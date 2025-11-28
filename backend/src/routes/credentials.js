const express = require('express');
const router = express.Router();
const CredentialController = require('../controllers/credentialController');
const HibpController = require('../controllers/hibpController');
const { authenticateToken } = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     Credential:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único da credencial
 *         title:
 *           type: string
 *           description: Título da credencial
 *         description:
 *           type: string
 *           description: Descrição da credencial
 *         category:
 *           type: string
 *           description: Categoria da credencial
 *           description: Nome de usuário
 *         password:
 *           type: string
 *           description: Senha
 *         notes:
 *           type: string
 *           description: Notas adicionais
 *         isFavorite:
 *           type: boolean
 *           description: Se é favorita
 *         accessCount:
 *           type: integer
{{ ... }}
 *         username:
 *           type: string
 *         password:
 *           type: string
 *           minLength: 1
 *         notes:
 *           type: string
 *         masterPassword:
 *           type: string
 *           minLength: 1
 *         isFavorite:
 *           type: boolean
 *           default: false
 *     
 *     UpdateCredentialRequest:
 *       type: object
 *       required:
 *         - masterPassword
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description:
 *           type: string
 *         category:
 *           minLength: 1
 *           maxLength: 50
 *         username:
 *           type: string
 *         password:
 *           type: string
 *           minLength: 1
 *         notes:
 *           type: string
 *         masterPassword:
 *           type: string
 *           minLength: 1
 *         isFavorite:
 *           type: boolean
 *     
 *     GeneratePasswordRequest:
 *       type: object
 *       properties:
 *         length:
 *           type: integer
 *           maximum: 128
 *           default: 16
 *         includeUppercase:
 *           type: boolean
 *           default: true
 *         includeLowercase:
 *           type: boolean
 *           default: true
 *         includeNumbers:
 *           type: boolean
 *           default: true
 *         includeSymbols:
 *           type: boolean
 *           default: true
 *         excludeSimilar:
 *           type: boolean
 *           default: true
 *     
 *     AnalyzePasswordRequest:
 *       type: object
 *       required:
 *         - password
 *       properties:
 *         password:
 *           type: string
 *           description: Senha a ser analisada
 *     
 *     PasswordStrength:
 *       type: object
 *       properties:
 *         score:
 *           type: integer
 *           minimum: 0
 *           maximum: 8
 *         strength:
 *           type: string
 *           enum: [Muito fraca, Fraca, Média, Forte, Muito forte]
 *         feedback:
 *           type: array
 *           items:
 *             type: string
 */

// Validações
const createCredentialValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Título deve ter entre 1 e 100 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Descrição deve ter no máximo 1000 caracteres'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Categoria deve ter entre 1 e 50 caracteres'),
  body('password')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Senha é obrigatória'),
  body('masterPassword')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Senha mestre é obrigatória'),
  body('isFavorite')
    .optional()
    .isBoolean()
    .withMessage('isFavorite deve ser um valor booleano')
];

const updateCredentialValidation = [
  param('id')
    .isUUID()
    .withMessage('ID deve ser um UUID válido'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Título deve ter entre 1 e 100 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Descrição deve ter no máximo 1000 caracteres'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Categoria deve ter entre 1 e 50 caracteres'),
  body('password')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Senha não pode estar vazia'),
  body('masterPassword')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Senha mestre é obrigatória'),
  body('isFavorite')
    .optional()
    .isBoolean()
    .withMessage('isFavorite deve ser um valor booleano')
];

const getCredentialValidation = [
  param('id')
    .isUUID()
    .withMessage('ID deve ser um UUID válido'),
  query('masterPassword')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Senha mestre é obrigatória')
];

const deleteCredentialValidation = [
  param('id')
    .isUUID()
    .withMessage('ID deve ser um UUID válido')
];

const generatePasswordValidation = [
  body('length')
    .optional()
    .isInt({ min: 4, max: 128 })
    .withMessage('Comprimento deve estar entre 4 e 128'),
  body('includeUppercase')
    .optional()
    .isBoolean()
    .withMessage('includeUppercase deve ser um valor booleano'),
  body('includeLowercase')
    .optional()
    .isBoolean()
    .withMessage('includeLowercase deve ser um valor booleano'),
  body('includeNumbers')
    .optional()
    .isBoolean()
    .withMessage('includeNumbers deve ser um valor booleano'),
  body('includeSymbols')
    .optional()
    .isBoolean()
    .withMessage('includeSymbols deve ser um valor booleano'),
  body('excludeSimilar')
    .optional()
    .isBoolean()
    .withMessage('excludeSimilar deve ser um valor booleano')
];

const analyzePasswordValidation = [
  body('password')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Senha é obrigatória')
];

// Versionamento
const listVersionsValidation = [
  param('id').isUUID().withMessage('ID deve ser um UUID válido'),
];

const restoreVersionValidation = [
  param('id').isUUID().withMessage('ID deve ser um UUID válido'),
  param('version').isInt({ min: 1 }).withMessage('Versão deve ser um inteiro >= 1'),
  body('masterPassword').trim().isLength({ min: 1 }).withMessage('Senha mestre é obrigatória'),
];

// Rotas

/**
 * @swagger
 * tags:
 *   name: Credentials
 *   description: Gerenciamento de credenciais criptografadas
 */

// GET /api/credentials - Listar credenciais
router.get('/', CredentialController.getCredentials);

// GET /api/credentials/categories - Listar categorias
router.get('/categories', CredentialController.getCategories);

// GET /api/credentials/:id - Obter credencial específica
router.get('/:id', getCredentialValidation, CredentialController.getCredential);

// POST /api/credentials - Criar nova credencial
router.post('/', createCredentialValidation, CredentialController.createCredential);

// PUT /api/credentials/:id - Atualizar credencial
router.put('/:id', updateCredentialValidation, CredentialController.updateCredential);

// DELETE /api/credentials/:id - Excluir credencial
router.delete('/:id', deleteCredentialValidation, CredentialController.deleteCredential);

// POST /api/credentials/generate-password - Gerar senha forte
router.post('/generate-password', generatePasswordValidation, CredentialController.generatePassword);

// POST /api/credentials/analyze-password - Analisar força da senha
router.post('/analyze-password', analyzePasswordValidation, CredentialController.analyzePassword);

// POST /api/credentials/breached-passwords - Listar senhas em risco (HIBP)
router.post('/breached-passwords', HibpController.getBreachedPasswords);

// GET /api/credentials/:id/versions - Listar versões
router.get('/:id/versions', listVersionsValidation, CredentialController.listVersions);

// POST /api/credentials/:id/versions/:version/restore - Restaurar versão
router.post('/:id/versions/:version/restore', restoreVersionValidation, CredentialController.restoreVersion);

module.exports = router;
