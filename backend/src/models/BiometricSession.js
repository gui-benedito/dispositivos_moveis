const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BiometricSession = sequelize.define('BiometricSession', {
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
    },
    onDelete: 'CASCADE'
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  biometricType: {
    type: DataTypes.ENUM('fingerprint'),
    allowNull: false
  },
  deviceInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Informações do dispositivo (modelo, OS, etc.)'
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  failureReason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Motivo da falha se success = false'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Quando a sessão expira'
  },
  lastUsed: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Última vez que a sessão foi usada'
  }
}, {
  tableName: 'biometric_sessions',
  timestamps: true,
  paranoid: true, // Soft delete
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['sessionId']
    },
    {
      fields: ['expiresAt']
    },
    {
      fields: ['createdAt']
    }
  ]
});

// Método para verificar se sessão é válida
BiometricSession.prototype.isValid = function() {
  return this.expiresAt > new Date() && this.success;
};

// Método para marcar como usada
BiometricSession.prototype.markAsUsed = async function() {
  this.lastUsed = new Date();
  return this.save();
};

module.exports = BiometricSession;
