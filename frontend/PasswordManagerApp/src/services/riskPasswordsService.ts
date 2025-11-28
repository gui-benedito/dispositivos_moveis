import api from './api';

export interface BreachedCredential {
  credentialId: string;
  title: string;
  category: string;
  username: string;
  pwnCount: number;
}

export interface BreachedPasswordsResponse {
  success: boolean;
  data: BreachedCredential[];
}

export interface AnalyzePasswordResponse {
  success: boolean;
  data: {
    strength: {
      score: number;
      strength: string;
      feedback: string[];
    };
    hibp: {
      found: boolean;
      count: number;
    };
  };
}

export const riskPasswordsService = {
  async listBreachedCredentials(masterPassword: string): Promise<BreachedPasswordsResponse> {
    const response = await api.post<BreachedPasswordsResponse>('/credentials/breached-passwords', {
      masterPassword,
    });
    return response.data;
  },

  async analyzePassword(password: string): Promise<AnalyzePasswordResponse> {
    const response = await api.post<AnalyzePasswordResponse>('/credentials/analyze-password', {
      password,
    });
    return response.data;
  },
};
