import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import SimpleBackupService from '../services/simpleBackupService';
import {
  GenerateBackupResponse,
  RestoreBackupResponse,
  ValidateBackupResponse,
  BackupMetadata,
  SimpleBackupError
} from '../types/simpleBackup';

export const useSimpleBackup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Limpar erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Gerar backup
   */
  const generateBackup = useCallback(async (masterPassword: string): Promise<GenerateBackupResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      console.log('📦 Gerando backup...');
      const response = await SimpleBackupService.generateBackup(masterPassword);

      console.log('✅ Backup gerado com sucesso');
      return response;

    } catch (err: any) {
      const error = err as SimpleBackupError;
      const errorMessage = error.message || 'Erro ao gerar backup';
      setError(errorMessage);
      
      console.error('❌ Erro ao gerar backup:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Restaurar backup
   */
  const restoreBackup = useCallback(async (backupData: string, masterPassword: string): Promise<RestoreBackupResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Restaurando backup...');
      const response = await SimpleBackupService.restoreBackup(backupData, masterPassword);

      console.log('✅ Backup restaurado com sucesso');
      return response;

    } catch (err: any) {
      const error = err as SimpleBackupError;
      const errorMessage = error.message || 'Erro ao restaurar backup';
      setError(errorMessage);
      
      console.error('❌ Erro ao restaurar backup:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Validar backup
   */
  const validateBackup = useCallback(async (backupData: string, masterPassword: string): Promise<ValidateBackupResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Validando backup...');
      const response = await SimpleBackupService.validateBackup(backupData, masterPassword);

      console.log('✅ Backup válido');
      return response;

    } catch (err: any) {
      const error = err as SimpleBackupError;
      const errorMessage = error.message || 'Erro ao validar backup';
      setError(errorMessage);
      
      console.error('❌ Erro ao validar backup:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Download backup
   */
  const downloadBackup = useCallback(async (backupData: string, filename: string, filePath?: string): Promise<void> => {
    try {
      await SimpleBackupService.downloadBackup(backupData, filename, filePath);
      console.log('📥 Download iniciado');
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao fazer download';
      setError(errorMessage);
      console.error('❌ Erro ao fazer download:', err);
      throw err;
    }
  }, []);

  /**
   * Restaurar backup de arquivo
   */
  const restoreBackupFromFile = useCallback(async (filePath: string, masterPassword: string): Promise<RestoreBackupResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Restaurando backup de arquivo...');
      const response = await SimpleBackupService.restoreBackupFromFile(filePath, masterPassword);

      console.log('✅ Backup restaurado com sucesso');
      return response;

    } catch (err: any) {
      const error = err as SimpleBackupError;
      const errorMessage = error.message || 'Erro ao restaurar backup';
      setError(errorMessage);
      
      console.error('❌ Erro ao restaurar backup:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Upload e restaurar backup de arquivo
   */
  const uploadAndRestoreBackup = useCallback(async (file: any, masterPassword: string): Promise<RestoreBackupResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fazendo upload e restaurando backup...');
      const response = await SimpleBackupService.uploadAndRestoreBackup(file, masterPassword);

      console.log('✅ Backup restaurado com sucesso');
      return response;

    } catch (err: any) {
      const error = err as SimpleBackupError;
      const errorMessage = error.message || 'Erro ao restaurar backup';
      setError(errorMessage);
      
      console.error('❌ Erro ao restaurar backup:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Ler arquivo de backup
   */
  const readBackupFile = useCallback(async (file: File): Promise<string> => {
    try {
      setLoading(true);
      setError(null);

      console.log('📖 Lendo arquivo de backup...');
      const data = await SimpleBackupService.readBackupFile(file);

      console.log('✅ Arquivo lido com sucesso');
      return data;

    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao ler arquivo';
      setError(errorMessage);
      console.error('❌ Erro ao ler arquivo:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // Estado
    loading,
    error,
    
    // Ações
    generateBackup,
    restoreBackup,
    restoreBackupFromFile,
    uploadAndRestoreBackup,
    validateBackup,
    downloadBackup,
    readBackupFile,
    
    // Utilitários
    clearError
  };
};
