import axios, { AxiosResponse } from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest, ApiError } from '../types/auth';

// URL que funcionou no teste
const WORKING_URL = 'http://192.168.0.68:3000/api';

console.log('🔗 Usando URL funcionando:', WORKING_URL);

const api = axios.create({
  baseURL: WORKING_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor para logging
api.interceptors.request.use(
  (config) => {
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
    console.log('📥 Resposta:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('❌ Erro na API:', error);
    
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
