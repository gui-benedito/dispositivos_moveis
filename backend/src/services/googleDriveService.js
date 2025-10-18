const { google } = require('googleapis');

class GoogleDriveService {
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
   * Gerar URL de autorização
   */
  generateAuthUrl(userId) {
    try {
      const oauth2Client = this.setupOAuth2Client();
      
      const scopes = [
        'https://www.googleapis.com/auth/drive.file'
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: userId,
        prompt: 'consent'
      });

      console.log('🔗 URL de autorização Google Drive gerada');
      return authUrl;
    } catch (error) {
      console.error('❌ Erro ao gerar URL de autorização:', error);
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
      
      console.log('✅ Tokens Google Drive obtidos');
      return tokens;
    } catch (error) {
      console.error('❌ Erro ao trocar código por tokens:', error);
      throw error;
    }
  }

  /**
   * Upload de arquivo para Google Drive
   */
  async uploadFile(tokens, filename, fileContent, mimeType = 'application/octet-stream') {
    try {
      const oauth2Client = this.setupOAuth2Client();
      oauth2Client.setCredentials(tokens);
      
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      const fileMetadata = {
        name: filename,
        parents: ['appDataFolder'] // Pasta privada da aplicação
      };

      const media = {
        mimeType: mimeType,
        body: Buffer.from(fileContent, 'base64')
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,size,createdTime'
      });

      console.log('✅ Arquivo enviado para Google Drive:', response.data.name);
      return {
        fileId: response.data.id,
        fileName: response.data.name,
        fileSize: response.data.size,
        createdTime: response.data.createdTime
      };
    } catch (error) {
      console.error('❌ Erro ao fazer upload para Google Drive:', error);
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
        fields: 'files(id,name,size,createdTime,modifiedTime)',
        orderBy: 'createdTime desc'
      });

      console.log('📋 Arquivos de backup listados:', response.data.files.length);
      return response.data.files;
    } catch (error) {
      console.error('❌ Erro ao listar arquivos de backup:', error);
      throw error;
    }
  }

  /**
   * Download de arquivo do Google Drive
   */
  async downloadFile(tokens, fileId) {
    try {
      const oauth2Client = this.setupOAuth2Client();
      oauth2Client.setCredentials(tokens);
      
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, {
        responseType: 'arraybuffer'
      });

      const fileContent = Buffer.from(response.data).toString('base64');
      console.log('📥 Arquivo baixado do Google Drive');
      return fileContent;
    } catch (error) {
      console.error('❌ Erro ao baixar arquivo do Google Drive:', error);
      throw error;
    }
  }

  /**
   * Deletar arquivo do Google Drive
   */
  async deleteFile(tokens, fileId) {
    try {
      const oauth2Client = this.setupOAuth2Client();
      oauth2Client.setCredentials(tokens);
      
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      await drive.files.delete({
        fileId: fileId
      });

      console.log('🗑️ Arquivo deletado do Google Drive');
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar arquivo do Google Drive:', error);
      throw error;
    }
  }
}

module.exports = new GoogleDriveService();
