import api from './api';
import {
  TwoFactorSetupRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  TwoFactorVerifyResponse,
  TwoFactorStatusResponse,
  TwoFactorDisableRequest,
  TwoFactorDisableResponse,
  TwoFactorMethod
} from '../types/twoFactor';

class TwoFactorService {
  /**
   * Configurar 2FA para um usuário
   */
  static async setup2FA(request: TwoFactorSetupRequest): Promise<TwoFactorSetupResponse> {
    try {
      const response = await api.post<TwoFactorSetupResponse>('/2fa/setup', request);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao configurar 2FA:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Verificar código 2FA
   */
  static async verify2FA(request: TwoFactorVerifyRequest): Promise<TwoFactorVerifyResponse> {
    try {
      // Para login 2FA, usar rota sem autenticação
      const endpoint = request.isActivation ? '/2fa/verify' : '/2fa/verify-login';
      
      const response = await api.post<TwoFactorVerifyResponse>(endpoint, request);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao verificar 2FA:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Desativar 2FA
   */
  static async disable2FA(request: TwoFactorDisableRequest): Promise<TwoFactorDisableResponse> {
    try {
      const response = await api.post<TwoFactorDisableResponse>('/2fa/disable', request);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao desativar 2FA:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Obter status do 2FA
   */
  static async get2FAStatus(): Promise<TwoFactorStatusResponse> {
    try {
      const response = await api.get<TwoFactorStatusResponse>('/2fa/status');
      return response.data;
    } catch (error: any) {
      console.error('Erro ao obter status do 2FA:', error);
      
      // Se for erro de autenticação, retornar erro
      if (error.code === 'USER_NOT_FOUND' || error.message?.includes('Usuário não encontrado')) {
        throw new Error('Usuário não encontrado. Faça login novamente.');
      }
      
      // Retornar status padrão para outros erros
      return {
        success: true,
        data: {
          totp: { enabled: false, verified: false, lastUsed: null },
          sms: { enabled: false, verified: false, phoneNumber: null, lastUsed: null }
        }
      };
    }
  }

  /**
   * Verificar se 2FA está ativado para um método
   */
  static async is2FAEnabled(method: TwoFactorMethod): Promise<boolean> {
    try {
      const status = await this.get2FAStatus();
      if (method === 'totp') {
        return status.data.totp.enabled;
      } else if (method === 'sms') {
        return status.data.sms.enabled;
      }
      return false;
    } catch (error) {
      console.error('Erro ao verificar status do 2FA:', error);
      return false;
    }
  }

  /**
   * Verificar se usuário tem 2FA configurado
   */
  static async has2FAConfigured(): Promise<boolean> {
    try {
      const status = await this.get2FAStatus();
      return status.data.totp.enabled || status.data.sms.enabled;
    } catch (error) {
      console.error('Erro ao verificar configuração do 2FA:', error);
      return false;
    }
  }

  /**
   * Obter métodos de 2FA disponíveis
   */
  static async getAvailableMethods(): Promise<TwoFactorMethod[]> {
    try {
      const status = await this.get2FAStatus();
      const methods: TwoFactorMethod[] = [];
      
      if (status.data.totp.enabled) {
        methods.push('totp');
      }
      
      if (status.data.sms.enabled) {
        methods.push('sms');
      }
      
      return methods;
    } catch (error) {
      console.error('Erro ao obter métodos disponíveis:', error);
      return [];
    }
  }

  /**
   * Validar formato de código 2FA
   */
  static validateCode(code: string, method: TwoFactorMethod): boolean {
    console.log('🔧 validateCode - Código:', code);
    console.log('🔧 validateCode - Método:', method);
    console.log('🔧 validateCode - Length:', code.length);
    
    if (!code || code.length < 4 || code.length > 8) {
      console.log('🔧 validateCode - Falhou no length check');
      return false;
    }

    if (method === 'totp') {
      // TOTP geralmente tem 6 dígitos
      const result = /^\d{6}$/.test(code);
      console.log('🔧 validateCode - TOTP result:', result);
      return result;
    } else if (method === 'sms') {
      // SMS pode ter 4-8 dígitos
      const result = /^\d{4,8}$/.test(code);
      console.log('🔧 validateCode - SMS result:', result);
      return result;
    } else if (method === 'email') {
      // Email códigos têm 6 dígitos
      const result = /^\d{6}$/.test(code);
      console.log('🔧 validateCode - Email result:', result);
      console.log('🔧 validateCode - Regex test:', /^\d{6}$/.test(code));
      return result;
    }

    console.log('🔧 validateCode - Método não reconhecido');
    return false;
  }

  /**
   * Validar formato de número de telefone
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Regex para validar formato internacional
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Formatar número de telefone
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove todos os caracteres não numéricos
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Adiciona + se não tiver
    if (!cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Gerar códigos de recuperação para exibição
   */
  static formatRecoveryCodes(codes: string[]): string[] {
    return codes.map((code, index) => `${index + 1}. ${code}`);
  }

  /**
   * Verificar se código de recuperação é válido
   */
  static validateRecoveryCode(code: string): boolean {
    // Códigos de recuperação são alfanuméricos de 8 caracteres
    return /^[A-Z0-9]{8}$/.test(code.toUpperCase());
  }
}

export default TwoFactorService;
