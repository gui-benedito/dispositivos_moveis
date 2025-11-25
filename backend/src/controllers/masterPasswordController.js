const { User } = require('../models');
const cryptoService = require('../services/cryptoService');

class MasterPasswordController {
  static async setMasterPassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword, confirmPassword } = req.body || {};

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Nova senha mestra deve ter pelo menos 8 caracteres',
          code: 'MASTER_PASSWORD_WEAK'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Confirmação de senha não confere',
          code: 'MASTER_PASSWORD_MISMATCH'
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }

      const hasExistingMaster = !!(user.masterKeyHash && user.masterKeySalt);
      if (hasExistingMaster) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: 'Senha mestra atual é obrigatória para alteração',
            code: 'CURRENT_MASTER_PASSWORD_REQUIRED'
          });
        }

        const isValid = await cryptoService.verifyMasterPassword(
          currentPassword,
          user.masterKeyHash,
          user.masterKeySalt
        );
        if (!isValid) {
          return res.status(401).json({
            success: false,
            message: 'Senha mestra atual incorreta',
            code: 'INVALID_CURRENT_MASTER_PASSWORD'
          });
        }
      }

      const salt = cryptoService.generateSalt();
      const { keyHash } = await cryptoService.deriveKey(newPassword, salt);

      user.masterKeySalt = salt;
      user.masterKeyHash = keyHash;
      await user.save();

      return res.json({
        success: true,
        message: hasExistingMaster
          ? 'Senha mestra atualizada com sucesso'
          : 'Senha mestra definida com sucesso'
      });
    } catch (error) {
      console.error('Erro ao definir senha mestra:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  static async verifyMasterPassword(req, res) {
    try {
      const userId = req.user.id;
      const { password } = req.body || {};

      if (!password || typeof password !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Senha mestra é obrigatória',
          code: 'MASTER_PASSWORD_REQUIRED'
        });
      }

      const user = await User.findByPk(userId);
      if (!user || !user.masterKeyHash || !user.masterKeySalt) {
        return res.status(400).json({
          success: false,
          message: 'Senha mestra não configurada',
          code: 'MASTER_PASSWORD_NOT_CONFIGURED'
        });
      }

      const isValid = await cryptoService.verifyMasterPassword(
        password,
        user.masterKeyHash,
        user.masterKeySalt
      );

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Senha mestra incorreta',
          code: 'INVALID_MASTER_PASSWORD'
        });
      }

      return res.json({
        success: true,
        message: 'Senha mestra verificada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao verificar senha mestra:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = MasterPasswordController;
