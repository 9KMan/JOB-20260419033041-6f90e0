const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const { Tenant, User, Plan } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { encryptData, decryptData } = require('../utils/encryption');

router.post('/',
  authenticate,
  authorize('superadmin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('slug').trim().notEmpty().isSlug().withMessage('Valid slug is required'),
    body('domain').optional().trim(),
    body('plan').optional().isIn(['free', 'starter', 'professional', 'enterprise'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const existingTenant = await Tenant.findOne({ where: { slug: req.body.slug } });
    if (existingTenant) {
      return res.status(409).json({ error: 'Tenant slug already exists' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const account = await stripe.accounts.create({
      type: 'standard',
      metadata: { slug: req.body.slug }
    });

    const tenant = await Tenant.create({
      ...req.body,
      stripeAccountId: account.id,
      plan: req.body.plan || 'starter'
    });

    await Plan.create({
      tenantId: tenant.id,
      name: 'Basic',
      description: 'Basic subscription plan',
      price: 0,
      features: ['Basic support', '5 orders/month'],
      isPublic: true
    });

    res.status(201).json({ tenant, message: 'Tenant created successfully' });
  })
);

router.get('/',
  authenticate,
  authorize('superadmin'),
  asyncHandler(async (req, res) => {
    const tenants = await Tenant.findAll({
      include: [
        { model: User, as: 'users', attributes: ['id'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      tenants: tenants.map(t => ({
        ...t.toJSON(),
        userCount: t.users?.length || 0
      }))
    });
  })
);

router.get('/:id',
  authenticate,
  authorize('superadmin', 'admin'),
  asyncHandler(async (req, res) => {
    const tenant = await Tenant.findByPk(req.params.id, {
      include: [
        { model: Plan, as: 'plans' }
      ]
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (req.user.role === 'admin' && tenant.id !== req.user.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ tenant: tenant.toJSON() });
  })
);

router.put('/:id',
  authenticate,
  authorize('superadmin', 'admin'),
  asyncHandler(async (req, res) => {
    const tenant = await Tenant.findByPk(req.params.id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (req.user.role === 'admin' && tenant.id !== req.user.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, domain, logo, settings, isActive, plan } = req.body;

    await tenant.update({
      ...(name && { name }),
      ...(domain !== undefined && { domain }),
      ...(logo !== undefined && { logo }),
      ...(settings && { settings }),
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(plan && req.user.role === 'superadmin' && { plan })
    });

    res.json({ tenant: tenant.toJSON(), message: 'Tenant updated successfully' });
  })
);

router.get('/:id/analytics',
  authenticate,
  authorize('superadmin', 'admin'),
  asyncHandler(async (req, res) => {
    const tenant = await Tenant.findByPk(req.params.id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (req.user.role === 'admin' && tenant.id !== req.user.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userCount = await User.count({ where: { tenantId: tenant.id } });

    res.json({
      analytics: {
        tenantId: tenant.id,
        userCount,
        plan: tenant.plan,
        subscriptionStatus: tenant.subscriptionStatus,
        isActive: tenant.isActive
      }
    });
  })
);

module.exports = router;