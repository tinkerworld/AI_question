import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { ThemeMode, FestivalKey } from '@repo/types';
import { API_BASE } from '../config/api';
import { FestivalThemeConfig, getCurrentFestivalSuggestion, getFestivalConfig } from '../config/festivals';

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
  festivalTheme: FestivalKey | null;
  setFestivalTheme: (festival: FestivalKey | null) => void;
  setSiteWideFestivalTheme: (festival: FestivalKey | null) => Promise<boolean>;
  suggestedFestival: FestivalThemeConfig | null;
  dismissedFestival: string | null;
  dismissFestivalSuggestion: (key: FestivalKey) => void;
  activeFestivalConfig: FestivalThemeConfig | undefined;
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
  // Base Theme Mode (Light / Slate / Dark)
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('examos_theme');
      return (saved as ThemeMode) || 'DARK';
    } catch {
      return 'DARK';
    }
  });

  // Base Curated Accent Color
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    try {
      const saved = localStorage.getItem('examos_accent');
      return (saved as AccentColor) || 'cyan';
    } catch {
      return 'cyan';
    }
  });

  // Seasonal Festival Theme Layer (Site-Wide Active Theme)
  const [festivalTheme, setFestivalThemeState] = useState<FestivalKey | null>(() => {
    try {
      const saved = localStorage.getItem('examos_festival_theme');
      if (saved && saved !== 'none') {
        return saved as FestivalKey;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Dismissed Festival Suggestion
  const [dismissedFestival, setDismissedFestival] = useState<string | null>(() => {
    try {
      return localStorage.getItem('examos_dismissed_festival') || null;
    } catch {
      return null;
    }
  });

  // High Contrast AA Mode (Strict Precedence Over Everything)
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

  // Compute active festival config
  const activeFestivalConfig = useMemo(() => {
    return getFestivalConfig(festivalTheme);
  }, [festivalTheme]);

  // Compute suggested festival for today's date
  const suggestedFestival = useMemo(() => {
    return getCurrentFestivalSuggestion();
  }, []);

  // Fetch site-wide festival theme on initial boot (public endpoint)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    fetch(`${API_BASE}/system/festival-theme`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const serverFest = d.data.festival as FestivalKey | null;
          setFestivalThemeState(serverFest || null);
          try {
            localStorage.setItem('examos_festival_theme', serverFest || 'none');
          } catch {}
        }
      })
      .catch((e) => console.warn('Could not fetch site-wide festival theme:', e));
  }, []);

  // Synchronize DOM attributes whenever settings change
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.setAttribute('data-theme', (theme || 'DARK').toLowerCase());
    root.setAttribute('data-festival', festivalTheme ? festivalTheme.toLowerCase() : 'none');
    // If festival is active and high-contrast is NOT on, festival color drives data-accent; otherwise user's curated base accent
    root.setAttribute(
      'data-accent',
      festivalTheme && !highContrast ? festivalTheme.toLowerCase() : (accentColor || 'cyan')
    );
    root.setAttribute('data-high-contrast', highContrast ? 'true' : 'false');
    root.setAttribute('data-contrast', highContrast ? 'high' : 'normal');
    root.setAttribute('data-font-scale', fontScale || 'normal');
    root.setAttribute('data-reduced-motion', reducedMotion ? 'true' : 'false');

    try {
      localStorage.setItem('examos_theme', theme);
      localStorage.setItem('examos_accent', accentColor);
      localStorage.setItem('examos_festival_theme', festivalTheme || 'none');
      localStorage.setItem('examos_high_contrast', String(highContrast));
      localStorage.setItem('examos_font_scale', fontScale);
      localStorage.setItem('examos_reduced_motion', String(reducedMotion));
    } catch {}
  }, [theme, accentColor, festivalTheme, highContrast, fontScale, reducedMotion]);

  // Synchronize browser tab title with festival emoji prefix while active (and not high contrast)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const baseTitle = 'ExamOS - Assessment Platform';
    // If user is currently in a live exam or interview, skip prefixing
    if (document.querySelector('.undecorated-assessment-env') || document.querySelector('[data-testid="exam-player-page"]')) {
      return;
    }

    if (activeFestivalConfig && !highContrast) {
      document.title = `${activeFestivalConfig.tabEmoji} ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [activeFestivalConfig, highContrast]);

  // Sync user-specific preference to database (excluding festival theme which is admin/site-wide)
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

  // Hydrate user-specific preferences on login
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

  // Site-wide admin activation
  const setSiteWideFestivalTheme = useCallback(async (festival: FestivalKey | null): Promise<boolean> => {
    setFestivalThemeState(festival);
    try {
      localStorage.setItem('examos_festival_theme', festival || 'none');
    } catch {}

    const token = sessionStorage.getItem('token');
    if (!token) return true; // Local change if offline

    try {
      const res = await fetch(`${API_BASE}/system/festival-theme`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ festival }),
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch (e) {
      console.error('Failed to update site-wide festival theme:', e);
      return false;
    }
  }, []);

  const setFestivalTheme = (festival: FestivalKey | null) => {
    setSiteWideFestivalTheme(festival);
  };

  const dismissFestivalSuggestion = (key: FestivalKey) => {
    try {
      localStorage.setItem('examos_dismissed_festival', key);
    } catch {}
    setDismissedFestival(key);
  };

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
        festivalTheme,
        setFestivalTheme,
        setSiteWideFestivalTheme,
        suggestedFestival,
        dismissedFestival,
        dismissFestivalSuggestion,
        activeFestivalConfig,
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
