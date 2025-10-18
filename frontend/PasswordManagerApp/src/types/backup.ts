export type CloudProvider = 'google_drive' | 'dropbox' | 'one_drive';

export interface CloudProviderInfo {
  id: CloudProvider;
  name: string;
  configured: boolean;
}

export interface BackupMetadata {
  credentialsCount: number;
  notesCount: number;
  hasTwoFactor: boolean;
  backupVersion: number;
}

export interface BackupInfo {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  checksum: string;
  version: number;
  provider: CloudProvider;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'restoring';
  metadata: BackupMetadata;
  createdAt: string;
  updatedAt: string;
  lastRestoredAt?: string;
}

export interface AuthUrlResponse {
  success: boolean;
  data: {
    authUrl: string;
    state: string;
    provider: CloudProvider;
  };
}

export interface OAuthCallbackRequest {
  code: string;
  state: string;
  provider: CloudProvider;
  masterPassword: string;
}

export interface CreateBackupRequest {
  provider: CloudProvider;
  accessToken: string;
  masterPassword: string;
}

export interface RestoreBackupRequest {
  provider: CloudProvider;
  accessToken: string;
  fileId: string;
  masterPassword: string;
}

export interface ValidateBackupRequest {
  provider: CloudProvider;
  accessToken: string;
  fileId: string;
}

export interface ListBackupsRequest {
  provider: CloudProvider;
  accessToken: string;
}

export interface RefreshTokenRequest {
  provider: CloudProvider;
  refreshToken: string;
}

export interface BackupResponse {
  success: boolean;
  message: string;
  data: {
    fileId: string;
    fileName: string;
    fileSize: number;
    checksum: string;
    version: number;
    metadata: BackupMetadata;
    createdAt: string;
    provider: CloudProvider;
    accessToken?: string;
    refreshToken?: string;
  };
}

export interface RestoreResponse {
  success: boolean;
  message: string;
  data: {
    restoredAt: string;
    metadata: BackupMetadata;
    itemsRestored: {
      credentials: number;
      notes: number;
      twoFactor: string;
    };
  };
}

export interface ValidationResponse {
  success: boolean;
  data: {
    isValid: boolean;
    checksum?: string;
    expectedChecksum?: string;
    metadata?: BackupMetadata;
    version?: string;
    error?: string;
  };
}

export interface ProvidersResponse {
  success: boolean;
  data: {
    providers: CloudProviderInfo[];
  };
}

export interface ListBackupsResponse {
  success: boolean;
  data: {
    backups: BackupInfo[];
    provider: CloudProvider;
    message?: string;
  };
}

export interface TokenRefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface BackupStats {
  totalBackups: number;
  lastBackup?: string;
  totalSize: number;
  providers: {
    [key in CloudProvider]?: {
      count: number;
      lastBackup?: string;
    };
  };
}

export interface BackupError {
  code: string;
  message: string;
  details?: any;
}
