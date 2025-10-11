const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

class TwoFactorService {
  /**
   * Gerar segredo TOTP para um usuário
   */
  static generateTOTPSecret(userEmail) {
    const secret = speakeasy.generateSecret({
      name: `Password Manager (${userEmail})`,
      issuer: 'Password Manager',
      length: 32
    });
    
    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url
    };
  }

  /**
   * Gerar QR Code para TOTP
   */
  static async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataURL;
    } catch (error) {
      throw new Error('Erro ao gerar QR Code: ' + error.message);
    }
  }

  /**
   * Gerar código TOTP atual (para debug)
   */
  static generateCurrentTOTPCode(secret) {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const token = speakeasy.totp({
        secret: secret,
        encoding: 'base32',
        time: currentTime
      });
      console.log('🔧 Código TOTP atual gerado:', token);
      return token;
    } catch (error) {
      console.error('❌ Erro ao gerar código TOTP:', error);
      return null;
    }
  }

  /**
   * Verificar código TOTP
   */
  static verifyTOTPCode(secret, token, window = 2) {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      console.log('🔧 Verificando TOTP - Tempo atual:', currentTime);
      console.log('🔧 Verificando TOTP - Token:', token);
      console.log('🔧 Verificando TOTP - Secret (primeiros 10):', secret.substring(0, 10));
      console.log('🔧 Verificando TOTP - Window:', window);
      
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: window, // Permite 2 janelas de tempo (60 segundos)
        time: currentTime
      });
      
      console.log('🔧 Resultado da verificação:', verified);
      
      // Se falhou, tentar com janela maior
      if (!verified && window < 5) {
        console.log('🔧 Tentando com janela maior...');
        const verifiedWithLargerWindow = speakeasy.totp.verify({
          secret: secret,
          encoding: 'base32',
          token: token,
          window: 5, // Janela maior
          time: currentTime
        });
        console.log('🔧 Resultado com janela maior:', verifiedWithLargerWindow);
        return verifiedWithLargerWindow;
      }
      
      return verified;
    } catch (error) {
      console.error('❌ Erro ao verificar código TOTP:', error);
      return false;
    }
  }

  /**
   * Gerar códigos de recuperação
   */
  static generateRecoveryCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Gerar códigos de 8 caracteres alfanuméricos
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Criptografar segredo TOTP
   */
  static encryptSecret(secret, masterKey) {
    try {
      // Criar hash da chave mestre
      const key = crypto.createHash('sha256').update(masterKey).digest();
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(secret, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Retornar IV + dados criptografados
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Erro ao criptografar segredo:', error);
      throw new Error('Erro ao criptografar segredo: ' + error.message);
    }
  }

  /**
   * Descriptografar segredo TOTP
   */
  static decryptSecret(encryptedSecret, masterKey) {
    try {
      // Separar IV e dados criptografados
      const parts = encryptedSecret.split(':');
      if (parts.length !== 2) {
        throw new Error('Formato de segredo criptografado inválido');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      // Criar hash da chave mestre
      const key = crypto.createHash('sha256').update(masterKey).digest();
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar segredo:', error);
      throw new Error('Erro ao descriptografar segredo: ' + error.message);
    }
  }

  /**
   * Criptografar códigos de recuperação
   */
  static encryptRecoveryCodes(codes, masterKey) {
    try {
      // Criar hash da chave mestre
      const key = crypto.createHash('sha256').update(masterKey).digest();
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(JSON.stringify(codes), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Retornar IV + dados criptografados
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Erro ao criptografar códigos de recuperação:', error);
      throw new Error('Erro ao criptografar códigos de recuperação: ' + error.message);
    }
  }

  /**
   * Descriptografar códigos de recuperação
   */
  static decryptRecoveryCodes(encryptedCodes, masterKey) {
    try {
      // Separar IV e dados criptografados
      const parts = encryptedCodes.split(':');
      if (parts.length !== 2) {
        throw new Error('Formato de códigos criptografados inválido');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      // Criar hash da chave mestre
      const key = crypto.createHash('sha256').update(masterKey).digest();
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Erro ao descriptografar códigos de recuperação:', error);
      throw new Error('Erro ao descriptografar códigos de recuperação: ' + error.message);
    }
  }

  /**
   * Verificar código de recuperação
   */
  static verifyRecoveryCode(encryptedCodes, code, masterKey) {
    try {
      const codes = this.decryptRecoveryCodes(encryptedCodes, masterKey);
      const index = codes.indexOf(code.toUpperCase());
      
      if (index !== -1) {
        // Remover código usado
        codes.splice(index, 1);
        return {
          valid: true,
          remainingCodes: codes
        };
      }
      
      return { valid: false, remainingCodes: codes };
    } catch (error) {
      console.error('Erro ao verificar código de recuperação:', error);
      return { valid: false, remainingCodes: [] };
    }
  }

  /**
   * Gerar código SMS aleatório
   */
  static generateSMSCode(length = 6) {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  }

  /**
   * Validar formato de telefone
   */
  static validatePhoneNumber(phoneNumber) {
    // Regex para validar formato internacional
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Formatar número de telefone
   */
  static formatPhoneNumber(phoneNumber) {
    // Remove todos os caracteres não numéricos
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Adiciona + se não tiver
    if (!cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return cleaned;
  }
}

module.exports = TwoFactorService;
