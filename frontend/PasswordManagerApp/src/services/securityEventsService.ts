import api from './api';

export interface SecurityEvent {
  id: string;
  userId: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  ipAddress?: string | null;
  geo?: any;
  deviceInfo?: any;
  metadata?: any;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityEventListResponse {
  success: boolean;
  data: SecurityEvent[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export const securityEventsService = {
  async listEvents(params: {
    type?: string;
    severity?: 'low' | 'medium' | 'high';
    since?: string;
    until?: string;
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
  } = {}): Promise<SecurityEventListResponse> {
    const response = await api.get<SecurityEventListResponse>('/security/events', {
      params: {
        ...params,
        unreadOnly: params.unreadOnly ? 'true' : undefined,
      },
    });
    return response.data;
  },

  async markAsRead(ids: string[]): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/security/events/read', { ids });
    return response.data;
  },
};
