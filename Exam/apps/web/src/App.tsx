import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider, useTranslation } from './context/I18nContext';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { LanguageSelector } from './components/LanguageSelector';
import './styles/theme.css';

const MainLayout: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
      <header style={{
        background: 'var(--panel-bg)',
        borderBottom: '1px solid var(--border-color)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontFamily: 'JetBrains Mono',
            color: '#fff',
          }}>
            EX
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontFamily: 'JetBrains Mono', fontSize: '16px' }}>
              {t('app_title')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Phase 1 Foundation Scaffolding
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ThemeSwitcher />
          <LanguageSelector />
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Sidebar */}
        <aside style={{
          width: '260px',
          background: 'var(--panel-bg)',
          borderRight: '1px solid var(--border-color)',
          padding: '24px 16px',
        }}>
          <div style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: '12px' }}>
            NAVIGATION
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['dashboard', 'users', 'courses', 'question_bank', 'exam_patterns', 'analytics'].map((item) => (
              <div
                key={item}
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: item === 'dashboard' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                  border: item === 'dashboard' ? '1px solid var(--accent-color)' : '1px solid transparent',
                  color: item === 'dashboard' ? 'var(--accent-color)' : 'var(--text-main)',
                  fontWeight: item === 'dashboard' ? 'bold' : 'normal',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t(item)}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content Body */}
        <main style={{ flex: 1, padding: '32px' }}>
          <div style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '28px',
          }}>
            <h1 style={{ marginTop: 0, fontSize: '24px', fontFamily: 'JetBrains Mono' }}>
              {t('welcome')}
            </h1>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Phase 1 Foundation complete. 3-Theme Switcher (Light, Slate Gray, Dark) and 23-language database-driven Multilingual Engine (ADR-013) initialized.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <I18nProvider>
        <MainLayout />
      </I18nProvider>
    </ThemeProvider>
  );
};
