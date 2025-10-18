const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class BackupCryptoService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
  }

  /**
   * Derivar chave de criptografia a partir do userId e senha mestra
   */
  _deriveKey(userId, masterPassword) {
    const salt = crypto.createHash('sha256').update(userId).digest();
    return crypto.pbkdf2Sync(masterPassword, salt, 100000, this.keyLength, 'sha512');
  }

  /**
   * Gerar chave de criptografia aleatória
   */
  generateEncryptionKey() {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Criptografar chave de criptografia com senha mestra
   */
  encryptEncryptionKey(encryptionKey, userId, masterPassword) {
    const key = this._deriveKey(userId, masterPassword);
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from(userId, 'utf8'));
    
    let encrypted = cipher.update(encryptionKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();
    
    return {
      encrypted: iv.toString('hex') + ':' + encrypted.toString('hex') + ':' + tag.toString('hex'),
      iv: iv.toString('hex')
    };
  }

  /**
   * Descriptografar chave de criptografia
   */
  decryptEncryptionKey(encryptedKey, userId, masterPassword) {
    try {
      const key = this._deriveKey(userId, masterPassword);
      const parts = encryptedKey.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Formato de chave criptografada inválido');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = Buffer.from(parts[1], 'hex');
      const tag = Buffer.from(parts[2], 'hex');
      
      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAAD(Buffer.from(userId, 'utf8'));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted;
    } catch (error) {
      console.error('❌ Erro ao descriptografar chave:', error);
      throw new Error('Falha na descriptografia da chave');
    }
  }

  /**
   * Criptografar dados do backup
   */
  async encryptBackupData(data, encryptionKey) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, encryptionKey);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      console.error('❌ Erro ao criptografar dados do backup:', error);
      throw new Error('Falha na criptografia dos dados');
    }
  }

  /**
   * Descriptografar dados do backup
   */
  async decryptBackupData(encryptedData, encryptionKey) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      
      const decipher = crypto.createDecipher(this.algorithm, encryptionKey);
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('❌ Erro ao descriptografar dados do backup:', error);
      throw new Error('Falha na descriptografia dos dados');
    }
  }

  /**
   * Calcular checksum SHA-256
   */
  calculateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verificar integridade do backup
   */
  verifyBackupIntegrity(data, expectedChecksum) {
    const actualChecksum = this.calculateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Gerar nome de arquivo único
   */
  generateBackupFileName(userId, provider) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomId = crypto.randomBytes(4).toString('hex');
    return `password-manager-backup-${userId.substring(0, 8)}-${timestamp}-${randomId}.pmb`;
  }
}

module.exports = new BackupCryptoService();
