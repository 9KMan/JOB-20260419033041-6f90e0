const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const { Op } = require('sequelize');
const { User, Tenant, Order, Subscription, Payment, AuditLog } = require('../models');
const { authenticate, authorize, tenantMiddleware } = require('../middleware/auth');

router.get('/dashboard',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const tenantId = req.user.role === 'customer' ? req.user.tenantId : req.query.tenantId;

    const dateRange = {
      today: new Date(new Date().setHours(0, 0, 0, 0)),
      week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    };

    const [
      totalUsers,
      activeSubscriptions,
      totalOrders,
      monthlyRevenue,
      todayOrders,
      recentOrders
    ] = await Promise.all([
      User.count({ where: { tenantId, isActive: true } }),
      Subscription.count({ where: { tenantId, status: { [Op.in]: ['active', 'trialing'] } } }),
      Order.count({ where: { tenantId } }),
      Payment.sum('amount', {
        where: {
          tenantId,
          status: 'succeeded',
          createdAt: { [Op.gte]: dateRange.month }
        }
      }),
      Order.count({
        where: {
          tenantId,
          createdAt: { [Op.gte]: dateRange.today }
        }
      }),
      Order.findAll({
        where: { tenantId },
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }]
      })
    ]);

    const orderStats = await Order.findAll({
      where: { tenantId, createdAt: { [Op.gte]: dateRange.month } },
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['status']
    });

    res.json({
      dashboard: {
        totalUsers,
        activeSubscriptions,
        totalOrders,
        monthlyRevenue: monthlyRevenue || 0,
        todayOrders,
        recentOrders,
        orderStats
      }
    });
  })
);

router.get('/revenue',
  authenticate,
  tenantMiddleware,
  authorize('admin', 'superadmin'),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('interval').optional().isIn(['day', 'week', 'month'])
  ],
  asyncHandler(async (req, res) => {
    const { startDate, endDate, interval = 'day' } = req.query;
    const tenantId = req.user.tenantId;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const revenueByDay = await Payment.findAll({
      where: {
        tenantId,
        status: 'succeeded',
        createdAt: { [Op.gte]: start, [Op.lte]: end }
      },
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('created_at')), 'date'],
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'revenue'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: [require('sequelize').fn('DATE', require('sequelize').col('created_at'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('created_at')), 'ASC']]
    });

    const totalRevenue = await Payment.sum('amount', {
      where: {
        tenantId,
        status: 'succeeded',
        createdAt: { [Op.gte]: start, [Op.lte]: end }
      }
    });

    res.json({
      revenue: {
        byDay: revenueByDay,
        total: totalRevenue || 0,
        startDate: start,
        endDate: end
      }
    });
  })
);

router.get('/customers',
  authenticate,
  tenantMiddleware,
  authorize('admin', 'superadmin'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { rows, count } = await User.findAndCountAll({
      where: { tenantId: req.user.tenantId, role: 'customer' },
      include: [
        { model: Subscription, as: 'subscriptions' },
        { model: Order, as: 'orders', attributes: ['id'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      customers: rows.map(u => ({
        ...u.toJSON(),
        totalOrders: u.orders?.length || 0,
        hasActiveSubscription: u.subscriptions?.some(s => ['active', 'trialing'].includes(s.status))
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  })
);

router.get('/activity',
  authenticate,
  tenantMiddleware,
  authorize('admin', 'superadmin'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { rows, count } = await AuditLog.findAndCountAll({
      where: { tenantId: req.user.tenantId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      activity: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  })
);

module.exports = router;