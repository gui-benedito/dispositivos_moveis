import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Dimensions } from 'react-native';
import { AppLockState, ActivityEvent, InactivityConfig } from '../types/settings';

/**
 * Hook para detectar inatividade do usuário e gerenciar bloqueio automático
 */
export const useInactivity = (
  timeoutMinutes: number = 5,
  onLock: (reason: 'timeout' | 'background' | 'screen_off' | 'manual') => void,
  settings?: { lockOnBackground?: boolean; lockOnScreenOff?: boolean }
) => {
  const [lockState, setLockState] = useState<AppLockState>({
    isLocked: false,
    lastActivity: Date.now()
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const screenDimensionsRef = useRef(Dimensions.get('window'));
  const screenOffTimeRef = useRef<number | null>(null);

  /**
   * Configuração do detector de inatividade
   */
  const config: InactivityConfig = {
    timeout: timeoutMinutes * 60 * 1000, // converter para milissegundos
    events: ['touch', 'scroll', 'keyboard', 'navigation', 'api_call'],
    resetOnActivity: true
  };

  /**
   * Resetar timer de inatividade
   */
  const resetInactivityTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    lastActivityRef.current = Date.now();
    
    setLockState(prev => ({
      ...prev,
      lastActivity: lastActivityRef.current
    }));

    // Configurar novo timeout
    timeoutRef.current = setTimeout(() => {
      onLock('timeout');
    }, config.timeout);
  }, [config.timeout, onLock]);

  /**
   * Bloquear aplicativo
   */
  const lockApp = useCallback((reason: 'timeout' | 'background' | 'screen_off' | 'manual') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLockState(prev => ({
      ...prev,
      isLocked: true,
      lockReason: reason,
      lockTimeout: undefined
    }));
  }, []);

  /**
   * Desbloquear aplicativo
   */
  const unlockApp = useCallback(() => {
    setLockState(prev => ({
      ...prev,
      isLocked: false,
      lockReason: undefined,
      lockTimeout: undefined
    }));

    // Reiniciar timer de inatividade
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  /**
   * Registrar atividade do usuário
   */
  const registerActivity = useCallback((event: ActivityEvent) => {
    if (config.events.includes(event) && config.resetOnActivity) {
      resetInactivityTimer();
    }
  }, [config.events, config.resetOnActivity, resetInactivityTimer]);

  /**
   * Gerenciar mudanças de estado do app
   */
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    const currentState = appStateRef.current;
    appStateRef.current = nextAppState;

    // App foi para background
    if (currentState === 'active' && nextAppState === 'background') {
      // Marcar tempo quando foi para background (pode ser tela desligada)
      screenOffTimeRef.current = Date.now();
      
      // Só bloquear se a configuração estiver habilitada (true)
      if (settings?.lockOnBackground === true) {
        onLock('background');
      }
    }
    // App voltou do background
    else if (currentState === 'background' && nextAppState === 'active') {
      // Verificar se foi bloqueio por tela desligada
      if (screenOffTimeRef.current && settings?.lockOnScreenOff === true) {
        const timeOff = Date.now() - screenOffTimeRef.current;
        
        // Se ficou fora por mais de 1 segundo, provavelmente foi tela desligada
        if (timeOff > 1000) {
          onLock('screen_off');
        }
      }
      
      screenOffTimeRef.current = null;
      // Não desbloqueia automaticamente, apenas registra atividade
      registerActivity('navigation');
    }
  }, [onLock, registerActivity, settings?.lockOnBackground, settings?.lockOnScreenOff]);

  /**
   * Gerenciar mudanças nas dimensões da tela (detectar tela desligada)
   */
  const handleScreenDimensionsChange = useCallback(({ window }) => {
    const currentDimensions = screenDimensionsRef.current;
    screenDimensionsRef.current = window;

    // Se as dimensões mudaram para 0x0, a tela foi desligada
    if (window.width === 0 && window.height === 0 && 
        currentDimensions.width > 0 && currentDimensions.height > 0) {
      if (settings?.lockOnScreenOff === true) {
        onLock('screen_off');
      }
    }
    // Se as dimensões voltaram ao normal, a tela foi ligada
    else if (window.width > 0 && window.height > 0 && 
             currentDimensions.width === 0 && currentDimensions.height === 0) {
      // Não desbloqueia automaticamente, apenas registra atividade
      registerActivity('navigation');
    }
  }, [onLock, registerActivity, settings?.lockOnScreenOff, settings]);

  /**
   * Atualizar timeout de bloqueio
   */
  const updateTimeout = useCallback((newTimeoutMinutes: number) => {
    config.timeout = newTimeoutMinutes * 60 * 1000;
    
    // Se não estiver bloqueado, reiniciar timer com novo timeout
    if (!lockState.isLocked) {
      resetInactivityTimer();
    }
  }, [lockState.isLocked]); // Simplificar dependências

  /**
   * Setup inicial
   */
  useEffect(() => {
    // Configurar listener de mudança de estado do app
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Configurar listener de mudança de dimensões da tela
    const dimensionsSubscription = Dimensions.addEventListener('change', handleScreenDimensionsChange);

    // Iniciar timer de inatividade
    resetInactivityTimer();

    return () => {
      appStateSubscription?.remove();
      dimensionsSubscription?.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [settings?.lockOnBackground, settings?.lockOnScreenOff]); // Reagir às mudanças nas configurações

  /**
   * Cleanup ao desmontar
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    lockState,
    registerActivity,
    lockApp,
    unlockApp,
    updateTimeout,
    resetInactivityTimer
  };
};

/**
 * Hook para detectar eventos de toque
 */
export const useTouchActivity = (onActivity: () => void) => {
  useEffect(() => {
    const handleTouch = () => {
      onActivity();
    };

    // Adicionar listener global de toque
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App voltou ao foco, registrar atividade
        onActivity();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [onActivity]);
};

/**
 * Hook para detectar atividade de navegação
 */
export const useNavigationActivity = (onActivity: () => void) => {
  const registerNavigationActivity = useCallback(() => {
    onActivity();
  }, [onActivity]);

  return { registerNavigationActivity };
};
