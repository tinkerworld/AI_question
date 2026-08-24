import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface PreviewBannerProps {
  onOpenConfig?: () => void;
}

export const PreviewBanner: React.FC<PreviewBannerProps> = ({ onOpenConfig }) => {
  const { impersonationSession, isImpersonating, exitImpersonation } = useAuth();
  const [timeLeftMinutes, setTimeLeftMinutes] = useState<number>(60);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  useEffect(() => {
    if (!impersonationSession) return;
    const expiresAt = new Date(impersonationSession.expiresAt).getTime();

    const updateTimer = () => {
      const remainingMs = Math.max(0, expiresAt - Date.now());
      setTimeLeftMinutes(Math.ceil(remainingMs / 60000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [impersonationSession]);

  if (!isImpersonating || !impersonationSession) return null;

  const isPreview = impersonationSession.mode === 'PREVIEW_STUDENT';
  const plan = impersonationSession.sessionData?.simulatedPlan || 'FREE';
  const contentVer = impersonationSession.sessionData?.contentVersion || 'PUBLISHED';
  const usageMode = impersonationSession.sessionData?.usageMode || 'NORMAL';

  const handleExit = async () => {
    setIsExiting(true);
    try {
      await exitImpersonation();
    } finally {
      setIsExiting(false);
    }
  };

  return (
    <div
      id="preview-banner"
      data-testid="preview-banner"
      style={{
        width: '100%',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isPreview
          ? 'linear-gradient(90deg, #d97706 0%, #b45309 100%)'
          : 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        zIndex: 9999,
        position: 'sticky',
        top: 0,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span
          style={{
            background: 'rgba(0,0,0,0.25)',
            padding: '3px 8px',
            borderRadius: '4px',
            letterSpacing: '0.5px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            textTransform: 'uppercase',
          }}
        >
          {isPreview ? '⚡ PREVIEW MODE' : '⚠️ IMPERSONATION ACTIVE'}
        </span>

        {isPreview ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span>
              <strong>Simulated Plan:</strong> {plan}
            </span>
            <span>•</span>
            <span>
              <strong>Content:</strong> {contentVer}
            </span>
            <span>•</span>
            <span>
              <strong>Mode:</strong> {usageMode}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>
              <strong>Acting As:</strong> {impersonationSession.effectiveEmail || impersonationSession.effectiveUserId}
            </span>
            {impersonationSession.reason && (
              <span style={{ opacity: 0.9, fontSize: '11px' }}>
                (Reason: {impersonationSession.reason.slice(0, 40)}
                {impersonationSession.reason.length > 40 ? '...' : ''})
              </span>
            )}
          </div>
        )}

        <span
          style={{
            opacity: 0.85,
            fontSize: '11px',
            background: 'rgba(255,255,255,0.15)',
            padding: '2px 6px',
            borderRadius: '3px',
          }}
        >
          ⏱️ {timeLeftMinutes}m left
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isPreview && onOpenConfig && (
          <button
            id="preview-quick-config-btn"
            data-testid="preview-quick-config-btn"
            onClick={onOpenConfig}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ⚙️ Quick Config
          </button>
        )}

        <button
          id="exit-preview-btn"
          data-testid="exit-preview-btn"
          onClick={handleExit}
          disabled={isExiting}
          style={{
            background: '#ffffff',
            color: isPreview ? '#b45309' : '#dc2626',
            border: 'none',
            padding: '4px 12px',
            borderRadius: '4px',
            cursor: isExiting ? 'not-allowed' : 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            transition: 'background 0.2s',
          }}
        >
          {isExiting ? 'Exiting...' : isPreview ? '✕ Exit Preview' : '✕ Exit Impersonation'}
        </button>
      </div>
    </div>
  );
};
