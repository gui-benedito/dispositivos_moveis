const express = require('express');
const router = express.Router();
const DirectGoogleDriveController = require('../controllers/directGoogleDriveController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

// Validações
const validateCallbackAndUpload = [
  body('code')
    .notEmpty()
    .withMessage('Código de autorização é obrigatório'),
  body('masterPassword')
    .notEmpty()
    .withMessage('Senha mestra é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Senha mestra deve ter pelo menos 6 caracteres'),
  handleValidationErrors
];

const validateListBackups = [
  body('tokens')
    .notEmpty()
    .withMessage('Tokens são obrigatórios'),
  handleValidationErrors
];

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// GET /direct-google-drive/auth-url - Gerar URL de autorização
router.get('/auth-url', DirectGoogleDriveController.getAuthUrl);

// POST /direct-google-drive/upload - Processar callback e fazer upload direto
router.post('/upload', validateCallbackAndUpload, DirectGoogleDriveController.processCallbackAndUpload);

// POST /direct-google-drive/list - Listar backups
router.post('/list', validateListBackups, DirectGoogleDriveController.listBackups);

module.exports = router;
