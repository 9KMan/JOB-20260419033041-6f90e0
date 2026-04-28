const { Op } = require('sequelize');

function paginate(model) {
  return async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    req.pagination = {
      page,
      limit,
      offset,
      limitValue: limit,
      offsetValue: offset
    };

    next();
  };
}

function formatPaginationResponse(data, page, limit, total) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
}

module.exports = { paginate, formatPaginationResponse };