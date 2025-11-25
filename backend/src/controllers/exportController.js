const { Credential, Note, User } = require('../models');
const cryptoService = require('../services/cryptoService');
const NoteCryptoService = require('../services/noteCryptoService');

class ExportController {
  static async exportJson(req, res) {
    try {
      const userId = req.user.id;
      const { masterPassword } = req.body || {};
      if (!masterPassword || typeof masterPassword !== 'string' || masterPassword.length < 1) {
        return res.status(400).json({ success: false, message: 'Senha mestre é obrigatória', code: 'MASTER_PASSWORD_REQUIRED' });
      }

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

      const credentials = await Credential.findAll({ where: { userId, isActive: true } });

      const exportedCredentials = [];
      for (const cred of credentials) {
        const decrypted = await cryptoService.decryptCredential(cred, masterPassword);
        exportedCredentials.push({
          id: cred.id,
          title: cred.title,
          description: cred.description,
          category: cred.category,
          username: decrypted.username,
          password: decrypted.password,
          notes: decrypted.notes,
          isFavorite: cred.isFavorite,
          createdAt: cred.createdAt,
          updatedAt: cred.updatedAt
        });
      }

      const notes = await Note.findAll({ where: { userId } });
      const exportedNotes = notes.map(n => {
        const isSecure = !!n.isSecure;
        const title = isSecure ? NoteCryptoService.decryptText(n.getDataValue('title'), userId) : n.title;
        const content = isSecure ? NoteCryptoService.decryptText(n.getDataValue('content'), userId) : n.content;
        return {
          id: n.id,
          title,
          content,
          isSecure,
          tags: n.tags,
          isFavorite: n.isFavorite,
          color: n.color,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt
        };
      });

      return res.json({
        success: true,
        message: 'Exportação gerada com sucesso',
        data: {
          exportedAt: new Date().toISOString(),
          credentials: exportedCredentials,
          notes: exportedNotes
        }
      });
    } catch (error) {
      console.error('Erro na exportação JSON:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    }
  }
}

module.exports = ExportController;
