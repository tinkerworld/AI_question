import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeMode } from '@repo/types';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const API_BASE = 'http://localhost:4000/api/v1';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('examos_theme');
    return (saved as ThemeMode) || 'DARK';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme.toLowerCase());
    localStorage.setItem('examos_theme', theme);
  }, [theme]);

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch(`${API_BASE}/users/me/preferences`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ themeMode: newTheme }),
        });
      } catch (e) {
        console.warn('Could not sync theme preference to database');
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
