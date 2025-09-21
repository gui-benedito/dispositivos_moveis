const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserSettings = sequelize.define('UserSettings', {
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
  autoLockTimeout: {
    type: DataTypes.INTEGER,
    defaultValue: 5, // 5 minutos por padrão
    validate: {
      min: 1,
      max: 60
    }
  },
  biometricEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  biometricType: {
    type: DataTypes.ENUM('fingerprint'),
    allowNull: true
  },
  requirePasswordOnLock: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lockOnBackground: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lockOnScreenOff: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'user_settings',
  timestamps: true,
  paranoid: true
});

// Relacionamento com User
UserSettings.associate = (models) => {
  UserSettings.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

module.exports = UserSettings;
