const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Password Manager API',
      version: '1.0.0',
      description: 'API para gerenciamento seguro de senhas com criptografia AES-256',
      contact: {
        name: 'Password Manager Team',
        email: 'support@passwordmanager.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.passwordmanager.com' 
          : `http://${process.env.SERVER_HOST || 'localhost'}:${process.env.SERVER_PORT || 3000}`,
        description: process.env.NODE_ENV === 'production' 
          ? 'Servidor de Produção' 
          : 'Servidor de Desenvolvimento'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido através do login'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do usuário'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário'
            },
            firstName: {
              type: 'string',
              description: 'Nome do usuário'
            },
            lastName: {
              type: 'string',
              description: 'Sobrenome do usuário'
            },
            isActive: {
              type: 'boolean',
              description: 'Status da conta'
            },
            biometricEnabled: {
              type: 'boolean',
              description: 'Biometria habilitada'
            },
            twoFactorEnabled: {
              type: 'boolean',
              description: '2FA habilitado'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Último login'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data de atualização'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário',
              example: 'usuario@exemplo.com'
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'Senha do usuário (mínimo 8 caracteres, deve conter maiúscula, minúscula, número e símbolo)',
              example: 'MinhaSenh@123'
            },
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Nome do usuário',
              example: 'João'
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Sobrenome do usuário',
              example: 'Silva'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário',
              example: 'usuario@exemplo.com'
            },
            password: {
              type: 'string',
              description: 'Senha do usuário',
              example: 'MinhaSenh@123'
            }
          }
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Refresh token para renovar acesso',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indica se a operação foi bem-sucedida'
            },
            message: {
              type: 'string',
              description: 'Mensagem de resposta'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: {
                      type: 'string',
                      description: 'Token de acesso JWT'
                    },
                    refreshToken: {
                      type: 'string',
                      description: 'Token de renovação JWT'
                    }
                  }
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Mensagem de erro'
            },
            code: {
              type: 'string',
              description: 'Código do erro'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Campo com erro'
                  },
                  message: {
                    type: 'string',
                    description: 'Mensagem de erro do campo'
                  },
                  value: {
                    type: 'string',
                    description: 'Valor fornecido'
                  }
                }
              }
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'API está funcionando'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            version: {
              type: 'string',
              example: '1.0.0'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Token de acesso inválido ou expirado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                message: 'Token de acesso requerido',
                code: 'TOKEN_REQUIRED'
              }
            }
          }
        },
        ValidationError: {
          description: 'Dados de entrada inválidos',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                message: 'Dados de entrada inválidos',
                code: 'VALIDATION_ERROR',
                errors: [
                  {
                    field: 'email',
                    message: 'Email deve ter um formato válido',
                    value: 'email-invalido'
                  }
                ]
              }
            }
          }
        },
        RateLimitError: {
          description: 'Muitas tentativas de requisição',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 900
              }
            }
          }
        },
        InternalServerError: {
          description: 'Erro interno do servidor',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                message: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Endpoints de autenticação e autorização'
      },
      {
        name: 'Health',
        description: 'Endpoints de verificação de saúde da API'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;

