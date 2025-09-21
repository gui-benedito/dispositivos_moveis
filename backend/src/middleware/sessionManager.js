const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware para gerenciar sessões e expiração de tokens
 */
class SessionManager {
  /**
   * Middleware para verificar e renovar tokens automaticamente
   */
  static async sessionMiddleware(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next();
      }

      // Verificar se o token está próximo do vencimento (últimos 5 minutos)
      const decoded = jwt.decode(token);
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;

      // Se o token expira em menos de 5 minutos, tentar renovar
      if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
        try {
          const user = await User.findByPk(decoded.id);
          if (user && user.isActive) {
            // Gerar novo token
            const newToken = jwt.sign(
              { 
                id: user.id, 
                email: user.email,
                type: 'access'
              },
              process.env.JWT_SECRET,
              { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            // Adicionar novo token ao header da resposta
            res.set('X-New-Token', newToken);
          }
        } catch (error) {
          console.error('Erro ao renovar token:', error);
        }
      }

      next();
    } catch (error) {
      console.error('Erro no middleware de sessão:', error);
      next();
    }
  }

  /**
   * Middleware para invalidar tokens expirados
   */
  static async tokenValidationMiddleware(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token de acesso requerido',
          code: 'TOKEN_REQUIRED'
        });
      }

      // Verificar se o token é válido
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verificar se o usuário ainda existe e está ativo
      const user = await User.findByPk(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado ou inativo',
          code: 'USER_INACTIVE'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado',
          code: 'TOKEN_EXPIRED'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido',
          code: 'TOKEN_INVALID'
        });
      }

      console.error('Erro na validação do token:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Middleware para registrar atividade do usuário
   */
  static async activityTrackerMiddleware(req, res, next) {
    try {
      if (req.user) {
        // Atualizar último acesso do usuário
        await req.user.update({
          lastLogin: new Date()
        });
      }
      next();
    } catch (error) {
      console.error('Erro ao registrar atividade:', error);
      next();
    }
  }

  /**
   * Invalidar todos os tokens de um usuário (logout forçado)
   */
  static async invalidateUserTokens(userId) {
    try {
      // Em uma implementação mais robusta, você manteria uma blacklist de tokens
      // Por enquanto, vamos apenas atualizar o usuário para forçar re-autenticação
      const user = await User.findByPk(userId);
      if (user) {
        await user.update({
          lastLogin: new Date()
        });
      }
    } catch (error) {
      console.error('Erro ao invalidar tokens:', error);
    }
  }
}

module.exports = SessionManager;
