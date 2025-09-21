const { User } = require('../models');
const { generateTokens } = require('../middleware/auth');

class AuthController {
  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Cadastrar novo usuário
   *     description: Cria uma nova conta de usuário com email e senha
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterRequest'
   *     responses:
   *       201:
   *         description: Usuário criado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *             example:
   *               success: true
   *               message: "Usuário criado com sucesso"
   *               data:
   *                 user:
   *                   id: "123e4567-e89b-12d3-a456-426614174000"
   *                   email: "usuario@exemplo.com"
   *                   firstName: "João"
   *                   lastName: "Silva"
   *                   isActive: true
   *                   createdAt: "2024-01-01T00:00:00.000Z"
   *                 tokens:
   *                   accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *                   refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       409:
   *         description: Email já está em uso
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: "Email já está em uso"
   *               code: "EMAIL_ALREADY_EXISTS"
   *       429:
   *         $ref: '#/components/responses/RateLimitError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async register(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Verificar se usuário já existe
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email já está em uso',
          code: 'EMAIL_ALREADY_EXISTS'
        });
      }

      // Criar novo usuário
      const user = await User.create({
        email,
        password,
        firstName,
        lastName
      });

      // Gerar tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Atualizar último login
      await user.update({ lastLogin: new Date() });

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: {
          user: user.toSafeJSON(),
          tokens: {
            accessToken,
            refreshToken
          }
        }
      });
    } catch (error) {
      console.error('Erro no cadastro:', error);
      
      // Tratar erros específicos do Sequelize
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => ({
          field: err.path,
          message: err.message,
          value: err.value
        }));

        return res.status(400).json({
          success: false,
          message: 'Dados de entrada inválidos',
          code: 'VALIDATION_ERROR',
          errors: validationErrors
        });
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Email já está em uso',
          code: 'EMAIL_ALREADY_EXISTS'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Fazer login
   *     description: Autentica um usuário com email e senha
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Login realizado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *             example:
   *               success: true
   *               message: "Login realizado com sucesso"
   *               data:
   *                 user:
   *                   id: "123e4567-e89b-12d3-a456-426614174000"
   *                   email: "usuario@exemplo.com"
   *                   firstName: "João"
   *                   lastName: "Silva"
   *                   isActive: true
   *                   lastLogin: "2024-01-01T00:00:00.000Z"
   *                 tokens:
   *                   accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *                   refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *       401:
   *         description: Credenciais inválidas ou conta bloqueada
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               invalid_credentials:
   *                 summary: Credenciais inválidas
   *                 value:
   *                   success: false
   *                   message: "Credenciais inválidas"
   *                   code: "INVALID_CREDENTIALS"
   *               account_locked:
   *                 summary: Conta bloqueada
   *                 value:
   *                   success: false
   *                   message: "Conta temporariamente bloqueada devido a muitas tentativas de login"
   *                   code: "ACCOUNT_LOCKED"
   *               account_disabled:
   *                 summary: Conta desativada
   *                 value:
   *                   success: false
   *                   message: "Conta desativada"
   *                   code: "ACCOUNT_DISABLED"
   *       423:
   *         description: Conta bloqueada por muitas tentativas
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: "Conta temporariamente bloqueada devido a muitas tentativas de login"
   *               code: "ACCOUNT_LOCKED"
   *       429:
   *         $ref: '#/components/responses/RateLimitError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Buscar usuário
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Verificar se conta está bloqueada
      if (user.isLocked()) {
        return res.status(423).json({
          success: false,
          message: 'Conta temporariamente bloqueada devido a muitas tentativas de login',
          code: 'ACCOUNT_LOCKED'
        });
      }

      // Verificar se conta está ativa
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Conta desativada',
          code: 'ACCOUNT_DISABLED'
        });
      }

      // Verificar senha
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        // Incrementar tentativas de login
        await user.incLoginAttempts();
        
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Resetar tentativas de login em caso de sucesso
      await user.resetLoginAttempts();

      // Gerar tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Atualizar último login
      await user.update({ lastLogin: new Date() });

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: user.toSafeJSON(),
          tokens: {
            accessToken,
            refreshToken
          }
        }
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/auth/refresh-token:
   *   post:
   *     summary: Renovar token de acesso
   *     description: Renova o token de acesso usando o refresh token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RefreshTokenRequest'
   *     responses:
   *       200:
   *         description: Token renovado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Token renovado com sucesso"
   *                 data:
   *                   type: object
   *                   properties:
   *                     tokens:
   *                       type: object
   *                       properties:
   *                         accessToken:
   *                           type: string
   *                           description: "Novo token de acesso JWT"
   *                         refreshToken:
   *                           type: string
   *                           description: "Novo refresh token JWT"
   *       401:
   *         description: Refresh token inválido ou expirado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               invalid_token:
   *                 summary: Token inválido
   *                 value:
   *                   success: false
   *                   message: "Refresh token inválido"
   *                   code: "INVALID_REFRESH_TOKEN"
   *               expired_token:
   *                 summary: Token expirado
   *                 value:
   *                   success: false
   *                   message: "Refresh token expirado"
   *                   code: "REFRESH_TOKEN_EXPIRED"
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      const user = req.user; // Já validado pelo middleware

      // Gerar novos tokens
      const { accessToken, newRefreshToken } = generateTokens(user);

      res.json({
        success: true,
        message: 'Token renovado com sucesso',
        data: {
          tokens: {
            accessToken,
            refreshToken: newRefreshToken
          }
        }
      });
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Fazer logout
   *     description: Realiza logout do usuário (invalidar token)
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logout realizado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Logout realizado com sucesso"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async logout(req, res) {
    try {
      // Em uma implementação mais robusta, você manteria uma blacklist de tokens
      // Por enquanto, apenas retornamos sucesso
      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      console.error('Erro no logout:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/auth/profile:
   *   get:
   *     summary: Obter perfil do usuário
   *     description: Retorna os dados do perfil do usuário autenticado
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Perfil obtido com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Perfil obtido com sucesso"
   *                 data:
   *                   type: object
   *                   properties:
   *                     user:
   *                       $ref: '#/components/schemas/User'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async getProfile(req, res) {
    try {
      const user = req.user; // Já autenticado pelo middleware

      res.json({
        success: true,
        message: 'Perfil obtido com sucesso',
        data: {
          user: user.toSafeJSON()
        }
      });
    } catch (error) {
      console.error('Erro ao obter perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/auth/check-email:
   *   get:
   *     summary: Verificar disponibilidade de email
   *     description: Verifica se um email está disponível para cadastro
   *     tags: [Authentication]
   *     parameters:
   *       - in: query
   *         name: email
   *         required: true
   *         schema:
   *           type: string
   *           format: email
   *         description: Email a ser verificado
   *         example: usuario@exemplo.com
   *     responses:
   *       200:
   *         description: Verificação concluída
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Verificação de email concluída"
   *                 data:
   *                   type: object
   *                   properties:
   *                     email:
   *                       type: string
   *                       format: email
   *                       example: "usuario@exemplo.com"
   *                     isAvailable:
   *                       type: boolean
   *                       description: "true se o email está disponível, false se já está em uso"
   *                       example: true
   *       400:
   *         description: Email não fornecido
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: "Email é obrigatório"
   *               code: "EMAIL_REQUIRED"
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async checkEmailAvailability(req, res) {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email é obrigatório',
          code: 'EMAIL_REQUIRED'
        });
      }

      const existingUser = await User.findOne({ where: { email } });
      const isAvailable = !existingUser;

      res.json({
        success: true,
        message: 'Verificação de email concluída',
        data: {
          email,
          isAvailable
        }
      });
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Verificar senha do usuário (para desbloqueio)
   * @swagger
   * /api/auth/verify-password:
   *   post:
   *     summary: Verificar senha do usuário
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - password
   *             properties:
   *               password:
   *                 type: string
   *                 description: Senha do usuário
   *     responses:
   *       200:
   *         description: Senha verificada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       401:
   *         description: Senha incorreta
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 code:
   *                   type: string
   *       500:
   *         description: Erro interno do servidor
   */
  static async verifyPassword(req, res) {
    try {
      const { password } = req.body;
      const userId = req.user.id;

      // Buscar usuário
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }

      // Verificar senha
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Senha incorreta',
          code: 'INVALID_PASSWORD'
        });
      }

      return res.json({
        success: true,
        message: 'Senha verificada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = AuthController;
