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
  // Light theme based on user palette
  background: '#FFFFFF',      // main background
  card: '#F5F5F5',            // secondary background (cards/inputs)
  text: '#212121',            // primary text
  mutedText: '#757575',       // secondary text
  primary: '#6200EE',         // primary button / accent
  danger: '#D32F2F',          // error
  border: '#E0E0E0',          // light border / dividers
};

const darkColors: ThemeColors = {
  // Dark theme based on user palette
  background: '#121212',      // main background
  card: '#1E1E1E',            // secondary background (cards/inputs)
  text: '#E0E0E0',            // primary text
  mutedText: '#B0B0B0',       // secondary text
  primary: '#6200EE',         // primary button / accent (same as light)
  danger: '#D32F2F',          // error
  border: '#1E1E1E',          // subtle border in dark
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
