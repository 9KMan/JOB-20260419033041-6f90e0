const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = require('./User')(sequelize);
const Tenant = require('./Tenant')(sequelize);
const Plan = require('./Plan')(sequelize);
const Subscription = require('./Subscription')(sequelize);
const Order = require('./Order')(sequelize);
const Payment = require('./Payment')(sequelize);
const Message = require('./Message')(sequelize);
const Room = require('./Room')(sequelize);
const OnboardingStep = require('./OnboardingStep')(sequelize);
const Notification = require('./Notification')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);

Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users' });
User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Plan, { foreignKey: 'tenantId', as: 'plans' });
Plan.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Subscription.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Subscription.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });

User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Order.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Order.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });

User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Payment.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Payment.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });

User.hasMany(Message, { foreignKey: 'userId', as: 'messages' });
Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Message.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Message.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

Room.belongsTo(User, { foreignKey: 'userId', as: 'customer' });
Room.belongsTo(User, { foreignKey: 'assignedTo', as: 'agent' });
Room.hasMany(Message, { foreignKey: 'roomId', as: 'messages' });

User.hasMany(OnboardingStep, { foreignKey: 'userId', as: 'onboardingSteps' });
OnboardingStep.belongsTo(User, { foreignKey: 'userId', as: 'user' });
OnboardingStep.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Notification.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

AuditLog.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Tenant,
  Plan,
  Subscription,
  Order,
  Payment,
  Message,
  Room,
  OnboardingStep,
  Notification,
  AuditLog
};