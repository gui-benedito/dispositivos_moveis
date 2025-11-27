const express = require('express');
const router = express.Router();
const SecurityEventController = require('../controllers/securityEventController');
const { authenticateToken } = require('../middleware/auth');

// Todas as rotas exigem usuário autenticado
router.use(authenticateToken);

// Listar eventos de segurança do usuário autenticado
router.get('/', SecurityEventController.listEvents);

// Criar evento de segurança (para uso interno ou testes)
router.post('/', SecurityEventController.createEvent);

// Marcar eventos como lidos
router.post('/read', SecurityEventController.markAsRead);

module.exports = router;
