import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import NoteService from '../services/noteService';
import { 
  Note, 
  CreateNoteRequest, 
  UpdateNoteRequest, 
  NoteSearchParams,
  NoteStats,
  ApiError 
} from '../types/note';

interface UseNotesReturn {
  // Estado
  notes: Note[];
  loading: boolean;
  error: string | null;
  stats: NoteStats | null;
  
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
      
      const response = await NoteService.getNotes(params);
      setNotes(response.data.notes);
      
      console.log(`📝 ${response.data.notes.length} notas carregadas`);
    } catch (err: any) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Erro ao carregar notas';
      setError(errorMessage);
      console.error('❌ Erro ao carregar notas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Atualizar lista de notas
   */
  const refreshNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await NoteService.getNotes();
      setNotes(response.data.notes);
      
      console.log(`📝 ${response.data.notes.length} notas recarregadas`);
    } catch (err: any) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Erro ao recarregar notas';
      setError(errorMessage);
      console.error('❌ Erro ao recarregar notas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      setError(errorMessage);
      
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao criar nota:', err);
      return null;
    }
  }, [loadStats]);

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
      setError(errorMessage);
      
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao atualizar nota:', err);
      return null;
    }
  }, []);

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
      setError(errorMessage);
      
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao deletar nota:', err);
      return false;
    }
  }, [loadStats]);

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
      setError(errorMessage);
      
      Alert.alert('Erro', errorMessage);
      console.error('❌ Erro ao alterar favorito:', err);
      return null;
    }
  }, []);

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
