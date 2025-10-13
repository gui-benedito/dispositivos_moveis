const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const Note = sequelize.define('Note', {
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
  title: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isSecure: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  tags: {
    type: DataTypes.TEXT,
    allowNull: true,
    set(value) {
      if (value && Array.isArray(value)) {
        this.setDataValue('tags', JSON.stringify(value));
      } else {
        this.setDataValue('tags', value);
      }
    },
    get() {
      const value = this.getDataValue('tags');
      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      }
      return [];
    }
  },
  isFavorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  color: {
    type: DataTypes.STRING(7), // Hex color code
    allowNull: true,
    defaultValue: '#4ECDC4'
  }
}, {
  tableName: 'notes',
  timestamps: true,
  paranoid: true, // Soft delete
  hooks: {
    beforeCreate: (note) => {
      console.log('🔐 Criando nota:', note.isSecure ? 'SEGURA' : 'NORMAL');
    },
    beforeUpdate: (note) => {
      console.log('🔐 Atualizando nota:', note.isSecure ? 'SEGURA' : 'NORMAL');
    }
  }
});

// Métodos de criptografia
Note.prototype.encryptText = function(text) {
  if (!text) return text;
  
  try {
    const algorithm = 'aes-256-cbc';
    const key = this.generateEncryptionKey();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combinar IV + dados criptografados
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('❌ Erro ao criptografar texto:', error);
    return text; // Retornar texto original em caso de erro
  }
};

Note.prototype.decryptText = function(encryptedText) {
  if (!encryptedText) return encryptedText;
  
  try {
    const algorithm = 'aes-256-cbc';
    const key = this.generateEncryptionKey();
    
    // Separar IV e dados criptografados
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      console.log('⚠️ Formato de texto criptografado inválido, retornando original');
      return encryptedText;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Erro ao descriptografar texto:', error);
    return encryptedText; // Retornar texto criptografado em caso de erro
  }
};

Note.prototype.generateEncryptionKey = function() {
  // Gerar chave baseada no userId e uma chave mestra
  const masterKey = process.env.ENCRYPTION_MASTER_KEY || 'password-manager-master-key-2024';
  const userId = this.userId || this.getDataValue('userId');
  
  return crypto
    .createHash('sha256')
    .update(masterKey + userId)
    .digest('hex');
};

// Método para retornar dados seguros
Note.prototype.toSafeJSON = function() {
  const data = this.toJSON();
  
  // Remover campos sensíveis se não for o dono
  if (data.isSecure) {
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      isSecure: data.isSecure,
      tags: data.tags,
      isFavorite: data.isFavorite,
      color: data.color,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }
  
  return data;
};

module.exports = Note;
