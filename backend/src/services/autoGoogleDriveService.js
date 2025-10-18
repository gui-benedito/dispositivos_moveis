const { google } = require('googleapis');

class AutoGoogleDriveService {
  constructor() {
    this.oauth2Client = null;
  }

  /**
   * Verificar se o email é do Google
   */
  isGoogleEmail(email) {
    const googleDomains = [
      'gmail.com',
      'googlemail.com',
      'google.com'
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    return googleDomains.includes(domain);
  }

  /**
   * Configurar cliente OAuth2 com credenciais de serviço
   */
  setupServiceAccount() {
    if (!this.oauth2Client) {
      // Usar credenciais de serviço para acesso automático
      this.oauth2Client = new google.auth.GoogleAuth({
        credentials: {
          type: "service_account",
          project_id: process.env.GOOGLE_PROJECT_ID,
          private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
        },
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });
    }
    return this.oauth2Client;
  }

  /**
   * Upload automático para Google Drive
   */
  async uploadToUserDrive(userEmail, filename, fileContent) {
    try {
      console.log('🔄 Iniciando upload automático para:', userEmail);
      
      const auth = this.setupServiceAccount();
      const drive = google.drive({ version: 'v3', auth });

      // Garantir que o filename tenha a extensão .encrypted
      const encryptedFilename = filename.endsWith('.encrypted') ? filename : `${filename}.encrypted`;
      
      // Criar arquivo no Google Drive
      const fileMetadata = {
        name: encryptedFilename,
        parents: ['appDataFolder'] // Pasta privada da aplicação
      };

      const media = {
        mimeType: 'application/octet-stream',
        body: Buffer.from(fileContent, 'base64')
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,size,createdTime'
      });

      console.log('✅ Upload automático realizado:', encryptedFilename);
      
      return {
        success: true,
        fileId: response.data.id,
        fileName: encryptedFilename,
        fileSize: response.data.size,
        createdTime: response.data.createdTime,
        userEmail: userEmail
      };

    } catch (error) {
      console.error('❌ Erro no upload automático:', error);
      throw error;
    }
  }

  /**
   * Processar backup automático
   */
  async processAutoBackup(userEmail, backupData, filename) {
    try {
      // Verificar se é email Google
      if (!this.isGoogleEmail(userEmail)) {
        return {
          success: false,
          reason: 'not_google_email',
          message: 'Email não é do Google'
        };
      }

      // Fazer upload automático
      const result = await this.uploadToUserDrive(userEmail, filename, backupData);
      
      return {
        success: true,
        message: 'Backup enviado automaticamente para o Google Drive',
        data: result
      };

    } catch (error) {
      console.error('❌ Erro no processamento automático:', error);
      return {
        success: false,
        reason: 'upload_failed',
        message: 'Erro ao enviar para Google Drive',
        error: error.message
      };
    }
  }
}

module.exports = new AutoGoogleDriveService();
