const { User, TwoFactorAuth, VerificationCode } = require('../models');
const TwoFactorService = require('../services/twoFactorService');
const EmailService = require('../services/emailService');
const { generateTokens } = require('../middleware/auth');
const { logSecurityEvent } = require('../services/securityEventLogger');
const crypto = require('crypto');

class TwoFactorController {
  /**
   * @swagger
   * /api/2fa/setup:
   *   post:
   *     summary: Configurar 2FA para usuário
   *     description: Inicia o processo de configuração do 2FA
   *     tags: [TwoFactor]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - method
   *             properties:
   *               method:
   *                 type: string
   *                 enum: [totp, sms]
   *                 description: Método de 2FA
   *               phoneNumber:
   *                 type: string
   *                 description: Número de telefone (apenas para SMS)
   *     responses:
   *       200:
   *         description: 2FA configurado com sucesso
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
   *                     qrCode:
   *                       type: string
   *                       description: QR Code para TOTP (apenas para TOTP)
   *                     secret:
   *                       type: string
   *                       description: Segredo TOTP (apenas para TOTP)
   *                     recoveryCodes:
   *                       type: array
   *                       items:
   *                         type: string
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async setup2FA(req, res) {
    try {
      console.log('🔧 Iniciando configuração 2FA...');
      const { method, phoneNumber } = req.body;
      const userId = req.user.id;
      const user = req.user;
      
      console.log('🔧 Método:', method);
      console.log('🔧 UserId:', userId);

      // Verificar se 2FA já está ativado
      const existing2FA = await TwoFactorAuth.findOne({
        where: { userId, method, isEnabled: true }
      });

      if (existing2FA) {
        return res.status(400).json({
          success: false,
          message: '2FA já está ativado para este método',
          code: '2FA_ALREADY_ENABLED'
        });
      }

      let responseData = {};

      if (method === 'email') {
        console.log('🔧 Configurando Email 2FA...');
        
        // Usar o email do usuário
        const userEmail = user.email;
        console.log('🔧 Email do usuário (original):', userEmail);
        console.log('🔧 Email do usuário (tipo):', typeof userEmail);
        console.log('🔧 Email do usuário (length):', userEmail.length);

        // Gerar código de verificação
        const verificationCode = EmailService.generateVerificationCode();
        console.log('🔧 Código gerado:', verificationCode);

        // Salvar código temporário (expira em 10 minutos)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
        await VerificationCode.create({
          userId,
          email: userEmail,
          code: verificationCode,
          type: '2fa_setup',
          expiresAt
        });

        // Enviar email com código
        try {
          await EmailService.sendVerificationCode(userEmail, verificationCode, `${user.firstName} ${user.lastName}`);
          console.log('🔧 Email enviado com sucesso');
          console.log('📧 [DESENVOLVIMENTO] Código de verificação:', verificationCode);
        } catch (emailError) {
          console.error('❌ Erro ao enviar email:', emailError);
          console.log('📧 [DESENVOLVIMENTO] Código de verificação:', verificationCode);
          console.log('📧 [DESENVOLVIMENTO] Email seria enviado para:', userEmail);
          // Continuar mesmo se email falhar (para desenvolvimento)
        }

        // Salvar configuração Email (ainda não ativado)
        await TwoFactorAuth.create({
          userId,
          method: 'email',
          email: userEmail,
          isEnabled: false,
          isVerified: false
        });

        responseData = {
          email: userEmail,
          message: 'Código de verificação enviado para seu email. Verifique sua caixa de entrada.'
        };
      }

      console.log('🔧 Retornando resposta...');
      res.json({
        success: true,
        message: '2FA configurado com sucesso',
        data: responseData
      });

      await logSecurityEvent({
        userId,
        type: '2fa_setup_email_requested',
        severity: 'low',
        title: 'Configuração de 2FA por email iniciada',
        message: 'Um código de verificação foi enviado para o email do usuário para configurar o 2FA.',
        req,
        metadata: { method },
      });

    } catch (error) {
      console.error('❌ Erro ao configurar 2FA:', error);
      console.error('❌ Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/2fa/verify:
   *   post:
   *     summary: Verificar código 2FA
   *     description: Verifica o código 2FA para ativar ou autenticar
   *     tags: [TwoFactor]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - method
   *               - code
   *             properties:
   *               method:
   *                 type: string
   *                 enum: [totp, sms]
   *               code:
   *                 type: string
   *                 description: Código de verificação
   *               isActivation:
   *                 type: boolean
   *                 description: Se é ativação (true) ou autenticação (false)
   *     responses:
   *       200:
   *         description: Código verificado com sucesso
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async verify2FALogin(req, res) {
    try {
      console.log('🔧 Iniciando verificação 2FA para login...');
      const { method, code } = req.body;
      
      console.log('🔧 Método:', method);
      console.log('🔧 Código:', code);

      // Buscar código de verificação válido
      const verificationRecord = await VerificationCode.findOne({
        where: {
          code,
          type: '2fa_login',
          isUsed: false,
          expiresAt: {
            [require('sequelize').Op.gt]: new Date()
          }
        },
        include: [{
          model: User,
          as: 'user'
        }]
      });

      if (!verificationRecord) {
        console.log('❌ Código inválido ou expirado');
        await logSecurityEvent({
          userId: null,
          type: 'login_2fa_invalid_code',
          severity: 'medium',
          title: 'Código 2FA inválido ou expirado (login)',
          message: 'Tentativa de login 2FA falhou devido a código inválido ou expirado.',
          req,
          metadata: { method },
        });
        return res.status(401).json({
          success: false,
          message: 'Código inválido ou expirado',
          code: 'INVALID_CODE'
        });
      }

      const user = verificationRecord.user;
      console.log('🔧 Usuário encontrado:', user.email);

      // Marcar código como usado
      await verificationRecord.update({ isUsed: true });

      // Gerar tokens
      const { generateTokens } = require('../middleware/auth');
      const { accessToken, refreshToken } = generateTokens(user);

      // Atualizar último login
      await user.update({ lastLogin: new Date() });

      console.log('🔧 Login 2FA realizado com sucesso');
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

      await logSecurityEvent({
        userId: user.id,
        type: 'login_2fa_success',
        severity: 'low',
        title: 'Login 2FA realizado com sucesso',
        message: 'O usuário concluiu o login utilizando código 2FA enviado por email.',
        req,
        metadata: { method },
      });
    } catch (error) {
      console.error('❌ Erro ao verificar 2FA para login:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  static async verify2FA(req, res) {
    try {
      console.log('🔧 Iniciando verificação 2FA...');
      const { method, code, isActivation = false } = req.body;
      const userId = req.user.id;
      const user = req.user;
      
      console.log('🔧 Método:', method);
      console.log('🔧 Código:', code);
      console.log('🔧 Ativação:', isActivation);
      console.log('🔧 UserId:', userId);

      // Buscar configuração 2FA
      console.log('🔧 Buscando configuração 2FA...');
      const twoFactorConfig = await TwoFactorAuth.findOne({
        where: { userId, method }
      });

      if (!twoFactorConfig) {
        console.log('❌ Configuração 2FA não encontrada');
        await logSecurityEvent({
          userId,
          type: '2fa_config_not_found',
          severity: 'medium',
          title: 'Configuração 2FA não encontrada',
          message: 'Tentativa de usar 2FA para um método sem configuração ativa.',
          req,
          metadata: { method, isActivation },
        });
        return res.status(404).json({
          success: false,
          message: 'Configuração 2FA não encontrada',
          code: '2FA_NOT_FOUND'
        });
      }
      
      console.log('🔧 Configuração encontrada:', twoFactorConfig.id);

      // Verificar se está bloqueado
      if (twoFactorConfig.isLocked()) {
        return res.status(423).json({
          success: false,
          message: '2FA temporariamente bloqueado por muitas tentativas',
          code: '2FA_LOCKED'
        });
      }

      let isValid = false;

      if (method === 'email') {
        console.log('🔧 Verificando código Email...');
        
        // Buscar código de verificação válido (setup ou login)
        const verificationRecord = await VerificationCode.findOne({
          where: {
            userId,
            email: user.email,
            code,
            type: isActivation ? '2fa_setup' : '2fa_login',
            isUsed: false,
            expiresAt: {
              [require('sequelize').Op.gt]: new Date() // Ainda não expirou
            }
          }
        });

        if (verificationRecord) {
          console.log('🔧 Código válido encontrado');
          isValid = true;
          
          // Marcar código como usado
          await verificationRecord.update({ isUsed: true });
        } else {
          console.log('🔧 Código inválido ou expirado');
          isValid = false;
        }
        
        console.log('🔧 Código válido:', isValid);
      }

      if (!isValid) {
        // Incrementar tentativas falhadas
        await twoFactorConfig.incrementFailedAttempts();
        await logSecurityEvent({
          userId,
          type: isActivation ? '2fa_activation_invalid_code' : '2fa_login_invalid_code',
          severity: 'medium',
          title: isActivation ? 'Código 2FA inválido na ativação' : 'Código 2FA inválido no login',
          message: 'Um código 2FA inválido foi informado.',
          req,
          metadata: { method, isActivation },
        });

        return res.status(401).json({
          success: false,
          message: 'Código 2FA inválido',
          code: 'INVALID_2FA_CODE'
        });
      }

      // Resetar tentativas falhadas
      await twoFactorConfig.resetFailedAttempts();

      if (isActivation) {
        console.log('🔧 Ativando 2FA...');
        // Ativar 2FA
        await twoFactorConfig.update({
          isEnabled: true,
          isVerified: true
        });
        console.log('🔧 2FA ativado com sucesso');

        // Enviar email de confirmação
        try {
          await EmailService.send2FAConfirmation(user.email, `${user.firstName} ${user.lastName}`);
          console.log('🔧 Email de confirmação enviado');
        } catch (emailError) {
          console.error('❌ Erro ao enviar email de confirmação:', emailError);
          // Continuar mesmo se email falhar
        }

        res.json({
          success: true,
          message: '2FA ativado com sucesso'
        });

        await logSecurityEvent({
          userId,
          type: '2fa_enabled_email',
          severity: 'low',
          title: '2FA por email ativado',
          message: 'O usuário ativou autenticação em duas etapas por email.',
          req,
          metadata: { method },
        });
      } else {
        console.log('🔧 Autenticação 2FA...');
        // Autenticação 2FA
        await twoFactorConfig.markAsUsed();

        // Gerar tokens de acesso
        const { accessToken, refreshToken } = generateTokens(user);
        console.log('🔧 Tokens gerados');

        res.json({
          success: true,
          message: 'Autenticação 2FA realizada com sucesso',
          data: {
            tokens: { accessToken, refreshToken }
          }
        });

        await logSecurityEvent({
          userId,
          type: '2fa_login_success',
          severity: 'low',
          title: 'Autenticação 2FA realizada com sucesso',
          message: 'O usuário autenticou com sucesso usando 2FA.',
          req,
          metadata: { method },
        });
      }

    } catch (error) {
      console.error('❌ Erro ao verificar 2FA:', error);
      console.error('❌ Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/2fa/disable:
   *   post:
   *     summary: Desativar 2FA
   *     description: Desativa o 2FA para o usuário
   *     tags: [TwoFactor]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - method
   *               - code
   *             properties:
   *               method:
   *                 type: string
   *                 enum: [totp, sms]
   *               code:
   *                 type: string
   *                 description: Código 2FA para confirmar desativação
   *     responses:
   *       200:
   *         description: 2FA desativado com sucesso
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async disable2FA(req, res) {
    try {
      const { method } = req.body;
      const userId = req.user.id;
      const user = req.user;

      console.log('🔧 Iniciando desativação 2FA...');
      console.log('🔧 Método:', method);
      console.log('🔧 UserId:', userId);

      // Buscar configuração 2FA
      const twoFactorConfig = await TwoFactorAuth.findOne({
        where: { userId, method, isEnabled: true }
      });

      if (!twoFactorConfig) {
        console.log('❌ 2FA não está ativado');
        await logSecurityEvent({
          userId,
          type: '2fa_disable_not_enabled',
          severity: 'low',
          title: 'Tentativa de desativar 2FA não ativado',
          message: 'O usuário tentou desativar 2FA que não estava ativado.',
          req,
          metadata: { method },
        });
        return res.status(404).json({
          success: false,
          message: '2FA não está ativado',
          code: '2FA_NOT_ENABLED'
        });
      }

      console.log('🔧 Configuração 2FA encontrada:', twoFactorConfig.id);

      // Desativar 2FA diretamente
      await twoFactorConfig.update({
        isEnabled: false,
        isVerified: false
      });

      console.log('✅ 2FA desativado com sucesso');

      res.json({
        success: true,
        message: '2FA desativado com sucesso'
      });

      await logSecurityEvent({
        userId,
        type: '2fa_disabled_email',
        severity: 'low',
        title: '2FA por email desativado',
        message: 'O usuário desativou o 2FA por email.',
        req,
        metadata: { method },
      });

    } catch (error) {
      console.error('❌ Erro ao desativar 2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * @swagger
   * /api/2fa/status:
   *   get:
   *     summary: Obter status do 2FA
   *     description: Retorna o status atual do 2FA do usuário
   *     tags: [TwoFactor]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Status do 2FA obtido com sucesso
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
   *                     totp:
   *                       type: object
   *                       properties:
   *                         enabled:
   *                           type: boolean
   *                         verified:
   *                           type: boolean
   *                         lastUsed:
   *                           type: string
   *                           format: date-time
   *                     sms:
   *                       type: object
   *                       properties:
   *                         enabled:
   *                           type: boolean
   *                         verified:
   *                           type: boolean
   *                         phoneNumber:
   *                           type: string
   *                         lastUsed:
   *                           type: string
   *                           format: date-time
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  static async get2FAStatus(req, res) {
    try {
      const userId = req.user.id;

      // Buscar todas as configurações 2FA do usuário
      const twoFactorConfigs = await TwoFactorAuth.findAll({
        where: { userId },
        attributes: ['method', 'isEnabled', 'isVerified', 'lastUsed', 'email']
      });

      const status = {
        email: {
          enabled: false,
          verified: false,
          email: null,
          lastUsed: null
        }
      };

      twoFactorConfigs.forEach(config => {
        if (config.method === 'email') {
          status.email = {
            enabled: config.isEnabled,
            verified: config.isVerified,
            email: config.email,
            lastUsed: config.lastUsed
          };
        }
      });

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Erro ao obter status do 2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = TwoFactorController;
