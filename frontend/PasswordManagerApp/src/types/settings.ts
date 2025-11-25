/**
 * Tipos para configurações do usuário
 */

export interface UserSettings {
  id: string;
  userId: string;
  autoLockTimeout: number; // em minutos
  biometricEnabled: boolean;
  biometricType?: 'fingerprint';
  requirePasswordOnLock: boolean;
  lockOnBackground: boolean;
  lockOnScreenOff: boolean;
  theme?: 'light' | 'dark';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingsRequest {
  autoLockTimeout?: number;
  biometricEnabled?: boolean;
  biometricType?: 'fingerprint';
  requirePasswordOnLock?: boolean;
  lockOnBackground?: boolean;
  lockOnScreenOff?: boolean;
  theme?: 'light' | 'dark';
}

export interface SettingsApiResponse {
  success: boolean;
  data: UserSettings;
}

export interface UpdateSettingsApiResponse {
  success: boolean;
  message: string;
  data: UserSettings;
}

/**
 * Configurações padrão
 */
export const DEFAULT_SETTINGS: UserSettings = {
  id: '',
  userId: '',
  autoLockTimeout: 5,
  biometricEnabled: false,
  biometricType: undefined,
  requirePasswordOnLock: true,
  lockOnBackground: true,
  lockOnScreenOff: true,
  theme: 'dark',
  createdAt: '',
  updatedAt: ''
};

/**
 * Opções de timeout para bloqueio automático
 */
export const LOCK_TIMEOUT_OPTIONS = [
  { value: 1, label: '1 minuto' },
  { value: 2, label: '2 minutos' },
  { value: 5, label: '5 minutos' },
  { value: 10, label: '10 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' }
];

/**
 * Estados do aplicativo relacionados ao bloqueio
 */
export interface AppLockState {
  isLocked: boolean;
  lockReason?: 'timeout' | 'background' | 'screen_off' | 'manual';
  lastActivity: number;
  lockTimeout?: NodeJS.Timeout;
}

/**
 * Eventos de atividade do usuário
 */
export type ActivityEvent = 'touch' | 'scroll' | 'keyboard' | 'navigation' | 'api_call';

/**
 * Configurações do detector de inatividade
 */
export interface InactivityConfig {
  timeout: number; // em milissegundos
  events: ActivityEvent[];
  resetOnActivity: boolean;
}
