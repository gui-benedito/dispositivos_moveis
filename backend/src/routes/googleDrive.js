const express = require('express');
const router = express.Router();
const GoogleDriveController = require('../controllers/googleDriveController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

// Validações
const validateOAuthCallback = [
  body('code')
    .notEmpty()
    .withMessage('Código de autorização é obrigatório'),
  handleValidationErrors
];

const validateUploadBackup = [
  body('backupData')
    .notEmpty()
    .withMessage('Dados do backup são obrigatórios'),
  body('filename')
    .notEmpty()
    .withMessage('Nome do arquivo é obrigatório'),
  body('tokens')
    .notEmpty()
    .withMessage('Tokens são obrigatórios'),
  handleValidationErrors
];

const validateListBackups = [
  body('tokens')
    .notEmpty()
    .withMessage('Tokens são obrigatórios'),
  handleValidationErrors
];

const validateDownloadBackup = [
  body('fileId')
    .notEmpty()
    .withMessage('ID do arquivo é obrigatório'),
  body('tokens')
    .notEmpty()
    .withMessage('Tokens são obrigatórios'),
  handleValidationErrors
];

const validateDeleteBackup = [
  body('fileId')
    .notEmpty()
    .withMessage('ID do arquivo é obrigatório'),
  body('tokens')
    .notEmpty()
    .withMessage('Tokens são obrigatórios'),
  handleValidationErrors
];

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// GET /google-drive/auth-url - Gerar URL de autorização
router.get('/auth-url', GoogleDriveController.getAuthUrl);

// GET /google-drive/oauth-callback - Processar callback OAuth
router.get('/oauth-callback', GoogleDriveController.processOAuthCallback);

// POST /google-drive/upload - Upload de backup
router.post('/upload', validateUploadBackup, GoogleDriveController.uploadBackup);

// POST /google-drive/list - Listar backups
router.post('/list', validateListBackups, GoogleDriveController.listBackups);

// POST /google-drive/download - Download de backup
router.post('/download', validateDownloadBackup, GoogleDriveController.downloadBackup);

// POST /google-drive/delete - Deletar backup
router.post('/delete', validateDeleteBackup, GoogleDriveController.deleteBackup);

module.exports = router;
