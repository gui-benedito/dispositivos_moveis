const express = require('express');
const router = express.Router();
const BackupController = require('../controllers/backupController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

// Validações para OAuth
const validateOAuthRequest = [
  body('provider')
    .isIn(['google_drive', 'dropbox', 'one_drive'])
    .withMessage('Provedor deve ser google_drive, dropbox ou one_drive'),
  handleValidationErrors
];

// Validações para callback OAuth
const validateOAuthCallback = [
  body('code')
    .notEmpty()
    .withMessage('Código de autorização é obrigatório'),
  body('state')
    .notEmpty()
    .withMessage('State é obrigatório'),
  body('provider')
    .isIn(['google_drive', 'dropbox', 'one_drive'])
    .withMessage('Provedor deve ser google_drive, dropbox ou one_drive'),
  body('masterPassword')
    .isLength({ min: 6 })
    .withMessage('Senha mestra deve ter pelo menos 6 caracteres'),
  handleValidationErrors
];

// Validações para criação de backup
const validateBackupCreation = [
  body('provider')
    .isIn(['google_drive', 'dropbox', 'one_drive'])
    .withMessage('Provedor deve ser google_drive, dropbox ou one_drive'),
  body('accessToken')
    .notEmpty()
    .withMessage('Token de acesso é obrigatório'),
  body('masterPassword')
    .isLength({ min: 6 })
    .withMessage('Senha mestra deve ter pelo menos 6 caracteres'),
  handleValidationErrors
];

// Validações para restauração de backup
const validateBackupRestore = [
  body('provider')
    .isIn(['google_drive', 'dropbox', 'one_drive'])
    .withMessage('Provedor deve ser google_drive, dropbox ou one_drive'),
  body('accessToken')
    .notEmpty()
    .withMessage('Token de acesso é obrigatório'),
  body('fileId')
    .notEmpty()
    .withMessage('ID do arquivo é obrigatório'),
  body('masterPassword')
    .isLength({ min: 6 })
    .withMessage('Senha mestra deve ter pelo menos 6 caracteres'),
  handleValidationErrors
];

// Validações para validação de backup
const validateBackupValidation = [
  body('provider')
    .isIn(['google_drive', 'dropbox', 'one_drive'])
    .withMessage('Provedor deve ser google_drive, dropbox ou one_drive'),
  body('accessToken')
    .notEmpty()
    .withMessage('Token de acesso é obrigatório'),
  body('fileId')
    .notEmpty()
    .withMessage('ID do arquivo é obrigatório'),
  handleValidationErrors
];

// Validações para listagem de backups
const validateBackupList = [
  body('provider')
    .isIn(['google_drive', 'dropbox', 'one_drive'])
    .withMessage('Provedor deve ser google_drive, dropbox ou one_drive'),
  body('accessToken')
    .notEmpty()
    .withMessage('Token de acesso é obrigatório'),
  handleValidationErrors
];

// Validações para renovação de token
const validateTokenRefresh = [
  body('provider')
    .isIn(['google_drive', 'dropbox', 'one_drive'])
    .withMessage('Provedor deve ser google_drive, dropbox ou one_drive'),
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token é obrigatório'),
  handleValidationErrors
];

// GET /backup/providers - Listar provedores disponíveis (não requer autenticação)
router.get('/providers', BackupController.getAvailableProviders);

// GET /backup/test-callback - Rota de teste para simular callback OAuth
router.get('/test-callback', (req, res) => {
  console.log('🧪 Teste de callback recebido:', req.query);
  res.json({
    success: true,
    message: 'Callback de teste funcionando!',
    query: req.query
  });
});

// POST /backup/oauth-callback - Processar callback OAuth e criar backup (não requer autenticação)
router.post('/oauth-callback', validateOAuthCallback, BackupController.processOAuthCallback);

// Todas as outras rotas requerem autenticação
router.use(authenticateToken);

// POST /backup/auth-url - Obter URL de autorização OAuth
router.post('/auth-url', validateOAuthRequest, BackupController.getAuthUrl);

// POST /backup/create - Criar backup direto
router.post('/create', validateBackupCreation, BackupController.createBackup);

// POST /backup/restore - Restaurar backup
router.post('/restore', validateBackupRestore, BackupController.restoreBackup);

// POST /backup/validate - Validar integridade do backup
router.post('/validate', validateBackupValidation, BackupController.validateBackup);

// POST /backup/list - Listar backups do usuário
router.post('/list', validateBackupList, BackupController.listBackups);

// POST /backup/refresh-token - Renovar token de acesso
router.post('/refresh-token', validateTokenRefresh, BackupController.refreshToken);

module.exports = router;
