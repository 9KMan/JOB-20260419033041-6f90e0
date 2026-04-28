require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const { Sequelize } = require('sequelize');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('passport');
const path = require('path');

const logger = require('./utils/logger');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { socketAuth } = require('./middleware/socketAuth');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PgSession = connectPgSimple(session);
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  }
});

const sessionStore = new PgSession({
  sequelize,
  tableName: 'session',
  createTableIfMissing: true
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"]
    }
  }
}));

app.use(compression());
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

io.use(socketAuth);
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.user?.id}`);

  socket.on('subscribe:orders', (orderId) => {
    socket.join(`order:${orderId}`);
  });

  socket.on('subscribe:messages', (roomId) => {
    socket.join(`room:${roomId}`);
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });
});

app.set('io', io);
app.set('sequelize', sequelize);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    if (process.env.NODE_ENV === 'production') {
      await sequelize.sync({ alter: false });
    } else {
      await sequelize.sync({ alter: true });
    }
    logger.info('Database synchronized');

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

module.exports = { app, server, sequelize, io };