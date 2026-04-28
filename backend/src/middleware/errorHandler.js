const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors || err.message
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Database Validation Error',
      details: err.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Resource already exists',
      details: err.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }

  if (err.status === 404 || err.name === 'NotFoundError') {
    return res.status(404).json({
      error: 'Resource not found'
    });
  }

  if (err.status === 403 || err.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Access denied'
    });
  }

  if (err.status === 401 || err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
}

module.exports = { errorHandler, notFoundHandler };