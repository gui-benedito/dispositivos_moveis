const { User } = require('../models');
const BackupService = require('../services/backupService');
const CloudProviderService = require('../services/cloudProviderService');
const cryptoService = require('../services/cryptoService');

class BackupController {
  /**
   * Obter URL de autorização OAuth
   */
  static async getAuthUrl(req, res) {
    try {
      const { provider } = req.body;
      const userId = req.user.id;

      console.log('🔗 Gerando URL de autorização...');
      console.log('🔗 Provedor:', provider);
      console.log('🔗 Usuário:', userId);

      if (!provider) {
        return res.status(400).json({
          success: false,
          message: 'Provedor é obrigatório',
          code: 'MISSING_PROVIDER'
        });
      }

      const { authUrl, state } = CloudProviderService.getAuthUrl(provider, userId);

      console.log('✅ URL de autorização gerada');
      console.log('🔗 URL:', authUrl);

      res.json({
        success: true,
        data: {
          authUrl,
          state,
          provider
        }
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
   * Processar callback OAuth e criar backup
   */
  static async processOAuthCallback(req, res) {
    try {
      const { code, state, provider, masterPassword } = req.body;
      const userId = req.user.id;

      console.log('🔄 Processando callback OAuth...');
      console.log('🔄 Provedor:', provider);
      console.log('🔄 Usuário:', userId);

      if (!code || !state || !provider || !masterPassword) {
        return res.status(400).json({
          success: false,
          message: 'Código, state, provedor e senha mestra são obrigatórios',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // 1. Validar senha mestra centralizada
      const user = await User.findByPk(userId);
      if (!user || !user.masterKeyHash || !user.masterKeySalt) {
        return res.status(400).json({
          success: false,
          message: 'Senha mestra não configurada',
          code: 'MASTER_PASSWORD_NOT_CONFIGURED'
        });
      }

      const isValidMaster = await cryptoService.verifyMasterPassword(
        masterPassword,
        user.masterKeyHash,
        user.masterKeySalt
      );

      if (!isValidMaster) {
        return res.status(401).json({
          success: false,
          message: 'Senha mestra incorreta',
          code: 'INVALID_MASTER_PASSWORD'
        });
      }

      // 2. Trocar código por token
      const tokenData = await CloudProviderService.exchangeCodeForToken(provider, code, state);
      console.log('✅ Token obtido com sucesso');

      // 3. Criar backup
      const backupResult = await BackupService.createBackup(
        userId,
        provider,
        tokenData.accessToken,
        masterPassword
      );

      console.log('✅ Backup criado com sucesso');

      res.json({
        success: true,
        message: 'Backup criado com sucesso',
        data: {
          ...backupResult.data,
          provider,
          accessToken: tokenData.accessToken, // Em produção, salvar no banco
          refreshToken: tokenData.refreshToken
        }
      });

    } catch (error) {
      console.error('❌ Erro no callback OAuth:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Criar backup direto (com token já existente)
   */
  static async createBackup(req, res) {
    try {
      const { provider, accessToken, masterPassword } = req.body;
      const userId = req.user.id;

      console.log('🔄 Criando backup direto...');
      console.log('🔄 Provedor:', provider);
      console.log('🔄 Usuário:', userId);

      if (!provider || !accessToken || !masterPassword) {
        return res.status(400).json({
          success: false,
          message: 'Provedor, token de acesso e senha mestra são obrigatórios',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Validar senha mestra centralizada
      const user = await User.findByPk(userId);
      if (!user || !user.masterKeyHash || !user.masterKeySalt) {
        return res.status(400).json({
          success: false,
          message: 'Senha mestra não configurada',
          code: 'MASTER_PASSWORD_NOT_CONFIGURED'
        });
      }

      const isValidMaster = await cryptoService.verifyMasterPassword(
        masterPassword,
        user.masterKeyHash,
        user.masterKeySalt
      );

      if (!isValidMaster) {
        return res.status(401).json({
          success: false,
          message: 'Senha mestra incorreta',
          code: 'INVALID_MASTER_PASSWORD'
        });
      }

      const backupResult = await BackupService.createBackup(
        userId,
        provider,
        accessToken,
        masterPassword
      );

      console.log('✅ Backup criado com sucesso');

      res.json({
        success: true,
        message: 'Backup criado com sucesso',
        data: backupResult.data
      });

    } catch (error) {
      console.error('❌ Erro ao criar backup:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Restaurar backup
   */
  static async restoreBackup(req, res) {
    try {
      const { provider, accessToken, fileId, masterPassword } = req.body;
      const userId = req.user.id;

      console.log('🔄 Restaurando backup...');
      console.log('🔄 Provedor:', provider);
      console.log('🔄 Arquivo:', fileId);
      console.log('🔄 Usuário:', userId);

      if (!provider || !accessToken || !fileId || !masterPassword) {
        return res.status(400).json({
          success: false,
          message: 'Provedor, token de acesso, ID do arquivo e senha mestra são obrigatórios',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Validar senha mestra centralizada
      const user = await User.findByPk(userId);
      if (!user || !user.masterKeyHash || !user.masterKeySalt) {
        return res.status(400).json({
          success: false,
          message: 'Senha mestra não configurada',
          code: 'MASTER_PASSWORD_NOT_CONFIGURED'
        });
      }

      const isValidMaster = await cryptoService.verifyMasterPassword(
        masterPassword,
        user.masterKeyHash,
        user.masterKeySalt
      );

      if (!isValidMaster) {
        return res.status(401).json({
          success: false,
          message: 'Senha mestra incorreta',
          code: 'INVALID_MASTER_PASSWORD'
        });
      }

      const restoreResult = await BackupService.restoreBackup(
        userId,
        provider,
        accessToken,
        fileId,
        masterPassword
      );

      console.log('✅ Backup restaurado com sucesso');

      res.json({
        success: true,
        message: 'Backup restaurado com sucesso',
        data: restoreResult.data
      });

    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Validar integridade do backup
   */
  static async validateBackup(req, res) {
    try {
      const { provider, accessToken, fileId } = req.body;
      const userId = req.user.id;

      console.log('🔍 Validando backup...');
      console.log('🔍 Provedor:', provider);
      console.log('🔍 Arquivo:', fileId);

      if (!provider || !accessToken || !fileId) {
        return res.status(400).json({
          success: false,
          message: 'Provedor, token de acesso e ID do arquivo são obrigatórios',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const validationResult = await BackupService.validateBackup(
        provider,
        accessToken,
        fileId
      );

      console.log('✅ Validação concluída:', validationResult.isValid ? 'VÁLIDO' : 'INVÁLIDO');

      res.json({
        success: true,
        data: validationResult
      });

    } catch (error) {
      console.error('❌ Erro ao validar backup:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Listar provedores disponíveis
   */
  static async getAvailableProviders(req, res) {
    try {
      console.log('🔧 Iniciando listagem de provedores...');
      
      const providers = CloudProviderService.getAvailableProviders();

      console.log('📋 Provedores disponíveis:', providers.length);
      console.log('📋 Provedores:', JSON.stringify(providers, null, 2));

      res.json({
        success: true,
        data: {
          providers
        }
      });

    } catch (error) {
      console.error('❌ Erro ao listar provedores:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Listar backups do usuário
   */
  static async listBackups(req, res) {
    try {
      const { provider, accessToken } = req.body;
      const userId = req.user.id;

      console.log('📋 Listando backups...');
      console.log('📋 Provedor:', provider);
      console.log('📋 Usuário:', userId);

      if (!provider || !accessToken) {
        return res.status(400).json({
          success: false,
          message: 'Provedor e token de acesso são obrigatórios',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const listResult = await BackupService.listBackups(provider, accessToken);

      res.json(listResult);

    } catch (error) {
      console.error('❌ Erro ao listar backups:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Renovar token de acesso
   */
  static async refreshToken(req, res) {
    try {
      const { provider, refreshToken } = req.body;
      const userId = req.user.id;

      console.log('🔄 Renovando token...');
      console.log('🔄 Provedor:', provider);

      if (!provider || !refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Provedor e refresh token são obrigatórios',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const tokenData = await CloudProviderService.refreshAccessToken(provider, refreshToken);

      console.log('✅ Token renovado com sucesso');

      res.json({
        success: true,
        data: tokenData
      });

    } catch (error) {
      console.error('❌ Erro ao renovar token:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = BackupController;
