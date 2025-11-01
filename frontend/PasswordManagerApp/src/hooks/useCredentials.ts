import { useState, useEffect, useCallback } from 'react';
import { CredentialService } from '../services/credentialService';
import {
  Credential,
  CredentialPublic,
  CreateCredentialRequest,
  UpdateCredentialRequest,
  CredentialFilters,
  PasswordStrength,
  GeneratePasswordRequest
} from '../types/credential';

export const useCredentials = () => {
  const [credentials, setCredentials] = useState<CredentialPublic[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CredentialFilters>({});
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Carregar credenciais
  const loadCredentials = useCallback(async (newFilters?: CredentialFilters) => {
    try {
      setLoading(true);
      setError(null);

      const currentFilters = newFilters || filters;
      const response = await CredentialService.getCredentials(currentFilters);
      
      if (response.success) {
        setCredentials(response.data);
        if (response.pagination) setPagination(response.pagination);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar credenciais');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Carregar categorias
  const loadCategories = useCallback(async () => {
    try {
      const response = await CredentialService.getCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (err: any) {
      console.error('Erro ao carregar categorias:', err);
    }
  }, []);

  // Aplicar filtros
  const applyFilters = useCallback((newFilters: CredentialFilters) => {
    setFilters(newFilters);
    loadCredentials(newFilters);
  }, [loadCredentials]);

  // Limpar filtros
  const clearFilters = useCallback(() => {
    setFilters({});
    loadCredentials({});
  }, [loadCredentials]);

  // Paginação: carregar próxima página
  const loadMore = useCallback(async () => {
    if (!pagination) return;
    if (pagination.page >= pagination.totalPages) return;
    try {
      setIsLoadingMore(true);
      const next = { ...filters, page: (pagination.page + 1), limit: pagination.limit };
      const response = await CredentialService.getCredentials(next);
      if (response.success) {
        setCredentials(prev => [...prev, ...response.data]);
        if (response.pagination) setPagination(response.pagination);
        setFilters(next);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar mais');
    } finally {
      setIsLoadingMore(false);
    }
  }, [pagination, filters]);

  // Criar credencial
  const createCredential = useCallback(async (data: CreateCredentialRequest) => {
    try {
      setLoading(true);
      setError(null);

      const response = await CredentialService.createCredential(data);
      
      if (response.success) {
        // Recarregar credenciais após criar
        await loadCredentials();
        await loadCategories(); // Recarregar categorias também
        return response;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar credencial');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadCredentials, loadCategories]);

  // Atualizar credencial
  const updateCredential = useCallback(async (id: string, data: UpdateCredentialRequest) => {
    try {
      setLoading(true);
      setError(null);

      const response = await CredentialService.updateCredential(id, data);
      
      if (response.success) {
        // Recarregar credenciais após atualizar
        await loadCredentials();
        await loadCategories(); // Recarregar categorias também
        return response;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar credencial');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadCredentials, loadCategories]);

  // Excluir credencial
  const deleteCredential = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await CredentialService.deleteCredential(id);
      
      if (response.success) {
        // Remover credencial da lista local
        setCredentials(prev => prev.filter(cred => cred.id !== id));
        await loadCategories(); // Recarregar categorias também
        return response;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir credencial');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadCategories]);

  // Obter credencial específica
  const getCredential = useCallback(async (id: string, masterPassword: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await CredentialService.getCredential(id, masterPassword);
      
      if (response.success) {
        return response.data;
      }
      throw new Error('Erro ao obter credencial');
    } catch (err: any) {
      setError(err.message || 'Erro ao obter credencial');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);


  // Carregar dados iniciais
  useEffect(() => {
    loadCredentials();
    loadCategories();
  }, []);

  return {
    // Estado
    credentials,
    categories,
    loading,
    error,
    filters,
    pagination,
    isLoadingMore,

    // Ações
    loadCredentials,
    loadCategories,
    applyFilters,
    clearFilters,
    createCredential,
    updateCredential,
    deleteCredential,
    getCredential,

    // Utilitários
    setError,

    // Paginação
    loadMore
  };
};

export const usePasswordGenerator = () => {
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Gerar senha
  const generatePassword = useCallback(async (options?: GeneratePasswordRequest) => {
    try {
      setLoading(true);
      setError(null);

      const response = await CredentialService.generatePassword(options);
      
      if (response.success) {
        setGeneratedPassword(response.data.password);
        setPasswordStrength(response.data.strength);
        return response.data;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar senha');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Analisar força da senha
  const analyzePassword = useCallback(async (password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await CredentialService.analyzePassword(password);
      
      if (response.success) {
        setPasswordStrength(response.data.strength);
        return response.data.strength;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao analisar senha');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Limpar senha gerada
  const clearGeneratedPassword = useCallback(() => {
    setGeneratedPassword('');
    setPasswordStrength(null);
  }, []);

  return {
    // Estado
    generatedPassword,
    passwordStrength,
    loading,
    error,

    // Ações
    generatePassword,
    analyzePassword,
    clearGeneratedPassword,

    // Utilitários
    setError
  };
};

export const useCredentialForm = (
  initialData?: Partial<CreateCredentialRequest>,
  options?: { requirePassword?: boolean }
) => {
  const [formData, setFormData] = useState<CreateCredentialRequest>({
    title: '',
    description: '',
    category: 'Geral',
    username: '',
    password: '',
    notes: '',
    masterPassword: '',
    isFavorite: false,
    ...initialData
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Atualizar campo do formulário
  const updateField = useCallback((field: keyof CreateCredentialRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Marcar campo como tocado
  const touchField = useCallback((field: keyof CreateCredentialRequest) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  // Validar formulário
  const validateForm = useCallback((): boolean => {
    const validation = CredentialService.validateCredential(formData);
    
    if (!validation.isValid) {
      const newErrors: { [key: string]: string } = {};
      validation.errors.forEach(error => {
        // Mapear erros para campos específicos
        if (error.includes('Título')) newErrors.title = error;
        else if (error.includes('Descrição')) newErrors.description = error;
        else if (error.includes('Categoria')) newErrors.category = error;
        else if (error.includes('Senha')) newErrors.password = error;
        else if (error.includes('Senha mestre')) newErrors.masterPassword = error;
        else newErrors.general = error;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [formData]);

  // Resetar formulário
  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      category: 'Geral',
      username: '',
      password: '',
      notes: '',
      masterPassword: '',
      isFavorite: false,
      ...initialData
    });
    setErrors({});
    setTouched({});
  }, [initialData]);

  // Verificar se formulário é válido
  const requirePassword = options?.requirePassword !== undefined ? options.requirePassword : true;
  const isValid = Object.keys(errors).length === 0 && 
    formData.title.trim() !== '' && 
    (requirePassword ? formData.password.trim() !== '' : true) && 
    formData.masterPassword.trim() !== '';

  return {
    // Estado
    formData,
    errors,
    touched,
    isValid,

    // Ações
    updateField,
    touchField,
    validateForm,
    resetForm,
    setFormData,
    setErrors
  };
};
