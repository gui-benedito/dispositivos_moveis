import api from './api';
import { 
  Note, 
  CreateNoteRequest, 
  UpdateNoteRequest, 
  NoteListResponse, 
  NoteResponse, 
  NoteStatsResponse,
  NoteSearchParams,
  ApiError 
} from '../types/note';

class NoteService {
  private static baseUrl = '/notes';

  /**
   * Criar nova nota
   */
  static async createNote(noteData: CreateNoteRequest): Promise<NoteResponse> {
    try {
      console.log('📝 Criando nota:', { title: noteData.title?.substring(0, 50), isSecure: noteData.isSecure });
      
      const response = await api.post<NoteResponse>(this.baseUrl, noteData);
      console.log('✅ Nota criada com sucesso');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao criar nota:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Listar notas do usuário
   */
  static async getNotes(params: NoteSearchParams = {}): Promise<NoteListResponse> {
    try {
      console.log('📝 Listando notas:', params);
      
      const response = await api.get<NoteListResponse>(this.baseUrl, { params });
      console.log(`✅ ${response.data.data.notes.length} notas encontradas`);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao listar notas:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Obter nota específica
   */
  static async getNote(id: string): Promise<NoteResponse> {
    try {
      console.log('📝 Obtendo nota:', id);
      
      const response = await api.get<NoteResponse>(`${this.baseUrl}/${id}`);
      console.log('✅ Nota obtida com sucesso');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao obter nota:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Atualizar nota
   */
  static async updateNote(id: string, noteData: UpdateNoteRequest): Promise<NoteResponse> {
    try {
      console.log('📝 Atualizando nota:', { id, isSecure: noteData.isSecure });
      
      const response = await api.put<NoteResponse>(`${this.baseUrl}/${id}`, noteData);
      console.log('✅ Nota atualizada com sucesso');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao atualizar nota:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Deletar nota
   */
  static async deleteNote(id: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('📝 Deletando nota:', id);
      
      const response = await api.delete(`${this.baseUrl}/${id}`);
      console.log('✅ Nota deletada com sucesso');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao deletar nota:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Alternar favorito
   */
  static async toggleFavorite(id: string): Promise<NoteResponse> {
    try {
      console.log('📝 Alternando favorito:', id);
      
      const response = await api.patch<NoteResponse>(`${this.baseUrl}/${id}/favorite`);
      console.log('✅ Favorito alterado com sucesso');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao alternar favorito:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Obter estatísticas das notas
   */
  static async getNoteStats(): Promise<NoteStatsResponse> {
    try {
      console.log('📝 Obtendo estatísticas das notas');
      
      const response = await api.get<NoteStatsResponse>(`${this.baseUrl}/stats`);
      console.log('✅ Estatísticas obtidas:', response.data.data.stats);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao obter estatísticas:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Buscar notas por texto
   */
  static async searchNotes(searchTerm: string, filters: Omit<NoteSearchParams, 'search'> = {}): Promise<NoteListResponse> {
    try {
      console.log('📝 Buscando notas:', { searchTerm, filters });
      
      const params: NoteSearchParams = {
        search: searchTerm,
        ...filters
      };
      
      return await this.getNotes(params);
    } catch (error: any) {
      console.error('❌ Erro ao buscar notas:', error);
      throw error;
    }
  }

  /**
   * Filtrar notas por tipo
   */
  static async getSecureNotes(page: number = 1, limit: number = 20): Promise<NoteListResponse> {
    return this.getNotes({ isSecure: true, page, limit });
  }

  /**
   * Filtrar notas favoritas
   */
  static async getFavoriteNotes(page: number = 1, limit: number = 20): Promise<NoteListResponse> {
    return this.getNotes({ isFavorite: true, page, limit });
  }
}

export default NoteService;
