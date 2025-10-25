const crypto = require('crypto');
const { User, Credential, Note, CredentialVersion } = require('../models');

class SimpleBackupService {
  /**
   * Gerar backup criptografado de todos os dados do usuário
   */
  static async generateBackup(userId, masterPassword) {
    try {
      console.log('📦 Gerando backup para usuário:', userId);

      // Buscar todos os dados do usuário
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password', 'twoFactorSecret', 'backupCodes'] }
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Buscar credenciais (incluindo dados de criptografia)
      const credentials = await Credential.findAll({
        where: { userId, isActive: true }
      });

      const versions = await CredentialVersion.findAll({
        where: { userId }
      });

      // Buscar notas
      const notes = await Note.findAll({
        where: { userId },
        attributes: ['id', 'title', 'content', 'isSecure', 'tags', 'isFavorite', 'color', 'createdAt', 'updatedAt']
      });

      // Criar estrutura do backup
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt
        },
        credentials: credentials.map(cred => ({
          id: cred.id,
          title: cred.title,
          description: cred.description,
          category: cred.category,
          username: cred.encryptedUsername,
          password: cred.encryptedPassword,
          notes: cred.encryptedNotes,
          isFavorite: cred.isFavorite,
          // Preservar dados de criptografia originais
          encryptionKey: cred.encryptionKey,
          iv: cred.iv,
          salt: cred.salt,
          createdAt: cred.createdAt,
          updatedAt: cred.updatedAt
        })),
        versions: versions.map(v => ({
          id: v.id,
          credentialId: v.credentialId,
          version: v.version,
          title: v.title,
          description: v.description,
          category: v.category,
          isFavorite: v.isFavorite,
          isActive: v.isActive,
          username: v.encryptedUsername,
          password: v.encryptedPassword,
          notes: v.encryptedNotes,
          encryptionKey: v.encryptionKey,
          iv: v.iv,
          salt: v.salt,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt
        })),
        notes: notes.map(note => ({
          id: note.id,
          title: note.title,
          content: note.content, // Nota: conteúdo já criptografado se isSecure=true
          isSecure: note.isSecure,
          tags: note.tags,
          isFavorite: note.isFavorite,
          color: note.color,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        })),
        metadata: {
          totalCredentials: credentials.length,
          totalVersions: versions.length,
          totalNotes: notes.length,
          backupSize: 0 // Será calculado após criptografia
        }
      };

      // Criptografar o backup
      const encryptedBackup = this.encryptBackup(JSON.stringify(backupData), masterPassword);

      // Atualizar tamanho do backup
      backupData.metadata.backupSize = encryptedBackup.length;

      console.log('✅ Backup gerado com sucesso');
      console.log('📊 Estatísticas:', {
        credentials: credentials.length,
        notes: notes.length,
        size: encryptedBackup.length
      });

      // Criar arquivo temporário
      const fs = require('fs');
      const path = require('path');
      
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const filename = `backup_${user.email}_${new Date().toISOString().split('T')[0]}.encrypted`;
      const filePath = path.join(tempDir, filename);
      
      // Salvar arquivo APENAS com o conteúdo criptografado
      fs.writeFileSync(filePath, encryptedBackup, 'utf8');

      return {
        filename,
        filePath,
        data: encryptedBackup,
        metadata: backupData.metadata
      };

    } catch (error) {
      console.error('❌ Erro ao gerar backup:', error);
      throw error;
    }
  }

  /**
   * Criptografar dados do backup
   */
  static encryptBackup(data, masterPassword) {
    try {
      // Gerar chave derivada da senha mestra
      const salt = crypto.randomBytes(32);
      const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');
      
      // Gerar IV
      const iv = crypto.randomBytes(16);
      
      // Criptografar dados
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combinar salt + iv + dados criptografados
      const combined = Buffer.concat([
        salt,
        iv,
        Buffer.from(encrypted, 'hex')
      ]);
      
      return combined.toString('base64');
      
    } catch (error) {
      console.error('❌ Erro ao criptografar backup:', error);
      throw error;
    }
  }

  /**
   * Descriptografar backup
   */
  static decryptBackup(encryptedData, masterPassword) {
    try {
      // Decodificar base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extrair salt, iv e dados criptografados
      const salt = combined.slice(0, 32);
      const iv = combined.slice(32, 48);
      const encrypted = combined.slice(48);
      
      // Gerar chave derivada
      const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');
      
      // Descriptografar
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
      
    } catch (error) {
      console.error('❌ Erro ao descriptografar backup:', error);
      throw new Error('Senha mestra incorreta ou arquivo corrompido');
    }
  }

  /**
   * Restaurar backup
   */
  static async restoreBackup(userId, backupData, masterPassword) {
    try {
      console.log('🔄 Restaurando backup para usuário:', userId);

      // Descriptografar backup
      const decryptedData = this.decryptBackup(backupData, masterPassword);

      // Validar estrutura do backup
      if (!decryptedData.version || !decryptedData.credentials || !decryptedData.notes) {
        throw new Error('Formato de backup inválido');
      }

      // Restaurar credenciais
      let restoredCredentials = 0;
      const idMap = new Map();
      for (const credData of decryptedData.credentials) {
        try {
          const created = await Credential.create({
            userId,
            title: credData.title,
            description: credData.description,
            category: credData.category,
            encryptedUsername: credData.username,
            encryptedPassword: credData.password,
            encryptedNotes: credData.notes,
            isFavorite: credData.isFavorite,
            // Preservar dados de criptografia originais
            encryptionKey: credData.encryptionKey,
            iv: credData.iv,
            salt: credData.salt
          });
          restoredCredentials++;
          if (credData.id) {
            idMap.set(credData.id, created.id);
          }
        } catch (error) {
          console.warn('⚠️ Erro ao restaurar credencial:', credData.title, error.message);
        }
      }

      let restoredVersions = 0;
      if (Array.isArray(decryptedData.versions) && decryptedData.versions.length > 0) {
        const versionsToCreate = decryptedData.versions
          .map(v => ({
            credentialId: idMap.get(v.credentialId) || null,
            userId,
            version: v.version,
            title: v.title,
            description: v.description,
            category: v.category,
            isFavorite: v.isFavorite,
            isActive: v.isActive,
            encryptedUsername: v.username,
            encryptedPassword: v.password,
            encryptedNotes: v.notes,
            encryptionKey: v.encryptionKey,
            iv: v.iv,
            salt: v.salt,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt
          }))
          .filter(v => !!v.credentialId);

        if (versionsToCreate.length > 0) {
          await CredentialVersion.bulkCreate(versionsToCreate);
          restoredVersions = versionsToCreate.length;
        }
      }

      // Restaurar notas
      let restoredNotes = 0;
      for (const noteData of decryptedData.notes) {
        try {
          await Note.create({
            userId,
            title: noteData.title,
            content: noteData.content,
            isSecure: noteData.isSecure,
            tags: noteData.tags,
            isFavorite: noteData.isFavorite,
            color: noteData.color
          });
          restoredNotes++;
        } catch (error) {
          console.warn('⚠️ Erro ao restaurar nota:', noteData.title, error.message);
        }
      }

      console.log('✅ Backup restaurado com sucesso');
      console.log('📊 Estatísticas:', {
        credentials: restoredCredentials,
        versions: restoredVersions,
        notes: restoredNotes
      });

      return {
        success: true,
        restoredCredentials,
        restoredNotes,
        totalCredentials: decryptedData.credentials.length,
        totalVersions: Array.isArray(decryptedData.versions) ? decryptedData.versions.length : 0,
        totalNotes: decryptedData.notes.length
      };

    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      throw error;
    }
  }

  /**
   * Ler arquivo de backup
   */
  static async readBackupFile(filePath) {
    try {
      const fs = require('fs');
      
      if (!fs.existsSync(filePath)) {
        throw new Error('Arquivo de backup não encontrado');
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      console.log('📖 Arquivo de backup lido com sucesso');
      
      return fileContent;
      
    } catch (error) {
      console.error('❌ Erro ao ler arquivo de backup:', error);
      throw error;
    }
  }

  /**
   * Limpar arquivos temporários
   */
  static cleanupTempFiles() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const tempDir = path.join(__dirname, '../../temp');
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        files.forEach(file => {
          const filePath = path.join(tempDir, file);
          fs.unlinkSync(filePath);
        });
        console.log('🧹 Arquivos temporários limpos');
      }
    } catch (error) {
      console.error('❌ Erro ao limpar arquivos temporários:', error);
    }
  }
}

module.exports = SimpleBackupService;
