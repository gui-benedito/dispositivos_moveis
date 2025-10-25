const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CredentialVersion = sequelize.define('CredentialVersion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  credentialId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'credentials',
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  version: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Metadados legíveis
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isFavorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Snapshot criptografado
  encryptedUsername: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  encryptedPassword: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  encryptedNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  encryptionKey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  iv: {
    type: DataTypes.STRING,
    allowNull: false
  },
  salt: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'credential_versions',
  timestamps: true,
  indexes: [
    { fields: ['credentialId'] },
    { fields: ['userId'] },
    { fields: ['version'] }
  ]
});

module.exports = CredentialVersion;
