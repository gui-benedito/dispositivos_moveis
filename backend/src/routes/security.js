const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const MasterPasswordController = require('../controllers/masterPasswordController');

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(authenticateToken);

/**
 * POST /api/security/master-password/set
 * Body: { currentPassword?: string, newPassword: string, confirmPassword: string }
 */
router.post('/master-password/set', MasterPasswordController.setMasterPassword);

/**
 * POST /api/security/master-password/verify
 * Body: { password: string }
 */
router.post('/master-password/verify', MasterPasswordController.verifyMasterPassword);

module.exports = router;
