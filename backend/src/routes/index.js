const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const tenantRoutes = require('./tenant.routes');
const subscriptionRoutes = require('./subscription.routes');
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');
const messageRoutes = require('./message.routes');
const notificationRoutes = require('./notification.routes');
const onboardingRoutes = require('./onboarding.routes');
const analyticsRoutes = require('./analytics.routes');
const webhookRoutes = require('./webhook.routes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tenants', tenantRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/webhooks', webhookRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;