const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const { Message, User, Room, Tenant } = require('../models');
const { authenticate, authorize, tenantMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../services/email.service');

router.post('/',
  authenticate,
  tenantMiddleware,
  [
    body('content').trim().notEmpty().withMessage('Message content is required'),
    body('roomId').optional().isUUID(),
    body('type').optional().isIn(['text', 'image', 'file', 'voice'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, roomId, type = 'text', metadata } = req.body;

    let targetRoomId = roomId;

    if (!targetRoomId) {
      const existingRoom = await Room.findOne({
        where: {
          userId: req.user.id,
          tenantId: req.user.tenantId,
          status: 'open'
        }
      });

      if (existingRoom) {
        targetRoomId = existingRoom.id;
      } else {
        const newRoom = await Room.create({
          userId: req.user.id,
          tenantId: req.user.tenantId,
          subject: 'Customer Support'
        });
        targetRoomId = newRoom.id;
      }
    }

    const message = await Message.create({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      roomId: targetRoomId,
      content,
      type,
      senderType: req.user.role === 'customer' ? 'customer' : 'admin',
      metadata
    });

    await Room.update(
      { lastMessageAt: new Date() },
      { where: { id: targetRoomId } }
    );

    const io = req.app.get('io');
    io.to(`room:${targetRoomId}`).emit('message:new', {
      message: message.toJSON()
    });

    if (req.user.role === 'customer') {
      const admins = await User.findAll({
        where: {
          tenantId: req.user.tenantId,
          role: { [require('sequelize').Op.in]: ['admin', 'superadmin'] },
          isActive: true
        }
      });

      const adminEmails = admins.map(a => a.email);
      if (adminEmails.length > 0) {
        await sendEmail({
          to: adminEmails,
          template: 'new-message',
          data: {
            customerName: `${req.user.firstName} ${req.user.lastName}`,
            message: content.substring(0, 100),
            roomId: targetRoomId
          }
        });
      }
    }

    res.status(201).json({ message });
  })
);

router.get('/',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { roomId, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.user.role === 'customer') {
      where.userId = req.user.id;
    } else if (req.user.role === 'admin') {
      where.tenantId = req.user.tenantId;
    }
    if (roomId) where.roomId = roomId;

    const { rows, count } = await Message.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      messages: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  })
);

router.get('/rooms',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.user.role === 'customer') {
      where.userId = req.user.id;
    } else if (req.user.role === 'admin') {
      where.tenantId = req.user.tenantId;
    }

    const rooms = await Room.findAll({
      where,
      include: [
        { model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'agent', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      order: [['lastMessageAt', 'DESC NULLS LAST']]
    });

    res.json({ rooms });
  })
);

router.get('/rooms/:id',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const room = await Room.findByPk(req.params.id, {
      include: [
        { model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'agent', attributes: ['id', 'firstName', 'lastName', 'email'] },
        {
          model: Message,
          as: 'messages',
          include: [{ model: User, as: 'user' }],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (req.user.role === 'customer' && room.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ room });
  })
);

router.put('/rooms/:id/assign',
  authenticate,
  tenantMiddleware,
  authorize('admin', 'superadmin'),
  asyncHandler(async (req, res) => {
    const { assignedTo } = req.body;
    const room = await Room.findByPk(req.params.id);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    await room.update({ assignedTo });

    res.json({ room, message: 'Room assigned successfully' });
  })
);

router.put('/rooms/:id/close',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const room = await Room.findByPk(req.params.id);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (req.user.role === 'customer' && room.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await room.update({ status: 'closed' });

    res.json({ room, message: 'Room closed successfully' });
  })
);

module.exports = router;