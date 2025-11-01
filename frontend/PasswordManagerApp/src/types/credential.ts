// Tipos para credenciais

export interface Credential {
  id: string;
  title: string;
  description?: string;
  category: string;
  username?: string;
  password: string;
  notes?: string;
  isFavorite: boolean;
  accessCount: number;
  lastAccessed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialPublic {
  id: string;
  title: string;
  description?: string;
  category: string;
  isFavorite: boolean;
  accessCount: number;
  lastAccessed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCredentialRequest {
  title: string;
  description?: string;
  category?: string;
  username?: string;
  password: string;
  notes?: string;
  masterPassword: string;
  isFavorite?: boolean;
}

export interface UpdateCredentialRequest {
  title?: string;
  description?: string;
  category?: string;
  username?: string;
  password?: string;
  notes?: string;
  masterPassword: string;
  isFavorite?: boolean;
}

export interface GetCredentialRequest {
  masterPassword: string;
}

export interface PasswordStrength {
  score: number;
  strength: 'Muito fraca' | 'Fraca' | 'Média' | 'Forte' | 'Muito forte';
  feedback: string[];
}

export interface GeneratePasswordRequest {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  excludeSimilar?: boolean;
}

export interface GeneratePasswordResponse {
  password: string;
  strength: PasswordStrength;
}

export interface AnalyzePasswordRequest {
  password: string;
}

export interface AnalyzePasswordResponse {
  strength: PasswordStrength;
}

export interface CredentialFilters {
  category?: string;
  search?: string;
  favorite?: boolean;
  page?: number;
  limit?: number;
  sort?: 'title' | 'category' | 'lastAccessed' | 'accessCount' | 'createdAt' | 'updatedAt' | 'isFavorite';
  order?: 'asc' | 'desc';
}

export interface CredentialFormData {
  title: string;
  description: string;
  category: string;
  username: string;
  password: string;
  notes: string;
  isFavorite: boolean;
}

export interface CredentialFormErrors {
  title?: string;
  description?: string;
  category?: string;
  username?: string;
  password?: string;
  notes?: string;
  masterPassword?: string;
}

// Respostas da API
export interface CredentialsResponse {
  success: boolean;
  data: CredentialPublic[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CredentialResponse {
  success: boolean;
  data: Credential;
}

export interface CreateCredentialResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    title: string;
    category: string;
    createdAt: string;
  };
}

export interface UpdateCredentialResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    title: string;
    category: string;
    updatedAt: string;
  };
}

export interface DeleteCredentialResponse {
  success: boolean;
  message: string;
}

export interface CategoriesResponse {
  success: boolean;
  data: string[];
}

// Versionamento de credenciais
export interface CredentialVersionItem {
  id: string;
  version: number;
  title: string;
  description?: string;
  category: string;
  isFavorite: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CredentialVersionsResponse {
  success: boolean;
  data: CredentialVersionItem[];
}

export interface RestoreVersionResponse {
  success: boolean;
  message: string;
}

export interface GeneratePasswordApiResponse {
  success: boolean;
  data: GeneratePasswordResponse;
}

export interface AnalyzePasswordApiResponse {
  success: boolean;
  data: AnalyzePasswordResponse;
}

// Constantes
export const DEFAULT_CATEGORIES = [
  'Geral',
  'Redes Sociais',
  'E-mail',
  'Contas Bancárias',
  'Serviços de Entretenimento',
  'Trabalho',
  'Educação',
  'Compras Online',
  'Outros'
];

export const PASSWORD_STRENGTH_COLORS = {
  'Muito fraca': '#e74c3c',
  'Fraca': '#f39c12',
  'Média': '#f1c40f',
  'Forte': '#27ae60',
  'Muito forte': '#2ecc71'
};

export const PASSWORD_STRENGTH_ICONS = {
  'Muito fraca': '🔴',
  'Fraca': '🟠',
  'Média': '🟡',
  'Forte': '🟢',
  'Muito forte': '💚'
};
