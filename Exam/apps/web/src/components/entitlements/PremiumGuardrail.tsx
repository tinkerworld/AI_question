import React from 'react';
import { useAuth } from '../../context/AuthContext';

export interface PremiumGuardrailProps {
  featureKey?: string;
  requiredPlan?: 'PREMIUM' | 'PREMIUM_PLUS' | string;
  isLocked?: boolean;
  title?: string;
  description?: string;
  blurAmount?: number;
  children: React.ReactNode;
  onUpgrade?: () => void;
}

export const PremiumGuardrail: React.FC<PremiumGuardrailProps> = ({
  requiredPlan = 'PREMIUM',
  isLocked = false,
  title = 'Premium Feature',
  description = 'Detailed diagnostics and advanced learning tools are available on Premium plans.',
  blurAmount = 6,
  children,
  onUpgrade,
}) => {
  const { setActiveTab } = useAuth();

  if (!isLocked) {
    return <>{children}</>;
  }

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      setActiveTab('subscription');
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px' }}>
      {/* Blurred Children Content */}
      <div
        style={{
          filter: `blur(${blurAmount}px)`,
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.6,
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Paywall Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          padding: '24px',
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px 32px',
            maxWidth: '440px',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(217, 119, 6, 0.15)',
              border: '1px solid #d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              fontSize: '20px',
              color: '#d97706',
            }}
          >
            🔒
          </div>
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: '17px',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono',
              color: 'var(--text-main)',
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: '0 0 20px',
              fontSize: '13px',
              lineHeight: 1.5,
              color: 'var(--text-muted)',
            }}
          >
            {description}
          </p>
          <button
            onClick={handleUpgrade}
            data-testid="guardrail-upgrade-btn"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
              border: 'none',
              color: '#ffffff',
              padding: '10px 22px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(6, 182, 212, 0.3)',
              transition: 'transform 0.15s ease',
            }}
          >
            Upgrade to {requiredPlan} Plan &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
