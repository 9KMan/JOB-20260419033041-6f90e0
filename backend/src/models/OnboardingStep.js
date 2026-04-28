const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OnboardingStep = sequelize.define('OnboardingStep', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    step: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 10
      }
    },
    stepName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'skipped'),
      defaultValue: 'pending'
    },
    data: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'onboarding_steps',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id', 'step'] },
      { fields: ['tenant_id'] }
    ]
  });

  return OnboardingStep;
};