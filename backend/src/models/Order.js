const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id'
      }
    },
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'subscriptions',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'canceled',
        'refunded',
        'on_hold'
      ),
      defaultValue: 'pending'
    },
    items: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    shippingCost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    shippingAddress: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    billingAddress: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fulfillmentStatus: {
      type: DataTypes.ENUM('unfulfilled', 'partially_fulfilled', 'fulfilled'),
      defaultValue: 'unfulfilled'
    },
    fulfillmentPartner: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    trackingNumber: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    trackingUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    underscored: true
  });

  return Order;
};