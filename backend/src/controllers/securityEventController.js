const { SecurityEvent } = require('../models');
const { Op } = require('sequelize');

class SecurityEventController {
  // Registrar um novo evento de segurança (poderá ser usado por outros controllers)
  static async createEvent(req, res) {
    try {
      const userId = req.user.id;
      const {
        type,
        severity = 'low',
        title,
        message,
        ipAddress,
        geo,
        deviceInfo,
        metadata,
      } = req.body;

      if (!type || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'type, title e message são obrigatórios',
          code: 'VALIDATION_ERROR',
        });
      }

      const event = await SecurityEvent.create({
        userId,
        type,
        severity,
        title,
        message,
        ipAddress: ipAddress || req.ip,
        geo: geo || null,
        deviceInfo: deviceInfo || null,
        metadata: metadata || null,
      });

      return res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error) {
      console.error('Erro ao criar evento de segurança:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  // Listar eventos de segurança do usuário com filtros básicos
  static async listEvents(req, res) {
    try {
      const userId = req.user.id;
      const {
        type,
        severity,
        since,
        until,
        page = 1,
        pageSize = 20,
        unreadOnly,
      } = req.query;

      const where = { userId };

      if (type) {
        where.type = type;
      }

      if (severity) {
        where.severity = severity;
      }

      if (unreadOnly === 'true') {
        where.readAt = { [Op.is]: null };
      }

      if (since || until) {
        where.createdAt = {};
        if (since) {
          where.createdAt[Op.gte] = new Date(since);
        }
        if (until) {
          where.createdAt[Op.lte] = new Date(until);
        }
      }

      const limit = Math.min(parseInt(pageSize, 10) || 20, 100);
      const offset = ((parseInt(page, 10) || 1) - 1) * limit;

      const { rows, count } = await SecurityEvent.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page, 10) || 1,
          pageSize: limit,
        },
      });
    } catch (error) {
      console.error('Erro ao listar eventos de segurança:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  // Marcar eventos como lidos
  static async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ids deve ser um array não vazio',
          code: 'VALIDATION_ERROR',
        });
      }

      await SecurityEvent.update(
        { readAt: new Date() },
        {
          where: {
            userId,
            id: { [Op.in]: ids },
            readAt: { [Op.is]: null },
          },
        }
      );

      return res.json({
        success: true,
        message: 'Eventos marcados como lidos',
      });
    } catch (error) {
      console.error('Erro ao marcar eventos como lidos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }
}

module.exports = SecurityEventController;
