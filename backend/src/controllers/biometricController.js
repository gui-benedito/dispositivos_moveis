const { User, BiometricSession } = require('../models');
const { generateTokens } = require('../middleware/auth');
const { logSecurityEvent } = require('../services/securityEventLogger');
const crypto = require('crypto');

// Debug: verificar se BiometricSession está disponível
console.log('BiometricSession model:', BiometricSession ? 'Available' : 'Not available');

class BiometricController {
  /**
   * @swagger
   * /api/biometric/enable:
   *   post:
   *     summary: Ativar autenticação biométrica
   *     description: Ativa a autenticação biométrica para o usuário
   *     tags: [Biometric]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - biometricType
   *             properties:
   *               biometricType:
   *                 type: string
   *                 enum: [fingerprint, face, both]
   *                 description: Tipo de biometria a ser ativada
   *               deviceInfo:
   *                 type: object
   *                 description: Informações do dispositivo
   *     responses:
   *       200:
   *         description: Biometria ativada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     biometricEnabled:
   *                       type: boolean
   *                     biometricType:
   *                       type: string
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async enableBiometric(req, res) {
    try {
      const { biometricType, deviceInfo } = req.body;
      const userId = req.user.id;

      // Validar tipo de biometria
      if (biometricType !== 'fingerprint') {
        return res.status(400).json({
          success: false,
          message: 'Tipo de biometria inválido. Apenas impressão digital é suportada.',
          code: 'INVALID_BIOMETRIC_TYPE'
        });
      }

      // Atualizar usuário
      await User.update({
        biometricEnabled: true,
        biometricType: biometricType,
        biometricLastUsed: new Date()
      }, {
        where: { id: userId }
      });

      // Criar sessão biométrica inicial
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

      await BiometricSession.create({
        userId: userId,
        sessionId: sessionId,
        biometricType: biometricType,
        deviceInfo: deviceInfo || {},
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        expiresAt: expiresAt,
        lastUsed: new Date()
      });

      res.json({
        success: true,
        message: 'Autenticação biométrica ativada com sucesso',
        data: {
          biometricEnabled: true,
          biometricType: biometricType,
          sessionId: sessionId
        }
      });
    } catch (error) {
      console.error('Erro ao ativar biometria:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/biometric/disable:
   *   post:
   *     summary: Desativar autenticação biométrica
   *     description: Desativa a autenticação biométrica para o usuário
   *     tags: [Biometric]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Biometria desativada com sucesso
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
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async disableBiometric(req, res) {
    try {
      const userId = req.user.id;

      // Desativar biometria no usuário
      await User.update({
        biometricEnabled: false,
        biometricType: null,
        biometricLastUsed: null
      }, {
        where: { id: userId }
      });

      // Invalidar todas as sessões biométricas ativas
      await BiometricSession.update({
        success: false,
        failureReason: 'Biometria desativada pelo usuário'
      }, {
        where: {
          userId: userId,
          success: true
        }
      });

      res.json({
        success: true,
        message: 'Autenticação biométrica desativada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao desativar biometria:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/biometric/authenticate:
   *   post:
   *     summary: Autenticar com biometria
   *     description: Autentica o usuário usando biometria
   *     tags: [Biometric]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - sessionId
   *               - biometricType
   *             properties:
   *               sessionId:
   *                 type: string
   *                 description: ID da sessão biométrica
   *               biometricType:
   *                 type: string
   *                 enum: [fingerprint, face, both]
   *               deviceInfo:
   *                 type: object
   *                 description: Informações do dispositivo
   *     responses:
   *       200:
   *         description: Autenticação biométrica bem-sucedida
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         description: Autenticação biométrica falhou
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               invalid_session:
   *                 summary: Sessão inválida
   *                 value:
   *                   success: false
   *                   message: "Sessão biométrica inválida ou expirada"
   *                   code: "INVALID_BIOMETRIC_SESSION"
   *               biometric_disabled:
   *                 summary: Biometria desativada
   *                 value:
   *                   success: false
   *                   message: "Autenticação biométrica não está ativada"
   *                   code: "BIOMETRIC_DISABLED"
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async authenticateBiometric(req, res) {
    try {
      const { sessionId, biometricType, deviceInfo, email } = req.body;

      // Buscar sessão biométrica
      let session = await BiometricSession.findOne({
        where: { sessionId },
        include: [{
          model: User,
          as: 'user',
          where: { isActive: true }
        }]
      });

      // Se não encontrou sessão, tentar encontrar usuário por email e recriar sessão
      if (!session && email) {
        const user = await User.findOne({ 
          where: { email, isActive: true, biometricEnabled: true } 
        });
        
        if (user) {
          // Recriar sessão biométrica para o usuário
          const newSessionId = crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

          session = await BiometricSession.create({
            userId: user.id,
            sessionId: newSessionId,
            biometricType: user.biometricType,
            deviceInfo: deviceInfo || {},
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            expiresAt: expiresAt,
            lastUsed: new Date()
          });

          // Incluir o usuário na sessão
          session.user = user;
        }
      }

      if (!session) {
        await logSecurityEvent({
          userId: null,
          type: 'biometric_auth_invalid_session',
          severity: 'medium',
          title: 'Sessão biométrica inválida',
          message: 'Tentativa de autenticação biométrica com sessão inexistente.',
          req,
          metadata: { sessionId },
        });
        return res.status(401).json({
          success: false,
          message: 'Sessão biométrica inválida',
          code: 'INVALID_BIOMETRIC_SESSION'
        });
      }

      const user = session.user;

      // Verificar se a sessão é válida
      if (!session.isValid()) {
        await logSecurityEvent({
          userId: user.id,
          type: 'biometric_auth_session_expired',
          severity: 'medium',
          title: 'Sessão biométrica expirada',
          message: 'Tentativa de autenticação biométrica com sessão expirada.',
          req,
          metadata: { sessionId },
        });
        return res.status(401).json({
          success: false,
          message: 'Sessão biométrica expirada',
          code: 'BIOMETRIC_SESSION_EXPIRED'
        });
      }

      // Verificar se biometria está ativada
      if (!user.biometricEnabled) {
        await logSecurityEvent({
          userId: user.id,
          type: 'biometric_auth_disabled',
          severity: 'low',
          title: 'Biometria desativada durante autenticação',
          message: 'Tentativa de autenticação biométrica quando a biometria está desativada.',
          req,
        });
        return res.status(401).json({
          success: false,
          message: 'Autenticação biométrica não está ativada',
          code: 'BIOMETRIC_DISABLED'
        });
      }

      // Verificar tipo de biometria
      if (user.biometricType !== biometricType && user.biometricType !== 'both') {
        await logSecurityEvent({
          userId: user.id,
          type: 'biometric_auth_type_mismatch',
          severity: 'medium',
          title: 'Tipo de biometria não corresponde ao configurado',
          message: 'Tentativa de autenticação biométrica com tipo diferente do configurado.',
          req,
          metadata: { biometricTypeConfigured: user.biometricType, biometricTypeUsed: biometricType },
        });
        return res.status(401).json({
          success: false,
          message: 'Tipo de biometria não corresponde ao configurado',
          code: 'BIOMETRIC_TYPE_MISMATCH'
        });
      }

      // Marcar sessão como usada
      await session.markAsUsed();

      // Atualizar último uso da biometria
      await user.update({ biometricLastUsed: new Date() });

      // Verificar se usuário tem 2FA ativado
      const { TwoFactorAuth } = require('../models');
      const twoFactorConfig = await TwoFactorAuth.findOne({
        where: { 
          userId: user.id, 
          method: 'email',
          isEnabled: true 
        }
      });

      if (twoFactorConfig) {
        console.log('🔧 Usuário tem 2FA ativado, enviando código...');
        
        // Gerar código de verificação
        const EmailService = require('../services/emailService');
        const verificationCode = EmailService.generateVerificationCode();
        
        // Salvar código temporário
        const { VerificationCode } = require('../models');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
        
        await VerificationCode.create({
          userId: user.id,
          email: user.email,
          code: verificationCode,
          type: '2fa_login',
          expiresAt
        });

        // Enviar email (simulado para desenvolvimento)
        try {
          await EmailService.sendVerificationCode(user.email, verificationCode, `${user.firstName} ${user.lastName}`);
          console.log('🔧 Email de 2FA enviado com sucesso');
        } catch (emailError) {
          console.error('❌ Erro ao enviar email 2FA:', emailError);
          console.log('📧 [FALLBACK] Código de verificação para login:', verificationCode);
        }

        // Retornar resposta indicando que 2FA é necessário
        return res.status(202).json({
          success: true,
          message: 'Código de verificação enviado para seu email',
          data: {
            requires2FA: true,
            method: 'email',
            email: user.email,
            user: user.toSafeJSON() // Incluir dados do usuário
          }
        });
      }

      // Sem 2FA, prosseguir com login normal
      console.log('🔧 Usuário sem 2FA, login biométrico normal');
      
      // Gerar tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Atualizar último login
      await user.update({ lastLogin: new Date() });

      // Log da autenticação biométrica
      console.log(`🔐 Autenticação biométrica bem-sucedida para usuário ${user.email} (${biometricType})`);

      res.json({
        success: true,
        message: 'Autenticação biométrica realizada com sucesso',
        data: {
          user: user.toSafeJSON(),
          tokens: {
            accessToken,
            refreshToken
          },
          sessionId: session.sessionId // Incluir sessionId na resposta
        }
      });

      await logSecurityEvent({
        userId: user.id,
        type: 'biometric_auth_success',
        severity: 'low',
        title: 'Autenticação biométrica bem-sucedida',
        message: 'O usuário autenticou com sucesso usando biometria.',
        req,
        metadata: { biometricType },
      });
    } catch (error) {
      console.error('Erro na autenticação biométrica:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/biometric/status:
   *   get:
   *     summary: Obter status da biometria
   *     description: Retorna o status atual da autenticação biométrica do usuário
   *     tags: [Biometric]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Status da biometria obtido com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     biometricEnabled:
   *                       type: boolean
   *                     biometricType:
   *                       type: string
   *                     biometricLastUsed:
   *                       type: string
   *                       format: date-time
   *                     activeSessions:
   *                       type: integer
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async getBiometricStatus(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }

      // Verificar se BiometricSession está disponível
      if (!BiometricSession) {
        console.error('BiometricSession model is not available');
        return res.status(500).json({
          success: false,
          message: 'Modelo biométrico não disponível',
          code: 'MODEL_NOT_AVAILABLE'
        });
      }

      // Contar sessões ativas
      const activeSessions = await BiometricSession.count({
        where: {
          userId: userId,
          success: true,
          expiresAt: {
            [require('sequelize').Op.gt]: new Date()
          }
        }
      });

      res.json({
        success: true,
        data: {
          biometricEnabled: user.biometricEnabled,
          biometricType: user.biometricType,
          biometricLastUsed: user.biometricLastUsed,
          activeSessions: activeSessions
        }
      });
    } catch (error) {
      console.error('Erro ao obter status da biometria:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/biometric/sessions:
   *   get:
   *     summary: Listar sessões biométricas
   *     description: Lista todas as sessões biométricas do usuário para auditoria
   *     tags: [Biometric]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Sessões biométricas listadas com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       sessionId:
   *                         type: string
   *                       biometricType:
   *                         type: string
   *                       deviceInfo:
   *                         type: object
   *                       ipAddress:
   *                         type: string
   *                       success:
   *                         type: boolean
   *                       expiresAt:
   *                         type: string
   *                         format: date-time
   *                       lastUsed:
   *                         type: string
   *                         format: date-time
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async getBiometricSessions(req, res) {
    try {
      const userId = req.user.id;

      const sessions = await BiometricSession.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        attributes: [
          'id', 'sessionId', 'biometricType', 'deviceInfo', 
          'ipAddress', 'success', 'failureReason', 'expiresAt', 
          'lastUsed', 'createdAt'
        ]
      });

      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      console.error('Erro ao listar sessões biométricas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/biometric/check-user:
   *   post:
   *     summary: Verificar se usuário tem biometria habilitada
   *     description: Verifica se um usuário tem biometria habilitada sem precisar de autenticação
   *     tags: [Biometric]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: Email do usuário
   *     responses:
   *       200:
   *         description: Status da biometria obtido com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     biometricEnabled:
   *                       type: boolean
   *                     biometricType:
   *                       type: string
   *       404:
   *         description: Usuário não encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async checkUserBiometric(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email é obrigatório',
          code: 'EMAIL_REQUIRED'
        });
      }

      const user = await User.findOne({
        where: { email, isActive: true },
        attributes: ['id', 'email', 'biometricEnabled', 'biometricType']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: {
          biometricEnabled: user.biometricEnabled,
          biometricType: user.biometricType
        }
      });
    } catch (error) {
      console.error('Erro ao verificar biometria do usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = BiometricController;
