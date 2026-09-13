import React from 'react';
import { useRouter } from '../context/RouterContext';
import { useTranslation } from '../context/I18nContext';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { LanguageSelector } from '../components/LanguageSelector';

export const LandingPage: React.FC = () => {
  const { navigate } = useRouter();
  const { t } = useTranslation();

  return (
    <div
      id="landing-page-root"
      data-testid="landing-page-root"
      style={{
        minHeight: '100vh',
        background: 'var(--bg-color)',
        color: 'var(--text-main)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 32px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--panel-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#fff',
              fontSize: '15px',
            }}
          >
            EX
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '18px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.5px' }}>
              ExamOS
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Adaptive Learning & Assessment Platform
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <ThemeSwitcher />
          <LanguageSelector />
          <button
            id="landing-btn-student-login"
            data-testid="landing-btn-student-login"
            onClick={() => navigate('/login/student')}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Student Sign In
          </button>
          <button
            id="landing-btn-student-register"
            data-testid="landing-btn-student-register"
            onClick={() => navigate('/register')}
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              border: 'none',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Create Account
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <section
          style={{
            padding: '72px 24px 48px',
            maxWidth: '1000px',
            margin: '0 auto',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              color: '#06b6d4',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            <span>⚡</span> Open Examination Architecture
          </div>

          <h1
            style={{
              fontSize: '44px',
              fontWeight: 800,
              lineHeight: 1.15,
              margin: '0 0 20px 0',
              letterSpacing: '-1px',
            }}
          >
            Precision Assessment &amp; Adaptive Practice for Competitive Exams
          </h1>

          <p
            style={{
              fontSize: '18px',
              lineHeight: 1.6,
              color: 'var(--text-muted)',
              maxWidth: '780px',
              margin: '0 0 36px 0',
            }}
          >
            ExamOS is an assessment engine built for rigorous standardized test preparation.
            Experience authentic examination blueprints, real-time topic mastery tracking, and
            AI-assisted viva interviews designed specifically for students.
          </p>

          {/* Singular Call to Action Area */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              id="hero-btn-student-portal"
              data-testid="hero-btn-student-portal"
              onClick={() => navigate('/login/student')}
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
                color: '#fff',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)',
              }}
            >
              Access Student Portal →
            </button>
            <button
              id="hero-btn-student-register"
              data-testid="hero-btn-student-register"
              onClick={() => navigate('/register')}
              style={{
                background: 'var(--panel-bg)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                padding: '14px 28px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              New Student Registration
            </button>
          </div>
        </section>

        {/* Supported Courses Grid */}
        <section
          style={{
            padding: '48px 24px',
            maxWidth: '1100px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 8px 0' }}>
              Supported Competitive Courses
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
              Curated syllabus structures, authentic sectional blueprints, and multi-tier question pools.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Course 1: JEE */}
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '24px' }}>📐</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: '#06b6d4',
                    fontWeight: 700,
                  }}
                >
                  ENGINEERING
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                JEE Main &amp; Advanced
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                Comprehensive physics, chemistry, and mathematics with authentic multi-choice and numerical questions, sectional cutoff rules, and standard marking schemes.
              </p>
            </div>

            {/* Course 2: NEET */}
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '24px' }}>🧬</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontWeight: 700,
                  }}
                >
                  MEDICAL
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                NEET Medical Entrance
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                Targeted biology, medical physics, and chemistry practice with authentic NCERT alignment, high-yield conceptual drills, and full-length timed mocks.
              </p>
            </div>

            {/* Course 3: IELTS */}
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '24px' }}>🌐</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(139, 92, 246, 0.15)',
                    color: '#8b5cf6',
                    fontWeight: 700,
                  }}
                >
                  LANGUAGE
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                IELTS Academic
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                Full four-skill preparation covering academic reading passages, timed essay writing analysis, multi-accent audio listening, and AI oral speaking viva.
              </p>
            </div>
          </div>
        </section>

        {/* Platform Capabilities */}
        <section
          style={{
            padding: '48px 24px 72px',
            maxWidth: '1100px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 8px 0' }}>
              Built for Academic Rigor
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
              Engineered with production-grade assessment integrity and intelligent skill modeling.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
            }}
          >
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '10px' }}>🎯</div>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                Adaptive Practice &amp; Drills
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.5 }}>
                Dynamically adjust item difficulty based on your historical recall accuracy and topic-level mastery.
              </div>
            </div>

            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '10px' }}>🎙️</div>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                AI Viva &amp; Oral Interview
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.5 }}>
                Real-time spoken dialogue evaluation across fluency, lexical resource, grammatical accuracy, and pronunciation.
              </div>
            </div>

            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '10px' }}>⏱️</div>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                Strict Exam Simulation
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.5 }}>
                Full-screen lockout, immutable question snapshots in archive, and instant scoring with comprehensive answer keys.
              </div>
            </div>

            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '10px' }}>📊</div>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                Mastery Analytics
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.5 }}>
                Deep statistical diagnosis identifying exact syllabus weak spots and recommended targeted remediation exercises.
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          background: 'var(--panel-bg)',
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <div>
          ExamOS Platform © {new Date().getFullYear()}. Open Assessment Operating System.
        </div>
        <div>
          <button
            id="footer-student-login-link"
            data-testid="footer-student-login-link"
            onClick={() => navigate('/login/student')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-color, #06b6d4)',
              cursor: 'pointer',
              fontSize: '12px',
              padding: 0,
            }}
          >
            Student Sign In Portal
          </button>
        </div>
      </footer>
    </div>
  );
};
