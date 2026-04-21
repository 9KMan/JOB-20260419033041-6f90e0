const request = require('supertest');
const express = require('express');
const subscriptionRoutes = require('../../src/routes/subscription.routes');
const { Subscription, User, Plan, Tenant } = require('../../src/models');

jest.mock('../../src/services/stripe.service', () => ({
  createStripeSubscription: jest.fn().mockResolvedValue({
    id: 'sub_test123',
    stripeSubscriptionId: 'sub_test123',
    status: 'active'
  }),
  cancelSubscription: jest.fn().mockResolvedValue({}),
  updateSubscription: jest.fn().mockResolvedValue({})
}));

jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}));

const app = express();
app.use(express.json());

describe('Subscription Routes', () => {
  let tenant;
  let user;
  let plan;
  let authToken;

  beforeEach(async () => {
    await Subscription.destroy({ where: {} });
    await User.destroy({ where: {} });
    await Plan.destroy({ where: {} });
    await Tenant.destroy({ where: {} });

    tenant = await Tenant.create({
      name: 'Test Tenant',
      slug: 'test-tenant'
    });

    user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: tenant.id,
      stripeCustomerId: 'cus_test123'
    });

    plan = await Plan.create({
      tenantId: tenant.id,
      name: 'Basic Plan',
      price: 29.99,
      stripePriceId: 'price_test123'
    });

    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenantId: tenant.id },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    app.use('/api/v1/subscriptions', (req, res, next) => {
      req.user = { id: user.id, email: user.email, role: user.role, tenantId: tenant.id };
      next();
    });
    app.use('/api/v1/subscriptions', subscriptionRoutes);
  });

  describe('GET /api/v1/subscriptions', () => {
    it('should return user subscriptions', async () => {
      const subscription = await Subscription.create({
        userId: user.id,
        tenantId: tenant.id,
        planId: plan.id,
        stripeSubscriptionId: 'sub_test123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .get('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.subscriptions).toHaveLength(1);
    });
  });
});