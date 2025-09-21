import { useSettings } from '../contexts/SettingsContext';

/**
 * Hook para carregar configurações locais (sem autenticação) com reatividade em tempo real
 */
export const useLocalSettings = () => {
  return useSettings();
};
