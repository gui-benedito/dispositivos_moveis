const express = require('express');
const router = express.Router();
const NoteController = require('../controllers/noteController');
const { authenticateToken } = require('../middleware/auth');
const { body, param, query } = require('express-validator');
const { validateRequest } = require('../middleware/validation');

// Middleware de validação para criação de nota
const validateNoteCreation = [
  body('title')
    .notEmpty()
    .withMessage('Título é obrigatório')
    .isLength({ min: 1, max: 255 })
    .withMessage('Título deve ter entre 1 e 255 caracteres'),
  body('content')
    .notEmpty()
    .withMessage('Conteúdo é obrigatório')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Conteúdo deve ter entre 1 e 10000 caracteres'),
  body('isSecure')
    .optional()
    .isBoolean()
    .withMessage('isSecure deve ser um booleano'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags deve ser um array'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Cor deve ser um código hexadecimal válido'),
  validateRequest
];

// Middleware de validação para atualização de nota
const validateNoteUpdate = [
  param('id')
    .isUUID()
    .withMessage('ID deve ser um UUID válido'),
  body('title')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Título deve ter entre 1 e 255 caracteres'),
  body('content')
    .optional()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Conteúdo deve ter entre 1 e 10000 caracteres'),
  body('isSecure')
    .optional()
    .isBoolean()
    .withMessage('isSecure deve ser um booleano'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags deve ser um array'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Cor deve ser um código hexadecimal válido'),
  body('isFavorite')
    .optional()
    .isBoolean()
    .withMessage('isFavorite deve ser um booleano'),
  validateRequest
];

// Middleware de validação para parâmetros de busca
const validateNoteSearch = [
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Termo de busca deve ter entre 1 e 100 caracteres'),
  query('isSecure')
    .optional()
    .isBoolean()
    .withMessage('isSecure deve ser um booleano'),
  query('isFavorite')
    .optional()
    .isBoolean()
    .withMessage('isFavorite deve ser um booleano'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro maior que 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número entre 1 e 100'),
  validateRequest
];

// Middleware de validação para ID
const validateNoteId = [
  param('id')
    .isUUID()
    .withMessage('ID deve ser um UUID válido'),
  validateRequest
];

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// POST /notes - Criar nova nota
router.post('/', validateNoteCreation, NoteController.createNote);

// GET /notes - Listar notas do usuário
router.get('/', validateNoteSearch, NoteController.getNotes);

// GET /notes/stats - Estatísticas das notas
router.get('/stats', NoteController.getNoteStats);

// GET /notes/:id - Obter nota específica
router.get('/:id', validateNoteId, NoteController.getNote);

// PUT /notes/:id - Atualizar nota
router.put('/:id', validateNoteUpdate, NoteController.updateNote);

// DELETE /notes/:id - Deletar nota
router.delete('/:id', validateNoteId, NoteController.deleteNote);

// PATCH /notes/:id/favorite - Alternar favorito
router.patch('/:id/favorite', validateNoteId, NoteController.toggleFavorite);

module.exports = router;
