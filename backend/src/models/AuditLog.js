const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    resource: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    oldValues: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    newValues: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['tenant_id', 'action'] },
      { fields: ['user_id', 'created_at'] },
      { fields: ['resource', 'resource_id'] }
    ]
  });

  return AuditLog;
};