const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const { User, Tenant } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { sendEmail } = require('../services/email.service');
const { sendSMS } = require('../services/sms.service');

router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('tenantSlug').optional().trim()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, phone, tenantSlug } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    let tenantId = null;
    if (tenantSlug) {
      const tenant = await Tenant.findOne({ where: { slug: tenantSlug, isActive: true } });
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      tenantId = tenant.id;
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      tenantId,
      role: tenantId ? 'customer' : 'admin'
    });

    if (tenantId) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user.id, tenantId }
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    await sendEmail({
      to: user.email,
      template: 'welcome',
      data: { firstName: user.firstName }
    });

    res.status(201).json({
      user: user.toJSON(),
      token,
      message: 'Registration successful'
    });
  })
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ where: { email, isActive: true } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      user: user.toJSON(),
      token,
      expiresIn: '7d'
    });
  })
);

router.post('/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    req.logout();
    res.json({ message: 'Logged out successfully' });
  })
);

router.post('/verify-email',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.user.id);
    user.emailVerified = true;
    await user.save();
    res.json({ message: 'Email verified successfully' });
  })
);

router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (user) {
      const resetToken = jwt.sign(
        { id: user.id, purpose: 'password-reset' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      await sendEmail({
        to: user.email,
        template: 'password-reset',
        data: {
          firstName: user.firstName,
          resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
        }
      });
    }

    res.json({ message: 'If email exists, password reset link has been sent' });
  })
);

router.post('/refresh-token',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret');
      const user = await User.findByPk(decoded.id);

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      const newToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.json({ token: newToken });
    } catch (error) {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  })
);

module.exports = router;