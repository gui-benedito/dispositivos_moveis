import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

type PendingOperationType = 'create' | 'update' | 'delete';

interface PendingOperation {
  id: string;
  type: PendingOperationType;
  credentialId?: string;
  data?: any;
  createdAt: number;
}

export const useCredentials = () => {
  const [credentials, setCredentials] = useState<CredentialPublic[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CredentialFilters>({});
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const CREDENTIALS_CACHE_KEY = 'credentialsCache';
  const CREDENTIAL_CATEGORIES_CACHE_KEY = 'credentialCategoriesCache';

  const saveCredentialsCache = useCallback(async (data: CredentialPublic[], paginationData?: any) => {
    try {
      await AsyncStorage.setItem(
        CREDENTIALS_CACHE_KEY,
        JSON.stringify({
          data,
          pagination: paginationData || null,
        })
      );
    } catch (cacheError) {
      console.error('Erro ao salvar cache de credenciais:', cacheError);
    }
  }, []);

  const saveCategoriesCache = useCallback(async (data: string[]) => {
    try {
      await AsyncStorage.setItem(
        CREDENTIAL_CATEGORIES_CACHE_KEY,
        JSON.stringify({ categories: data })
      );
    } catch (e) {
      console.error('Erro ao salvar cache de categorias de credenciais:', e);
    }
  }, []);

  const readCategoriesCache = useCallback(async (): Promise<string[] | null> => {
    try {
      const raw = await AsyncStorage.getItem(CREDENTIAL_CATEGORIES_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.categories || [];
    } catch (e) {
      console.error('Erro ao ler cache de categorias de credenciais:', e);
      return null;
    }
  }, []);

  const readCredentialsCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CREDENTIALS_CACHE_KEY);
      if (!cached) return null;
      return JSON.parse(cached);
    } catch (cacheReadError) {
      console.error('Erro ao ler cache de credenciais:', cacheReadError);
      return null;
    }
  }, []);

  const getErrorCode = (err: any): string | undefined => {
    return err?.code || err?.data?.code;
  };

  const enqueueOperation = useCallback(async (operation: PendingOperation) => {
    try {
      const existing = await AsyncStorage.getItem('credentialOpsQueue');
      const list: PendingOperation[] = existing ? JSON.parse(existing) : [];

      // Evitar enfileirar múltiplas operações idênticas de criação
      if (
        operation.type === 'create' &&
        operation.data &&
        list.some(op => op.type === 'create' && JSON.stringify(op.data) === JSON.stringify(operation.data))
      ) {
        return;
      }

      list.push(operation);
      await AsyncStorage.setItem('credentialOpsQueue', JSON.stringify(list));
    } catch (queueError) {
      console.error('Erro ao enfileirar operação offline de credencial:', queueError);
    }
  }, []);

  const syncPendingOperations = useCallback(async () => {
    try {
      const existing = await AsyncStorage.getItem('credentialOpsQueue');
      if (!existing) return;

      const queue: PendingOperation[] = JSON.parse(existing);
      if (!Array.isArray(queue) || queue.length === 0) {
        return;
      }

      // Limpar a fila imediatamente para evitar que múltiplas chamadas concorrentes
      // processem as mesmas operações ao mesmo tempo. Em caso de erro de rede,
      // as operações pendentes serão regravadas abaixo em `remaining`.
      await AsyncStorage.removeItem('credentialOpsQueue');

      const remaining: PendingOperation[] = [];

      for (let i = 0; i < queue.length; i++) {
        const op = queue[i];
        try {
          if (op.type === 'create' && op.data) {
            await CredentialService.createCredential(op.data as CreateCredentialRequest);
          } else if (op.type === 'update' && op.credentialId && op.data) {
            await CredentialService.updateCredential(op.credentialId, op.data as UpdateCredentialRequest);
          } else if (op.type === 'delete' && op.credentialId) {
            await CredentialService.deleteCredential(op.credentialId);
          }
        } catch (err: any) {
          const code = getErrorCode(err);
          if (code === 'NETWORK_ERROR' || code === 'CONNECTION_REFUSED') {
            remaining.push(op, ...queue.slice(i + 1));
            await AsyncStorage.setItem('credentialOpsQueue', JSON.stringify(remaining));
            throw err;
          } else {
            console.error('Erro ao sincronizar operação offline de credencial:', err);
          }
        }
      }
    } catch (e) {
      console.error('Erro geral ao sincronizar operações offline de credenciais:', e);
    }
  }, []);

  // Carregar credenciais
  const loadCredentials = useCallback(async (newFilters?: CredentialFilters) => {
    try {
      setLoading(true);
      setError(null);
      setIsOffline(false);

      // Remover placeholders offline-* da lista atual antes de recarregar
      setCredentials(prev => prev.filter(cred => !String(cred.id).startsWith('offline-')));

      const currentFilters = newFilters || filters;

      await syncPendingOperations();

      const response = await CredentialService.getCredentials(currentFilters);
      
      if (response.success) {
        setCredentials(response.data);
        if (response.pagination) setPagination(response.pagination);
        await saveCredentialsCache(response.data, response.pagination);
      }
    } catch (err: any) {
      const errorCode = getErrorCode(err);
      if (errorCode === 'NETWORK_ERROR' || errorCode === 'CONNECTION_REFUSED') {
        const parsed = await readCredentialsCache();
        if (parsed) {
          setCredentials(parsed.data || []);
          if (parsed.pagination) setPagination(parsed.pagination);
          setIsOffline(true);
        }
        // Não setar mensagem de erro para modo offline
      } else {
        setError(err.message || 'Erro ao carregar credenciais');
      }
    } finally {
      setLoading(false);
    }
  }, [filters, saveCredentialsCache, readCredentialsCache, syncPendingOperations]);

  // Carregar categorias
  const loadCategories = useCallback(async () => {
    try {
      const response = await CredentialService.getCategories();
      if (response.success) {
        setCategories(response.data);
        saveCategoriesCache(response.data);
      }
    } catch (err: any) {
      console.error('Erro ao carregar categorias:', err);

      const code = getErrorCode(err);
      if (code === 'NETWORK_ERROR' || code === 'CONNECTION_REFUSED') {
        const cached = await readCategoriesCache();
        if (cached) {
          setCategories(cached);
        }
      }
    }
  }, [saveCategoriesCache, readCategoriesCache]);

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
      const errorCode = getErrorCode(err);
      if (errorCode !== 'NETWORK_ERROR' && errorCode !== 'CONNECTION_REFUSED') {
        setError(err.message || 'Erro ao carregar mais');
      }
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
        await loadCredentials();
        await loadCategories();
        return response;
      }
    } catch (err: any) {
      const errorCode = getErrorCode(err);

      if (errorCode === 'NETWORK_ERROR' || errorCode === 'CONNECTION_REFUSED') {
        const tempId = `offline-${Date.now()}`;
        const category = data.category || 'Geral';
        const offlineCredential: CredentialPublic = {
          id: tempId,
          title: data.title,
          description: data.description || '',
          category,
          isFavorite: !!data.isFavorite,
          accessCount: 0,
          lastAccessed: null as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any;

        setCredentials(prev => {
          const next = [...prev, offlineCredential];
          saveCredentialsCache(next, pagination);
          return next;
        });

        setCategories(prev => {
          if (prev.includes(category)) return prev;
          const next = [...prev, category];
          saveCategoriesCache(next);
          return next;
        });

        enqueueOperation({
          id: tempId,
          type: 'create',
          data,
          createdAt: Date.now(),
        });

        setIsOffline(true);
        return {
          success: true,
          message: 'Operação enfileirada para sincronização offline',
          data: {
            id: tempId,
          },
        } as any;
      }

      setError(err.message || 'Erro ao criar credencial');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadCredentials, loadCategories, enqueueOperation, saveCredentialsCache, pagination]);

  // Atualizar credencial
  const updateCredential = useCallback(async (id: string, data: UpdateCredentialRequest) => {
    try {
      setLoading(true);
      setError(null);

      const response = await CredentialService.updateCredential(id, data);
      
      if (response.success) {
        await loadCredentials();
        await loadCategories();
        return response;
      }
    } catch (err: any) {
      const errorCode = getErrorCode(err);

      if (errorCode === 'NETWORK_ERROR' || errorCode === 'CONNECTION_REFUSED') {
        setCredentials(prev => {
          const next = prev.map(cred => cred.id === id ? {
            ...cred,
            title: data.title ?? cred.title,
            description: data.description ?? cred.description,
            category: data.category ?? cred.category,
            isFavorite: data.isFavorite ?? cred.isFavorite,
          } : cred);
          saveCredentialsCache(next, pagination);
          return next;
        });

        enqueueOperation({
          id: `offline-update-${Date.now()}`,
          type: 'update',
          credentialId: id,
          data,
          createdAt: Date.now(),
        });

        setIsOffline(true);
        return {
          success: true,
          message: 'Operação de atualização enfileirada para sincronização offline',
        } as any;
      }

      setError(err.message || 'Erro ao atualizar credencial');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadCredentials, loadCategories, enqueueOperation, saveCredentialsCache, pagination]);

  // Excluir credencial
  const deleteCredential = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await CredentialService.deleteCredential(id);
      
      if (response.success) {
        setCredentials(prev => {
          const next = prev.filter(cred => cred.id !== id);
          saveCredentialsCache(next, pagination);
          return next;
        });
        await loadCategories();
        return response;
      }
    } catch (err: any) {
      const errorCode = getErrorCode(err);

      if (errorCode === 'NETWORK_ERROR' || errorCode === 'CONNECTION_REFUSED') {
        setCredentials(prev => {
          const next = prev.filter(cred => cred.id !== id);
          saveCredentialsCache(next, pagination);
          return next;
        });

        enqueueOperation({
          id: `offline-delete-${Date.now()}`,
          type: 'delete',
          credentialId: id,
          createdAt: Date.now(),
        });

        setIsOffline(true);
        return {
          success: true,
          message: 'Operação de exclusão enfileirada para sincronização offline',
        } as any;
      }

      setError(err.message || 'Erro ao excluir credencial');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadCategories, enqueueOperation, saveCredentialsCache, pagination]);

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
    isOffline,

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
