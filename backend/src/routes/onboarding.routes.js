const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const { OnboardingStep, User, Tenant } = require('../models');
const { authenticate, tenantMiddleware } = require('../middleware/auth');

const DEFAULT_STEPS = [
  { step: 1, stepName: 'profile', title: 'Complete Your Profile', description: 'Add your personal information' },
  { step: 2, stepName: 'payment', title: 'Set Up Payment', description: 'Add your payment method' },
  { step: 3, stepName: 'shipping', title: 'Add Shipping Address', description: 'Tell us where to deliver' },
  { step: 4, stepName: 'preferences', title: 'Set Preferences', description: 'Customize your experience' },
  { step: 5, stepName: 'complete', title: 'Get Started', description: 'You are ready to go!' }
];

router.get('/status',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    let steps = await OnboardingStep.findAll({
      where: { userId: req.user.id, tenantId: req.user.tenantId },
      order: [['step', 'ASC']]
    });

    if (steps.length === 0) {
      const tenant = await Tenant.findByPk(req.user.tenantId);
      const trialDays = tenant?.settings?.subscription?.trialDays || 14;

      steps = await OnboardingStep.bulkCreate(
        DEFAULT_STEPS.map(s => ({
          ...s,
          userId: req.user.id,
          tenantId: req.user.tenantId,
          status: 'pending'
        }))
      );
    }

    const completedCount = steps.filter(s => s.status === 'completed').length;
    const progress = Math.round((completedCount / steps.length) * 100);

    res.json({
      steps,
      progress,
      isComplete: completedCount === steps.length
    });
  })
);

router.put('/steps/:stepName',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { stepName } = req.params;
    const { data } = req.body;

    const step = await OnboardingStep.findOne({
      where: { userId: req.user.id, tenantId: req.user.tenantId, stepName }
    });

    if (!step) {
      return res.status(404).json({ error: 'Step not found' });
    }

    await step.update({
      status: 'completed',
      data: { ...step.data, ...data },
      completedAt: new Date()
    });

    const io = req.app.get('io');
    io.to(`user:${req.user.id}`).emit('onboarding:stepCompleted', { stepName });

    const nextStep = await OnboardingStep.findOne({
      where: {
        userId: req.user.id,
        tenantId: req.user.tenantId,
        step: step.step + 1
      }
    });

    res.json({
      step,
      nextStep,
      message: `Step "${stepName}" completed successfully`
    });
  })
);

router.post('/skip/:stepName',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { stepName } = req.params;

    const step = await OnboardingStep.findOne({
      where: { userId: req.user.id, tenantId: req.user.tenantId, stepName }
    });

    if (!step) {
      return res.status(404).json({ error: 'Step not found' });
    }

    await step.update({ status: 'skipped' });

    res.json({ step, message: `Step "${stepName}" skipped` });
  })
);

router.post('/reset',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    await OnboardingStep.destroy({
      where: { userId: req.user.id, tenantId: req.user.tenantId }
    });

    const steps = await OnboardingStep.bulkCreate(
      DEFAULT_STEPS.map(s => ({
        ...s,
        userId: req.user.id,
        tenantId: req.user.tenantId,
        status: 'pending'
      }))
    );

    res.json({ steps, message: 'Onboarding reset successfully' });
  })
);

module.exports = router;