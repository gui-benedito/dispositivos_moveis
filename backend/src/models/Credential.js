const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Credential = sequelize.define('Credential', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Título é obrigatório'
      },
      len: {
        args: [1, 100],
        msg: 'Título deve ter entre 1 e 100 caracteres'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Geral',
    validate: {
      notEmpty: {
        msg: 'Categoria é obrigatória'
      },
      len: {
        args: [1, 50],
        msg: 'Categoria deve ter entre 1 e 50 caracteres'
      }
    }
  },
  // Campos criptografados com AES-256
  encryptedUsername: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Username criptografado'
  },
  encryptedPassword: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Senha é obrigatória'
      }
    },
    comment: 'Senha criptografada'
  },
  encryptedUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'URL criptografada'
  },
  encryptedNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas criptografadas'
  },
  // Metadados de criptografia
  encryptionKey: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Hash da chave de criptografia (derivada da senha mestre)'
  },
  iv: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Vetor de inicialização único para AES'
  },
  salt: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Salt usado na derivação da chave'
  },
  // Metadados de segurança
  lastAccessed: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Última vez que a credencial foi acessada'
  },
  accessCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Número de vezes que a credencial foi acessada'
  },
  isFavorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Se a credencial está marcada como favorita'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Se a credencial está ativa'
  }
}, {
  tableName: 'credentials',
  timestamps: true,
  paranoid: true, // Soft delete
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['category']
    },
    {
      fields: ['isFavorite']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['title']
    }
  ]
});

// Método para incrementar contador de acesso
Credential.prototype.incrementAccess = async function() {
  this.accessCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

// Método para retornar dados seguros (sem campos sensíveis)
Credential.prototype.toSafeJSON = function() {
  const values = Object.assign({}, this.get());
  // Remover campos sensíveis
  delete values.encryptedUsername;
  delete values.encryptedPassword;
  delete values.encryptedUrl;
  delete values.encryptedNotes;
  delete values.encryptionKey;
  delete values.iv;
  delete values.salt;
  return values;
};

// Método para retornar dados públicos (apenas metadados)
Credential.prototype.toPublicJSON = function() {
  return {
    id: this.id,
    title: this.title,
    description: this.description,
    category: this.category,
    isFavorite: this.isFavorite,
    isActive: this.isActive,
    accessCount: this.accessCount,
    lastAccessed: this.lastAccessed,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = Credential;
