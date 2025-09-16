import { useState, useEffect } from 'react';
import { BiometricService } from '../services/biometricService';
import { BiometricType, BiometricStatus } from '../types/biometric';

export const useBiometric = () => {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [availableTypes, setAvailableTypes] = useState<BiometricType[]>([]);
  const [status, setStatus] = useState<BiometricStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar suporte biométrico ao inicializar
  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      setLoading(true);
      setError(null);

      const supported = await BiometricService.isBiometricSupported();
      setIsSupported(supported);

      if (supported) {
        const types = await BiometricService.getAvailableBiometricTypes();
        setAvailableTypes(types);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar suporte biométrico');
    } finally {
      setLoading(false);
    }
  };

  const enableBiometric = async (biometricType: BiometricType) => {
    try {
      setLoading(true);
      setError(null);

      const result = await BiometricService.enableBiometric(biometricType);
      
      if (result.success) {
        // Atualizar status após ativar
        await getBiometricStatus();
      }

      return result;
    } catch (err: any) {
      setError(err.message || 'Erro ao ativar biometria');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const disableBiometric = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await BiometricService.disableBiometric();
      
      if (result.success) {
        // Atualizar status após desativar
        await getBiometricStatus();
      }

      return result;
    } catch (err: any) {
      setError(err.message || 'Erro ao desativar biometria');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const authenticateBiometric = async (biometricType: BiometricType) => {
    try {
      setLoading(true);
      setError(null);

      const result = await BiometricService.authenticateBiometric(biometricType);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação biométrica');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getBiometricStatus = async () => {
    try {
      const result = await BiometricService.getBiometricStatus();
      if (result.success) {
        setStatus(result.data);
      }
      return result;
    } catch (err: any) {
      setError(err.message || 'Erro ao obter status da biometria');
      throw err;
    }
  };

  const getBiometricSessions = async () => {
    try {
      const result = await BiometricService.getBiometricSessions();
      return result;
    } catch (err: any) {
      setError(err.message || 'Erro ao obter sessões biométricas');
      throw err;
    }
  };

  const hasValidSession = async () => {
    try {
      return await BiometricService.hasValidBiometricSession();
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar sessão biométrica');
      return false;
    }
  };

  const clearBiometricData = async () => {
    try {
      await BiometricService.clearBiometricData();
    } catch (err: any) {
      setError(err.message || 'Erro ao limpar dados biométricos');
    }
  };

  return {
    // Estado
    isSupported,
    availableTypes,
    status,
    loading,
    error,

    // Ações
    enableBiometric,
    disableBiometric,
    authenticateBiometric,
    getBiometricStatus,
    getBiometricSessions,
    hasValidSession,
    clearBiometricData,
    checkBiometricSupport
  };
};
