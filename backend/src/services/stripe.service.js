const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Subscription, User, Plan } = require('../models');
const logger = require('../utils/logger');

async function createStripeSubscription({ customerId, priceId, tenantId, userId, planId, trialDays }) {
  try {
    const subscriptionParams = {
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        tenantId,
        userId,
        planId
      },
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    };

    if (trialDays > 0) {
      subscriptionParams.trial_period_days = trialDays;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    const stripeSubscription = subscription.items.data[0];
    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice.payment_intent;

    const dbSubscription = await Subscription.create({
      userId,
      tenantId,
      planId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status === 'active' ? 'active' : 'trialing',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialStart: trialDays > 0 ? new Date() : null,
      trialEnd: trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null
    });

    return dbSubscription;
  } catch (error) {
    logger.error('Error creating Stripe subscription:', error);
    throw error;
  }
}

async function updateSubscription(stripeSubscriptionId, { priceId, quantity, cancel_at_period_end }) {
  try {
    const updateParams = {};

    if (priceId) {
      updateParams.items = [{
        id: (await stripe.subscriptions.retrieve(stripeSubscriptionId)).items.data[0].id,
        price: priceId
      }];
    }

    if (quantity !== undefined) {
      updateParams.items = [{
        id: (await stripe.subscriptions.retrieve(stripeSubscriptionId)).items.data[0].id,
        quantity
      }];
    }

    if (cancel_at_period_end !== undefined) {
      updateParams.cancel_at_period_end = cancel_at_period_end;
    }

    const subscription = await stripe.subscriptions.update(stripeSubscriptionId, updateParams);
    return subscription;
  } catch (error) {
    logger.error('Error updating Stripe subscription:', error);
    throw error;
  }
}

async function cancelSubscription(stripeSubscriptionId, { immediately = false } = {}) {
  try {
    let subscription;

    if (immediately) {
      subscription = await stripe.subscriptions.cancel(stripeSubscriptionId);
    } else {
      subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true
      });
    }

    return subscription;
  } catch (error) {
    logger.error('Error canceling Stripe subscription:', error);
    throw error;
  }
}

async function createStripePaymentIntent({ amount, currency, customerId, metadata }) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      customer: customerId,
      metadata,
      automatic_payment_methods: {
        enabled: true
      }
    });

    return paymentIntent;
  } catch (error) {
    logger.error('Error creating Stripe payment intent:', error);
    throw error;
  }
}

async function confirmPayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    logger.error('Error confirming payment:', error);
    throw error;
  }
}

async function updateSubscriptionFromStripe(stripeSubscription) {
  const subscription = await Subscription.findOne({
    where: { stripeSubscriptionId: stripeSubscription.id }
  });

  if (!subscription) {
    logger.warn(`Subscription not found for Stripe ID: ${stripeSubscription.id}`);
    return;
  }

  await subscription.update({
    status: stripeSubscription.status,
    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
  });
}

async function cancelSubscriptionFromStripe(stripeSubscription) {
  const subscription = await Subscription.findOne({
    where: { stripeSubscriptionId: stripeSubscription.id }
  });

  if (!subscription) {
    logger.warn(`Subscription not found for canceled Stripe ID: ${stripeSubscription.id}`);
    return;
  }

  await subscription.update({
    status: 'canceled',
    canceledAt: new Date()
  });
}

module.exports = {
  createStripeSubscription,
  updateSubscription,
  cancelSubscription,
  createStripePaymentIntent,
  confirmPayment,
  updateSubscriptionFromStripe,
  cancelSubscriptionFromStripe
};