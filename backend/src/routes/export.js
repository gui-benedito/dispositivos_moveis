const express = require('express');
const router = express.Router();
const ExportController = require('../controllers/exportController');
const { authenticateToken } = require('../middleware/auth');

// Todas as rotas exigem autenticação
router.use(authenticateToken);

/**
 * POST /api/export/json
 * Body: { masterPassword: string }
 */
router.post('/json', ExportController.exportJson);

module.exports = router;
