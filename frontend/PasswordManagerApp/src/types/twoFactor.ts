export type TwoFactorMethod = 'email';

export interface TwoFactorSetupRequest {
  method: TwoFactorMethod;
}

export interface TwoFactorSetupResponse {
  success: boolean;
  message: string;
  data?: {
    qrCode?: string;
    secret?: string;
    recoveryCodes?: string[];
    phoneNumber?: string;
  };
}

export interface TwoFactorVerifyRequest {
  method: TwoFactorMethod;
  code: string;
  isActivation?: boolean;
}

export interface TwoFactorVerifyResponse {
  success: boolean;
  message: string;
  data?: {
    tokens?: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

export interface TwoFactorStatus {
  email: {
    enabled: boolean;
    verified: boolean;
    email: string | null;
    lastUsed: string | null;
  };
}

export interface TwoFactorStatusResponse {
  success: boolean;
  data: TwoFactorStatus;
}

export interface TwoFactorDisableRequest {
  method: TwoFactorMethod;
  code: string;
}

export interface TwoFactorDisableResponse {
  success: boolean;
  message: string;
}

export interface TwoFactorError {
  success: false;
  message: string;
  code: string;
}

export interface TwoFactorRecoveryCodes {
  codes: string[];
  used: string[];
  remaining: number;
}
