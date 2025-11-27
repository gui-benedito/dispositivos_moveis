const { User } = require('../models');
const cryptoService = require('../services/cryptoService');
const { logSecurityEvent } = require('../services/securityEventLogger');

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
          await logSecurityEvent({
            userId,
            type: 'master_password_change_invalid_current',
            severity: 'medium',
            title: 'Tentativa de alterar senha mestra com senha atual incorreta',
            message: 'O usuário informou uma senha mestra atual incorreta ao tentar alterar a senha mestra.',
            req,
          });
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

      const successMessage = hasExistingMaster
        ? 'Senha mestra atualizada com sucesso'
        : 'Senha mestra definida com sucesso';

      await logSecurityEvent({
        userId,
        type: hasExistingMaster ? 'master_password_changed' : 'master_password_set',
        severity: 'high',
        title: hasExistingMaster ? 'Senha mestra alterada' : 'Senha mestra definida',
        message: successMessage,
        req,
      });

      return res.json({
        success: true,
        message: successMessage
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
        await logSecurityEvent({
          userId,
          type: 'master_password_invalid',
          severity: 'medium',
          title: 'Senha mestra incorreta',
          message: 'Tentativa de uso de senha mestra incorreta para desbloquear conteúdo seguro.',
          req,
        });
        return res.status(401).json({
          success: false,
          message: 'Senha mestra incorreta',
          code: 'INVALID_MASTER_PASSWORD'
        });
      }

      await logSecurityEvent({
        userId,
        type: 'master_password_verified',
        severity: 'low',
        title: 'Senha mestra verificada',
        message: 'Senha mestra verificada com sucesso para acesso a conteúdo seguro.',
        req,
      });

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
