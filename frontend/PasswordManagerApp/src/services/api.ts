import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, LoginRequest, RegisterRequest, ApiError } from '../types/auth';
import { connectionManager } from './connectionManager';

// Configuração da API - detecta ambiente e usa URL apropriada
const getApiBaseUrl = () => {
  // Para Expo web, usar localhost
  if (typeof window !== 'undefined') {
    return 'http://localhost:3000/api';
  }
  
  // Para React Native, tentar diferentes IPs
  // Primeiro, tentar descobrir o IP da máquina
  const possibleUrls = [
    'http://localhost:3000/api',
    'http://127.0.0.1:3000/api',
    'http://10.0.2.2:3000/api', // Android emulator
    'http://192.168.1.100:3000/api', // IP local comum
    'http://192.168.0.100:3000/api', // IP local comum
  ];
  
  // Por enquanto, usar localhost e deixar o interceptor tentar outras URLs
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔗 API Base URL:', API_BASE_URL);

// Criar instância do axios sem baseURL inicial
const api = axios.create({
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
      console.log('🔄 Usando URL detectada:', workingUrl);
    } else {
      config.baseURL = API_BASE_URL;
      console.log('⚠️ Usando URL padrão:', API_BASE_URL);
    }
    
    // Adicionar token de autenticação se disponível
    try {
      const tokens = await AsyncStorage.getItem('authTokens');
      if (tokens) {
        const parsedTokens = JSON.parse(tokens);
        if (parsedTokens.accessToken) {
          config.headers.Authorization = `Bearer ${parsedTokens.accessToken}`;
          console.log('🔐 Token adicionado à requisição');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao obter token:', error);
    }
    
    console.log('📤 Requisição:', config.method?.toUpperCase(), config.url);
    console.log('📤 Base URL:', config.baseURL);
    console.log('📤 Dados:', config.data);
    return config;
  },
  (error) => {
    console.error('❌ Erro na requisição:', error);
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    console.error('Erro na API:', error);
    
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
