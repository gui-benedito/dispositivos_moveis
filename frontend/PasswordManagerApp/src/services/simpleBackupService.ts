import api from './api';
// import * as FileSystem from 'expo-file-system';
import {
  GenerateBackupRequest,
  GenerateBackupResponse,
  RestoreBackupRequest,
  RestoreBackupResponse,
  ValidateBackupRequest,
  ValidateBackupResponse,
  SimpleBackupError
} from '../types/simpleBackup';

class SimpleBackupService {
  /**
   * Gerar arquivo de backup
   */
  static async generateBackup(masterPassword: string): Promise<GenerateBackupResponse> {
    try {
      const response = await api.post<GenerateBackupResponse>('/simple-backup/generate', {
        masterPassword
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao gerar backup:', error);
      throw error;
    }
  }

  /**
   * Restaurar backup
   */
  static async restoreBackup(backupData: string, masterPassword: string): Promise<RestoreBackupResponse> {
    try {
      const response = await api.post<RestoreBackupResponse>('/simple-backup/restore', {
        backupData,
        masterPassword
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao restaurar backup:', error);
      throw error;
    }
  }

  /**
   * Validar backup
   */
  static async validateBackup(backupData: string, masterPassword: string): Promise<ValidateBackupResponse> {
    try {
      const response = await api.post<ValidateBackupResponse>('/simple-backup/validate', {
        backupData,
        masterPassword
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao validar backup:', error);
      throw error;
    }
  }

  /**
   * Download do arquivo de backup (React Native)
   */
  static async downloadBackup(backupData: string, filename: string, filePath?: string): Promise<void> {
    try {
      const { Share } = require('react-native');
      
      // Garantir que o filename tenha a extensão .encrypted
      const tempFilename = filename.endsWith('.encrypted') ? filename : `${filename}.encrypted`;
      
      // Compartilhar APENAS o conteúdo criptografado
      const message = backupData;
      
      Share.share({
        message: message,
        title: `Backup do Password Manager - ${tempFilename}`
      }).then((result: any) => {
        if (result.action === Share.sharedAction) {
          console.log('📥 Backup compartilhado com sucesso');
        }
      }).catch((error: any) => {
        console.error('❌ Erro ao compartilhar backup:', error);
        throw new Error('Erro ao compartilhar backup');
      });
      
    } catch (error) {
      console.error('❌ Erro ao fazer download:', error);
      throw new Error('Erro ao fazer download do arquivo');
    }
  }

  /**
   * Restaurar backup de arquivo
   */
  static async restoreBackupFromFile(filePath: string, masterPassword: string): Promise<RestoreBackupResponse> {
    try {
      const response = await api.post<RestoreBackupResponse>('/simple-backup/restore-file', {
        filePath,
        masterPassword
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao restaurar backup de arquivo:', error);
      throw error;
    }
  }

  /**
   * Upload e restaurar backup de arquivo
   */
  static async uploadAndRestoreBackup(file: any, masterPassword: string): Promise<RestoreBackupResponse> {
    try {
      // Para React Native, vamos ler o arquivo e enviar como texto
      const response = await fetch(file.uri);
      const fileContent = await response.text();
      
      // Enviar como dados normais em vez de FormData
      const response2 = await api.post<RestoreBackupResponse>('/simple-backup/restore', {
        backupData: fileContent,
        masterPassword: masterPassword
      });
      
      return response2.data;
    } catch (error: any) {
      console.error('Erro ao fazer upload e restaurar backup:', error);
      throw error;
    }
  }

  /**
   * Ler arquivo de backup
   */
  static async readBackupFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const result = event.target?.result as string;
          resolve(result);
        } catch (error) {
          reject(new Error('Erro ao ler arquivo'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erro ao ler arquivo'));
      };
      
      reader.readAsText(file);
    });
  }
}

export default SimpleBackupService;
