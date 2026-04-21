const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const { Op } = require('sequelize');
const { Order, User, Subscription, Tenant, Payment } = require('../models');
const { authenticate, authorize, tenantMiddleware } = require('../middleware/auth');
const { createStripePaymentIntent, confirmPayment } = require('../services/stripe.service');
const { processFulfillment } = require('../services/fulfillment.service');
const { sendEmail } = require('../services/email.service');
const { v4: uuidv4 } = require('uuid');

router.post('/',
  authenticate,
  tenantMiddleware,
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.name').notEmpty(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('items.*.price').isFloat({ min: 0 }),
    body('shippingAddress').optional().isObject(),
    body('subscriptionId').optional().isUUID()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, shippingAddress, billingAddress, subscriptionId, notes } = req.body;

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const shippingCost = subtotal > 100 ? 0 : 9.99;
    const total = subtotal + tax + shippingCost;

    const orderNumber = `ORD-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const order = await Order.create({
      orderNumber,
      userId: req.user.id,
      tenantId: req.user.tenantId,
      subscriptionId,
      items,
      subtotal,
      tax,
      shippingCost,
      discount: 0,
      total,
      shippingAddress,
      billingAddress,
      status: 'pending',
      notes
    });

    const paymentIntent = await createStripePaymentIntent({
      amount: total,
      currency: 'usd',
      customerId: req.user.stripeCustomerId,
      metadata: { orderId: order.id, userId: req.user.id }
    });

    order.stripePaymentIntentId = paymentIntent.id;
    await order.save();

    res.status(201).json({ order, clientSecret: paymentIntent.client_secret });
  })
);

router.get('/',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, startDate, endDate, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.user.role === 'customer') {
      where.userId = req.user.id;
    } else if (req.user.role === 'admin') {
      where.tenantId = req.user.tenantId;
    }

    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }
    if (search) {
      where[Op.or] = [
        { orderNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      orders: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  })
);

router.get('/:id',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user' },
        { model: Subscription, as: 'subscription' },
        { model: Tenant, as: 'tenant' }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role === 'customer' && order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ order });
  })
);

router.put('/:id/status',
  authenticate,
  tenantMiddleware,
  authorize('admin', 'superadmin'),
  asyncHandler(async (req, res) => {
    const { status, trackingNumber, trackingUrl, notes } = req.body;
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;
    await order.update({
      status,
      ...(trackingNumber && { trackingNumber }),
      ...(trackingUrl && { trackingUrl }),
      ...(notes && { notes })
    });

    if (status === 'shipped' && trackingNumber) {
      await processFulfillment(order);
    }

    const io = req.app.get('io');
    io.to(`order:${order.id}`).emit('order:statusChanged', {
      orderId: order.id,
      oldStatus,
      newStatus: status
    });

    res.json({ order, message: 'Order status updated successfully' });
  })
);

router.post('/:id/confirm',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.stripePaymentIntentId) {
      const paymentResult = await confirmPayment(order.stripePaymentIntentId);

      if (paymentResult.status === 'succeeded') {
        await order.update({ status: 'confirmed' });

        await Payment.create({
          userId: order.userId,
          tenantId: order.tenantId,
          orderId: order.id,
          stripePaymentIntentId: paymentResult.id,
          amount: order.total,
          status: 'succeeded',
          paymentType: 'order'
        });

        if (order.user) {
          await sendEmail({
            to: order.user.email,
            template: 'order-confirmed',
            data: { order }
          });
        }

        return res.json({ order, message: 'Payment confirmed and order confirmed' });
      }
    }

    await order.update({ status: 'confirmed' });
    res.json({ order, message: 'Order confirmed' });
  })
);

router.get('/:id/tracking',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const order = await Order.findByPk(req.params.id, {
      attributes: ['id', 'orderNumber', 'status', 'trackingNumber', 'trackingUrl', 'fulfillmentStatus', 'fulfillmentPartner']
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role === 'customer' && order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ tracking: order });
  })
);

module.exports = router;