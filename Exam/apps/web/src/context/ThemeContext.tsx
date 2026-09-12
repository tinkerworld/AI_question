import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ThemeMode } from '@repo/types';
import { API_BASE } from '../config/api';

export type AccentColor = 'cyan' | 'purple' | 'emerald' | 'amber' | 'rose' | 'blue';
export type AccentPalette = AccentColor;
export type FontScale = 'small' | 'normal' | 'large' | 'xlarge';

export interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  accentPalette: AccentColor;
  setAccentPalette: (color: AccentColor) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  accessibility: {
    highContrast: boolean;
    fontScale: FontScale;
    reducedMotion: boolean;
  };
  setAccessibility: (partial: Partial<{ highContrast: boolean; fontScale: FontScale; reducedMotion: boolean }>) => void;
}

export const ACCENT_PALETTES: { key: AccentColor; label: string; hex: string }[] = [
  { key: 'cyan', label: 'Ocean Cyan', hex: '#06b6d4' },
  { key: 'purple', label: 'Royal Purple', hex: '#8b5cf6' },
  { key: 'emerald', label: 'Emerald Green', hex: '#10b981' },
  { key: 'amber', label: 'Warm Amber', hex: '#f59e0b' },
  { key: 'rose', label: 'Crimson Rose', hex: '#f43f5e' },
  { key: 'blue', label: 'Classic Blue', hex: '#3b82f6' },
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Theme Mode
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('examos_theme');
      return (saved as ThemeMode) || 'DARK';
    } catch {
      return 'DARK';
    }
  });

  // Curated Accent Color
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    try {
      const saved = localStorage.getItem('examos_accent');
      return (saved as AccentColor) || 'cyan';
    } catch {
      return 'cyan';
    }
  });

  // High Contrast AA Mode
  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('examos_high_contrast') === 'true';
    } catch {
      return false;
    }
  });

  // Font Scale
  const [fontScale, setFontScaleState] = useState<FontScale>(() => {
    try {
      const saved = localStorage.getItem('examos_font_scale');
      return (saved as FontScale) || 'normal';
    } catch {
      return 'normal';
    }
  });

  // Reduced Motion
  const [reducedMotion, setReducedMotionState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('examos_reduced_motion');
      if (saved !== null) return saved === 'true';
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
      return false;
    } catch {
      return false;
    }
  });

  // Synchronize DOM attributes whenever settings change
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.setAttribute('data-theme', (theme || 'DARK').toLowerCase());
    root.setAttribute('data-accent', accentColor || 'cyan');
    root.setAttribute('data-high-contrast', highContrast ? 'true' : 'false');
    root.setAttribute('data-contrast', highContrast ? 'high' : 'normal');
    root.setAttribute('data-font-scale', fontScale || 'normal');
    root.setAttribute('data-reduced-motion', reducedMotion ? 'true' : 'false');

    try {
      localStorage.setItem('examos_theme', theme);
      localStorage.setItem('examos_accent', accentColor);
      localStorage.setItem('examos_high_contrast', String(highContrast));
      localStorage.setItem('examos_font_scale', fontScale);
      localStorage.setItem('examos_reduced_motion', String(reducedMotion));
    } catch {}
  }, [theme, accentColor, highContrast, fontScale, reducedMotion]);

  // Sync to database
  const syncPreference = useCallback(async (payload: Partial<{
    themeMode: ThemeMode;
    accentColor: AccentColor;
    highContrast: boolean;
    fontScale: FontScale;
    reducedMotion: boolean;
  }>) => {
    if (typeof window === 'undefined') return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    try {
      await fetch(`${API_BASE}/users/me/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn('Could not sync preference update to server');
    }
  }, []);

  // Hydrate from user preferences on login
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    fetch(`${API_BASE}/users/me/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          if (d.data.themeMode) setThemeState(d.data.themeMode);
          if (d.data.accentColor) setAccentColorState(d.data.accentColor);
          if (typeof d.data.highContrast === 'boolean') setHighContrastState(d.data.highContrast);
          if (d.data.fontScale) setFontScaleState(d.data.fontScale);
          if (typeof d.data.reducedMotion === 'boolean') setReducedMotionState(d.data.reducedMotion);
        }
      })
      .catch(() => {});
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    syncPreference({ themeMode: newTheme });
  };

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
    syncPreference({ accentColor: color });
  };

  const setAccentPalette = (color: AccentColor) => setAccentColor(color);

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    syncPreference({ highContrast: enabled });
  };

  const setFontScale = (scale: FontScale) => {
    setFontScaleState(scale);
    syncPreference({ fontScale: scale });
  };

  const setReducedMotion = (enabled: boolean) => {
    setReducedMotionState(enabled);
    syncPreference({ reducedMotion: enabled });
  };

  const setAccessibility = (partial: Partial<{ highContrast: boolean; fontScale: FontScale; reducedMotion: boolean }>) => {
    if (typeof partial.highContrast === 'boolean') setHighContrast(partial.highContrast);
    if (partial.fontScale) setFontScale(partial.fontScale);
    if (typeof partial.reducedMotion === 'boolean') setReducedMotion(partial.reducedMotion);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        accentColor,
        setAccentColor,
        accentPalette: accentColor,
        setAccentPalette,
        highContrast,
        setHighContrast,
        fontScale,
        setFontScale,
        reducedMotion,
        setReducedMotion,
        accessibility: {
          highContrast,
          fontScale,
          reducedMotion,
        },
        setAccessibility,
      }}
    >
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
