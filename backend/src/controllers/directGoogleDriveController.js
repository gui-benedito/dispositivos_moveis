const DirectGoogleDriveService = require('../services/directGoogleDriveService');
const SimpleBackupService = require('../services/simpleBackupService');

class DirectGoogleDriveController {
  /**
   * Gerar URL de autorização
   */
  static async getAuthUrl(req, res) {
    try {
      console.log('🔗 Gerando URL de autorização...');
      
      const authUrl = DirectGoogleDriveService.generateSimpleAuthUrl();

      res.json({
        success: true,
        data: {
          authUrl
        },
        message: 'URL de autorização gerada'
      });

    } catch (error) {
      console.error('❌ Erro ao gerar URL:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Processar callback e fazer upload direto
   */
  static async processCallbackAndUpload(req, res) {
    try {
      const { code, masterPassword } = req.body;
      const userId = req.user.id;

      console.log('🔄 Processando callback e fazendo upload direto...');
      console.log('👤 Usuário:', userId);

      if (!code || !masterPassword) {
        return res.status(400).json({
          success: false,
          message: 'Código de autorização e senha mestra são obrigatórios',
          code: 'MISSING_DATA'
        });
      }

      // 1. Trocar código por tokens
      const tokens = await DirectGoogleDriveService.exchangeCodeForTokens(code);

      // 2. Gerar backup
      const backup = await SimpleBackupService.generateBackup(userId, masterPassword);

      // 3. Upload direto para Google Drive
      const uploadResult = await DirectGoogleDriveService.uploadDirectly(
        tokens,
        backup.filename,
        backup.data
      );

      console.log('✅ Backup enviado diretamente para Google Drive');

      res.json({
        success: true,
        data: {
          backup: {
            filename: backup.filename,
            metadata: backup.metadata
          },
          upload: uploadResult
        },
        message: 'Backup enviado diretamente para o Google Drive com sucesso!'
      });

    } catch (error) {
      console.error('❌ Erro no processo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Listar backups do Google Drive
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

      const files = await DirectGoogleDriveService.listBackupFiles(tokens);

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
}

module.exports = DirectGoogleDriveController;
