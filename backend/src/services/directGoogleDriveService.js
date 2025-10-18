const { google } = require('googleapis');

class DirectGoogleDriveService {
  constructor() {
    this.oauth2Client = null;
  }

  /**
   * Configurar cliente OAuth2
   */
  setupOAuth2Client() {
    if (!this.oauth2Client) {
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_DRIVE_CLIENT_ID,
        process.env.GOOGLE_DRIVE_CLIENT_SECRET,
        process.env.GOOGLE_DRIVE_REDIRECT_URI
      );
    }
    return this.oauth2Client;
  }

  /**
   * Gerar URL de autorização simples
   */
  generateSimpleAuthUrl() {
    try {
      const oauth2Client = this.setupOAuth2Client();
      
      const scopes = [
        'https://www.googleapis.com/auth/drive.file'
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });

      console.log('🔗 URL de autorização gerada');
      return authUrl;
    } catch (error) {
      console.error('❌ Erro ao gerar URL:', error);
      throw error;
    }
  }

  /**
   * Trocar código por tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const oauth2Client = this.setupOAuth2Client();
      
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      console.log('✅ Tokens obtidos');
      return tokens;
    } catch (error) {
      console.error('❌ Erro ao trocar código:', error);
      throw error;
    }
  }

  /**
   * Upload direto para Google Drive
   */
  async uploadDirectly(tokens, filename, fileContent) {
    try {
      const oauth2Client = this.setupOAuth2Client();
      oauth2Client.setCredentials(tokens);
      
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      const fileMetadata = {
        name: filename,
        parents: ['appDataFolder'] // Pasta privada
      };

      const media = {
        mimeType: 'application/octet-stream',
        body: Buffer.from(fileContent, 'base64')
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,size,createdTime,webViewLink'
      });

      console.log('✅ Upload direto realizado:', response.data.name);
      return {
        fileId: response.data.id,
        fileName: response.data.name,
        fileSize: response.data.size,
        createdTime: response.data.createdTime,
        webViewLink: response.data.webViewLink
      };
    } catch (error) {
      console.error('❌ Erro no upload direto:', error);
      throw error;
    }
  }

  /**
   * Listar arquivos de backup
   */
  async listBackupFiles(tokens) {
    try {
      const oauth2Client = this.setupOAuth2Client();
      oauth2Client.setCredentials(tokens);
      
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      const response = await drive.files.list({
        q: "name contains 'backup_' and name contains '.encrypted'",
        spaces: 'appDataFolder',
        fields: 'files(id,name,size,createdTime,modifiedTime,webViewLink)',
        orderBy: 'createdTime desc'
      });

      console.log('📋 Arquivos listados:', response.data.files.length);
      return response.data.files;
    } catch (error) {
      console.error('❌ Erro ao listar arquivos:', error);
      throw error;
    }
  }
}

module.exports = new DirectGoogleDriveService();
