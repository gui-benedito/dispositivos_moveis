import api from './api';
import {
  CloudProvider,
  CloudProviderInfo,
  AuthUrlResponse,
  OAuthCallbackRequest,
  CreateBackupRequest,
  RestoreBackupRequest,
  ValidateBackupRequest,
  ListBackupsRequest,
  RefreshTokenRequest,
  BackupResponse,
  RestoreResponse,
  ValidationResponse,
  ProvidersResponse,
  ListBackupsResponse,
  TokenRefreshResponse,
  BackupError
} from '../types/backup';

class BackupService {
  /**
   * Obter provedores disponíveis
   */
  static async getAvailableProviders(): Promise<CloudProviderInfo[]> {
    try {
      const response = await api.get<ProvidersResponse>('/backup/providers');
      return response.data.data.providers;
    } catch (error: any) {
      console.error('Erro ao obter provedores:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Obter URL de autorização OAuth
   */
  static async getAuthUrl(provider: CloudProvider): Promise<AuthUrlResponse['data']> {
    try {
      const response = await api.post<AuthUrlResponse>('/backup/auth-url', { provider });
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao obter URL de autorização:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Processar callback OAuth e criar backup
   */
  static async processOAuthCallback(request: OAuthCallbackRequest): Promise<BackupResponse['data']> {
    try {
      const response = await api.post<BackupResponse>('/backup/oauth-callback', request);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro no callback OAuth:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Criar backup direto
   */
  static async createBackup(request: CreateBackupRequest): Promise<BackupResponse['data']> {
    try {
      const response = await api.post<BackupResponse>('/backup/create', request);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao criar backup:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Restaurar backup
   */
  static async restoreBackup(request: RestoreBackupRequest): Promise<RestoreResponse['data']> {
    try {
      const response = await api.post<RestoreResponse>('/backup/restore', request);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao restaurar backup:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Validar integridade do backup
   */
  static async validateBackup(request: ValidateBackupRequest): Promise<ValidationResponse['data']> {
    try {
      const response = await api.post<ValidationResponse>('/backup/validate', request);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao validar backup:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Listar backups do usuário
   */
  static async listBackups(request: ListBackupsRequest): Promise<ListBackupsResponse['data']> {
    try {
      const response = await api.post<ListBackupsResponse>('/backup/list', request);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao listar backups:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Renovar token de acesso
   */
  static async refreshToken(request: RefreshTokenRequest): Promise<TokenRefreshResponse['data']> {
    try {
      const response = await api.post<TokenRefreshResponse>('/backup/refresh-token', request);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao renovar token:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Abrir URL de autorização no navegador
   */
  static async openAuthUrl(authUrl: string): Promise<void> {
    try {
      // Para React Native, usar Linking
      const { Linking } = require('react-native');
      const supported = await Linking.canOpenURL(authUrl);
      
      if (supported) {
        await Linking.openURL(authUrl);
      } else {
        throw new Error('Não é possível abrir a URL de autorização');
      }
    } catch (error) {
      console.error('Erro ao abrir URL de autorização:', error);
      throw error;
    }
  }

  /**
   * Processar callback URL (quando o usuário retorna do OAuth)
   */
  static parseCallbackUrl(url: string): { code?: string; state?: string; error?: string } {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      
      return {
        code: params.get('code') || undefined,
        state: params.get('state') || undefined,
        error: params.get('error') || undefined
      };
    } catch (error) {
      console.error('Erro ao processar URL de callback:', error);
      return {};
    }
  }

  /**
   * Formatar tamanho de arquivo
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Formatar data de backup
   */
  static formatBackupDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Hoje às ' + date.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else if (diffDays === 1) {
        return 'Ontem às ' + date.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else if (diffDays < 7) {
        return `${diffDays} dias atrás`;
      } else {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    } catch (error) {
      return 'Data inválida';
    }
  }

  /**
   * Obter ícone do provedor
   */
  static getProviderIcon(provider: CloudProvider): string {
    switch (provider) {
      case 'google_drive':
        return 'logo-google';
      case 'dropbox':
        return 'logo-dropbox';
      case 'one_drive':
        return 'logo-microsoft';
      default:
        return 'cloud-outline';
    }
  }

  /**
   * Obter cor do provedor
   */
  static getProviderColor(provider: CloudProvider): string {
    switch (provider) {
      case 'google_drive':
        return '#4285F4';
      case 'dropbox':
        return '#0061FF';
      case 'one_drive':
        return '#0078D4';
      default:
        return '#666';
    }
  }

  /**
   * Tratar erros da API
   */
  private static _handleError(error: any): BackupError {
    if (error.response?.data) {
      return {
        code: error.response.data.code || 'API_ERROR',
        message: error.response.data.message || 'Erro na API',
        details: error.response.data
      };
    }
    
    return {
      code: 'NETWORK_ERROR',
      message: error.message || 'Erro de rede',
      details: error
    };
  }
}

export default BackupService;
