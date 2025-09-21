import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  UserSettings, 
  UpdateSettingsRequest, 
  SettingsApiResponse, 
  UpdateSettingsApiResponse 
} from '../types/settings';

/**
 * Serviço para gerenciar configurações do usuário
 */
class SettingsService {
  /**
   * Obter configurações do usuário
   */
  static async getSettings(): Promise<SettingsApiResponse> {
    try {
      const response = await api.get<SettingsApiResponse>('/settings');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter configurações:', error);
      throw error;
    }
  }

  /**
   * Atualizar configurações do usuário
   */
  static async updateSettings(settings: UpdateSettingsRequest): Promise<UpdateSettingsApiResponse> {
    try {
      const response = await api.put<UpdateSettingsApiResponse>('/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      throw error;
    }
  }

  /**
   * Resetar configurações para padrão
   */
  static async resetSettings(): Promise<UpdateSettingsApiResponse> {
    try {
      const response = await api.post<UpdateSettingsApiResponse>('/settings/reset');
      return response.data;
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
      throw error;
    }
  }

  /**
   * Validar configurações antes de enviar
   */
  static validateSettings(settings: UpdateSettingsRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.autoLockTimeout !== undefined) {
      if (settings.autoLockTimeout < 1 || settings.autoLockTimeout > 60) {
        errors.push('Timeout de bloqueio deve estar entre 1 e 60 minutos');
      }
    }

    if (settings.biometricType !== undefined) {
      const validTypes = ['fingerprint'];
      if (!validTypes.includes(settings.biometricType)) {
        errors.push('Tipo biométrico deve ser fingerprint');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Obter configurações do AsyncStorage
   */
  static async getLocalSettings(): Promise<Partial<UserSettings> | null> {
    try {
      const settings = await AsyncStorage.getItem('userSettings');
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Erro ao obter configurações locais:', error);
      return null;
    }
  }

  /**
   * Salvar configurações no AsyncStorage
   */
  static async saveLocalSettings(settings: UserSettings): Promise<void> {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Erro ao salvar configurações locais:', error);
    }
  }

  /**
   * Limpar configurações do AsyncStorage
   */
  static async clearLocalSettings(): Promise<void> {
    try {
      await AsyncStorage.removeItem('userSettings');
    } catch (error) {
      console.error('Erro ao limpar configurações locais:', error);
    }
  }
}

export default SettingsService;
