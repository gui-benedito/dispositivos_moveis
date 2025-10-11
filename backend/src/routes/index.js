const express = require('express');
const router = express.Router();

// Importar rotas
const authRoutes = require('./auth');
const biometricRoutes = require('./biometric');
const credentialRoutes = require('./credentials');
const settingsRoutes = require('./settings');
const twoFactorRoutes = require('./twoFactor');

// Configurar rotas
router.use('/auth', authRoutes);
router.use('/biometric', biometricRoutes);
router.use('/credentials', credentialRoutes);
router.use('/settings', settingsRoutes);
router.use('/2fa', twoFactorRoutes);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check da API
 *     description: Verifica se a API está funcionando corretamente
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API funcionando normalmente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               success: true
 *               message: "API está funcionando"
 *               timestamp: "2024-01-01T00:00:00.000Z"
 *               version: "1.0.0"
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API está funcionando',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * @swagger
 * /api/:
 *   get:
 *     summary: Informações da API
 *     description: Retorna informações básicas sobre a API e seus endpoints
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Informações da API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password Manager API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     auth:
 *                       type: string
 *                       example: "/api/auth"
 *                     health:
 *                       type: string
 *                       example: "/api/health"
 *             example:
 *               success: true
 *               message: "Password Manager API"
 *               version: "1.0.0"
 *               endpoints:
 *                 auth: "/api/auth"
 *                 health: "/api/health"
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Password Manager API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      biometric: '/api/biometric',
      credentials: '/api/credentials',
      settings: '/api/settings',
      twoFactor: '/api/2fa',
      health: '/api/health'
    }
  });
});

module.exports = router;
