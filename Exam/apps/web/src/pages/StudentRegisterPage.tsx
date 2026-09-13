import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { LanguageSelector } from '../components/LanguageSelector';

export const StudentRegisterPage: React.FC = () => {
  const { navigate } = useRouter();
  const { login } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!termsAccepted) {
      setError('You must accept the terms and conditions.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/student-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
          termsAccepted,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Registration failed');
      }

      setSuccessMessage('Registration successful! Logging you in...');

      // Automatic login with newly created credentials
      const loginRes = await login(email.trim().toLowerCase(), password);
      if (!loginRes.success) {
        // Fallback: navigate to student login
        navigate('/login/student');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!password) return { label: '', color: 'transparent', width: '0%' };
    if (password.length < 8) return { label: 'Too short', color: '#ef4444', width: '30%' };
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    if (hasLetters && hasNumbers && hasSpecial) return { label: 'Strong', color: '#10b981', width: '100%' };
    if (hasLetters && hasNumbers) return { label: 'Medium', color: '#f59e0b', width: '70%' };
    return { label: 'Weak', color: '#ef4444', width: '40%' };
  };

  const strength = getPasswordStrength();

  return (
    <div
      id="student-register-page-root"
      data-testid="student-register-page-root"
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
              Student Registration
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeSwitcher />
          <LanguageSelector />
          <button
            id="register-back-home-btn"
            data-testid="register-back-home-btn"
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

      {/* Main Registration Card */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '36px 16px',
        }}
      >
        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '36px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '16px',
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: '#06b6d4',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono',
                fontWeight: 600,
                marginBottom: '10px',
              }}
            >
              <span>🎓</span> Student Onboarding
            </div>
            <h1
              id="student-register-title"
              data-testid="student-register-title"
              style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}
            >
              Create Student Account
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Sign up free to access competitive mock tests, topic mastery tracking, and practice drills.
            </p>
          </div>

          {error && (
            <div
              id="student-register-error-banner"
              data-testid="student-register-error-banner"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '18px',
              }}
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              id="student-register-success-banner"
              data-testid="student-register-success-banner"
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid #10b981',
                color: '#10b981',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '18px',
              }}
            >
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label
                  htmlFor="reg-input-first-name"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}
                >
                  First Name *
                </label>
                <input
                  id="reg-input-first-name"
                  name="firstName"
                  data-testid="reg-input-first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Maya"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="reg-input-last-name"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}
                >
                  Last Name *
                </label>
                <input
                  id="reg-input-last-name"
                  name="lastName"
                  data-testid="reg-input-last-name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sharma"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-input-email"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}
              >
                Email Address *
              </label>
              <input
                id="reg-input-email"
                name="email"
                data-testid="reg-input-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="reg-input-phone"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}
              >
                Phone (Optional)
              </label>
              <input
                id="reg-input-phone"
                name="phone"
                data-testid="reg-input-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="reg-input-password"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}
              >
                Password *
              </label>
              <input
                id="reg-input-password"
                name="password"
                data-testid="reg-input-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              {password && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'all 0.3s ease' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: strength.color, marginTop: '3px', fontWeight: 600 }}>
                    Password Strength: {strength.label}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="reg-input-confirm-password"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}
              >
                Confirm Password *
              </label>
              <input
                id="reg-input-confirm-password"
                name="confirmPassword"
                data-testid="reg-input-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type password"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', marginTop: '2px' }}>
              <input
                id="reg-input-terms"
                data-testid="reg-input-terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
              />
              <span style={{ color: 'var(--text-muted)' }}>
                I agree to the Terms of Service &amp; Academic Integrity Policy
              </span>
            </label>

            <button
              id="reg-btn-submit"
              data-testid="reg-btn-submit"
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: '8px',
                padding: '12px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #06b6d4, #10b981)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)',
              }}
            >
              {isLoading ? 'Creating Student Account...' : 'Complete Registration'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Already registered?{' '}
            <button
              type="button"
              id="register-link-to-login"
              data-testid="register-link-to-login"
              onClick={() => navigate('/login/student')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-color, #06b6d4)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                textDecoration: 'underline',
              }}
            >
              Sign In Here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
