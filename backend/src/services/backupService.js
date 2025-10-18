const { User, Credential, Note, TwoFactorAuth } = require('../models');
const BackupCryptoService = require('./backupCryptoService');
const CloudProviderService = require('./cloudProviderService');

class BackupService {
  /**
   * Criar backup completo dos dados do usuário
   */
  async createBackup(userId, provider, accessToken, masterPassword) {
    try {
      console.log('🔄 Iniciando backup para usuário:', userId);
      console.log('🔄 Provedor:', provider);

      // 1. Coletar todos os dados do usuário
      const userData = await this._collectUserData(userId);
      console.log('📊 Dados coletados:', {
        credentials: userData.credentials.length,
        notes: userData.notes.length,
        twoFactor: userData.twoFactor ? 'Configurado' : 'Não configurado'
      });

      // 2. Gerar chave de criptografia
      const encryptionKey = BackupCryptoService.generateEncryptionKey();
      console.log('🔐 Chave de criptografia gerada');

      // 3. Criptografar dados
      const encryptedData = await BackupCryptoService.encryptBackupData(userData, encryptionKey);
      console.log('🔐 Dados criptografados');

      // 4. Criptografar chave de criptografia com senha mestra
      const encryptedKey = BackupCryptoService.encryptEncryptionKey(encryptionKey, userId, masterPassword);
      console.log('🔐 Chave de criptografia protegida');

      // 5. Preparar dados finais do backup
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        userId,
        data: encryptedData,
        encryptionKey: encryptedKey.encrypted,
        metadata: {
          credentialsCount: userData.credentials.length,
          notesCount: userData.notes.length,
          hasTwoFactor: !!userData.twoFactor,
          backupVersion: 1
        }
      };

      // 6. Calcular checksum
      const backupJson = JSON.stringify(backupData);
      const checksum = BackupCryptoService.calculateChecksum(backupJson);
      console.log('✅ Checksum calculado:', checksum.substring(0, 16) + '...');

      // 7. Gerar nome do arquivo
      const fileName = BackupCryptoService.generateBackupFileName(userId, provider);
      console.log('📁 Nome do arquivo:', fileName);

      // 8. Upload para o provedor de nuvem
      const uploadResult = await CloudProviderService.uploadFile(
        provider,
        accessToken,
        fileName,
        Buffer.from(backupJson, 'utf8'),
        {
          description: 'Password Manager Backup',
          appProperties: {
            app: 'password-manager',
            version: '1.0',
            checksum
          }
        }
      );

      console.log('☁️ Upload concluído:', uploadResult.fileId);

      return {
        success: true,
        data: {
          fileId: uploadResult.fileId,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.fileSize,
          checksum,
          version: 1,
          metadata: backupData.metadata,
          createdAt: uploadResult.createdTime
        }
      };

    } catch (error) {
      console.error('❌ Erro ao criar backup:', error);
      throw new Error(`Falha na criação do backup: ${error.message}`);
    }
  }

  /**
   * Restaurar backup dos dados do usuário
   */
  async restoreBackup(userId, provider, accessToken, fileId, masterPassword) {
    try {
      console.log('🔄 Iniciando restauração para usuário:', userId);
      console.log('🔄 Provedor:', provider);
      console.log('🔄 Arquivo:', fileId);

      // 1. Download do arquivo
      const fileData = await CloudProviderService.downloadFile(provider, accessToken, fileId);
      console.log('☁️ Download concluído, tamanho:', fileData.byteLength, 'bytes');

      // 2. Parse dos dados
      const backupData = JSON.parse(Buffer.from(fileData).toString('utf8'));
      console.log('📊 Backup versão:', backupData.version);

      // 3. Verificar checksum
      const expectedChecksum = backupData.checksum || this._calculateLegacyChecksum(backupData);
      const actualChecksum = BackupCryptoService.calculateChecksum(JSON.stringify(backupData));
      
      if (actualChecksum !== expectedChecksum) {
        throw new Error('Checksum inválido - arquivo pode estar corrompido');
      }
      console.log('✅ Checksum verificado');

      // 4. Descriptografar chave de criptografia
      const encryptionKey = BackupCryptoService.decryptEncryptionKey(
        backupData.encryptionKey,
        userId,
        masterPassword
      );
      console.log('🔐 Chave de criptografia descriptografada');

      // 5. Descriptografar dados
      const userData = await BackupCryptoService.decryptBackupData(backupData.data, encryptionKey);
      console.log('🔐 Dados descriptografados');

      // 6. Restaurar dados no banco
      await this._restoreUserData(userId, userData);
      console.log('✅ Dados restaurados no banco');

      return {
        success: true,
        data: {
          restoredAt: new Date().toISOString(),
          metadata: backupData.metadata,
          itemsRestored: {
            credentials: userData.credentials.length,
            notes: userData.notes.length,
            twoFactor: userData.twoFactor ? 'Restaurado' : 'Não restaurado'
          }
        }
      };

    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      throw new Error(`Falha na restauração do backup: ${error.message}`);
    }
  }

  /**
   * Coletar todos os dados do usuário
   */
  async _collectUserData(userId) {
    const [credentials, notes, twoFactor] = await Promise.all([
      Credential.findAll({
        where: { userId },
        attributes: ['id', 'title', 'username', 'password', 'url', 'category', 'notes', 'isFavorite', 'createdAt', 'updatedAt']
      }),
      Note.findAll({
        where: { userId },
        attributes: ['id', 'title', 'content', 'isSecure', 'tags', 'color', 'isFavorite', 'createdAt', 'updatedAt']
      }),
      TwoFactorAuth.findOne({
        where: { userId, isEnabled: true },
        attributes: ['id', 'method', 'isEnabled', 'isVerified', 'createdAt', 'updatedAt']
      })
    ]);

    return {
      credentials: credentials.map(c => c.toJSON()),
      notes: notes.map(n => n.toJSON()),
      twoFactor: twoFactor ? twoFactor.toJSON() : null
    };
  }

  /**
   * Restaurar dados do usuário no banco
   */
  async _restoreUserData(userId, userData) {
    // Limpar dados existentes (opcional - pode ser configurável)
    await Promise.all([
      Credential.destroy({ where: { userId } }),
      Note.destroy({ where: { userId } })
    ]);

    // Restaurar credenciais
    if (userData.credentials && userData.credentials.length > 0) {
      const credentialsToCreate = userData.credentials.map(cred => ({
        ...cred,
        userId,
        id: undefined // Deixar o banco gerar novos IDs
      }));
      await Credential.bulkCreate(credentialsToCreate);
    }

    // Restaurar notas
    if (userData.notes && userData.notes.length > 0) {
      const notesToCreate = userData.notes.map(note => ({
        ...note,
        userId,
        id: undefined // Deixar o banco gerar novos IDs
      }));
      await Note.bulkCreate(notesToCreate);
    }

    // Nota: 2FA não é restaurado por segurança
    console.log('⚠️ 2FA não foi restaurado por motivos de segurança');
  }

  /**
   * Calcular checksum para backups legados
   */
  _calculateLegacyChecksum(backupData) {
    // Para compatibilidade com backups antigos
    const dataToHash = JSON.stringify({
      version: backupData.version,
      timestamp: backupData.timestamp,
      userId: backupData.userId,
      metadata: backupData.metadata
    });
    return BackupCryptoService.calculateChecksum(dataToHash);
  }

  /**
   * Validar integridade do backup
   */
  async validateBackup(provider, accessToken, fileId) {
    try {
      const fileData = await CloudProviderService.downloadFile(provider, accessToken, fileId);
      const backupData = JSON.parse(Buffer.from(fileData).toString('utf8'));
      
      const expectedChecksum = backupData.checksum || this._calculateLegacyChecksum(backupData);
      const actualChecksum = BackupCryptoService.calculateChecksum(JSON.stringify(backupData));
      
      return {
        isValid: actualChecksum === expectedChecksum,
        checksum: actualChecksum,
        expectedChecksum,
        metadata: backupData.metadata,
        version: backupData.version
      };
    } catch (error) {
      console.error('❌ Erro ao validar backup:', error);
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Listar backups disponíveis
   */
  async listBackups(provider, accessToken) {
    // Esta funcionalidade seria implementada com APIs específicas de cada provedor
    // Por simplicidade, retornamos uma lista vazia
    return {
      success: true,
      data: {
        backups: [],
        provider,
        message: 'Listagem de backups será implementada com APIs específicas'
      }
    };
  }
}

module.exports = new BackupService();
