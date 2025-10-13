const crypto = require('crypto');

class NoteCryptoService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.masterKey = process.env.ENCRYPTION_MASTER_KEY || 'password-manager-master-key-2024';
  }

  /**
   * Gerar chave de criptografia baseada no userId
   */
  generateUserKey(userId) {
    return crypto
      .createHash('sha256')
      .update(this.masterKey + userId)
      .digest('hex');
  }

  /**
   * Criptografar texto
   */
  encryptText(text, userId) {
    if (!text || !userId) return text;
    
    try {
      const key = this.generateUserKey(userId);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(this.algorithm, key);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combinar IV + dados criptografados
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('❌ Erro ao criptografar texto:', error);
      return text; // Retornar texto original em caso de erro
    }
  }

  /**
   * Descriptografar texto
   */
  decryptText(encryptedText, userId) {
    if (!encryptedText || !userId) return encryptedText;
    
    try {
      const key = this.generateUserKey(userId);
      
      // Separar IV e dados criptografados
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        console.log('⚠️ Formato de texto criptografado inválido, retornando original');
        return encryptedText;
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipher(this.algorithm, key);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Erro ao descriptografar texto:', error);
      return encryptedText; // Retornar texto criptografado em caso de erro
    }
  }

  /**
   * Criptografar objeto de nota
   */
  encryptNote(noteData, userId) {
    if (!noteData || !userId) return noteData;
    
    const encrypted = { ...noteData };
    
    if (noteData.title) {
      encrypted.title = this.encryptText(noteData.title, userId);
    }
    
    if (noteData.content) {
      encrypted.content = this.encryptText(noteData.content, userId);
    }
    
    return encrypted;
  }

  /**
   * Descriptografar objeto de nota
   */
  decryptNote(noteData, userId) {
    if (!noteData || !userId) return noteData;
    
    const decrypted = { ...noteData };
    
    if (noteData.title) {
      decrypted.title = this.decryptText(noteData.title, userId);
    }
    
    if (noteData.content) {
      decrypted.content = this.decryptText(noteData.content, userId);
    }
    
    return decrypted;
  }

  /**
   * Verificar se texto está criptografado
   */
  isEncrypted(text) {
    if (!text || typeof text !== 'string') return false;
    
    // Verificar se tem o formato IV:encrypted
    const parts = text.split(':');
    return parts.length === 2 && parts[0].length === 32; // IV em hex tem 32 caracteres
  }

  /**
   * Gerar hash para busca segura
   */
  generateSearchHash(text, userId) {
    if (!text || !userId) return null;
    
    try {
      const key = this.generateUserKey(userId);
      return crypto
        .createHmac('sha256', key)
        .update(text.toLowerCase())
        .digest('hex');
    } catch (error) {
      console.error('❌ Erro ao gerar hash de busca:', error);
      return null;
    }
  }
}

module.exports = new NoteCryptoService();
