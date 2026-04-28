const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { authenticate, tenantMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../services/email.service');
const { sendSMS } = require('../services/sms.service');

router.post('/send',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { userId, type, channel, title, message, data } = req.body;

    const notification = await Notification.create({
      userId,
      tenantId: req.user.tenantId,
      type,
      channel: channel || 'in_app',
      title,
      message,
      data,
      status: 'pending'
    });

    try {
      if (channel === 'email' || channel === 'both') {
        const user = await User.findByPk(userId);
        if (user) {
          await sendEmail({
            to: user.email,
            template: type,
            data: { title, message, ...data }
          });
        }
      }

      if (channel === 'sms' || channel === 'both') {
        const user = await User.findByPk(userId);
        if (user && user.phone) {
          await sendSMS({
            to: user.phone,
            body: message
          });
        }
      }

      notification.status = 'sent';
      notification.sentAt = new Date();
    } catch (error) {
      notification.status = 'failed';
      logger.error('Notification send failed:', error);
    }

    await notification.save();

    res.json({ notification });
  })
);

router.get('/',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const where = { userId: req.user.id };
    if (status) where.status = status;

    const { rows, count } = await Notification.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      notifications: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  })
);

router.put('/:id/read',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.status = 'read';
    notification.readAt = new Date();
    await notification.save();

    res.json({ notification });
  })
);

router.put('/read-all',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    await Notification.update(
      { status: 'read', readAt: new Date() },
      { where: { userId: req.user.id, status: { [require('sequelize').Op.ne]: 'read' } } }
    );

    res.json({ message: 'All notifications marked as read' });
  })
);

module.exports = router;