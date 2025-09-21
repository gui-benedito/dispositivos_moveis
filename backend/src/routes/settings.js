const express = require('express');
const { body } = require('express-validator');
const SettingsController = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/auth');
const SessionManager = require('../middleware/sessionManager');

const router = express.Router();

/**
 * Validação para atualização de configurações
 */
const updateSettingsValidation = [
  body('autoLockTimeout')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('Timeout de bloqueio deve estar entre 1 e 60 minutos'),
  
  body('biometricEnabled')
    .optional()
    .isBoolean()
    .withMessage('biometricEnabled deve ser um booleano'),
  
  body('biometricType')
    .optional()
    .isIn(['fingerprint'])
    .withMessage('Tipo biométrico deve ser fingerprint'),
  
  body('requirePasswordOnLock')
    .optional()
    .isBoolean()
    .withMessage('requirePasswordOnLock deve ser um booleano'),
  
  body('lockOnBackground')
    .optional()
    .isBoolean()
    .withMessage('lockOnBackground deve ser um booleano'),
  
  body('lockOnScreenOff')
    .optional()
    .isBoolean()
    .withMessage('lockOnScreenOff deve ser um booleano')
];

/**
 * @swagger
 * components:
 *   schemas:
 *     UserSettings:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         autoLockTimeout:
 *           type: integer
 *           description: Timeout de bloqueio automático em minutos
 *           minimum: 1
 *           maximum: 60
 *         biometricEnabled:
 *           type: boolean
 *           description: Biometria habilitada
 *         biometricType:
 *           type: string
 *           enum: [fingerprint]
 *           description: Tipo de biometria
 *         requirePasswordOnLock:
 *           type: boolean
 *           description: Requer senha no desbloqueio
 *         lockOnBackground:
 *           type: boolean
 *           description: Bloquear ao colocar app em background
 *         lockOnScreenOff:
 *           type: boolean
 *           description: Bloquear ao desligar tela
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// Aplicar middleware de autenticação e sessão em todas as rotas
router.use(authenticateToken);
router.use(SessionManager.sessionMiddleware);
router.use(SessionManager.activityTrackerMiddleware);

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
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', SettingsController.getSettings);

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
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/', updateSettingsValidation, SettingsController.updateSettings);

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
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/reset', SettingsController.resetSettings);

module.exports = router;
