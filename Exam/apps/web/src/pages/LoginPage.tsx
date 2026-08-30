import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/I18nContext';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { LanguageSelector } from '../components/LanguageSelector';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
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

    const res = await login(email, password);
    if (!res.success) {
      setError(res.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-color)',
        color: 'var(--text-main)',
      }}
    >
      {/* Top Utility Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 32px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
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
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 'bold', fontSize: '15px' }}>
            {t('app_title')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeSwitcher />
          <LanguageSelector />
        </div>
      </header>

      {/* Main Login Card Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Card Title */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontFamily: 'JetBrains Mono', fontSize: '20px' }}>Sign in to ExamOS</h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Enter your credentials or choose a quick demo account
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              id="login-error-alert"
              data-testid="login-error-alert"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '16px',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                id="input-login-email"
                data-testid="input-login-email"
                type="email"
                required
                placeholder="name@examos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
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
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="input-login-password"
                  data-testid="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
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
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              id="btn-login-submit"
              data-testid="btn-login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '8px',
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '10px' }}>
              QUICK DEMO ACCOUNTS (ONE-CLICK)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                type="button"
                onClick={() => fillCredentials('admin@examos.com', 'Admin@123')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(6, 182, 212, 0.08)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  color: 'var(--text-main)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>👑 <strong>Main Admin</strong> (admin@examos.com)</span>
                <span style={{ fontSize: '10px', color: '#06b6d4' }}>Auto-Fill</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('subadmin@examos.com', 'SubAdmin@123')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: 'var(--text-main)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>🛡️ <strong>Sub Admin</strong> (subadmin@examos.com)</span>
                <span style={{ fontSize: '10px', color: '#3b82f6' }}>Auto-Fill</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('teacher@examos.com', 'Teacher@123')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  color: 'var(--text-main)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>👨‍🏫 <strong>Teacher</strong> (teacher@examos.com)</span>
                <span style={{ fontSize: '10px', color: '#8b5cf6' }}>Auto-Fill</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('student@examos.com', 'Student@123')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: 'var(--text-main)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>🎓 <strong>Student</strong> (student@examos.com)</span>
                <span style={{ fontSize: '10px', color: '#10b981' }}>Auto-Fill</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
