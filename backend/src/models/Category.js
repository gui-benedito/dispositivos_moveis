const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Nome é obrigatório' },
      len: { args: [1, 50], msg: 'Nome deve ter entre 1 e 50 caracteres' }
    }
  },
  icon: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Identificador do ícone (ex.: Ionicons name)'
  },
  color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Cor opcional para o ícone (hex ou nome)'
  }
}, {
  tableName: 'categories',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['name'] },
    { unique: true, fields: ['userId', 'name'] }
  ]
});

module.exports = Category;
