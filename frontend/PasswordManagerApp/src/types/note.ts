export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  isSecure: boolean;
  tags: string[];
  isFavorite: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  isSecure?: boolean;
  tags?: string[];
  color?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  isSecure?: boolean;
  tags?: string[];
  color?: string;
  isFavorite?: boolean;
}

export interface NoteListResponse {
  success: boolean;
  message: string;
  data: {
    notes: Note[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface NoteResponse {
  success: boolean;
  message: string;
  data: {
    note: Note;
  };
}

export interface NoteStats {
  total: number;
  secure: number;
  favorites: number;
  normal: number;
}

export interface NoteStatsResponse {
  success: boolean;
  message: string;
  data: {
    stats: NoteStats;
  };
}

export interface NoteSearchParams {
  search?: string;
  isSecure?: boolean;
  isFavorite?: boolean;
  page?: number;
  limit?: number;
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}
