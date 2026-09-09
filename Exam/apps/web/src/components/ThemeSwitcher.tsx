import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/I18nContext';
import { ThemeMode } from '@repo/types';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const themes: { mode: ThemeMode; labelKey: string; icon: string }[] = [
    { mode: 'LIGHT', labelKey: 'theme_light', icon: '☀️' },
    { mode: 'GRAY', labelKey: 'theme_slate', icon: '🌫️' },
    { mode: 'DARK', labelKey: 'theme_dark', icon: '🌙' },
  ];

  return (
    <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.08)', padding: '4px', borderRadius: '8px' }}>
      {themes.map((themeItem) => (
        <button
          key={themeItem.mode}
          onClick={() => setTheme(themeItem.mode)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            background: theme === themeItem.mode ? '#06b6d4' : 'transparent',
            color: theme === themeItem.mode ? '#000' : '#fff',
            fontWeight: theme === themeItem.mode ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <span>{themeItem.icon}</span>
          <span>{t(themeItem.labelKey)}</span>
        </button>
      ))}
    </div>
  );
};
