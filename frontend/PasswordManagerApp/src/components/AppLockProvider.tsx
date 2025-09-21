import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import LockScreen from '../screens/LockScreen';
import { useInactivity } from '../hooks/useInactivity';
import { useSettings } from '../contexts/SettingsContext';
import { AppLockState } from '../types/settings';

interface AppLockContextType {
  lockState: AppLockState;
  lockApp: (reason: 'timeout' | 'background' | 'screen_off' | 'manual') => void;
  unlockApp: () => void;
  registerActivity: (event: 'touch' | 'scroll' | 'keyboard' | 'navigation' | 'api_call') => void;
}

const AppLockContext = createContext<AppLockContextType | undefined>(undefined);

interface AppLockProviderProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

export const AppLockProvider: React.FC<AppLockProviderProps> = ({ children, isAuthenticated = true }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<'timeout' | 'background' | 'screen_off' | 'manual'>('manual');
  
  // Usar configurações do SettingsContext que são atualizadas em tempo real
  const { settings, loading: settingsLoading } = useSettings();

  /**
   * Função para bloquear o app
   */
  const handleLock = (reason: 'timeout' | 'background' | 'screen_off' | 'manual') => {
    setIsLocked(true);
    setLockReason(reason);
  };

  /**
   * Função para desbloquear o app
   */
  const handleUnlock = () => {
    setIsLocked(false);
    setLockReason('manual');
  };

  /**
   * Hook de inatividade - só inicializa quando autenticado
   */
  const inactivityHook = isAuthenticated ? useInactivity(
    settings.autoLockTimeout || 5, 
    handleLock,
    { 
      lockOnBackground: settings.lockOnBackground,
      lockOnScreenOff: settings.lockOnScreenOff
    }
  ) : {
    registerActivity: () => {},
    updateTimeout: () => {}
  };
  
  const { registerActivity: registerInactivityActivity, updateTimeout } = inactivityHook;

  /**
   * Atualizar timeout quando configurações mudarem
   */
  useEffect(() => {
    if (!settingsLoading && settings.autoLockTimeout) {
      updateTimeout(settings.autoLockTimeout);
    }
  }, [settings.autoLockTimeout, settingsLoading]); // Só atualiza quando não está carregando

  /**
   * Registrar atividade
   */
  const registerActivity = (event: 'touch' | 'scroll' | 'keyboard' | 'navigation' | 'api_call') => {
    if (!isLocked) {
      registerInactivityActivity(event);
    }
  };

  /**
   * Bloquear app manualmente
   */
  const lockApp = (reason: 'timeout' | 'background' | 'screen_off' | 'manual') => {
    handleLock(reason);
  };

  /**
   * Desbloquear app
   */
  const unlockApp = () => {
    handleUnlock();
  };

  const contextValue: AppLockContextType = {
    lockState: {
      isLocked,
      lockReason,
      lastActivity: Date.now()
    },
    lockApp,
    unlockApp,
    registerActivity
  };

  // Se não estiver autenticado, não renderizar nada
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <AppLockContext.Provider value={contextValue}>
      {isLocked ? (
        <LockScreen 
          onUnlock={unlockApp} 
          lockReason={lockReason}
        />
      ) : (
        children
      )}
    </AppLockContext.Provider>
  );
};

/**
 * Hook para usar o contexto de bloqueio
 */
export const useAppLock = (): AppLockContextType => {
  const context = useContext(AppLockContext);
  if (!context) {
    throw new Error('useAppLock deve ser usado dentro de um AppLockProvider');
  }
  return context;
};

/**
 * HOC para registrar atividade automaticamente
 */
export const withActivityTracking = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    const { registerActivity } = useAppLock();

    useEffect(() => {
      // Registrar atividade de navegação quando o componente monta
      registerActivity('navigation');
    }, [registerActivity]);

    return <Component {...props} />;
  };
};
