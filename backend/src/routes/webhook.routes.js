const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Subscription, Order, Payment, User } = require('../models');
const { updateSubscriptionFromStripe, cancelSubscriptionFromStripe } = require('../services/stripe.service');

router.post('/stripe',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscriptionData = event.data.object;
          await updateSubscriptionFromStripe(subscriptionData);
          break;

        case 'customer.subscription.deleted':
          const canceledSubscription = event.data.object;
          await cancelSubscriptionFromStripe(canceledSubscription);
          break;

        case 'invoice.payment_succeeded':
          const invoice = event.data.object;
          if (invoice.subscription) {
            const subscription = await Subscription.findOne({
              where: { stripeSubscriptionId: invoice.subscription }
            });
            if (subscription) {
              subscription.status = 'active';
              subscription.currentPeriodStart = new Date(invoice.period_start * 1000);
              subscription.currentPeriodEnd = new Date(invoice.period_end * 1000);
              await subscription.save();
            }
          }
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object;
          if (failedInvoice.subscription) {
            const failedSubscription = await Subscription.findOne({
              where: { stripeSubscriptionId: failedInvoice.subscription }
            });
            if (failedSubscription) {
              failedSubscription.status = 'past_due';
              await failedSubscription.save();
            }
          }
          break;

        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          if (paymentIntent.metadata.orderId) {
            const order = await Order.findByPk(paymentIntent.metadata.orderId);
            if (order) {
              order.status = 'confirmed';
              await order.save();

              await Payment.create({
                userId: paymentIntent.metadata.userId,
                tenantId: order.tenantId,
                orderId: order.id,
                stripePaymentIntentId: paymentIntent.id,
                stripeChargeId: paymentIntent.latest_charge,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                status: 'succeeded',
                paymentType: 'order'
              });
            }
          }
          break;

        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object;
          if (failedPaymentIntent.metadata.orderId) {
            const order = await Order.findByPk(failedPaymentIntent.metadata.orderId);
            if (order) {
              order.status = 'pending';
              await order.save();
            }
          }
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  })
);

router.post('/twilio',
  express.urlencoded({ extended: true }),
  asyncHandler(async (req, res) => {
    const {
      From: from,
      To: to,
      Body: body,
      MessageSid: messageSid
    } = req.body;

    console.log(`Twilio webhook: From=${from}, To=${to}, Body=${body}`);

    const user = await User.findOne({
      where: { phone: from.replace('+', '') }
    });

    if (user) {
      console.log(`SMS received from user: ${user.id}`);
    }

    res.status(200).send('OK');
  })
);

module.exports = router;