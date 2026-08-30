import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider, useTranslation } from './context/I18nContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExamLockProvider, useExamLock } from './context/ExamLockContext';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { LanguageSelector } from './components/LanguageSelector';
import { LoginPage } from './pages/LoginPage';
import { ExamPatternsPage } from './pages/ExamPatternsPage';
import { ExamsPage } from './pages/ExamsPage';
import { QuestionBankPage } from './pages/QuestionBankPage';
import { CoursesPage } from './pages/CoursesPage';
import { StudentExamsPage } from './pages/StudentExamsPage';
import { ExamArchivePage } from './pages/ExamArchivePage';
import { UsersPage } from './pages/UsersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { InterviewPage } from './pages/InterviewPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { PreviewBanner } from './components/PreviewBanner';
import { PreviewConfigurationModal } from './components/PreviewConfigurationModal';
import { API_BASE } from './config/api';
import './styles/theme.css';

interface NavTabConfig {
  id: string;
  label?: string;
  requiredPermission?: string;
}

const NAV_ITEMS: NavTabConfig[] = [
  { id: 'dashboard' },
  { id: 'student_exams', label: 'My Assessments & Tests', requiredPermission: 'exams.attempt' },
  { id: 'interview', label: 'AI Interview & Viva', requiredPermission: 'interview.attempt' },
  { id: 'subscription', label: 'Subscription & Credits', requiredPermission: 'subscriptions.read' },
  { id: 'analytics', label: 'Student Analytics & Mastery', requiredPermission: 'analytics.read_own' },
  { id: 'exams', label: 'Exam Generator & Papers', requiredPermission: 'exams.create' },
  { id: 'archive', label: 'Published Archive', requiredPermission: 'archive.read' },
  { id: 'exam_patterns', requiredPermission: 'exams.create' },
  { id: 'question_bank', label: 'Question Bank', requiredPermission: 'questions.read' },
  { id: 'courses', label: 'Academic Structure', requiredPermission: 'courses.create' },
  { id: 'users', label: 'User Management', requiredPermission: 'users.read' },
  { id: 'settings', label: 'Settings', requiredPermission: 'ai.admin_config' },
];

const hasPermission = (userPermissions: string[] | undefined, requiredPermission?: string): boolean => {
  if (!requiredPermission) return true;
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  return userPermissions.includes(requiredPermission) || userPermissions.includes('*');
};

const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const { user, token, isAuthenticated, isLoading, logout, isImpersonating, activeTab, setActiveTab } = useAuth();
  const { isExamLocked, triggerExitWarning } = useExamLock();
  const [showPreviewConfig, setShowPreviewConfig] = useState<boolean>(false);
  const [isInterviewEligible, setIsInterviewEligible] = useState<boolean>(true);

  const userPermissions = user?.permissions || [];

  useEffect(() => {
    if (!token) return;
    const isStaff =
      user?.roles?.includes('MAIN_ADMIN') ||
      user?.roles?.includes('SUB_ADMIN') ||
      user?.roles?.includes('TEACHER');

    if (isStaff) {
      setIsInterviewEligible(true);
      return;
    }

    fetch(`${API_BASE}/interview/eligibility`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setIsInterviewEligible(Boolean(d.data?.isEligible));
        }
      })
      .catch(() => {});
  }, [token, user]);

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!hasPermission(userPermissions, item.requiredPermission)) return false;
    if (item.id === 'interview' && !isInterviewEligible) return false;
    return true;
  });

  useEffect(() => {
    if (visibleNavItems.length > 0 && !visibleNavItems.some((item) => item.id === activeTab)) {
      setActiveTab(visibleNavItems[0].id);
    }
  }, [user, activeTab]);

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

  const canUsePreview = hasPermission(userPermissions, 'preview.use') || user?.roles?.includes('MAIN_ADMIN') || user?.roles?.includes('SUB_ADMIN') || user?.roles?.includes('TEACHER');

  return (
    <div id="app-root" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Phase 10: Global Persistent Preview & Impersonation Banner */}
      <PreviewBanner onOpenConfig={() => setShowPreviewConfig(true)} />

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
          {/* Preview as Student Launch Button for Staff */}
          {canUsePreview && !isImpersonating && (
            <button
              id="header-preview-mode-btn"
              data-testid="header-preview-mode-btn"
              onClick={() => setShowPreviewConfig(true)}
              style={{
                background: 'rgba(217, 119, 6, 0.12)',
                border: '1px solid #d97706',
                color: '#d97706',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>⚡</span>
              <span>Preview as Student</span>
            </button>
          )}

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
            onClick={() => {
              if (isExamLocked) {
                triggerExitWarning();
              } else {
                logout();
              }
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: isExamLocked ? 'not-allowed' : 'pointer',
              opacity: isExamLocked ? 0.4 : 1,
              transition: 'all 0.15s ease',
            }}
            title={isExamLocked ? "Examination in progress - finish or exit exam first" : "Sign out of ExamOS"}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Preview Configuration Modal */}
      <PreviewConfigurationModal
        isOpen={showPreviewConfig}
        onClose={() => setShowPreviewConfig(false)}
      />

      {/* Main Dashboard Layout */}
      <div id="app-dashboard-row" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside
          style={{
            width: '240px',
            background: 'var(--panel-bg)',
            borderRight: '1px solid var(--border-color)',
            padding: '20px 14px',
            overflowY: 'auto',
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
            {visibleNavItems.map((item) => {
              const isCurrentActive = activeTab === item.id;
              const isLockedOut = isExamLocked && item.id !== 'student_exams';

              return (
                <div
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => {
                    if (isLockedOut) {
                      triggerExitWarning();
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: isCurrentActive ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                    border: isCurrentActive ? '1px solid var(--accent-color)' : '1px solid transparent',
                    color: isCurrentActive ? 'var(--accent-color)' : isLockedOut ? 'var(--text-muted)' : 'var(--text-main)',
                    fontWeight: isCurrentActive ? 'bold' : 'normal',
                    fontSize: '13px',
                    cursor: isLockedOut ? 'not-allowed' : 'pointer',
                    opacity: isLockedOut ? 0.35 : 1,
                    transition: 'all 0.15s ease',
                  }}
                  title={isLockedOut ? 'Navigation locked during active examination' : undefined}
                >
                  {item.label || t(item.id)}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content Body */}
        <main
          id="app-main"
          style={{
            flex: 1,
            minHeight: 0,
            padding:
              activeTab === 'student_exams' ||
              activeTab === 'interview' ||
              activeTab === 'subscription' ||
              activeTab === 'analytics' ||
              activeTab === 'exams' ||
              activeTab === 'archive' ||
              activeTab === 'exam_patterns' ||
              activeTab === 'question_bank' ||
              activeTab === 'courses' ||
              activeTab === 'users' ||
              activeTab === 'settings'
                ? '0'
                : '28px',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {activeTab === 'student_exams' ? (
            <StudentExamsPage />
          ) : activeTab === 'interview' ? (
            <InterviewPage />
          ) : activeTab === 'subscription' ? (
            <SubscriptionPage />
          ) : activeTab === 'analytics' ? (
            <AnalyticsPage />
          ) : activeTab === 'exams' ? (
            <ExamsPage />
          ) : activeTab === 'archive' ? (
            <ExamArchivePage />
          ) : activeTab === 'exam_patterns' ? (
            <ExamPatternsPage />
          ) : activeTab === 'question_bank' ? (
            <QuestionBankPage />
          ) : activeTab === 'courses' ? (
            <CoursesPage />
          ) : activeTab === 'users' ? (
            <UsersPage />
          ) : activeTab === 'settings' ? (
            <SettingsPage />
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
          <ExamLockProvider>
            <MainLayout />
          </ExamLockProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
};
