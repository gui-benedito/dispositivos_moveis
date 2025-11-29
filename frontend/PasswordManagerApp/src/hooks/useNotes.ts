import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NoteService from '../services/noteService';
import { 
  Note, 
  CreateNoteRequest, 
  UpdateNoteRequest, 
  NoteSearchParams,
  NoteStats,
  ApiError 
} from '../types/note';

type PendingNoteOpType = 'create' | 'update' | 'delete' | 'toggleFavorite';

interface PendingNoteOperation {
  id: string;
  type: PendingNoteOpType;
  noteId?: string;
  data?: any;
  createdAt: number;
}

interface UseNotesReturn {
  // Estado
  notes: Note[];
  loading: boolean;
  error: string | null;
  stats: NoteStats | null;
  isOffline: boolean;
  
  // Ações
  createNote: (noteData: CreateNoteRequest) => Promise<Note | null>;
  updateNote: (id: string, noteData: UpdateNoteRequest) => Promise<Note | null>;
  deleteNote: (id: string) => Promise<boolean>;
  toggleFavorite: (id: string) => Promise<Note | null>;
  loadNotes: (params?: NoteSearchParams) => Promise<void>;
  searchNotes: (searchTerm: string, filters?: Omit<NoteSearchParams, 'search'>) => Promise<void>;
  loadStats: () => Promise<void>;
  refreshNotes: () => Promise<void>;
  
  // Utilitários
  getNoteById: (id: string) => Note | undefined;
  clearError: () => void;
}

export const useNotes = (): UseNotesReturn => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<NoteStats | null>(null);
   const [isOffline, setIsOffline] = useState(false);

  const NOTES_CACHE_KEY = 'notesCache';
  const NOTES_QUEUE_KEY = 'noteOpsQueue';

  const getErrorCode = (err: any): string | undefined => {
    const apiError = err as ApiError;
    return apiError?.code;
  };

  const saveNotesCache = useCallback(async (data: Note[]) => {
    try {
      await AsyncStorage.setItem(NOTES_CACHE_KEY, JSON.stringify({ notes: data }));
    } catch (e) {
      console.error('Erro ao salvar cache de notas:', e);
    }
  }, []);

  const readNotesCache = useCallback(async (): Promise<Note[] | null> => {
    try {
      const raw = await AsyncStorage.getItem(NOTES_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.notes || [];
    } catch (e) {
      console.error('Erro ao ler cache de notas:', e);
      return null;
    }
  }, []);

  const enqueueNoteOperation = useCallback(async (op: PendingNoteOperation) => {
    try {
      const raw = await AsyncStorage.getItem(NOTES_QUEUE_KEY);
      const list: PendingNoteOperation[] = raw ? JSON.parse(raw) : [];

      // Evitar enfileirar múltiplas operações idênticas de criação
      if (
        op.type === 'create' &&
        op.data &&
        list.some(item => item.type === 'create' && JSON.stringify(item.data) === JSON.stringify(op.data))
      ) {
        return;
      }

      list.push(op);
      await AsyncStorage.setItem(NOTES_QUEUE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Erro ao enfileirar operação offline de nota:', e);
    }
  }, []);

  const syncPendingNoteOperations = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(NOTES_QUEUE_KEY);
      if (!raw) return;

      const queue: PendingNoteOperation[] = JSON.parse(raw);
      if (!Array.isArray(queue) || queue.length === 0) return;

      const remaining: PendingNoteOperation[] = [];

      for (let i = 0; i < queue.length; i++) {
        const op = queue[i];
        try {
          if (op.type === 'create' && op.data) {
            await NoteService.createNote(op.data as CreateNoteRequest);
          } else if (op.type === 'update' && op.noteId && op.data) {
            await NoteService.updateNote(op.noteId, op.data as UpdateNoteRequest);
          } else if (op.type === 'delete' && op.noteId) {
            await NoteService.deleteNote(op.noteId);
          } else if (op.type === 'toggleFavorite' && op.noteId) {
            await NoteService.toggleFavorite(op.noteId);
          }
        } catch (err: any) {
          const code = getErrorCode(err);
          if (code === 'NETWORK_ERROR' || code === 'CONNECTION_REFUSED') {
            remaining.push(op, ...queue.slice(i + 1));
            await AsyncStorage.setItem(NOTES_QUEUE_KEY, JSON.stringify(remaining));
            throw err;
          } else {
            console.error('Erro ao sincronizar operação offline de nota:', err);
          }
        }
      }

      await AsyncStorage.removeItem(NOTES_QUEUE_KEY);
    } catch (e) {
      console.error('Erro geral ao sincronizar operações offline de notas:', e);
    }
  }, []);

  /**
   * Limpar erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Carregar notas
   */
  const loadNotes = useCallback(async (params: NoteSearchParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      setIsOffline(false);

      // Remover placeholders offline-note-* antes de recarregar
      setNotes(prev => prev.filter(note => !String(note.id).startsWith('offline-note-')));
      
      await syncPendingNoteOperations();

      const response = await NoteService.getNotes(params);
      setNotes(response.data.notes);
      await saveNotesCache(response.data.notes);
      
      console.log(`📝 ${response.data.notes.length} notas carregadas`);
    } catch (err: any) {
      const code = getErrorCode(err);
      if (code === 'NETWORK_ERROR' || code === 'CONNECTION_REFUSED') {
        const cached = await readNotesCache();
        if (cached) {
          setNotes(cached);
          setIsOffline(true);
        }
      } else {
        const apiError = err as ApiError;
        const errorMessage = apiError.message || 'Erro ao carregar notas';
        setError(errorMessage);
        console.error('❌ Erro ao carregar notas:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [readNotesCache, saveNotesCache, syncPendingNoteOperations]);

  /**
   * Atualizar lista de notas
   */
  const refreshNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await syncPendingNoteOperations();

      const response = await NoteService.getNotes();
      setNotes(response.data.notes);
      await saveNotesCache(response.data.notes);
      
      console.log(`📝 ${response.data.notes.length} notas recarregadas`);
    } catch (err: any) {
      const code = getErrorCode(err);
      if (code === 'NETWORK_ERROR' || code === 'CONNECTION_REFUSED') {
        const cached = await readNotesCache();
        if (cached) {
          setNotes(cached);
          setIsOffline(true);
        }
      } else {
        const apiError = err as ApiError;
        const errorMessage = apiError.message || 'Erro ao recarregar notas';
        setError(errorMessage);
        console.error('❌ Erro ao recarregar notas:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [readNotesCache, saveNotesCache, syncPendingNoteOperations]);

  /**
   * Buscar notas
   */
  const searchNotes = useCallback(async (searchTerm: string, filters: Omit<NoteSearchParams, 'search'> = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await NoteService.searchNotes(searchTerm, filters);
      setNotes(response.data.notes);
      
      console.log(`🔍 ${response.data.notes.length} notas encontradas para: "${searchTerm}"`);
    } catch (err: any) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Erro ao buscar notas';
      setError(errorMessage);
      console.error('❌ Erro ao buscar notas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carregar estatísticas
   */
  const loadStats = useCallback(async () => {
    try {
      const response = await NoteService.getNoteStats();
      setStats(response.data.stats);
      
      console.log('📊 Estatísticas carregadas:', response.data.stats);
    } catch (err: any) {
      console.error('❌ Erro ao carregar estatísticas:', err);
    }
  }, []);

  /**
   * Criar nota
   */
  const createNote = useCallback(async (noteData: CreateNoteRequest): Promise<Note | null> => {
    try {
      setError(null);
      
      const response = await NoteService.createNote(noteData);
      const newNote = response.data.note;
      
      // Adicionar à lista local
      setNotes(prevNotes => [newNote, ...prevNotes]);
      
      // Atualizar estatísticas
      await loadStats();
      
      console.log('✅ Nota criada com sucesso:', newNote.id);
      return newNote;
    } catch (err: any) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Erro ao criar nota';
      const code = getErrorCode(err);

      if (code === 'NETWORK_ERROR' || code === 'CONNECTION_REFUSED') {
        const tempId = `offline-note-${Date.now()}`;
        const now = new Date().toISOString();
        const offlineNote: Note = {
          id: tempId,
          userId: 'offline',
          title: noteData.title,
          content: noteData.content,
          isSecure: !!noteData.isSecure,
          tags: noteData.tags || [],
          isFavorite: false,
          color: noteData.color || '#4ECDC4',
          createdAt: now,
          updatedAt: now,
        };

        setNotes(prev => {
          const next = [offlineNote, ...prev];
          saveNotesCache(next);
          return next;
        });

        enqueueNoteOperation({
          id: tempId,
          type: 'create',
          data: noteData,
          createdAt: Date.now(),
        });

        setIsOffline(true);
        return offlineNote;
      }

      setError(errorMessage);
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao criar nota:', err);
      return null;
    }
  }, [loadStats, enqueueNoteOperation, saveNotesCache]);

  /**
   * Atualizar nota
   */
  const updateNote = useCallback(async (id: string, noteData: UpdateNoteRequest): Promise<Note | null> => {
    try {
      setError(null);
      
      const response = await NoteService.updateNote(id, noteData);
      const updatedNote = response.data.note;
      
      // Atualizar na lista local
      setNotes(prevNotes => 
        prevNotes.map(note => note.id === id ? updatedNote : note)
      );
      
      console.log('✅ Nota atualizada com sucesso:', id);
      return updatedNote;
    } catch (err: any) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Erro ao atualizar nota';
      const code = getErrorCode(err);

      if (code === 'NETWORK_ERROR' || code === 'CONNECTION_REFUSED') {
        setNotes(prevNotes => {
          const next = prevNotes.map(note => note.id === id ? {
            ...note,
            ...noteData,
            updatedAt: new Date().toISOString(),
          } : note);
          saveNotesCache(next);
          return next;
        });

        enqueueNoteOperation({
          id: `offline-note-update-${Date.now()}`,
          type: 'update',
          noteId: id,
          data: noteData,
          createdAt: Date.now(),
        });

        setIsOffline(true);
        return getNoteById(id) || null;
      }

      setError(errorMessage);
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao atualizar nota:', err);
      return null;
    }
  }, [enqueueNoteOperation, saveNotesCache, getNoteById]);

  /**
   * Deletar nota
   */
  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      await NoteService.deleteNote(id);
      
      // Remover da lista local
      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      
      // Atualizar estatísticas
      await loadStats();
      
      console.log('✅ Nota deletada com sucesso:', id);
      return true;
    } catch (err: any) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Erro ao deletar nota';
      const code = getErrorCode(err);

      if (code === 'NETWORK_ERROR' || code === 'CONNECTION_REFUSED') {
        setNotes(prevNotes => {
          const next = prevNotes.filter(note => note.id !== id);
          saveNotesCache(next);
          return next;
        });

        enqueueNoteOperation({
          id: `offline-note-delete-${Date.now()}`,
          type: 'delete',
          noteId: id,
          createdAt: Date.now(),
        });

        setIsOffline(true);
        return true;
      }

      setError(errorMessage);
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao deletar nota:', err);
      return false;
    }
  }, [loadStats, enqueueNoteOperation, saveNotesCache]);

  /**
   * Alternar favorito
   */
  const toggleFavorite = useCallback(async (id: string): Promise<Note | null> => {
    try {
      setError(null);
      
      const response = await NoteService.toggleFavorite(id);
      const updatedNote = response.data.note;
      
      // Atualizar na lista local
      setNotes(prevNotes => 
        prevNotes.map(note => note.id === id ? updatedNote : note)
      );
      
      console.log('✅ Favorito alterado:', id, updatedNote.isFavorite);
      return updatedNote;
    } catch (err: any) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Erro ao alterar favorito';
      const code = getErrorCode(err);

      if (code === 'NETWORK_ERROR' || code === 'CONNECTION_REFUSED') {
        setNotes(prevNotes => {
          const next = prevNotes.map(note => note.id === id ? {
            ...note,
            isFavorite: !note.isFavorite,
            updatedAt: new Date().toISOString(),
          } : note);
          saveNotesCache(next);
          return next;
        });

        enqueueNoteOperation({
          id: `offline-note-fav-${Date.now()}`,
          type: 'toggleFavorite',
          noteId: id,
          createdAt: Date.now(),
        });

        setIsOffline(true);
        return getNoteById(id) || null;
      }

      setError(errorMessage);
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao alterar favorito:', err);
      return null;
    }
  }, [enqueueNoteOperation, saveNotesCache, getNoteById]);

  /**
   * Obter nota por ID
   */
  const getNoteById = useCallback((id: string): Note | undefined => {
    return notes.find(note => note.id === id);
  }, [notes]);

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      await loadNotes();
      await loadStats();
    };
    loadInitialData();
  }, []); // Remover dependências para evitar loop

  return {
    // Estado
    notes,
    loading,
    error,
    stats,
    isOffline,
    
    // Ações
    createNote,
    updateNote,
    deleteNote,
    toggleFavorite,
    loadNotes,
    searchNotes,
    loadStats,
    refreshNotes,
    
    // Utilitários
    getNoteById,
    clearError
  };
};
