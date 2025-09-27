const crypto = require('crypto');
const argon2 = require('argon2');

class CryptoService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
  }

  /**
   * Deriva uma chave de criptografia da senha mestre usando Argon2id
   * @param {string} masterPassword - Senha mestre do usuário
   * @param {string} salt - Salt único para derivação
   * @returns {Promise<{key: Buffer, keyHash: string}>}
   */
  async deriveKey(masterPassword, salt) {
    try {
      // Converter salt de hex para Buffer se necessário
      const saltBuffer = Buffer.isBuffer(salt) ? salt : Buffer.from(salt, 'hex');
      
      // Derivar chave usando Argon2id
      const key = await argon2.hash(masterPassword, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64 MB
        timeCost: 3,
        parallelism: 1,
        salt: saltBuffer,
        hashLength: this.keyLength,
        raw: true // Retorna apenas a chave raw, não o hash completo
      });

      // A chave já está no formato correto (Buffer)
      const keyBuffer = key;
      
      // Criar hash da chave para armazenamento
      const keyHash = crypto.createHash('sha256').update(keyBuffer).digest('hex');

      return {
        key: keyBuffer,
        keyHash: keyHash
      };
    } catch (error) {
      console.error('Erro ao derivar chave:', error);
      throw new Error('Falha na derivação da chave de criptografia');
    }
  }

  /**
   * Gera um salt aleatório
   * @returns {string} Salt em formato hex
   */
  generateSalt() {
    return crypto.randomBytes(this.saltLength).toString('hex');
  }

  /**
   * Gera um IV (Initialization Vector) aleatório
   * @returns {string} IV em formato hex
   */
  generateIV() {
    return crypto.randomBytes(this.ivLength).toString('hex');
  }

  /**
   * Criptografa um texto usando AES-256-GCM
   * @param {string} text - Texto a ser criptografado
   * @param {Buffer} key - Chave de criptografia
   * @param {string} iv - Vetor de inicialização
   * @returns {string} Texto criptografado em formato hex
   */
  encrypt(text, key, iv) {
    try {
      if (!text) return null;

      const ivBuffer = Buffer.from(iv, 'hex');
      const cipher = crypto.createCipheriv(this.algorithm, key, ivBuffer);
      cipher.setAAD(Buffer.from('password-manager', 'utf8')); // Additional Authenticated Data

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combinar IV + tag + dados criptografados
      return ivBuffer.toString('hex') + tag.toString('hex') + encrypted;
    } catch (error) {
      console.error('Erro ao criptografar:', error);
      throw new Error('Falha na criptografia');
    }
  }

  /**
   * Descriptografa um texto usando AES-256-GCM
   * @param {string} encryptedText - Texto criptografado
   * @param {Buffer} key - Chave de descriptografia
   * @returns {string} Texto descriptografado
   */
  decrypt(encryptedText, key) {
    try {
      if (!encryptedText) return null;

      // Extrair IV, tag e dados criptografados
      const ivHex = encryptedText.substring(0, this.ivLength * 2);
      const tagHex = encryptedText.substring(this.ivLength * 2, (this.ivLength + this.tagLength) * 2);
      const encryptedHex = encryptedText.substring((this.ivLength + this.tagLength) * 2);

      const ivBuffer = Buffer.from(ivHex, 'hex');
      const tagBuffer = Buffer.from(tagHex, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, key, ivBuffer);
      decipher.setAAD(Buffer.from('password-manager', 'utf8'));
      decipher.setAuthTag(tagBuffer);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar:', error);
      throw new Error('Falha na descriptografia');
    }
  }

  /**
   * Criptografa múltiplos campos de uma credencial
   * @param {Object} credentialData - Dados da credencial
   * @param {string} masterPassword - Senha mestre
   * @returns {Promise<Object>} Dados criptografados com metadados
   */
  async encryptCredential(credentialData, masterPassword) {
    try {
      const salt = this.generateSalt();
      const { key, keyHash } = await this.deriveKey(masterPassword, salt);
      const iv = this.generateIV();

      const encryptedData = {
        encryptedUsername: this.encrypt(credentialData.username, key, iv),
        encryptedPassword: this.encrypt(credentialData.password, key, iv),
        encryptedNotes: this.encrypt(credentialData.notes, key, iv),
        encryptionKey: keyHash,
        iv: iv,
        salt: salt
      };

      return encryptedData;
    } catch (error) {
      console.error('Erro ao criptografar credencial:', error);
      throw new Error('Falha na criptografia da credencial');
    }
  }

  /**
   * Descriptografa uma credencial
   * @param {Object} encryptedCredential - Credencial criptografada
   * @param {string} masterPassword - Senha mestre
   * @returns {Promise<Object>} Credencial descriptografada
   */
  async decryptCredential(encryptedCredential, masterPassword) {
    try {
      const { key } = await this.deriveKey(masterPassword, encryptedCredential.salt);

      const decryptedData = {
        username: this.decrypt(encryptedCredential.encryptedUsername, key),
        password: this.decrypt(encryptedCredential.encryptedPassword, key),
        notes: this.decrypt(encryptedCredential.encryptedNotes, key)
      };

      return decryptedData;
    } catch (error) {
      console.error('Erro ao descriptografar credencial:', error);
      throw new Error('Falha na descriptografia da credencial');
    }
  }

  /**
   * Verifica se a senha mestre está correta
   * @param {string} masterPassword - Senha mestre fornecida
   * @param {string} storedKeyHash - Hash da chave armazenado
   * @param {string} salt - Salt usado na derivação
   * @returns {Promise<boolean>} True se a senha está correta
   */
  async verifyMasterPassword(masterPassword, storedKeyHash, salt) {
    try {
      const { keyHash } = await this.deriveKey(masterPassword, salt);
      return keyHash === storedKeyHash;
    } catch (error) {
      console.error('Erro ao verificar senha mestre:', error);
      return false;
    }
  }

  /**
   * Gera uma senha forte aleatória
   * @param {Object} options - Opções de geração
   * @returns {string} Senha gerada
   */
  generatePassword(options = {}) {
    const {
      length = 16,
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSymbols = true,
      excludeSimilar = true
    } = options;

    let charset = '';
    
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    if (excludeSimilar) {
      charset = charset.replace(/[0O1lI]/g, ''); // Remover caracteres similares
    }

    if (charset.length === 0) {
      throw new Error('Pelo menos um tipo de caractere deve ser incluído');
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(crypto.randomInt(0, charset.length));
    }

    return password;
  }

  /**
   * Calcula a força de uma senha
   * @param {string} password - Senha a ser analisada
   * @returns {Object} Informações sobre a força da senha
   */
  analyzePasswordStrength(password) {
    const analysis = {
      score: 0,
      feedback: [],
      strength: 'Muito fraca'
    };

    if (!password) return analysis;

    // Critérios de força
    if (password.length >= 8) analysis.score += 1;
    if (password.length >= 12) analysis.score += 1;
    if (password.length >= 16) analysis.score += 1;
    
    if (/[a-z]/.test(password)) analysis.score += 1;
    if (/[A-Z]/.test(password)) analysis.score += 1;
    if (/[0-9]/.test(password)) analysis.score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) analysis.score += 1;

    // Verificar padrões comuns
    if (/(.)\1{2,}/.test(password)) {
      analysis.feedback.push('Evite caracteres repetidos');
    }
    if (/123|abc|qwe/i.test(password)) {
      analysis.feedback.push('Evite sequências comuns');
    }
    if (/password|senha|123456/i.test(password)) {
      analysis.feedback.push('Evite senhas óbvias');
    }

    // Determinar força
    if (analysis.score >= 7) analysis.strength = 'Muito forte';
    else if (analysis.score >= 5) analysis.strength = 'Forte';
    else if (analysis.score >= 3) analysis.strength = 'Média';
    else if (analysis.score >= 1) analysis.strength = 'Fraca';

    return analysis;
  }
}

module.exports = new CryptoService();
