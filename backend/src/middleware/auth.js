const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido',
        code: 'TOKEN_REQUIRED'
      });
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário no banco de dados
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Conta desativada',
        code: 'ACCOUNT_DISABLED'
      });
    }

    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Conta temporariamente bloqueada devido a muitas tentativas de login',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Adicionar usuário ao request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Erro na autenticação:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Middleware opcional para autenticação (não bloqueia se não tiver token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);
      
      if (user && user.isActive && !user.isLocked()) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Se houver erro, continua sem usuário autenticado
    next();
  }
};

// Middleware para verificar se usuário é admin (para futuras funcionalidades)
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Privilégios de administrador necessários',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

// Função para gerar tokens JWT
const generateTokens = (user) => {
  const payload = {
    userId: user.id,
    email: user.email
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'password-manager-api',
    audience: 'password-manager-client'
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'password-manager-api',
    audience: 'password-manager-client'
  });

  return { accessToken, refreshToken };
};

// Middleware para verificar refresh token
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token requerido',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive || user.isLocked()) {
      return res.status(401).json({
        success: false,
        message: 'Usuário inválido ou conta bloqueada',
        code: 'INVALID_USER'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expirado',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    console.error('Erro na verificação do refresh token:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  generateTokens,
  verifyRefreshToken
};
