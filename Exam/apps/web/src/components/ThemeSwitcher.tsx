import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ACCENT_PALETTES, AccentColor, FontScale } from '../context/ThemeContext';
import { useTranslation } from '../context/I18nContext';
import { ThemeMode } from '@repo/types';

export const ThemeSwitcher: React.FC = () => {
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    highContrast,
    setHighContrast,
    fontScale,
    setFontScale,
    reducedMotion,
    setReducedMotion,
  } = useTheme();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes: { mode: ThemeMode; labelKey: string; icon: string }[] = [
    { mode: 'LIGHT', labelKey: 'theme_light', icon: '☀️' },
    { mode: 'GRAY', labelKey: 'theme_slate', icon: '🌫️' },
    { mode: 'DARK', labelKey: 'theme_dark', icon: '🌙' },
  ];

  const currentAccentHex = ACCENT_PALETTES.find((p) => p.key === accentColor)?.hex || '#06b6d4';

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255,255,255,0.08)',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
        }}
      >
        {themes.map((themeItem) => {
          const isSelected = theme === themeItem.mode;
          return (
            <button
              key={themeItem.mode}
              id={`theme-btn-${themeItem.mode.toLowerCase()}`}
              data-testid={`theme-${themeItem.mode.toLowerCase()}`}
              onClick={() => setTheme(themeItem.mode)}
              title={t(themeItem.labelKey)}
              aria-label={t(themeItem.labelKey)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: isSelected ? '1px solid var(--accent-color, #06b6d4)' : '1px solid transparent',
                background: isSelected ? 'var(--accent-color, #06b6d4)' : 'transparent',
                color: isSelected ? '#000' : 'var(--text-main, #fff)',
                fontWeight: isSelected ? 'bold' : 'normal',
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
          );
        })}

        {/* Palette & Accessibility Popover Toggle */}
        <button
          id="theme-customizer-toggle"
          data-testid="theme-customizer-toggle"
          onClick={() => setIsOpen((prev) => !prev)}
          title="Theme Accents & Accessibility Settings"
          aria-label="Theme Accents & Accessibility Settings"
          aria-expanded={isOpen}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: isOpen ? '1px solid var(--accent-color, #06b6d4)' : '1px solid transparent',
            background: isOpen ? 'rgba(255,255,255,0.15)' : 'transparent',
            color: 'var(--text-main, #fff)',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: currentAccentHex,
              display: 'inline-block',
              boxShadow: `0 0 6px ${currentAccentHex}`,
              border: '1px solid rgba(255,255,255,0.8)',
            }}
          />
          <span style={{ fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Dropdown / Popover Menu */}
      {isOpen && (
        <div
          id="theme-customizer-popover"
          data-testid="theme-customizer-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '280px',
            background: 'var(--panel-bg, #131b2e)',
            border: '1px solid var(--border-color, #2e3d5a)',
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
            zIndex: 1000,
            color: 'var(--text-main, #f8fafc)',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Section: Accent Color Palette */}
          <div>
            <div
              style={{
                fontWeight: 600,
                marginBottom: '8px',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Accent Color Palette
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
              {ACCENT_PALETTES.map((p) => {
                const isCurrent = accentColor === p.key;
                return (
                  <button
                    key={p.key}
                    id={`accent-${p.key}`}
                    data-testid={`accent-${p.key}`}
                    onClick={() => setAccentColor(p.key as AccentColor)}
                    title={p.label}
                    aria-label={`Select ${p.label} accent color`}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: p.hex,
                      border: isCurrent ? '2px solid #ffffff' : '2px solid transparent',
                      boxShadow: isCurrent ? `0 0 10px ${p.hex}` : 'none',
                      cursor: 'pointer',
                      outline: 'none',
                      transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      padding: 0,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border-color, rgba(255,255,255,0.1))' }} />

          {/* Section: Accessibility Controls */}
          <div>
            <div
              style={{
                fontWeight: 600,
                marginBottom: '10px',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Accessibility Mode
            </div>

            {/* High Contrast Toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '12px' }}>High Contrast (AA)</span>
              <input
                type="checkbox"
                id="toggle-high-contrast"
                data-testid="toggle-high-contrast"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
            </label>

            {/* Reduced Motion Toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '12px' }}>Reduced Motion</span>
              <input
                type="checkbox"
                id="toggle-reduced-motion"
                data-testid="toggle-reduced-motion"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
            </label>

            {/* Font Scale Selection */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '8px',
                paddingTop: '6px',
              }}
            >
              <span style={{ fontSize: '12px' }}>Font Scale</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(
                  [
                    { scale: 'small', label: 'Small', symbol: 'A-' },
                    { scale: 'normal', label: 'Normal', symbol: 'A' },
                    { scale: 'large', label: 'Large', symbol: 'A+' },
                  ] as const
                ).map(({ scale, label, symbol }) => {
                  const isScaleActive = fontScale === scale;
                  return (
                    <button
                      key={scale}
                      id={`font-scale-${scale}`}
                      data-testid={`font-scale-${scale}`}
                      onClick={() => setFontScale(scale as FontScale)}
                      title={`Font size ${label}`}
                      aria-label={`Font size ${label}`}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: isScaleActive ? '1px solid var(--accent-color, #06b6d4)' : '1px solid var(--border-color, #2e3d5a)',
                        background: isScaleActive ? 'var(--accent-color, #06b6d4)' : 'transparent',
                        color: isScaleActive ? '#000' : 'var(--text-main, #fff)',
                        fontSize: scale === 'small' ? '11px' : scale === 'normal' ? '12px' : '13px',
                        fontWeight: isScaleActive ? 'bold' : 'normal',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {symbol}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
