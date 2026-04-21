const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const { Subscription, User, Plan, Tenant, Order, Payment } = require('../models');
const { authenticate, authorize, tenantMiddleware } = require('../middleware/auth');
const { createStripeSubscription, cancelSubscription, updateSubscription } = require('../services/stripe.service');
const { sendEmail } = require('../services/email.service');

router.post('/',
  authenticate,
  tenantMiddleware,
  [
    body('planId').isUUID().withMessage('Valid plan ID is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const plan = await Plan.findByPk(req.body.planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ error: 'Plan not found or inactive' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No payment method configured' });
    }

    const existingSubscription = await Subscription.findOne({
      where: {
        userId: req.user.id,
        status: { [require('sequelize').Op.in]: ['active', 'trialing'] }
      }
    });

    if (existingSubscription) {
      return res.status(400).json({ error: 'Active subscription already exists' });
    }

    const subscription = await createStripeSubscription({
      customerId: user.stripeCustomerId,
      priceId: plan.stripePriceId,
      tenantId: req.user.tenantId,
      userId: req.user.id,
      planId: plan.id,
      trialDays: plan.trialDays
    });

    await sendEmail({
      to: user.email,
      template: 'subscription-activated',
      data: { planName: plan.name, subscription }
    });

    res.status(201).json({ subscription, message: 'Subscription created successfully' });
  })
);

router.get('/',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const where = { userId: req.user.id };
    if (req.user.role !== 'customer') {
      if (req.query.tenantId) {
        where.tenantId = req.query.tenantId;
      } else {
        where.tenantId = req.user.tenantId;
      }
    }

    const subscriptions = await Subscription.findAll({
      where,
      include: [
        { model: Plan, as: 'plan', attributes: ['id', 'name', 'price', 'billingInterval'] },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ subscriptions });
  })
);

router.get('/:id',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const subscription = await Subscription.findByPk(req.params.id, {
      include: [
        { model: Plan, as: 'plan' },
        { model: User, as: 'user' },
        { model: Tenant, as: 'tenant' }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (req.user.role === 'customer' && subscription.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ subscription });
  })
);

router.put('/:id',
  authenticate,
  tenantMiddleware,
  authorize('admin', 'superadmin'),
  asyncHandler(async (req, res) => {
    const subscription = await Subscription.findByPk(req.params.id);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (req.user.role === 'admin' && subscription.tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { quantity, planId } = req.body;

    if (planId) {
      const newPlan = await Plan.findByPk(planId);
      if (!newPlan) {
        return res.status(404).json({ error: 'New plan not found' });
      }

      await updateSubscription(subscription.stripeSubscriptionId, {
        priceId: newPlan.stripePriceId,
        quantity
      });

      await subscription.update({
        planId: newPlan.id,
        stripePriceId: newPlan.stripePriceId,
        ...(quantity && { quantity })
      });
    } else if (quantity) {
      await updateSubscription(subscription.stripeSubscriptionId, { quantity });
      await subscription.update({ quantity });
    }

    res.json({ subscription, message: 'Subscription updated successfully' });
  })
);

router.post('/:id/cancel',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { cancelAtPeriodEnd = false } = req.body;

    const subscription = await Subscription.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (req.user.role === 'customer' && subscription.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (cancelAtPeriodEnd) {
      await updateSubscription(subscription.stripeSubscriptionId, { cancel_at_period_end: true });
      await subscription.update({ cancelAtPeriodEnd: true });
    } else {
      await cancelSubscription(subscription.stripeSubscriptionId);
      await subscription.update({
        status: 'canceled',
        canceledAt: new Date()
      });
    }

    if (subscription.user) {
      await sendEmail({
        to: subscription.user.email,
        template: 'subscription-canceled',
        data: { subscription }
      });
    }

    res.json({ subscription, message: 'Subscription canceled successfully' });
  })
);

router.post('/:id/pause',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const subscription = await Subscription.findByPk(req.params.id);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.stripeSubscriptionId) {
      await updateSubscription(subscription.stripeSubscriptionId, { pause_collection: { behavior: 'void' } });
    }

    await subscription.update({ status: 'paused' });

    res.json({ subscription, message: 'Subscription paused successfully' });
  })
);

router.post('/:id/resume',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const subscription = await Subscription.findByPk(req.params.id);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.stripeSubscriptionId) {
      await updateSubscription(subscription.stripeSubscriptionId, { pause_collection: '' });
    }

    await subscription.update({ status: 'active' });

    res.json({ subscription, message: 'Subscription resumed successfully' });
  })
);

module.exports = router;