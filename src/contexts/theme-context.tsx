"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('ecert-theme');
        if (saved === 'light' || saved === 'dark') return saved;
        // Check system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
        }
      } catch {}
    }
    return 'light';
  });

  // Use useLayoutEffect for immediate DOM updates before paint
  useLayoutEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const root = window.document.documentElement;
        
        // Remove inline styles to allow CSS transition
        root.style.removeProperty('background-color');
        if (document.body) {
          document.body.style.removeProperty('background-color');
        }
        
        // Remove inline style tag if exists
        const existingStyle = document.getElementById('theme-bg-inline-client');
        if (existingStyle) {
          existingStyle.remove();
        }
        
        // Apply theme class immediately for synchronized change - NO DELAY
        // Apply synchronously without requestAnimationFrame for instant change
        if (!root.classList.contains(theme)) {
          // Batch DOM updates for better performance - change happens immediately
          root.classList.remove('light', 'dark');
          root.classList.add(theme);
        }
        // Save to localStorage
        window.localStorage.setItem('ecert-theme', theme);
      }
    } catch {}
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

