import api from './api';

export interface SetMasterPasswordRequest {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  code?: string;
}

export const SecurityService = {
  async setMasterPassword(payload: SetMasterPasswordRequest): Promise<ApiResponse> {
    const res = await api.post<ApiResponse>('/security/master-password/set', payload);
    return res.data;
  },

  async verifyMasterPassword(password: string): Promise<ApiResponse> {
    const res = await api.post<ApiResponse>('/security/master-password/verify', { password });
    return res.data;
  }
};
