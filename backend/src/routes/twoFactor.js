const express = require('express');
const router = express.Router();
const TwoFactorController = require('../controllers/twoFactorController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

// Validações para configuração de 2FA
const validate2FASetup = [
  body('method')
    .isIn(['totp', 'sms', 'email'])
    .withMessage('Método deve ser totp, sms ou email'),
  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Número de telefone deve ter formato válido'),
  handleValidationErrors
];

// Validações para verificação de 2FA
const validate2FAVerify = [
  body('method')
    .isIn(['totp', 'sms', 'email'])
    .withMessage('Método deve ser totp, sms ou email'),
  body('code')
    .notEmpty()
    .withMessage('Código é obrigatório')
    .isLength({ min: 4, max: 8 })
    .withMessage('Código deve ter entre 4 e 8 caracteres'),
  body('isActivation')
    .optional()
    .isBoolean()
    .withMessage('isActivation deve ser boolean'),
  handleValidationErrors
];

// Validações para desativação de 2FA
const validate2FADisable = [
  body('method')
    .isIn(['totp', 'sms', 'email'])
    .withMessage('Método deve ser totp, sms ou email'),
  body('code')
    .notEmpty()
    .withMessage('Código é obrigatório')
    .isLength({ min: 4, max: 8 })
    .withMessage('Código deve ter entre 4 e 8 caracteres'),
  handleValidationErrors
];

// Rota para configurar 2FA (requer autenticação)
router.post('/setup', 
  authenticateToken,
  validate2FASetup,
  TwoFactorController.setup2FA
);

// Rota para verificar código 2FA (requer autenticação)
router.post('/verify', 
  authenticateToken,
  validate2FAVerify,
  TwoFactorController.verify2FA
);

// Rota para verificar código 2FA durante login (NÃO requer autenticação)
router.post('/verify-login', 
  validate2FAVerify,
  TwoFactorController.verify2FALogin
);

// Rota para desativar 2FA (requer autenticação)
router.post('/disable', 
  authenticateToken,
  validate2FADisable,
  TwoFactorController.disable2FA
);

// Rota para obter status do 2FA (requer autenticação)
router.get('/status', 
  authenticateToken,
  TwoFactorController.get2FAStatus
);

module.exports = router;
