const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { 
  validateUserRegistration, 
  validateUserLogin, 
  validateRefreshToken 
} = require('../middleware/validation');
const { 
  authenticateToken, 
  verifyRefreshToken 
} = require('../middleware/auth');
const { 
  authLimiter, 
  registrationLimiter 
} = require('../middleware/rateLimiter');

// Rota de cadastro (com rate limiting específico para cadastro)
router.post('/register', 
  registrationLimiter,
  validateUserRegistration,
  AuthController.register
);

// Rota de login (com rate limiting para autenticação)
router.post('/login', 
  authLimiter,
  validateUserLogin,
  AuthController.login
);

// Rota para renovar token
router.post('/refresh-token', 
  verifyRefreshToken,
  validateRefreshToken,
  AuthController.refreshToken
);

// Rota de logout
router.post('/logout', 
  authenticateToken,
  AuthController.logout
);

// Rota para obter perfil do usuário autenticado
router.get('/profile', 
  authenticateToken,
  AuthController.getProfile
);

// Rota para verificar disponibilidade de email
router.get('/check-email', 
  AuthController.checkEmailAvailability
);

module.exports = router;

