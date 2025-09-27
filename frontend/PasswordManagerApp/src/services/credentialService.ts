import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectionManager } from './connectionManager';
import {
  Credential,
  CredentialPublic,
  CreateCredentialRequest,
  UpdateCredentialRequest,
  GetCredentialRequest,
  CredentialFilters,
  CredentialsResponse,
  CredentialResponse,
  CreateCredentialResponse,
  UpdateCredentialResponse,
  DeleteCredentialResponse,
  CategoriesResponse,
  GeneratePasswordRequest,
  GeneratePasswordApiResponse,
  AnalyzePasswordRequest,
  AnalyzePasswordApiResponse
} from '../types/credential';

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
  
  // Para React Native, tentar diferentes IPs
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

console.log('🔗 CredentialService API Base URL:', API_BASE_URL);

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
      console.log('🔄 CredentialService usando URL detectada:', workingUrl);
    } else {
      config.baseURL = API_BASE_URL;
      console.log('⚠️ CredentialService usando URL padrão:', API_BASE_URL);
    }
    
    // Adicionar token de autenticação se disponível
    try {
      const tokens = await AsyncStorage.getItem('authTokens');
      if (tokens) {
        const parsedTokens = JSON.parse(tokens);
        if (parsedTokens.accessToken) {
          config.headers.Authorization = `Bearer ${parsedTokens.accessToken}`;
          console.log('🔐 Token adicionado à requisição de credenciais');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao obter token:', error);
    }
    
    console.log('📤 Requisição de credenciais:', config.method?.toUpperCase(), config.url);
    console.log('📤 Base URL:', config.baseURL);
    console.log('📤 Dados:', config.data);
    return config;
  },
  (error) => {
    console.error('❌ Erro na requisição de credenciais:', error);
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Erro na API de credenciais:', error);
    
    if (error.response?.data) {
      // Retornar erro formatado da API
      return Promise.reject(error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      return Promise.reject({
        success: false,
        message: 'Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3000.',
        code: 'CONNECTION_REFUSED'
      });
    }
    
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      return Promise.reject({
        success: false,
        message: 'Erro de rede. Verifique sua conexão e se o backend está rodando.',
        code: 'NETWORK_ERROR'
      });
    }
    
    return Promise.reject({
      success: false,
      message: 'Erro de conexão',
      code: 'NETWORK_ERROR'
    });
  }
);

export class CredentialService {
  /**
   * Lista todas as credenciais do usuário (apenas metadados)
   */
  static async getCredentials(filters?: CredentialFilters): Promise<CredentialsResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.category) {
        params.append('category', filters.category);
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }
      if (filters?.favorite !== undefined) {
        params.append('favorite', filters.favorite.toString());
      }

      const response = await api.get<CredentialsResponse>(`/credentials?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao listar credenciais:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Obtém uma credencial específica (descriptografada)
   */
  static async getCredential(id: string, masterPassword: string): Promise<CredentialResponse> {
    try {
      const response = await api.get<CredentialResponse>(`/credentials/${id}?masterPassword=${encodeURIComponent(masterPassword)}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao obter credencial:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Cria uma nova credencial
   */
  static async createCredential(data: CreateCredentialRequest): Promise<CreateCredentialResponse> {
    try {
      const response = await api.post<CreateCredentialResponse>('/credentials', data);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao criar credencial:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Atualiza uma credencial existente
   */
  static async updateCredential(id: string, data: UpdateCredentialRequest): Promise<UpdateCredentialResponse> {
    try {
      const response = await api.put<UpdateCredentialResponse>(`/credentials/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao atualizar credencial:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Exclui uma credencial (soft delete)
   */
  static async deleteCredential(id: string): Promise<DeleteCredentialResponse> {
    try {
      const response = await api.delete<DeleteCredentialResponse>(`/credentials/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao excluir credencial:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Lista todas as categorias do usuário
   */
  static async getCategories(): Promise<CategoriesResponse> {
    try {
      const response = await api.get<CategoriesResponse>('/credentials/categories');
      return response.data;
    } catch (error: any) {
      console.error('Erro ao listar categorias:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Gera uma senha forte
   */
  static async generatePassword(options?: GeneratePasswordRequest): Promise<GeneratePasswordApiResponse> {
    try {
      const response = await api.post<GeneratePasswordApiResponse>('/credentials/generate-password', options || {});
      return response.data;
    } catch (error: any) {
      console.error('Erro ao gerar senha:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Analisa a força de uma senha
   */
  static async analyzePassword(password: string): Promise<AnalyzePasswordApiResponse> {
    try {
      const response = await api.post<AnalyzePasswordApiResponse>('/credentials/analyze-password', {
        password
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao analisar senha:', error);
      throw error.response?.data || error;
    }
  }


  /**
   * Valida dados de uma credencial
   */
  static validateCredential(data: Partial<CreateCredentialRequest>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.title?.trim()) {
      errors.push('Título é obrigatório');
    } else if (data.title.length > 100) {
      errors.push('Título deve ter no máximo 100 caracteres');
    }

    if (data.description && data.description.length > 1000) {
      errors.push('Descrição deve ter no máximo 1000 caracteres');
    }

    if (data.category && data.category.length > 50) {
      errors.push('Categoria deve ter no máximo 50 caracteres');
    }

    if (!data.password?.trim()) {
      errors.push('Senha é obrigatória');
    }

    if (data.url && !CredentialService.isValidUrl(data.url)) {
      errors.push('URL deve ter um formato válido');
    }

    if (!data.masterPassword?.trim()) {
      errors.push('Senha mestre é obrigatória');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida URL
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Formata dados de uma credencial para exibição
   */
  static formatCredentialForDisplay(credential: CredentialPublic): {
    title: string;
    category: string;
    lastAccessed: string;
    accessCount: string;
  } {
    return {
      title: credential.title,
      category: credential.category,
      lastAccessed: credential.lastAccessed 
        ? new Date(credential.lastAccessed).toLocaleDateString('pt-BR')
        : 'Nunca',
      accessCount: credential.accessCount.toString()
    };
  }

  /**
   * Filtra credenciais localmente (para busca em tempo real)
   */
  static filterCredentials(
    credentials: CredentialPublic[], 
    filters: CredentialFilters
  ): CredentialPublic[] {
    return credentials.filter(credential => {
      // Filtro por categoria
      if (filters.category && credential.category !== filters.category) {
        return false;
      }

      // Filtro por favoritos
      if (filters.favorite !== undefined && credential.isFavorite !== filters.favorite) {
        return false;
      }

      // Filtro por busca
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = credential.title.toLowerCase().includes(searchLower);
        const matchesDescription = credential.description?.toLowerCase().includes(searchLower) || false;
        
        if (!matchesTitle && !matchesDescription) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Ordena credenciais
   */
  static sortCredentials(
    credentials: CredentialPublic[], 
    sortBy: 'title' | 'category' | 'lastAccessed' | 'accessCount' = 'title',
    order: 'asc' | 'desc' = 'asc'
  ): CredentialPublic[] {
    return [...credentials].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'lastAccessed':
          const dateA = a.lastAccessed ? new Date(a.lastAccessed).getTime() : 0;
          const dateB = b.lastAccessed ? new Date(b.lastAccessed).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'accessCount':
          comparison = a.accessCount - b.accessCount;
          break;
      }

      return order === 'desc' ? -comparison : comparison;
    });
  }
}

export const credentialService = new CredentialService();
