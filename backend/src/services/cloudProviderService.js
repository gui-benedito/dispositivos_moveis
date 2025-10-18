const crypto = require('crypto');

class CloudProviderService {
  constructor() {
    this.providers = {
      google_drive: {
        name: 'Google Drive',
        authUrl: 'https://accounts.google.com/oauth/authorize',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: 'https://www.googleapis.com/auth/drive.file',
        clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI
      },
      dropbox: {
        name: 'Dropbox',
        authUrl: 'https://www.dropbox.com/oauth2/authorize',
        tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
        scope: 'files.metadata.write files.content.write files.content.read',
        clientId: process.env.DROPBOX_CLIENT_ID,
        clientSecret: process.env.DROPBOX_CLIENT_SECRET,
        redirectUri: process.env.DROPBOX_REDIRECT_URI
      },
      one_drive: {
        name: 'OneDrive',
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scope: 'https://graph.microsoft.com/Files.ReadWrite',
        clientId: process.env.ONEDRIVE_CLIENT_ID,
        clientSecret: process.env.ONEDRIVE_CLIENT_SECRET,
        redirectUri: process.env.ONEDRIVE_REDIRECT_URI
      }
    };
  }

  /**
   * Obter URL de autorização OAuth
   */
  getAuthUrl(provider, userId) {
    const providerConfig = this.providers[provider];
    if (!providerConfig) {
      throw new Error(`Provedor ${provider} não suportado`);
    }

    const state = crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: providerConfig.redirectUri,
      response_type: 'code',
      scope: providerConfig.scope,
      state: `${state}:${userId}`,
      access_type: 'offline',
      prompt: 'consent'
    });

    return {
      authUrl: `${providerConfig.authUrl}?${params.toString()}`,
      state
    };
  }

  /**
   * Trocar código de autorização por token de acesso
   */
  async exchangeCodeForToken(provider, code, state) {
    const providerConfig = this.providers[provider];
    if (!providerConfig) {
      throw new Error(`Provedor ${provider} não suportado`);
    }

    const [stateValue, userId] = state.split(':');
    
    const tokenData = {
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
      redirect_uri: providerConfig.redirectUri,
      grant_type: 'authorization_code',
      code
    };

    try {
      const response = await fetch(providerConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(tokenData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro na autenticação: ${response.status} - ${errorData}`);
      }

      const tokens = await response.json();
      
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        userId
      };
    } catch (error) {
      console.error(`❌ Erro ao trocar código por token (${provider}):`, error);
      throw new Error(`Falha na autenticação com ${providerConfig.name}`);
    }
  }

  /**
   * Renovar token de acesso
   */
  async refreshAccessToken(provider, refreshToken) {
    const providerConfig = this.providers[provider];
    if (!providerConfig) {
      throw new Error(`Provedor ${provider} não suportado`);
    }

    const tokenData = {
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    };

    try {
      const response = await fetch(providerConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(tokenData)
      });

      if (!response.ok) {
        throw new Error(`Erro ao renovar token: ${response.status}`);
      }

      const tokens = await response.json();
      
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken,
        expiresIn: tokens.expires_in
      };
    } catch (error) {
      console.error(`❌ Erro ao renovar token (${provider}):`, error);
      throw new Error(`Falha ao renovar token do ${providerConfig.name}`);
    }
  }

  /**
   * Upload de arquivo para o provedor
   */
  async uploadFile(provider, accessToken, fileName, fileData, metadata = {}) {
    switch (provider) {
      case 'google_drive':
        return this._uploadToGoogleDrive(accessToken, fileName, fileData, metadata);
      case 'dropbox':
        return this._uploadToDropbox(accessToken, fileName, fileData, metadata);
      case 'one_drive':
        return this._uploadToOneDrive(accessToken, fileName, fileData, metadata);
      default:
        throw new Error(`Provedor ${provider} não suportado`);
    }
  }

  /**
   * Download de arquivo do provedor
   */
  async downloadFile(provider, accessToken, fileId) {
    switch (provider) {
      case 'google_drive':
        return this._downloadFromGoogleDrive(accessToken, fileId);
      case 'dropbox':
        return this._downloadFromDropbox(accessToken, fileId);
      case 'one_drive':
        return this._downloadFromOneDrive(accessToken, fileId);
      default:
        throw new Error(`Provedor ${provider} não suportado`);
    }
  }

  /**
   * Upload para Google Drive
   */
  async _uploadToGoogleDrive(accessToken, fileName, fileData, metadata) {
    try {
      // Criar metadados do arquivo
      const fileMetadata = {
        name: fileName,
        parents: ['appDataFolder'], // Pasta privada da aplicação
        ...metadata
      };

      // Upload do arquivo
      const form = new FormData();
      form.append('metadata', JSON.stringify(fileMetadata));
      form.append('media', new Blob([fileData]), fileName);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: form
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro no upload: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      
      return {
        fileId: result.id,
        fileName: result.name,
        fileSize: result.size,
        createdTime: result.createdTime
      };
    } catch (error) {
      console.error('❌ Erro no upload para Google Drive:', error);
      throw new Error('Falha no upload para Google Drive');
    }
  }

  /**
   * Download do Google Drive
   */
  async _downloadFromGoogleDrive(accessToken, fileId) {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro no download: ${response.status}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('❌ Erro no download do Google Drive:', error);
      throw new Error('Falha no download do Google Drive');
    }
  }

  /**
   * Upload para Dropbox
   */
  async _uploadToDropbox(accessToken, fileName, fileData, metadata) {
    try {
      const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({
            path: `/PasswordManager/${fileName}`,
            mode: 'overwrite',
            ...metadata
          }),
          'Content-Type': 'application/octet-stream'
        },
        body: fileData
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro no upload: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      
      return {
        fileId: result.id,
        fileName: result.name,
        fileSize: result.size,
        createdTime: result.client_modified
      };
    } catch (error) {
      console.error('❌ Erro no upload para Dropbox:', error);
      throw new Error('Falha no upload para Dropbox');
    }
  }

  /**
   * Download do Dropbox
   */
  async _downloadFromDropbox(accessToken, fileId) {
    try {
      const response = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({ path: fileId })
        }
      });

      if (!response.ok) {
        throw new Error(`Erro no download: ${response.status}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('❌ Erro no download do Dropbox:', error);
      throw new Error('Falha no download do Dropbox');
    }
  }

  /**
   * Upload para OneDrive
   */
  async _uploadToOneDrive(accessToken, fileName, fileData, metadata) {
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/PasswordManager/${fileName}:/content`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream'
        },
        body: fileData
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro no upload: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      
      return {
        fileId: result.id,
        fileName: result.name,
        fileSize: result.size,
        createdTime: result.createdDateTime
      };
    } catch (error) {
      console.error('❌ Erro no upload para OneDrive:', error);
      throw new Error('Falha no upload para OneDrive');
    }
  }

  /**
   * Download do OneDrive
   */
  async _downloadFromOneDrive(accessToken, fileId) {
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro no download: ${response.status}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('❌ Erro no download do OneDrive:', error);
      throw new Error('Falha no download do OneDrive');
    }
  }

  /**
   * Listar provedores disponíveis
   */
  getAvailableProviders() {
    return Object.keys(this.providers).map(key => ({
      id: key,
      name: this.providers[key].name,
      configured: !!(this.providers[key].clientId && this.providers[key].clientSecret)
    }));
  }
}

module.exports = new CloudProviderService();
