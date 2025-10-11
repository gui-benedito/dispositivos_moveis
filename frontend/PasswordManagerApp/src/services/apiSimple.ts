import axios, { AxiosResponse } from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest, ApiError } from '../types/auth';
import { connectionManager } from './connectionManager';

// Configuração da API - detecta ambiente e usa URL apropriada
const getApiBaseUrl = () => {
  // Usar variável de ambiente se disponível
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  
  // Para Expo web, usar localhost
  if (typeof window !== 'undefined') {
    return 'http://localhost:3000/api';
  }
  
  // Para React Native, usar localhost por padrão
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔗 ApiSimple API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor para adicionar token automaticamente e detectar URL funcionando
api.interceptors.request.use(
  async (config) => {
    // Sempre verificar se temos uma URL funcionando
    let workingUrl = connectionManager.getWorkingUrl();
    if (!workingUrl) {
      workingUrl = await connectionManager.findWorkingUrl();
    }
    
    if (workingUrl) {
      config.baseURL = workingUrl;
      console.log('🔄 ApiSimple usando URL detectada:', workingUrl);
    } else {
      config.baseURL = API_BASE_URL;
      console.log('⚠️ ApiSimple usando URL padrão:', API_BASE_URL);
    }
    
    console.log('📤 Requisição ApiSimple:', config.method?.toUpperCase(), config.url);
    console.log('📤 Base URL:', config.baseURL);
    console.log('📤 Dados:', config.data);
    
    // Log específico para email
    if (config.data && config.data.email) {
      console.log('🔧 Email sendo enviado:', config.data.email);
      console.log('🔧 Tipo do email:', typeof config.data.email);
      console.log('🔧 Length do email:', config.data.email.length);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Erro na requisição ApiSimple:', error);
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('📥 Resposta:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('❌ Erro na API:', error);
    
    // Tratar status 202 como sucesso (2FA necessário)
    if (error.response?.status === 202) {
      console.log('🔧 Status 202 detectado - 2FA necessário');
      return Promise.resolve(error.response);
    }
    
    if (error.response?.data) {
      // Retornar erro formatado da API
      return Promise.reject(error.response.data as ApiError);
    }
    
    if (error.code === 'ECONNREFUSED') {
      return Promise.reject({
        success: false,
        message: 'Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3000.',
        code: 'CONNECTION_REFUSED'
      } as ApiError);
    }
    
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      return Promise.reject({
        success: false,
        message: 'Erro de rede. Verifique sua conexão e se o backend está rodando.',
        code: 'NETWORK_ERROR'
      } as ApiError);
    }
    
    return Promise.reject({
      success: false,
      message: 'Erro de conexão',
      code: 'NETWORK_ERROR'
    } as ApiError);
  }
);

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/refresh-token', {
      refreshToken
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    const response = await api.get(`/auth/check-email?email=${encodeURIComponent(email)}`);
    return response.data;
  }
};

export default api;
