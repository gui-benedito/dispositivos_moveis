const express = require('express');
const router = express.Router();
const BiometricController = require('../controllers/biometricController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

// Validações para ativação de biometria
const validateBiometricEnable = [
  body('biometricType')
    .isIn(['fingerprint', 'face', 'both'])
    .withMessage('Tipo de biometria deve ser fingerprint, face ou both'),
  handleValidationErrors
];

// Validações para autenticação biométrica
const validateBiometricAuth = [
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID é obrigatório'),
  body('biometricType')
    .isIn(['fingerprint', 'face', 'both'])
    .withMessage('Tipo de biometria deve ser fingerprint, face ou both'),
  handleValidationErrors
];

// Rota para ativar biometria (requer autenticação)
router.post('/enable', 
  authenticateToken,
  validateBiometricEnable,
  BiometricController.enableBiometric
);

// Rota para desativar biometria (requer autenticação)
router.post('/disable', 
  authenticateToken,
  BiometricController.disableBiometric
);

// Rota para autenticação biométrica (não requer token, usa sessionId)
router.post('/authenticate', 
  validateBiometricAuth,
  BiometricController.authenticateBiometric
);

// Rota para obter status da biometria (requer autenticação)
router.get('/status', 
  authenticateToken,
  BiometricController.getBiometricStatus
);

// Rota para listar sessões biométricas (requer autenticação)
router.get('/sessions', 
  authenticateToken,
  BiometricController.getBiometricSessions
);

module.exports = router;
