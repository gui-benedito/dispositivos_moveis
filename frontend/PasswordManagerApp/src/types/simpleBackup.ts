export interface BackupMetadata {
  totalCredentials: number;
  totalNotes: number;
  backupSize: number;
}

export interface BackupUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface BackupCredential {
  id: string;
  title: string;
  description: string;
  category: string;
  username: string;
  password: string;
  notes: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackupNote {
  id: string;
  title: string;
  content: string;
  isSecure: boolean;
  tags: string;
  isFavorite: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackupData {
  version: string;
  timestamp: string;
  user: BackupUser;
  credentials: BackupCredential[];
  notes: BackupNote[];
  metadata: BackupMetadata;
}

export interface GenerateBackupRequest {
  masterPassword: string;
}

export interface GenerateBackupResponse {
  success: boolean;
  data: {
    filename: string;
    backupData: string;
    metadata: BackupMetadata;
  };
  message: string;
}

export interface RestoreBackupRequest {
  backupData: string;
  masterPassword: string;
}

export interface RestoreBackupResponse {
  success: boolean;
  data: {
    success: boolean;
    restoredCredentials: number;
    restoredNotes: number;
    totalCredentials: number;
    totalNotes: number;
  };
  message: string;
}

export interface ValidateBackupRequest {
  backupData: string;
  masterPassword: string;
}

export interface ValidateBackupResponse {
  success: boolean;
  data: {
    version: string;
    timestamp: string;
    user: BackupUser;
    metadata: BackupMetadata;
  };
  message: string;
}

export interface SimpleBackupError {
  success: false;
  message: string;
  code: string;
}
