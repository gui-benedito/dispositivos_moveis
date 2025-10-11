const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VerificationCode = sequelize.define('VerificationCode', {
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
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Email para onde o código foi enviado'
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Código de verificação'
  },
  type: {
    type: DataTypes.ENUM('2fa_setup', '2fa_login', 'password_reset'),
    allowNull: false,
    comment: 'Tipo de verificação'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Data de expiração do código'
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Se o código já foi usado'
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Número de tentativas de uso'
  }
}, {
  tableName: 'verification_codes',
  timestamps: true,
  paranoid: true
});

module.exports = VerificationCode;
