const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TwoFactorAuth = sequelize.define('TwoFactorAuth', {
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
  method: {
    type: DataTypes.ENUM('totp', 'sms', 'email'),
    allowNull: false
  },
  secret: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Segredo TOTP (criptografado)'
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Número de telefone para SMS'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Email para códigos (se diferente do principal)'
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Se 2FA está ativado'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Se 2FA foi verificado após ativação'
  },
  backupCodes: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Códigos de recuperação (criptografados)'
  },
  lastUsed: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Última vez que 2FA foi usado'
  },
  failedAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Tentativas falhadas consecutivas'
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Bloqueio temporário por muitas tentativas'
  }
}, {
  tableName: 'two_factor_auth',
  timestamps: true,
  paranoid: true, // Soft delete
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['method']
    },
    {
      fields: ['isEnabled']
    },
    {
      fields: ['createdAt']
    }
  ]
});

// Método para verificar se está bloqueado
TwoFactorAuth.prototype.isLocked = function() {
  return this.lockedUntil && this.lockedUntil > new Date();
};

// Método para incrementar tentativas falhadas
TwoFactorAuth.prototype.incrementFailedAttempts = async function() {
  this.failedAttempts += 1;
  
  // Bloquear por 15 minutos após 5 tentativas falhadas
  if (this.failedAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  
  return this.save();
};

// Método para resetar tentativas falhadas
TwoFactorAuth.prototype.resetFailedAttempts = async function() {
  this.failedAttempts = 0;
  this.lockedUntil = null;
  return this.save();
};

// Método para marcar como usado
TwoFactorAuth.prototype.markAsUsed = async function() {
  this.lastUsed = new Date();
  return this.save();
};

module.exports = TwoFactorAuth;
