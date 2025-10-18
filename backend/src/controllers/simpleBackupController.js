const SimpleBackupService = require('../services/simpleBackupService');
const SimpleGoogleDriveService = require('../services/simpleGoogleDriveService');
const AutoGoogleDriveService = require('../services/autoGoogleDriveService');

class SimpleBackupController {
  /**
   * Gerar arquivo de backup
   */
  static async generateBackup(req, res) {
    try {
      const { masterPassword } = req.body;
      const userId = req.user.id;

      console.log('📦 Iniciando geração de backup...');
      console.log('👤 Usuário:', userId);

      if (!masterPassword) {
        return res.status(400).json({
          success: false,
          message: 'Senha mestra é obrigatória',
          code: 'MISSING_MASTER_PASSWORD'
        });
      }

      const backup = await SimpleBackupService.generateBackup(userId, masterPassword);

      // Tentar upload automático para Google Drive
      let autoUploadResult = null;
      if (req.user.email) {
        try {
          autoUploadResult = await AutoGoogleDriveService.processAutoBackup(
            req.user.email,
            backup.data,
            backup.filename
          );
          console.log('🔄 Resultado do upload automático:', autoUploadResult.success ? 'Sucesso' : 'Falhou');
        } catch (error) {
          console.log('⚠️ Upload automático falhou, continuando com backup normal');
        }
      }

      // Gerar instruções para Google Drive (fallback)
      const driveInstructions = SimpleGoogleDriveService.generateBackupInstructions(
        backup.filename,
        backup.data
      );

      console.log('✅ Backup gerado com sucesso');

      res.json({
        success: true,
        data: {
          filename: backup.filename,
          filePath: backup.filePath,
          backupData: backup.data,
          metadata: backup.metadata,
          autoUpload: autoUploadResult,
          driveInstructions: driveInstructions
        },
        message: autoUploadResult?.success 
          ? 'Backup enviado automaticamente para o Google Drive!' 
          : 'Backup gerado com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao gerar backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Restaurar backup
   */
  static async restoreBackup(req, res) {
    try {
      const { backupData, masterPassword } = req.body;
      const userId = req.user.id;

      console.log('🔄 Iniciando restauração de backup...');
      console.log('👤 Usuário:', userId);

      if (!backupData || !masterPassword) {
        return res.status(400).json({
          success: false,
          message: 'Dados do backup e senha mestra são obrigatórios',
          code: 'MISSING_DATA'
        });
      }

      const result = await SimpleBackupService.restoreBackup(userId, backupData, masterPassword);

      console.log('✅ Backup restaurado com sucesso');

      res.json({
        success: true,
        data: result,
        message: 'Backup restaurado com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      
      if (error.message.includes('Senha mestra incorreta')) {
        return res.status(400).json({
          success: false,
          message: 'Senha mestra incorreta',
          code: 'INVALID_MASTER_PASSWORD'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Validar backup (sem restaurar)
   */
  static async validateBackup(req, res) {
    try {
      const { backupData, masterPassword } = req.body;

      console.log('🔍 Validando backup...');

      if (!backupData || !masterPassword) {
        return res.status(400).json({
          success: false,
          message: 'Dados do backup e senha mestra são obrigatórios',
          code: 'MISSING_DATA'
        });
      }

      const decryptedData = SimpleBackupService.decryptBackup(backupData, masterPassword);

      console.log('✅ Backup válido');

      res.json({
        success: true,
        data: {
          version: decryptedData.version,
          timestamp: decryptedData.timestamp,
          user: decryptedData.user,
          metadata: decryptedData.metadata
        },
        message: 'Backup válido'
      });

    } catch (error) {
      console.error('❌ Erro ao validar backup:', error);
      
      if (error.message.includes('Senha mestra incorreta')) {
        return res.status(400).json({
          success: false,
          message: 'Senha mestra incorreta',
          code: 'INVALID_MASTER_PASSWORD'
        });
      }

      res.status(400).json({
        success: false,
        message: 'Arquivo de backup inválido ou corrompido',
        code: 'INVALID_BACKUP'
      });
    }
  }

  /**
   * Restaurar backup de arquivo
   */
  static async restoreBackupFromFile(req, res) {
    try {
      const { filePath, masterPassword } = req.body;
      const userId = req.user.id;

      console.log('🔄 Iniciando restauração de backup de arquivo...');
      console.log('👤 Usuário:', userId);
      console.log('📁 Arquivo:', filePath);

      if (!filePath || !masterPassword) {
        return res.status(400).json({
          success: false,
          message: 'Caminho do arquivo e senha mestra são obrigatórios',
          code: 'MISSING_DATA'
        });
      }

      // Ler arquivo de backup
      const backupData = await SimpleBackupService.readBackupFile(filePath);

      // Restaurar backup
      const result = await SimpleBackupService.restoreBackup(userId, backupData, masterPassword);

      console.log('✅ Backup restaurado com sucesso');

      res.json({
        success: true,
        data: result,
        message: 'Backup restaurado com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      
      if (error.message.includes('Senha mestra incorreta')) {
        return res.status(400).json({
          success: false,
          message: 'Senha mestra incorreta',
          code: 'INVALID_MASTER_PASSWORD'
        });
      }

      if (error.message.includes('Arquivo de backup não encontrado')) {
        return res.status(400).json({
          success: false,
          message: 'Arquivo de backup não encontrado',
          code: 'FILE_NOT_FOUND'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Upload e restaurar backup de arquivo
   */
  static async uploadAndRestoreBackup(req, res) {
    try {
      const { masterPassword } = req.body;
      const userId = req.user.id;

      console.log('🔄 Iniciando upload e restauração de backup...');
      console.log('👤 Usuário:', userId);

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Arquivo de backup é obrigatório',
          code: 'MISSING_FILE'
        });
      }

      if (!masterPassword) {
        return res.status(400).json({
          success: false,
          message: 'Senha mestra é obrigatória',
          code: 'MISSING_MASTER_PASSWORD'
        });
      }

      // Ler conteúdo do arquivo
      const backupData = req.file.buffer.toString('utf8');
      console.log('📖 Arquivo de backup lido:', req.file.originalname);

      // Restaurar backup
      const result = await SimpleBackupService.restoreBackup(userId, backupData, masterPassword);

      console.log('✅ Backup restaurado com sucesso');

      res.json({
        success: true,
        data: result,
        message: 'Backup restaurado com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      
      if (error.message.includes('Senha mestra incorreta')) {
        return res.status(400).json({
          success: false,
          message: 'Senha mestra incorreta',
          code: 'INVALID_MASTER_PASSWORD'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = SimpleBackupController;
