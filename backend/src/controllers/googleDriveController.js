const GoogleDriveService = require('../services/googleDriveService');
const { User } = require('../models');

class GoogleDriveController {
  /**
   * Gerar URL de autorização
   */
  static async getAuthUrl(req, res) {
    try {
      const userId = req.user.id;
      
      console.log('🔗 Gerando URL de autorização Google Drive...');
      console.log('👤 Usuário:', userId);

      const authUrl = GoogleDriveService.generateAuthUrl(userId);

      res.json({
        success: true,
        data: {
          authUrl,
          provider: 'google_drive'
        },
        message: 'URL de autorização gerada com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao gerar URL de autorização:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Processar callback OAuth
   */
  static async processOAuthCallback(req, res) {
    try {
      const { code, state } = req.query;
      const userId = req.user.id;

      console.log('🔄 Processando callback Google Drive...');
      console.log('👤 Usuário:', userId);

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Código de autorização não fornecido',
          code: 'MISSING_CODE'
        });
      }

      // Trocar código por tokens
      const tokens = await GoogleDriveService.exchangeCodeForTokens(code);

      // Salvar tokens no banco (você pode criar uma tabela para isso)
      // Por enquanto, vamos retornar os tokens para o frontend salvar
      console.log('✅ OAuth Google Drive processado com sucesso');

      res.json({
        success: true,
        data: {
          tokens,
          provider: 'google_drive'
        },
        message: 'Autorização Google Drive realizada com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao processar callback:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Upload de backup
   */
  static async uploadBackup(req, res) {
    try {
      const { backupData, filename, tokens } = req.body;
      const userId = req.user.id;

      console.log('📤 Fazendo upload de backup para Google Drive...');
      console.log('👤 Usuário:', userId);

      if (!backupData || !filename || !tokens) {
        return res.status(400).json({
          success: false,
          message: 'Dados do backup, nome do arquivo e tokens são obrigatórios',
          code: 'MISSING_DATA'
        });
      }

      // Fazer upload para Google Drive
      const result = await GoogleDriveService.uploadFile(
        tokens,
        filename,
        backupData,
        'application/octet-stream'
      );

      console.log('✅ Backup enviado para Google Drive com sucesso');

      res.json({
        success: true,
        data: result,
        message: 'Backup enviado para Google Drive com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao fazer upload:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Listar backups
   */
  static async listBackups(req, res) {
    try {
      const { tokens } = req.body;
      const userId = req.user.id;

      console.log('📋 Listando backups do Google Drive...');
      console.log('👤 Usuário:', userId);

      if (!tokens) {
        return res.status(400).json({
          success: false,
          message: 'Tokens são obrigatórios',
          code: 'MISSING_TOKENS'
        });
      }

      // Listar arquivos de backup
      const files = await GoogleDriveService.listBackupFiles(tokens);

      console.log('✅ Backups listados com sucesso');

      res.json({
        success: true,
        data: {
          files,
          total: files.length
        },
        message: 'Backups listados com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao listar backups:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Download de backup
   */
  static async downloadBackup(req, res) {
    try {
      const { fileId, tokens } = req.body;
      const userId = req.user.id;

      console.log('📥 Fazendo download de backup do Google Drive...');
      console.log('👤 Usuário:', userId);

      if (!fileId || !tokens) {
        return res.status(400).json({
          success: false,
          message: 'ID do arquivo e tokens são obrigatórios',
          code: 'MISSING_DATA'
        });
      }

      // Download do arquivo
      const fileContent = await GoogleDriveService.downloadFile(tokens, fileId);

      console.log('✅ Backup baixado do Google Drive com sucesso');

      res.json({
        success: true,
        data: {
          fileContent,
          fileId
        },
        message: 'Backup baixado com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao fazer download:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Deletar backup
   */
  static async deleteBackup(req, res) {
    try {
      const { fileId, tokens } = req.body;
      const userId = req.user.id;

      console.log('🗑️ Deletando backup do Google Drive...');
      console.log('👤 Usuário:', userId);

      if (!fileId || !tokens) {
        return res.status(400).json({
          success: false,
          message: 'ID do arquivo e tokens são obrigatórios',
          code: 'MISSING_DATA'
        });
      }

      // Deletar arquivo
      await GoogleDriveService.deleteFile(tokens, fileId);

      console.log('✅ Backup deletado do Google Drive com sucesso');

      res.json({
        success: true,
        message: 'Backup deletado com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao deletar backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = GoogleDriveController;
