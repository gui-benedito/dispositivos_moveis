import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      const tokens = await AsyncStorage.getItem('authTokens');
      if (tokens) {
        const parsedTokens = JSON.parse(tokens);
        if (parsedTokens.accessToken) {
          config.headers.Authorization = `Bearer ${parsedTokens.accessToken}`;
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
   * Copia texto para a área de transferência (simulado)
   * Em React Native, isso seria implementado com uma biblioteca específica
   */
  static async copyToClipboard(text: string): Promise<void> {
    try {
      // Em uma implementação real, você usaria uma biblioteca como @react-native-clipboard/clipboard
      // Por enquanto, apenas simulamos o comportamento
      console.log('Texto copiado para área de transferência:', text);
      
      // Salvar temporariamente no AsyncStorage para simular cópia
      await AsyncStorage.setItem('lastCopiedText', text);
    } catch (error) {
      console.error('Erro ao copiar para área de transferência:', error);
      throw error;
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
