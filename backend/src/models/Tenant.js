const { DataTypes } = require('sequelize');
const CryptoJS = require('crypto-js');

module.exports = (sequelize) => {
  const Tenant = sequelize.define('Tenant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        is: /^[a-z0-9-]+$/
      }
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    logo: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        features: {
          voiceAI: true,
          smsNotifications: true,
          emailNotifications: true,
          analytics: true,
          crm: true
        },
        branding: {
          primaryColor: '#0066CC',
          secondaryColor: '#FFFFFF'
        },
        subscription: {
          trialDays: 14,
          defaultPlan: 'basic'
        }
      }
    },
    stripeAccountId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    twilioAccountSid: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    sendgridApiKey: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    awsAccessKeyId: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    awsSecretAccessKey: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    plan: {
      type: DataTypes.ENUM('free', 'starter', 'professional', 'enterprise'),
      defaultValue: 'starter'
    },
    subscriptionStatus: {
      type: DataTypes.ENUM('active', 'past_due', 'canceled', 'trialing'),
      defaultValue: 'active'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'tenants',
    timestamps: true,
    underscored: true
  });

  Tenant.prototype.encryptSensitiveData = function(data, key) {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
  };

  Tenant.prototype.decryptSensitiveData = function(encryptedData, key) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  };

  return Tenant;
};