const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Backup = sequelize.define('Backup', {
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
  provider: {
    type: DataTypes.ENUM('google_drive', 'dropbox', 'one_drive'),
    allowNull: false
  },
  providerFileId: {
    type: DataTypes.STRING,
    allowNull: true, // Pode ser null se ainda não foi enviado
    comment: 'ID do arquivo no provedor de nuvem'
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nome do arquivo de backup'
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Tamanho do arquivo em bytes'
  },
  checksum: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'SHA-256 hash para verificação de integridade'
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Versão do backup'
  },
  isEncrypted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Se o backup está criptografado'
  },
  encryptionKey: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Chave de criptografia (criptografada)'
  },
  status: {
    type: DataTypes.ENUM('pending', 'uploading', 'completed', 'failed', 'restoring'),
    allowNull: false,
    defaultValue: 'pending'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Metadados adicionais (contagem de itens, etc.)'
  },
  lastRestoredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Última vez que foi restaurado'
  }
}, {
  tableName: 'backups',
  timestamps: true,
  paranoid: true, // Soft delete
  indexes: [
    {
      fields: ['userId', 'provider']
    },
    {
      fields: ['userId', 'status']
    },
    {
      fields: ['checksum']
    }
  ]
});

// Métodos de instância
Backup.prototype.toSafeJSON = function() {
  const values = { ...this.dataValues };
  
  // Remover campos sensíveis
  delete values.encryptionKey;
  
  return values;
};

// Método para obter estatísticas do backup
Backup.prototype.getStats = function() {
  return {
    id: this.id,
    provider: this.provider,
    fileName: this.fileName,
    fileSize: this.fileSize,
    version: this.version,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastRestoredAt: this.lastRestoredAt,
    metadata: this.metadata
  };
};

module.exports = Backup;
