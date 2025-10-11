import { useState, useCallback } from 'react';
import TwoFactorService from '../services/twoFactorService';
import { TwoFactorMethod, TwoFactorStatus } from '../types/twoFactor';

export const useTwoFactor = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);

  /**
   * Configurar 2FA
   */
  const setup2FA = useCallback(async (method: TwoFactorMethod) => {
    setLoading(true);
    setError(null);

    try {
      const request = { method };

      const result = await TwoFactorService.setup2FA(request);
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.message || 'Erro ao configurar 2FA');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao configurar 2FA';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verificar código 2FA
   */
  const verify2FA = useCallback(async (method: TwoFactorMethod, code: string, isActivation = false) => {
    setLoading(true);
    setError(null);

    try {
      const request = {
        method,
        code,
        isActivation
      };

      const result = await TwoFactorService.verify2FA(request);
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.message || 'Erro ao verificar código 2FA');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao verificar código 2FA';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Desativar 2FA
   */
  const disable2FA = useCallback(async (method: TwoFactorMethod, code: string) => {
    setLoading(true);
    setError(null);

    try {
      const request = {
        method,
        code
      };

      const result = await TwoFactorService.disable2FA(request);
      
      if (result.success) {
        // Atualizar status local
        await loadStatus();
        return result;
      } else {
        throw new Error(result.message || 'Erro ao desativar 2FA');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao desativar 2FA';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carregar status do 2FA
   */
  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await TwoFactorService.get2FAStatus();
      
      if (result.success) {
        setStatus(result.data);
        return result.data;
      } else {
        throw new Error('Erro ao carregar status do 2FA');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar status do 2FA';
      
      // Se for erro de autenticação, não definir como erro
      if (errorMessage.includes('Usuário não encontrado') || errorMessage.includes('Token')) {
        console.warn('Erro de autenticação ao carregar 2FA:', errorMessage);
        setStatus({
          email: { enabled: false, verified: false, email: null, lastUsed: null }
        });
        return null;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verificar se 2FA está ativado
   */
  const is2FAEnabled = useCallback(async (method: TwoFactorMethod) => {
    try {
      return await TwoFactorService.is2FAEnabled(method);
    } catch (err: any) {
      console.error('Erro ao verificar status do 2FA:', err);
      return false;
    }
  }, []);

  /**
   * Verificar se usuário tem 2FA configurado
   */
  const has2FAConfigured = useCallback(async () => {
    try {
      return await TwoFactorService.has2FAConfigured();
    } catch (err: any) {
      console.error('Erro ao verificar configuração do 2FA:', err);
      return false;
    }
  }, []);

  /**
   * Obter métodos disponíveis
   */
  const getAvailableMethods = useCallback(async () => {
    try {
      return await TwoFactorService.getAvailableMethods();
    } catch (err: any) {
      console.error('Erro ao obter métodos disponíveis:', err);
      return [];
    }
  }, []);

  /**
   * Validar código
   */
  const validateCode = useCallback((code: string, method: TwoFactorMethod) => {
    return TwoFactorService.validateCode(code, method);
  }, []);

  /**
   * Validar número de telefone
   */
  const validatePhoneNumber = useCallback((phoneNumber: string) => {
    return TwoFactorService.validatePhoneNumber(phoneNumber);
  }, []);

  /**
   * Formatar número de telefone
   */
  const formatPhoneNumber = useCallback((phoneNumber: string) => {
    return TwoFactorService.formatPhoneNumber(phoneNumber);
  }, []);

  /**
   * Limpar erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Resetar estado
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setStatus(null);
  }, []);

  return {
    // Estado
    loading,
    error,
    status,
    
    // Ações
    setup2FA,
    verify2FA,
    disable2FA,
    loadStatus,
    is2FAEnabled,
    has2FAConfigured,
    getAvailableMethods,
    
    // Utilitários
    validateCode,
    validatePhoneNumber,
    formatPhoneNumber,
    clearError,
    reset
  };
};
