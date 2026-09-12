import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useTranslation } from '../context/I18nContext';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { LanguageSelector } from '../components/LanguageSelector';

export const StudentLoginPage: React.FC = () => {
  const { login } = useAuth();
  const { navigate } = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.message || t('login_error_fallback'));
      }
    } catch (err: any) {
      setError(err.message || t('login_error_network'));
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (u: string, p: string) => {
    setEmail(u);
    setPassword(p);
  };

  return (
    <div
      id="student-login-page-root"
      data-testid="student-login-page-root"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-color)',
        color: 'var(--text-main)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 28px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--panel-bg)',
        }}
      >
        <div
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '7px',
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
              ExamOS
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Student Portal
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeSwitcher />
          <LanguageSelector />
          <button
            id="student-login-back-home-btn"
            data-testid="student-login-back-home-btn"
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            ← Back to Home
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
        }}
      >
        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '36px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '16px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono',
                fontWeight: 600,
                marginBottom: '12px',
              }}
            >
              <span>🎓</span> Student Access
            </div>
            <h1
              id="student-login-title"
              data-testid="student-login-title"
              style={{
                fontSize: '22px',
                fontWeight: 700,
                margin: '0 0 8px 0',
                letterSpacing: '-0.5px',
              }}
            >
              Sign In to Your Courses
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Access your practice drills, mock exams, and personalized scorecards.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              id="student-login-error-banner"
              data-testid="student-login-error-banner"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '18px',
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label
                htmlFor="student-input-email"
                style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}
              >
                Student Email Address
              </label>
              <input
                id="student-input-email"
                name="email"
                data-testid="student-input-email"
                type="email"
                required
                placeholder="student@examos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="student-input-password"
                style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="student-input-password"
                  name="password"
                  data-testid="student-input-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {showPassword ? t('login_btn_hide') : t('login_btn_show')}
                </button>
              </div>
            </div>

            <button
              id="student-btn-login-submit"
              data-testid="student-btn-login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #06b6d4, #10b981)',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px',
                boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)',
              }}
            >
              {loading ? t('login_btn_authenticating') : 'Sign In as Student'}
            </button>

            {/* Registration CTA */}
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                New student?{' '}
              </span>
              <button
                type="button"
                id="student-link-to-register"
                data-testid="student-link-to-register"
                onClick={() => navigate('/register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-color, #06b6d4)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Create an account
              </button>
            </div>
          </form>

          {/* Quick Demo Autofill */}
          <div style={{ marginTop: '22px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '8px' }}>
              Quick Demo Account
            </div>
            <button
              type="button"
              id="student-autofill-btn"
              data-testid="student-autofill-btn"
              onClick={() => fillCredentials('student@examos.com', 'Student@123')}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: 'var(--text-main)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>🎓 <strong>Student Demo</strong> (student@examos.com)</span>
              <span style={{ fontSize: '10px', color: '#10b981' }}>Autofill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
