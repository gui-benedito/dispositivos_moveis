import { useState, useEffect, useCallback } from 'react';
import SettingsService from '../services/settingsService';
import { useSettings } from '../contexts/SettingsContext';
import { UserSettings, UpdateSettingsRequest, DEFAULT_SETTINGS } from '../types/settings';

/**
 * Hook para usar configurações apenas quando autenticado
 */
export const useAuthenticatedSettings = (isAuthenticated: boolean) => {
  const { settings: contextSettings, updateSettings: updateContextSettings } = useSettings();
  const [settings, setSettings] = useState<UserSettings>(contextSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carregar configurações do servidor
   */
  const loadSettings = useCallback(async () => {
    if (!isAuthenticated) {
      return; // Não carregar se não autenticado
    }
    
    try {
      setLoading(true);
      setError(null);

      // Primeiro tentar carregar do AsyncStorage
      const localSettings = await SettingsService.getLocalSettings();
      
      if (localSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...localSettings });
      }

      // Depois tentar atualizar do servidor
      const response = await SettingsService.getSettings();
      setSettings(response.data);

      // Salvar no AsyncStorage para acesso offline
      await SettingsService.saveLocalSettings(response.data);
    } catch (err) {
      setError('Erro ao carregar configurações');
      
      // Tentar carregar do AsyncStorage em caso de erro
      const localSettings = await SettingsService.getLocalSettings();
      if (localSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...localSettings });
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Atualizar configurações
   */
  const updateSettings = useCallback(async (newSettings: UpdateSettingsRequest) => {
    if (!isAuthenticated) return false; // Não atualizar se não autenticado
    
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

      // Atualizar Context (que também salva no AsyncStorage)
      updateContextSettings(response.data);

      return true;
    } catch (err) {
      setError('Erro ao atualizar configurações');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Resetar configurações para padrão
   */
  const resetSettings = useCallback(async () => {
    if (!isAuthenticated) return false; // Não resetar se não autenticado
    
    try {
      setLoading(true);
      setError(null);

      const response = await SettingsService.resetSettings();
      setSettings(response.data);

      // Atualizar AsyncStorage
      await SettingsService.saveLocalSettings(response.data);

      return true;
    } catch (err) {
      setError('Erro ao resetar configurações');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

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
   * Sincronizar com Context
   */
  useEffect(() => {
    setSettings(contextSettings);
  }, [contextSettings]);

  /**
   * Carregar configurações quando autenticado
   */
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    } else {
      // Resetar para padrão quando não autenticado
      setSettings(DEFAULT_SETTINGS);
      setError(null);
    }
  }, [isAuthenticated]); // Remover loadSettings da dependência

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
