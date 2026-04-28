const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
}

function tenantMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.tenantId && req.user.role !== 'superadmin') {
    return res.status(400).json({ error: 'Tenant context required' });
  }

  next();
}

function rateLimiter({ windowMs, maxRequests, message }) {
  const rateLimit = require('express-rate-limit');

  return rateLimit({
    windowMs: windowMs || 15 * 60 * 1000,
    max: maxRequests || 100,
    message: message || 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  });
}

function validateRequest(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({ errors });
    }
    next();
  };
}

module.exports = {
  authenticate,
  authorize,
  tenantMiddleware,
  rateLimiter,
  validateRequest
};