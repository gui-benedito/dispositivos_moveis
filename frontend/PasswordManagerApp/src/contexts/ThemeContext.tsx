import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useSettings } from './SettingsContext';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  mutedText: string;
  primary: string;
  danger: string;
  border: string;
}

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const lightColors: ThemeColors = {
  // Light theme based on user palette (pastel)
  background: '#F7F9FB',      // main background (quase branco azulado)
  card: '#FFFFFF',            // secondary background (cards)
  text: '#4A5560',            // primary text
  mutedText: '#6B7A88',       // secondary text / labels
  primary: '#9CC5E8',         // primary button / accent
  danger: '#D32F2F',          // error (mantida)
  border: '#DCE4EC',          // light border / dividers
};

const darkColors: ThemeColors = {
  // Dark theme based on user palette (suave)
  background: '#111418',      // main background
  card: '#181C21',            // secondary background (cards)
  text: '#D8DEE3',            // primary text
  mutedText: '#9AA4AD',       // secondary text / labels
  primary: '#7BAED1',         // primary button / accent
  danger: '#D32F2F',          // error (mantida)
  border: '#2A3138',          // subtle border in dark
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { settings } = useSettings();
  const mode: ThemeMode = settings.theme === 'light' ? 'light' : 'dark';

  const colors = useMemo(() => (mode === 'light' ? lightColors : darkColors), [mode]);

  const value: ThemeContextType = {
    mode,
    colors,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return ctx;
};
