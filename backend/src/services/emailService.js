const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    // Configuração para Gmail com senha de app
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'guisantos.benedito@gmail.com',
        pass: process.env.EMAIL_PASS || 'sua-senha-app'
      }
    });
    
    console.log('📧 EmailService configurado:');
    console.log('📧 User:', process.env.EMAIL_USER || 'guisantos.benedito@gmail.com');
    console.log('📧 Pass configurada:', process.env.EMAIL_PASS ? 'SIM' : 'NÃO');
  }

  /**
   * Gerar código de verificação de 6 dígitos
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Enviar código de verificação por email
   */
  async sendVerificationCode(email, code, userName = 'Usuário') {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'guisantos.benedito@gmail.com',
        to: email,
        subject: '🔐 Código de Verificação - Password Manager',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4ECDC4, #44A08D); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Password Manager</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Código de Verificação</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.5;">
                Olá <strong>${userName}</strong>,
              </p>
              
              <p style="color: #666; font-size: 16px; line-height: 1.5;">
                Você está fazendo login em sua conta do Password Manager. Use o código abaixo para completar a autenticação.
              </p>
              
              <div style="background: white; border: 2px solid #4ECDC4; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <p style="margin: 0; color: #666; font-size: 14px;">Seu código de verificação é:</p>
                <h1 style="color: #4ECDC4; font-size: 32px; margin: 10px 0; letter-spacing: 5px; font-family: monospace;">${code}</h1>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.5;">
                <strong>⏰ Este código expira em 10 minutos.</strong>
              </p>
              
              <p style="color: #666; font-size: 14px; line-height: 1.5;">
                Se você não solicitou este código, ignore este email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                Este é um email automático do Password Manager. Não responda a este email.
              </p>
            </div>
          </div>
        `
      };

      console.log('📧 Enviando email real para:', email);
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email enviado com sucesso:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      
      // Fallback para desenvolvimento
      console.log('📧 ===========================================');
      console.log('📧 [FALLBACK] EMAIL DE VERIFICAÇÃO 2FA');
      console.log('📧 ===========================================');
      console.log('📧 Para:', email);
      console.log('📧 Código:', code);
      console.log('📧 ===========================================');
      
      throw new Error('Erro ao enviar email: ' + error.message);
    }
  }

  /**
   * Enviar email de confirmação de 2FA ativado
   */
  async send2FAConfirmation(email, userName = 'Usuário') {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'seu-email@gmail.com',
        to: email,
        subject: '✅ 2FA Ativado com Sucesso - Password Manager',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #27ae60, #2ecc71); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">✅ Password Manager</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">2FA Ativado com Sucesso!</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.5;">
                Olá <strong>${userName}</strong>,
              </p>
              
              <p style="color: #666; font-size: 16px; line-height: 1.5;">
                A autenticação em dois fatores (2FA) foi ativada com sucesso para sua conta no Password Manager.
              </p>
              
              <div style="background: #e8f5e8; border: 1px solid #27ae60; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; color: #27ae60; font-weight: bold;">
                  🔐 Sua conta agora está protegida com 2FA por email
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.5;">
                A partir de agora, sempre que você fizer login, será solicitado um código de verificação enviado para este email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                Este é um email automático do Password Manager. Não responda a este email.
              </p>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email de confirmação enviado:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Erro ao enviar email de confirmação:', error);
      throw new Error('Erro ao enviar email de confirmação: ' + error.message);
    }
  }
}

module.exports = new EmailService();
