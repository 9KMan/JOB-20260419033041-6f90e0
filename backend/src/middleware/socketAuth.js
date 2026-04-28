const jwt = require('jsonwebtoken');

async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
}

module.exports = { socketAuth };