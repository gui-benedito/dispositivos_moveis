import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import BackupService from '../services/backupService';
import {
  CloudProvider,
  CloudProviderInfo,
  BackupInfo,
  BackupStats,
  BackupError
} from '../types/backup';

export const useBackup = () => {
  const [providers, setProviders] = useState<CloudProviderInfo[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Limpar erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Carregar provedores disponíveis
   */
  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const providersList = await BackupService.getAvailableProviders();
      setProviders(providersList);
      
      console.log('☁️ Provedores carregados:', providersList.length);
    } catch (err: any) {
      const error = err as BackupError;
      const errorMessage = error.message || 'Erro ao carregar provedores';
      setError(errorMessage);
      console.error('❌ Erro ao carregar provedores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obter URL de autorização OAuth
   */
  const getAuthUrl = useCallback(async (provider: CloudProvider) => {
    try {
      setError(null);
      
      const authData = await BackupService.getAuthUrl(provider);
      
      console.log('🔗 URL de autorização gerada para:', provider);
      return authData;
    } catch (err: any) {
      const error = err as BackupError;
      const errorMessage = error.message || 'Erro ao gerar URL de autorização';
      setError(errorMessage);
      
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao gerar URL de autorização:', err);
      throw err;
    }
  }, []);

  /**
   * Abrir URL de autorização
   */
  const openAuthUrl = useCallback(async (authUrl: string) => {
    try {
      await BackupService.openAuthUrl(authUrl);
      console.log('🌐 URL de autorização aberta');
    } catch (err: any) {
      const error = err as BackupError;
      const errorMessage = error.message || 'Erro ao abrir URL de autorização';
      setError(errorMessage);
      
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao abrir URL de autorização:', err);
      throw err;
    }
  }, []);

  /**
   * Processar callback OAuth e criar backup
   */
  const processOAuthCallback = useCallback(async (
    code: string,
    state: string,
    provider: CloudProvider,
    masterPassword: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const backupData = await BackupService.processOAuthCallback({
        code,
        state,
        provider,
        masterPassword
      });
      
      console.log('✅ Backup criado via OAuth:', backupData.fileName);
      
      // Recarregar lista de backups
      // await loadBackups(provider, backupData.accessToken);
      
      return backupData;
    } catch (err: any) {
      const error = err as BackupError;
      const errorMessage = error.message || 'Erro ao processar callback OAuth';
      setError(errorMessage);
      
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro no callback OAuth:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Criar backup direto
   */
  const createBackup = useCallback(async (
    provider: CloudProvider,
    accessToken: string,
    masterPassword: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const backupData = await BackupService.createBackup({
        provider,
        accessToken,
        masterPassword
      });
      
      console.log('✅ Backup criado:', backupData.fileName);
      
      // Recarregar lista de backups
      // await loadBackups(provider, accessToken);
      
      return backupData;
    } catch (err: any) {
      const error = err as BackupError;
      const errorMessage = error.message || 'Erro ao criar backup';
      setError(errorMessage);
      
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao criar backup:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Restaurar backup
   */
  const restoreBackup = useCallback(async (
    provider: CloudProvider,
    accessToken: string,
    fileId: string,
    masterPassword: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const restoreData = await BackupService.restoreBackup({
        provider,
        accessToken,
        fileId,
        masterPassword
      });
      
      console.log('✅ Backup restaurado:', restoreData.restoredAt);
      
      return restoreData;
    } catch (err: any) {
      const error = err as BackupError;
      const errorMessage = error.message || 'Erro ao restaurar backup';
      setError(errorMessage);
      
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao restaurar backup:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Validar backup
   */
  const validateBackup = useCallback(async (
    provider: CloudProvider,
    accessToken: string,
    fileId: string
  ) => {
    try {
      setError(null);
      
      const validationData = await BackupService.validateBackup({
        provider,
        accessToken,
        fileId
      });
      
      console.log('✅ Backup validado:', validationData.isValid ? 'VÁLIDO' : 'INVÁLIDO');
      
      return validationData;
    } catch (err: any) {
      const error = err as BackupError;
      const errorMessage = error.message || 'Erro ao validar backup';
      setError(errorMessage);
      
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao validar backup:', err);
      throw err;
    }
  }, []);

  /**
   * Listar backups
   */
  const loadBackups = useCallback(async (provider: CloudProvider, accessToken: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const backupsData = await BackupService.listBackups({
        provider,
        accessToken
      });
      
      setBackups(backupsData.backups);
      
      console.log('📋 Backups carregados:', backupsData.backups.length);
    } catch (err: any) {
      const error = err as BackupError;
      const errorMessage = error.message || 'Erro ao carregar backups';
      setError(errorMessage);
      console.error('❌ Erro ao carregar backups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Renovar token
   */
  const refreshToken = useCallback(async (provider: CloudProvider, refreshToken: string) => {
    try {
      setError(null);
      
      const tokenData = await BackupService.refreshToken({
        provider,
        refreshToken
      });
      
      console.log('✅ Token renovado para:', provider);
      
      return tokenData;
    } catch (err: any) {
      const error = err as BackupError;
      const errorMessage = error.message || 'Erro ao renovar token';
      setError(errorMessage);
      
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao renovar token:', err);
      throw err;
    }
  }, []);

  /**
   * Calcular estatísticas
   */
  const calculateStats = useCallback(() => {
    if (backups.length === 0) {
      setStats({
        totalBackups: 0,
        totalSize: 0,
        providers: {}
      });
      return;
    }

    const totalSize = backups.reduce((sum, backup) => sum + (backup.fileSize || 0), 0);
    const lastBackup = backups
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      ?.createdAt;

    const providersStats: BackupStats['providers'] = {};
    backups.forEach(backup => {
      if (!providersStats[backup.provider]) {
        providersStats[backup.provider] = { count: 0 };
      }
      providersStats[backup.provider]!.count++;
      
      if (!providersStats[backup.provider]!.lastBackup || 
          new Date(backup.createdAt) > new Date(providersStats[backup.provider]!.lastBackup!)) {
        providersStats[backup.provider]!.lastBackup = backup.createdAt;
      }
    });

    setStats({
      totalBackups: backups.length,
      lastBackup,
      totalSize,
      providers: providersStats
    });
  }, [backups]);

  // Calcular estatísticas quando backups mudarem
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Carregar provedores ao montar o componente
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return {
    // Estado
    providers,
    backups,
    stats,
    loading,
    error,
    
    // Ações
    loadProviders,
    getAuthUrl,
    openAuthUrl,
    processOAuthCallback,
    createBackup,
    restoreBackup,
    validateBackup,
    loadBackups,
    refreshToken,
    
    // Utilitários
    clearError
  };
};
