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
import { VocabularyPracticePage } from './pages/VocabularyPracticePage';
import { ListeningPracticePage } from './pages/ListeningPracticePage';
import { WritingPracticePage } from './pages/WritingPracticePage';
import { StudentAnalyticsPage } from './pages/StudentAnalyticsPage';
import { PreviewBanner } from './components/PreviewBanner';
import { PreviewConfigurationModal } from './components/PreviewConfigurationModal';
import { MaintenanceBanner } from './components/maintenance/MaintenanceBanner';
import { FeatureMaintenanceWrapper } from './components/maintenance/FeatureMaintenanceWrapper';
import { PromotionalBanner } from './components/entitlements/PromotionalBanner';
import { API_BASE } from './config/api';
import './styles/theme.css';

interface NavTabConfig {
  id: string;
  labelKey: string;
  requiredPermission?: string;
  featureKey?: string;
}

const NAV_ITEMS: NavTabConfig[] = [
  { id: 'dashboard', labelKey: 'nav_dashboard' },
  { id: 'student_exams', labelKey: 'nav_student_exams', requiredPermission: 'exams.attempt', featureKey: 'exams' },
  { id: 'practice', labelKey: 'nav_practice', requiredPermission: 'practice.attempt', featureKey: 'practice' },
  { id: 'interview', labelKey: 'nav_interview', requiredPermission: 'interview.attempt', featureKey: 'interview' },
  { id: 'listening_practice', labelKey: 'nav_listening_practice', requiredPermission: 'exams.attempt', featureKey: 'audio' },
  { id: 'writing_practice', labelKey: 'nav_writing_practice', requiredPermission: 'exams.attempt', featureKey: 'writing' },
  { id: 'vocabulary', labelKey: 'nav_vocabulary', featureKey: 'vocabulary' },
  { id: 'subscription', labelKey: 'nav_subscription', requiredPermission: 'subscriptions.read', featureKey: 'subscriptions' },
  { id: 'analytics', labelKey: 'nav_analytics', requiredPermission: 'analytics.read_own', featureKey: 'analytics' },
  { id: 'exams', labelKey: 'nav_exams', requiredPermission: 'exams.create', featureKey: 'exams' },
  { id: 'archive', labelKey: 'nav_archive', requiredPermission: 'archive.read' },
  { id: 'exam_patterns', labelKey: 'nav_exam_patterns', requiredPermission: 'exams.create' },
  { id: 'question_bank', labelKey: 'nav_question_bank', requiredPermission: 'questions.read', featureKey: 'question_bank' },
  { id: 'courses', labelKey: 'nav_courses', requiredPermission: 'courses.create' },
  { id: 'users', labelKey: 'nav_users', requiredPermission: 'users.read' },
  { id: 'settings', labelKey: 'nav_settings', requiredPermission: 'ai.admin_config' },
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
  const [isListeningEligible, setIsListeningEligible] = useState<boolean>(true);
  const [isWritingEligible, setIsWritingEligible] = useState<boolean>(true);

  const [maintenanceStatus, setMaintenanceStatus] = useState<any>(null);

  const userPermissions = user?.permissions || [];
  const isStaff =
    user?.roles?.includes('MAIN_ADMIN') ||
    user?.roles?.includes('SUB_ADMIN') ||
    user?.roles?.includes('TEACHER');

  const hasMaintenanceAuthority =
    userPermissions.includes('system.maintenance') || userPermissions.includes('*');

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'MAIN_ADMIN':
        return t('role_main_admin');
      case 'SUB_ADMIN':
        return t('role_sub_admin');
      case 'TEACHER':
        return t('role_teacher');
      case 'STUDENT':
        return t('role_student');
      default:
        return role;
    }
  };

  const isUserBypassedForFeature = (ctrl: any): boolean => {
    if (hasMaintenanceAuthority) return true;
    const isTeacher = user?.roles?.includes('TEACHER');
    if (isTeacher && ctrl?.allowTeacher) return true;
    const isStudent = user?.roles?.includes('STUDENT');
    if (isStudent && ctrl?.allowStudent) return true;
    return false;
  };

  useEffect(() => {
    fetch(`${API_BASE}/maintenance/status`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setMaintenanceStatus(d.data);
        }
      })
      .catch(() => {});
  }, [activeTab]);

  useEffect(() => {
    if (!token) return;

    if (isStaff) {
      setIsInterviewEligible(true);
      setIsListeningEligible(true);
      setIsWritingEligible(true);
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

    fetch(`${API_BASE}/listening/eligibility`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setIsListeningEligible(Boolean(d.data?.isEligible));
        }
      })
      .catch(() => {});

    fetch(`${API_BASE}/writing/eligibility`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setIsWritingEligible(Boolean(d.data?.isEligible));
        }
      })
      .catch(() => {});
  }, [token, user]);

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!hasPermission(userPermissions, item.requiredPermission)) return false;
    if (item.id === 'interview' && !isInterviewEligible) return false;
    if (item.id === 'listening_practice' && !isListeningEligible) return false;
    if (item.id === 'writing_practice' && !isWritingEligible) return false;

    // DisplayMode HIDDEN enforcement: removes entry point entirely for blocked users
    if (item.featureKey && maintenanceStatus?.featureControls) {
      const ctrl = maintenanceStatus.featureControls[item.featureKey];
      if (ctrl && ctrl.status !== 'ACTIVE' && ctrl.displayMode === 'HIDDEN') {
        if (!isUserBypassedForFeature(ctrl)) {
          return false;
        }
      }
    }

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
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('verifying_session')}</div>
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

      {/* Phase 15: Global Maintenance Banner & Promotional Window Banner */}
      <MaintenanceBanner />
      <PromotionalBanner />

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
            <div
              id="app-title-text"
              data-testid="app-title-text"
              style={{ fontWeight: 'bold', fontFamily: 'JetBrains Mono', fontSize: '15px' }}
            >
              {t('app_title')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {t('app_subtitle')}
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
              <span>{t('preview_as_student')}</span>
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
                  {getRoleLabel(user.roles[0])}
                </span>
              )}
            </div>
          )}

          <ThemeSwitcher />
          <LanguageSelector />

          {/* Logout Button */}
          <button
            id="btn-logout"
            data-testid="btn-logout"
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
            title={isExamLocked ? t('logout_locked_tooltip') : t('logout_tooltip')}
          >
            {t('logout')}
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
            {t('sidebar_modules')}
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {visibleNavItems.map((item) => {
              const isCurrentActive = activeTab === item.id;
              const isLockedOut = isExamLocked && item.id !== 'student_exams';
              const ctrl = item.featureKey && maintenanceStatus?.featureControls ? maintenanceStatus.featureControls[item.featureKey] : null;
              const isFeatureDisabledButton =
                Boolean(ctrl) &&
                ctrl.status !== 'ACTIVE' &&
                ctrl.displayMode === 'DISABLED_BUTTON' &&
                !isUserBypassedForFeature(ctrl);

              const isClickDisabled = isLockedOut || isFeatureDisabledButton;

              return (
                <div
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => {
                    if (isLockedOut) {
                      triggerExitWarning();
                    } else if (!isFeatureDisabledButton) {
                      setActiveTab(item.id);
                    }
                  }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: isCurrentActive ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                    border: isCurrentActive ? '1px solid var(--accent-color)' : '1px solid transparent',
                    color: isCurrentActive
                      ? 'var(--accent-color)'
                      : isClickDisabled
                      ? 'var(--text-muted)'
                      : 'var(--text-main)',
                    fontWeight: isCurrentActive ? 'bold' : 'normal',
                    fontSize: '13px',
                    cursor: isClickDisabled ? 'not-allowed' : 'pointer',
                    opacity: isClickDisabled ? 0.4 : 1,
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  title={
                    isLockedOut
                      ? t('nav_locked_tooltip')
                      : isFeatureDisabledButton
                      ? t('feature_maintenance_tooltip')
                      : undefined
                  }
                >
                  <span>{t(item.labelKey)}</span>
                  {isFeatureDisabledButton && (
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '2px 5px',
                        borderRadius: '3px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        fontFamily: 'JetBrains Mono',
                        fontWeight: 700,
                      }}
                    >
                      {t('offline_badge')}
                    </span>
                  )}
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
              activeTab === 'practice' ||
              activeTab === 'interview' ||
              activeTab === 'listening_practice' ||
              activeTab === 'writing_practice' ||
              activeTab === 'vocabulary' ||
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
            <FeatureMaintenanceWrapper featureKey="exams" featureName="Exams & Assessments" onNavigateHome={() => setActiveTab('dashboard')}>
              <StudentExamsPage />
            </FeatureMaintenanceWrapper>
          ) : activeTab === 'practice' ? (
            <FeatureMaintenanceWrapper featureKey="practice" featureName="Practice & Drills" onNavigateHome={() => setActiveTab('dashboard')}>
              <StudentAnalyticsPage />
            </FeatureMaintenanceWrapper>
          ) : activeTab === 'interview' ? (
            <FeatureMaintenanceWrapper featureKey="interview" featureName="AI Interview & Viva" onNavigateHome={() => setActiveTab('dashboard')}>
              <InterviewPage />
            </FeatureMaintenanceWrapper>
          ) : activeTab === 'listening_practice' ? (
            <FeatureMaintenanceWrapper featureKey="audio" featureName="Listening Practice" onNavigateHome={() => setActiveTab('dashboard')}>
              <ListeningPracticePage />
            </FeatureMaintenanceWrapper>
          ) : activeTab === 'writing_practice' ? (
            <FeatureMaintenanceWrapper featureKey="writing" featureName="Writing Practice" onNavigateHome={() => setActiveTab('dashboard')}>
              <WritingPracticePage />
            </FeatureMaintenanceWrapper>
          ) : activeTab === 'vocabulary' ? (
            <FeatureMaintenanceWrapper featureKey="vocabulary" featureName="Vocabulary Practice" onNavigateHome={() => setActiveTab('dashboard')}>
              <VocabularyPracticePage />
            </FeatureMaintenanceWrapper>
          ) : activeTab === 'subscription' ? (
            <FeatureMaintenanceWrapper featureKey="subscriptions" featureName="Subscriptions & Billing" onNavigateHome={() => setActiveTab('dashboard')}>
              <SubscriptionPage />
            </FeatureMaintenanceWrapper>
          ) : activeTab === 'analytics' ? (
            <FeatureMaintenanceWrapper featureKey="analytics" featureName="Student Analytics & Mastery" onNavigateHome={() => setActiveTab('dashboard')}>
              <AnalyticsPage />
            </FeatureMaintenanceWrapper>
          ) : activeTab === 'exams' ? (
            <FeatureMaintenanceWrapper featureKey="exams" featureName="Exam Generator & Papers" onNavigateHome={() => setActiveTab('dashboard')}>
              <ExamsPage />
            </FeatureMaintenanceWrapper>
          ) : activeTab === 'archive' ? (
            <ExamArchivePage />
          ) : activeTab === 'exam_patterns' ? (
            <ExamPatternsPage />
          ) : activeTab === 'question_bank' ? (
            <FeatureMaintenanceWrapper featureKey="question_bank" featureName="Question Bank" onNavigateHome={() => setActiveTab('dashboard')}>
              <QuestionBankPage />
            </FeatureMaintenanceWrapper>
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
              <h1
                id="dashboard-welcome-heading"
                data-testid="dashboard-welcome-heading"
                style={{ marginTop: 0, fontSize: '22px', fontFamily: 'JetBrains Mono' }}
              >
                {t('welcome')}
              </h1>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '13px' }}>
                {t('dashboard_welcome_desc')}
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
