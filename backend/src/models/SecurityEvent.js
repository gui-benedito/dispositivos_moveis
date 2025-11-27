const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Evento de segurança para auditoria e notificações
const SecurityEvent = sequelize.define('SecurityEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  type: {
    // ex: login_success, login_failed, new_device, password_changed, twofa_enabled, suspicious_activity
    type: DataTypes.STRING,
    allowNull: false,
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false,
    defaultValue: 'low',
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  geo: {
    // Pode armazenar país/cidade/etc.
    type: DataTypes.JSON,
    allowNull: true,
  },
  deviceInfo: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'security_events',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['type'] },
    { fields: ['severity'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = SecurityEvent;
