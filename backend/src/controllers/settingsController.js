const { UserSettings } = require('../models');
const { validationResult } = require('express-validator');

/**
 * Controller para gerenciar configurações do usuário
 */
class SettingsController {
  /**
   * @swagger
   * /api/settings:
   *   get:
   *     summary: Obter configurações do usuário
   *     tags: [Settings]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Configurações obtidas com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UserSettings'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async getSettings(req, res) {
    try {
      const settings = await UserSettings.findOne({
        where: { userId: req.user.id }
      });

      if (!settings) {
        // Criar configurações padrão se não existirem
        const defaultSettings = await UserSettings.create({
          userId: req.user.id,
          autoLockTimeout: 5,
          biometricEnabled: false,
          requirePasswordOnLock: true,
          lockOnBackground: true,
          lockOnScreenOff: true
        });

        return res.json({
          success: true,
          data: defaultSettings
        });
      }

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Erro ao obter configurações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/settings:
   *   put:
   *     summary: Atualizar configurações do usuário
   *     tags: [Settings]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               autoLockTimeout:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 60
   *               biometricEnabled:
   *                 type: boolean
   *               biometricType:
   *                 type: string
   *                 enum: [fingerprint]
   *               requirePasswordOnLock:
   *                 type: boolean
   *               lockOnBackground:
   *                 type: boolean
   *               lockOnScreenOff:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Configurações atualizadas com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/UserSettings'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async updateSettings(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array(),
          code: 'VALIDATION_ERROR'
        });
      }

      const {
        autoLockTimeout,
        biometricEnabled,
        biometricType,
        requirePasswordOnLock,
        lockOnBackground,
        lockOnScreenOff
      } = req.body;

      const [settings, created] = await UserSettings.findOrCreate({
        where: { userId: req.user.id },
        defaults: {
          userId: req.user.id,
          autoLockTimeout: 5,
          biometricEnabled: false,
          requirePasswordOnLock: true,
          lockOnBackground: true,
          lockOnScreenOff: true
        }
      });

      // Atualizar configurações
      await settings.update({
        autoLockTimeout: autoLockTimeout ?? settings.autoLockTimeout,
        biometricEnabled: biometricEnabled ?? settings.biometricEnabled,
        biometricType: biometricType ?? settings.biometricType,
        requirePasswordOnLock: requirePasswordOnLock ?? settings.requirePasswordOnLock,
        lockOnBackground: lockOnBackground ?? settings.lockOnBackground,
        lockOnScreenOff: lockOnScreenOff ?? settings.lockOnScreenOff
      });

      res.json({
        success: true,
        message: 'Configurações atualizadas com sucesso',
        data: settings
      });
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/settings/reset:
   *   post:
   *     summary: Resetar configurações para padrão
   *     tags: [Settings]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Configurações resetadas com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/UserSettings'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async resetSettings(req, res) {
    try {
      const [settings] = await UserSettings.findOrCreate({
        where: { userId: req.user.id },
        defaults: {
          userId: req.user.id,
          autoLockTimeout: 5,
          biometricEnabled: false,
          requirePasswordOnLock: true,
          lockOnBackground: true,
          lockOnScreenOff: true
        }
      });

      // Resetar para valores padrão
      await settings.update({
        autoLockTimeout: 5,
        biometricEnabled: false,
        biometricType: null,
        requirePasswordOnLock: true,
        lockOnBackground: true,
        lockOnScreenOff: true
      });

      res.json({
        success: true,
        message: 'Configurações resetadas para padrão',
        data: settings
      });
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = SettingsController;
