const express = require('express');
const multer = require('multer');
const router = express.Router();
const SimpleBackupController = require('../controllers/simpleBackupController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

// Validações
const validateBackupGeneration = [
  body('masterPassword')
    .notEmpty()
    .withMessage('Senha mestra é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Senha mestra deve ter pelo menos 6 caracteres'),
  handleValidationErrors
];

const validateBackupRestore = [
  body('backupData')
    .notEmpty()
    .withMessage('Dados do backup são obrigatórios'),
  body('masterPassword')
    .notEmpty()
    .withMessage('Senha mestra é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Senha mestra deve ter pelo menos 6 caracteres'),
  handleValidationErrors
];

const validateBackupValidation = [
  body('backupData')
    .notEmpty()
    .withMessage('Dados do backup são obrigatórios'),
  body('masterPassword')
    .notEmpty()
    .withMessage('Senha mestra é obrigatória'),
  handleValidationErrors
];

const validateRestoreFromFile = [
  body('filePath')
    .notEmpty()
    .withMessage('Caminho do arquivo é obrigatório'),
  body('masterPassword')
    .notEmpty()
    .withMessage('Senha mestra é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Senha mestra deve ter pelo menos 6 caracteres'),
  handleValidationErrors
];

const validateUploadRestore = [
  body('masterPassword')
    .notEmpty()
    .withMessage('Senha mestra é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Senha mestra deve ter pelo menos 6 caracteres'),
  handleValidationErrors
];

// Configurar multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Aceitar apenas arquivos .encrypted
    if (file.originalname.endsWith('.encrypted')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .encrypted são permitidos'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// POST /simple-backup/generate - Gerar arquivo de backup
router.post('/generate', validateBackupGeneration, SimpleBackupController.generateBackup);

// POST /simple-backup/restore - Restaurar backup
router.post('/restore', validateBackupRestore, SimpleBackupController.restoreBackup);

// POST /simple-backup/validate - Validar backup
router.post('/validate', validateBackupValidation, SimpleBackupController.validateBackup);

// POST /simple-backup/restore-file - Restaurar backup de arquivo
router.post('/restore-file', validateRestoreFromFile, SimpleBackupController.restoreBackupFromFile);

// POST /simple-backup/upload-restore - Upload e restaurar backup
router.post('/upload-restore', upload.single('backupFile'), validateUploadRestore, SimpleBackupController.uploadAndRestoreBackup);

module.exports = router;
