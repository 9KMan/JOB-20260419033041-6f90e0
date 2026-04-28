const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { Plan, Subscription, User } = require('../models');
const { authenticate, tenantMiddleware } = require('../middleware/auth');

router.post('/',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { code, promoType } = req.body;

    const { createPromoCode, validatePromoCode } = require('../services/promo.service');
    const isValid = await validatePromoCode(code);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid promo code' });
    }

    res.json({ valid: true, code });
  })
);

module.exports = router;