const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const { Op } = require('sequelize');
const { User, Tenant, AuditLog } = require('../models');
const { authenticate, authorize, tenantMiddleware } = require('../middleware/auth');
const { paginate } = require('../middleware/pagination');

router.get('/',
  authenticate,
  authorize('admin', 'superadmin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().trim(),
    query('role').optional().isIn(['customer', 'admin', 'superadmin']),
    query('status').optional().isIn(['active', 'inactive'])
  ],
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, role, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.user.role === 'admin') {
      where.tenantId = req.user.tenantId;
    }
    if (role) where.role = role;
    if (status) where.isActive = status === 'active';
    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'name', 'slug'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      users: rows.map(u => u.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  })
);

router.get('/:id',
  authenticate,
  authorize('admin', 'superadmin'),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id, {
      include: [{ model: Tenant, as: 'tenant' }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.role === 'admin' && user.tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ user: user.toJSON() });
  })
);

router.put('/:id',
  authenticate,
  authorize('admin', 'superadmin'),
  [
    param('id').isUUID(),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    body('role').optional().isIn(['customer', 'admin', 'superadmin']),
    body('isActive').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.role === 'admin' && user.tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { firstName, lastName, phone, role, isActive, preferences } = req.body;

    await AuditLog.create({
      tenantId: user.tenantId,
      userId: req.user.id,
      action: 'update',
      resource: 'user',
      resourceId: user.id,
      oldValues: user.toJSON(),
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await user.update({
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone && { phone }),
      ...(role && req.user.role === 'superadmin' && { role }),
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(preferences && { preferences })
    });

    res.json({ user: user.toJSON(), message: 'User updated successfully' });
  })
);

router.delete('/:id',
  authenticate,
  authorize('superadmin'),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update({ isActive: false });

    await AuditLog.create({
      tenantId: user.tenantId,
      userId: req.user.id,
      action: 'delete',
      resource: 'user',
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ message: 'User deactivated successfully' });
  })
);

router.get('/profile/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Tenant, as: 'tenant' }]
    });
    res.json({ user: user.toJSON() });
  })
);

router.put('/profile/me',
  authenticate,
  [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    body('preferences').optional().isObject()
  ],
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.user.id);
    const { firstName, lastName, phone, preferences } = req.body;

    await user.update({
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(preferences && { preferences })
    });

    res.json({ user: user.toJSON(), message: 'Profile updated successfully' });
  })
);

module.exports = router;