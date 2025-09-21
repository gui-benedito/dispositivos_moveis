import { useState, useEffect, useCallback } from 'react';
import SettingsService from '../services/settingsService';
import { useAuthenticatedSettings } from './useAuthenticatedSettings';
import { UserSettings, UpdateSettingsRequest, DEFAULT_SETTINGS } from '../types/settings';

/**
 * Hook para gerenciar configurações do usuário
 */
export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carregar configurações do servidor
   */
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await SettingsService.getSettings();
      setSettings(response.data);

      // Salvar no AsyncStorage para acesso offline
      await SettingsService.saveLocalSettings(response.data);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError('Erro ao carregar configurações');
      
      // Tentar carregar do AsyncStorage em caso de erro
      const localSettings = await SettingsService.getLocalSettings();
      if (localSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...localSettings });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Atualizar configurações
   */
  const updateSettings = useCallback(async (newSettings: UpdateSettingsRequest) => {
    try {
      setLoading(true);
      setError(null);

      // Validar configurações
      const validation = SettingsService.validateSettings(newSettings);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return false;
      }

      const response = await SettingsService.updateSettings(newSettings);
      setSettings(response.data);

      // Atualizar AsyncStorage
      await SettingsService.saveLocalSettings(response.data);

      return true;
    } catch (err) {
      console.error('Erro ao atualizar configurações:', err);
      setError('Erro ao atualizar configurações');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Resetar configurações para padrão
   */
  const resetSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await SettingsService.resetSettings();
      setSettings(response.data);

      // Atualizar AsyncStorage
      await SettingsService.saveLocalSettings(response.data);

      return true;
    } catch (err) {
      console.error('Erro ao resetar configurações:', err);
      setError('Erro ao resetar configurações');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Atualizar timeout de bloqueio automático
   */
  const updateAutoLockTimeout = useCallback(async (timeout: number) => {
    return await updateSettings({ autoLockTimeout: timeout });
  }, [updateSettings]);

  /**
   * Atualizar configurações biométricas
   */
  const updateBiometricSettings = useCallback(async (enabled: boolean, type?: 'fingerprint') => {
    return await updateSettings({ 
      biometricEnabled: enabled,
      biometricType: enabled ? type : undefined
    });
  }, [updateSettings]);

  /**
   * Atualizar configurações de bloqueio
   */
  const updateLockSettings = useCallback(async (settings: {
    requirePasswordOnLock?: boolean;
    lockOnBackground?: boolean;
    lockOnScreenOff?: boolean;
  }) => {
    return await updateSettings(settings);
  }, [updateSettings]);

  /**
   * Carregar configurações na inicialização - só se não estiver carregando
   */
  useEffect(() => {
    if (!loading) {
      loadSettings();
    }
  }, []); // Remover dependência que causa loop infinito

  /**
   * Carregar configurações do AsyncStorage na inicialização
   */
  useEffect(() => {
    const loadLocalSettings = async () => {
      const localSettings = await SettingsService.getLocalSettings();
      if (localSettings && !settings.id) {
        setSettings({ ...DEFAULT_SETTINGS, ...localSettings });
      }
    };
    loadLocalSettings();
  }, []); // Remover dependência que causa loop infinito

  return {
    settings,
    loading,
    error,
    loadSettings,
    updateSettings,
    resetSettings,
    updateAutoLockTimeout,
    updateBiometricSettings,
    updateLockSettings
  };
};

/**
 * Hook para configurações específicas de bloqueio
 */
export const useLockSettings = (isAuthenticated: boolean = true) => {
  const { settings, updateLockSettings } = useAuthenticatedSettings(isAuthenticated);

  const lockSettings = {
    autoLockTimeout: settings.autoLockTimeout,
    biometricEnabled: settings.biometricEnabled,
    biometricType: settings.biometricType,
    requirePasswordOnLock: settings.requirePasswordOnLock,
    lockOnBackground: settings.lockOnBackground,
    lockOnScreenOff: settings.lockOnScreenOff
  };

  return {
    lockSettings,
    updateLockSettings
  };
};
