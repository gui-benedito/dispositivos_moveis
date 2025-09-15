const rateLimit = require('express-rate-limit');

// Rate limiter para rotas de autenticação (mais restritivo)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5, // máximo 5 tentativas por IP
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Retorna rate limit info nos headers
  legacyHeaders: false, // Desabilita headers X-RateLimit-*
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  },
  // Pular rate limit para IPs confiáveis (opcional)
  skip: (req) => {
    // Em produção, você pode adicionar IPs confiáveis aqui
    return false;
  },
  // Key generator personalizada (opcional)
  keyGenerator: (req) => {
    // Usar IP + User-Agent para melhor identificação
    return `${req.ip}-${req.get('User-Agent')}`;
  }
});

// Rate limiter geral para outras rotas (menos restritivo)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter para criação de contas (muito restritivo)
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 tentativas de cadastro por IP por hora
  message: {
    success: false,
    message: 'Muitas tentativas de cadastro. Tente novamente em 1 hora.',
    code: 'REGISTRATION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter para reset de senha
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 tentativas por IP por hora
  message: {
    success: false,
    message: 'Muitas tentativas de reset de senha. Tente novamente em 1 hora.',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  generalLimiter,
  registrationLimiter,
  passwordResetLimiter
};
