const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const CategoryController = require('../controllers/categoryController');

router.use(authenticateToken);

const createValidation = [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Nome deve ter entre 1 e 50 caracteres'),
  body('icon').optional().isString().isLength({ max: 100 }).withMessage('Ícone inválido'),
  body('color').optional().isString().isLength({ max: 20 }).withMessage('Cor inválida')
];

const updateValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Nome deve ter entre 1 e 50 caracteres'),
  body('icon').optional().isString().isLength({ max: 100 }).withMessage('Ícone inválido'),
  body('color').optional().isString().isLength({ max: 20 }).withMessage('Cor inválida'),
  body('cascadeUpdate').optional().isBoolean()
];

const deleteValidation = [
  param('id').isUUID().withMessage('ID inválido')
];

// GET /api/categories
router.get('/', CategoryController.list);

// POST /api/categories
router.post('/', createValidation, CategoryController.create);

// PUT /api/categories/:id
router.put('/:id', updateValidation, CategoryController.update);

// DELETE /api/categories/:id
router.delete('/:id', deleteValidation, CategoryController.remove);

module.exports = router;
