import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider, useTranslation } from './context/I18nContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { LanguageSelector } from './components/LanguageSelector';
import { LoginPage } from './pages/LoginPage';
import { ExamPatternsPage } from './pages/ExamPatternsPage';
import { ExamsPage } from './pages/ExamsPage';
import { QuestionBankPage } from './pages/QuestionBankPage';
import { CoursesPage } from './pages/CoursesPage';
import './styles/theme.css';

const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('exams');

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-color)',
          color: 'var(--text-main)',
          gap: '12px',
          fontFamily: 'JetBrains Mono',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(6, 182, 212, 0.2)',
            borderTopColor: '#06b6d4',
            animation: 'spin 1s linear infinite',
          }}
        />
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Verifying ExamOS session...</div>
      </div>
    );
  }

  // Route Guard: If not authenticated, render Login Screen
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
      <header
        style={{
          background: 'var(--panel-bg)',
          borderBottom: '1px solid var(--border-color)',
          padding: '12px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontFamily: 'JetBrains Mono',
              color: '#fff',
              fontSize: '14px',
            }}
          >
            EX
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontFamily: 'JetBrains Mono', fontSize: '15px' }}>
              {t('app_title')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              ExamOS // Adaptive Learning Platform
            </div>
          </div>
        </div>

        {/* User Info & Global Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* User Profile Badge */}
          {user && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              <span style={{ fontWeight: 'bold' }}>{user.firstName || user.email}</span>
              {user.roles && user.roles.length > 0 && (
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontFamily: 'JetBrains Mono',
                    background:
                      user.roles[0] === 'MAIN_ADMIN'
                        ? 'rgba(6, 182, 212, 0.15)'
                        : user.roles[0] === 'TEACHER'
                        ? 'rgba(139, 92, 246, 0.15)'
                        : 'rgba(16, 185, 129, 0.15)',
                    color:
                      user.roles[0] === 'MAIN_ADMIN'
                        ? '#06b6d4'
                        : user.roles[0] === 'TEACHER'
                        ? '#8b5cf6'
                        : '#10b981',
                  }}
                >
                  {user.roles[0]}
                </span>
              )}
            </div>
          )}

          <ThemeSwitcher />
          <LanguageSelector />

          {/* Logout Button */}
          <button
            onClick={logout}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
            title="Sign out of ExamOS"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Sidebar */}
        <aside
          style={{
            width: '240px',
            background: 'var(--panel-bg)',
            borderRight: '1px solid var(--border-color)',
            padding: '20px 14px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontFamily: 'JetBrains Mono',
              color: 'var(--text-muted)',
              marginBottom: '12px',
              paddingLeft: '6px',
            }}
          >
            MODULES
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {['dashboard', 'exams', 'exam_patterns', 'question_bank', 'courses', 'users', 'analytics'].map((item) => (
              <div
                key={item}
                id={`nav-tab-${item}`}
                onClick={() => setActiveTab(item)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '6px',
                  background: activeTab === item ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                  border: activeTab === item ? '1px solid var(--accent-color)' : '1px solid transparent',
                  color: activeTab === item ? 'var(--accent-color)' : 'var(--text-main)',
                  fontWeight: activeTab === item ? 'bold' : 'normal',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {item === 'exams'
                  ? 'Exam Generator & Papers'
                  : item === 'question_bank'
                  ? 'Question Bank'
                  : item === 'courses'
                  ? 'Academic Structure'
                  : t(item)}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content Body */}
        <main
          style={{
            flex: 1,
            padding:
              activeTab === 'exams' ||
              activeTab === 'exam_patterns' ||
              activeTab === 'question_bank' ||
              activeTab === 'courses'
                ? '0'
                : '28px',
            display: 'flex',
          }}
        >
          {activeTab === 'exams' ? (
            <ExamsPage />
          ) : activeTab === 'exam_patterns' ? (
            <ExamPatternsPage />
          ) : activeTab === 'question_bank' ? (
            <QuestionBankPage />
          ) : activeTab === 'courses' ? (
            <CoursesPage />
          ) : (
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '28px',
                flex: 1,
              }}
            >
              <h1 style={{ marginTop: 0, fontSize: '22px', fontFamily: 'JetBrains Mono' }}>
                {t('welcome')}
              </h1>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '13px' }}>
                Welcome to ExamOS. Use the sidebar to navigate to Exam Generator & Papers, Exam Patterns, Academic Structure, or Question Bank.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
};
