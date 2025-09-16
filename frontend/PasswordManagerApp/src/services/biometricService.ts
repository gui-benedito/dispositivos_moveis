import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axios from 'axios';
import { 
  BiometricType, 
  DeviceInfo, 
  EnableBiometricRequest, 
  AuthenticateBiometricRequest,
  BiometricResponse,
  BiometricStatusResponse,
  BiometricSessionsResponse
} from '../types/biometric';

// URL da API (usando a mesma configuração do apiSimple)
const API_BASE_URL = 'http://192.168.0.68:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  async (config) => {
    try {
      // Tentar buscar token do AsyncStorage primeiro (onde o login salva)
      const tokens = await AsyncStorage.getItem('authTokens');
      if (tokens) {
        const parsedTokens = JSON.parse(tokens);
        if (parsedTokens.accessToken) {
          config.headers.Authorization = `Bearer ${parsedTokens.accessToken}`;
        }
      } else {
        // Fallback para SecureStore se não encontrar no AsyncStorage
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Erro ao obter token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export class BiometricService {
  /**
   * Verifica se o dispositivo suporta autenticação biométrica
   */
  static async isBiometricSupported(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Erro ao verificar suporte biométrico:', error);
      return false;
    }
  }

  /**
   * Obtém os tipos de biometria disponíveis no dispositivo
   */
  static async getAvailableBiometricTypes(): Promise<BiometricType[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const availableTypes: BiometricType[] = [];

      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        availableTypes.push('fingerprint');
      }

      return availableTypes;
    } catch (error) {
      console.error('Erro ao obter tipos biométricos:', error);
      return [];
    }
  }

  /**
   * Obtém informações do dispositivo
   */
  static getDeviceInfo(): DeviceInfo {
    return {
      model: Platform.OS === 'ios' ? 'iPhone' : 'Android Device',
      os: Platform.OS,
      version: Platform.Version?.toString(),
      platform: Platform.OS
    };
  }

  /**
   * Ativa autenticação biométrica no backend
   */
  static async enableBiometric(biometricType: BiometricType): Promise<BiometricResponse> {
    try {
      const deviceInfo = this.getDeviceInfo();
      const requestData: EnableBiometricRequest = {
        biometricType,
        deviceInfo
      };

      const response = await api.post<BiometricResponse>('/biometric/enable', requestData);
      
      // Salvar sessionId para uso posterior
      if (response.data.data?.sessionId) {
        await AsyncStorage.setItem('biometricSessionId', response.data.data.sessionId);
      }

      return response.data;
    } catch (error: any) {
      console.error('Erro ao ativar biometria:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Desativa autenticação biométrica no backend
   */
  static async disableBiometric(): Promise<BiometricResponse> {
    try {
      const response = await api.post<BiometricResponse>('/biometric/disable');
      
      // Remover sessionId salvo
      await AsyncStorage.removeItem('biometricSessionId');
      
      return response.data;
    } catch (error: any) {
      console.error('Erro ao desativar biometria:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Autentica usando biometria
   */
  static async authenticateBiometric(biometricType: BiometricType): Promise<BiometricResponse> {
    try {
      // Primeiro, autenticar localmente com biometria
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentique-se para acessar suas credenciais',
        fallbackLabel: 'Usar senha',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false
      });

      if (!result.success) {
        throw new Error('Autenticação biométrica local falhou');
      }

      // Obter sessionId salvo
      const sessionId = await AsyncStorage.getItem('biometricSessionId');
      if (!sessionId) {
        throw new Error('Sessão biométrica não encontrada');
      }

      // Autenticar no backend
      const deviceInfo = this.getDeviceInfo();
      const requestData: AuthenticateBiometricRequest = {
        sessionId,
        biometricType,
        deviceInfo
      };

      const response = await api.post<BiometricResponse>('/biometric/authenticate', requestData);
      
      // Salvar tokens se a autenticação foi bem-sucedida
      if (response.data.data?.tokens) {
        await AsyncStorage.setItem('authTokens', JSON.stringify(response.data.data.tokens));
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error: any) {
      console.error('Erro na autenticação biométrica:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Obtém status da biometria
   */
  static async getBiometricStatus(): Promise<BiometricStatusResponse> {
    try {
      const response = await api.get<BiometricStatusResponse>('/biometric/status');
      return response.data;
    } catch (error: any) {
      console.error('Erro ao obter status da biometria:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Lista sessões biométricas para auditoria
   */
  static async getBiometricSessions(): Promise<BiometricSessionsResponse> {
    try {
      const response = await api.get<BiometricSessionsResponse>('/biometric/sessions');
      return response.data;
    } catch (error: any) {
      console.error('Erro ao obter sessões biométricas:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Verifica se há uma sessão biométrica válida salva
   */
  static async hasValidBiometricSession(): Promise<boolean> {
    try {
      const sessionId = await AsyncStorage.getItem('biometricSessionId');
      return !!sessionId;
    } catch (error) {
      console.error('Erro ao verificar sessão biométrica:', error);
      return false;
    }
  }

  /**
   * Limpa dados biométricos salvos
   */
  static async clearBiometricData(): Promise<void> {
    try {
      await AsyncStorage.removeItem('biometricSessionId');
    } catch (error) {
      console.error('Erro ao limpar dados biométricos:', error);
    }
  }
}
