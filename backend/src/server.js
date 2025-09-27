const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const { syncDatabase } = require('./models');
const routes = require('./routes');
const { generalLimiter } = require('./middleware/rateLimiter');
const swaggerSpecs = require('./config/swagger');

const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const HOST = process.env.SERVER_HOST || '0.0.0.0';

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - mais permissivo para desenvolvimento
app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (ex: mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Em desenvolvimento, permite qualquer origem local
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Em produção, verificar domínios específicos
    const allowedOrigins = ['https://yourdomain.com'];
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Foo'],
  optionsSuccessStatus: 200 // Para suportar navegadores legados
}));

// Rate limiting geral
app.use(generalLimiter);

// Middleware para parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip} - Origin: ${req.headers.origin || 'N/A'}`);
  next();
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Password Manager API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

// Rotas da API
app.use('/api', routes);

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl
  });
});

// Middleware global de tratamento de erros
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  
  // Erro de sintaxe JSON
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      message: 'JSON inválido',
      code: 'INVALID_JSON'
    });
  }

  // Erro de limite de payload
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Payload muito grande',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }

  // Erro genérico
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR'
  });
});

// Função para iniciar o servidor
const startServer = async () => {
  try {
    // Sincronizar banco de dados
    await syncDatabase();
    
    // Iniciar servidor em todas as interfaces (0.0.0.0)
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌐 Host: ${HOST}`);
      console.log(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API disponível em:`);
      console.log(`   - http://localhost:${PORT}/api`);
      console.log(`   - http://127.0.0.1:${PORT}/api`);
      console.log(`   - http://${process.env.SERVER_HOST || 'localhost'}:${PORT}/api`);
      console.log(`📚 Documentação Swagger: http://localhost:${PORT}/api-docs`);
      console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Tratamento de sinais para shutdown graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido. Encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido. Encerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;
