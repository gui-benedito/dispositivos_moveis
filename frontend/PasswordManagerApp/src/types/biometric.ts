export type BiometricType = 'fingerprint';

export interface DeviceInfo {
  model?: string;
  os?: string;
  version?: string;
  platform?: string;
}

export interface BiometricStatus {
  biometricEnabled: boolean;
  biometricType: BiometricType | null;
  biometricLastUsed: string | null;
  activeSessions: number;
}

export interface BiometricSession {
  id: string;
  sessionId: string;
  biometricType: BiometricType;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  success: boolean;
  failureReason?: string;
  expiresAt: string;
  lastUsed: string | null;
  createdAt: string;
}

export interface EnableBiometricRequest {
  biometricType: BiometricType;
  deviceInfo?: DeviceInfo;
}

export interface AuthenticateBiometricRequest {
  sessionId: string;
  biometricType: BiometricType;
  deviceInfo?: DeviceInfo;
  email?: string;
}

export interface BiometricResponse {
  success: boolean;
  message: string;
  data?: {
    biometricEnabled?: boolean;
    biometricType?: BiometricType;
    sessionId?: string;
    user?: any;
    tokens?: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

export interface BiometricSessionsResponse {
  success: boolean;
  data: BiometricSession[];
}

export interface BiometricStatusResponse {
  success: boolean;
  data: BiometricStatus;
}
