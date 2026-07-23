import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useTheme, type Theme } from '@/hooks/useTheme';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useTheme();
  const ctx = useMemo(() => value, [value.theme, value.resolvedTheme, value.setTheme]);
  return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within a ThemeProvider');
  return ctx;
}
