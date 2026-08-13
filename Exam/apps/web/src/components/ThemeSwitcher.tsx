import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode } from '@repo/types';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'LIGHT', label: 'Light', icon: '☀️' },
    { mode: 'GRAY', label: 'Slate', icon: '🌫️' },
    { mode: 'DARK', label: 'Dark', icon: '🌙' },
  ];

  return (
    <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.08)', padding: '4px', borderRadius: '8px' }}>
      {themes.map((t) => (
        <button
          key={t.mode}
          onClick={() => setTheme(t.mode)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            background: theme === t.mode ? '#06b6d4' : 'transparent',
            color: theme === t.mode ? '#000' : '#fff',
            fontWeight: theme === t.mode ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <span>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
};
