const { Credential } = require('../models');
const cryptoService = require('../services/cryptoService');
const { checkPasswordPwned } = require('../services/hibpService');

class HibpController {
  /**
   * RF14 - Listar credenciais com senhas possivelmente vazadas (Have I Been Pwned)
   *
   * POST /api/credentials/breached-passwords
   * Body: { masterPassword: string }
   */
  static async getBreachedPasswords(req, res) {
    try {
      const userId = req.user.id;
      const { masterPassword } = req.body || {};

      if (!masterPassword || typeof masterPassword !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Senha mestra é obrigatória',
          code: 'MASTER_PASSWORD_REQUIRED',
        });
      }

      const credentials = await Credential.findAll({
        where: { userId, isActive: true },
        order: [['createdAt', 'ASC']],
      });

      const breached = [];

      for (const credential of credentials) {
        try {
          const decrypted = await cryptoService.decryptCredential(credential, masterPassword);
          const password = decrypted.password;

          if (!password) continue;

          const hibp = await checkPasswordPwned(password);

          if (hibp.found && hibp.count > 0) {
            breached.push({
              credentialId: credential.id,
              title: credential.title,
              category: credential.category,
              username: decrypted.username,
              pwnCount: hibp.count,
            });
          }
        } catch (innerError) {
          console.error('Erro ao verificar HIBP para credencial', credential.id, innerError.message || innerError);
          // Continua com as próximas credenciais
        }
      }

      return res.json({ success: true, data: breached });
    } catch (error) {
      console.error('Erro ao listar senhas em risco (HIBP):', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }
}

module.exports = HibpController;
