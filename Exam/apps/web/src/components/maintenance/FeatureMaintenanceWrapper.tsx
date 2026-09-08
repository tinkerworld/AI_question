import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';
import { getAuthHeaders } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { FeatureDisplayMode, FeatureStatus } from '@repo/types';

interface FeatureMaintenanceWrapperProps {
  featureKey: string;
  featureName?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  overrideDisplayMode?: FeatureDisplayMode;
  onNavigateHome?: () => void;
}

export const FeatureMaintenanceWrapper: React.FC<FeatureMaintenanceWrapperProps> = ({
  featureKey,
  featureName,
  children,
  fallback,
  overrideDisplayMode,
  onNavigateHome,
}) => {
  const { user } = useAuth();
  const [adminOverrideAcknowledged, setAdminOverrideAcknowledged] = useState<boolean>(false);
  const [inMaintenance, setInMaintenance] = useState<boolean>(false);
  const [isBlockedByBackend, setIsBlockedByBackend] = useState<boolean>(false);
  const [status, setStatus] = useState<FeatureStatus>('ACTIVE');
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<FeatureDisplayMode>('FULL_PAGE');
  const [endAt, setEndAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Compute if current logged-in user has admin maintenance authority
  // Mirrors backend maintenance.service.ts permission check: system.maintenance or '*'
  const userPermissions: string[] = Array.isArray(user?.permissions) ? user.permissions : [];
  const isRealAdmin = Boolean(
    userPermissions.includes('system.maintenance') ||
    userPermissions.includes('*')
  );

  useEffect(() => {
    let isMounted = true;
    setAdminOverrideAcknowledged(false);

    fetch(`${API_BASE}/maintenance/feature/${featureKey}`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.data) {
          const controlStatus = (data.data.control?.status || data.data.status || 'ACTIVE') as FeatureStatus;
          const blocked = Boolean(data.data.isInMaintenance || data.data.isUnderMaintenance);
          const flagged = controlStatus !== 'ACTIVE';

          setIsBlockedByBackend(blocked);
          setInMaintenance(flagged || blocked);
          setStatus(controlStatus);
          setMessage(data.data.control?.message || data.data.message || null);
          setReason(data.data.control?.reason || data.data.reason || null);
          setDisplayMode(overrideDisplayMode || data.data.control?.displayMode || data.data.displayMode || 'FULL_PAGE');
          setEndAt(data.data.control?.endAt || data.data.endAt || null);
        }
      })
      .catch(() => {
        // Fail-open: if network error, don't arbitrarily block the user
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [featureKey, overrideDisplayMode]);

  // If loading or feature is active, render children normally
  if (loading || !inMaintenance) {
    return <>{children}</>;
  }

  // Custom fallback provided by caller
  if (fallback) {
    return <>{fallback}</>;
  }

  const effectiveDisplayMode = overrideDisplayMode || displayMode;
  const displayName = featureName || featureKey.replace(/_/g, ' ').toUpperCase();

  // Sticky reminder banner displayed when an admin overrides a maintenance display mode
  const renderAdminOverrideBanner = () => (
    <div
      id={`admin-override-banner-${featureKey}`}
      data-testid={`admin-override-banner-${featureKey}`}
      style={{
        padding: '10px 16px',
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        marginBottom: '16px',
        color: '#f59e0b',
        fontSize: '13px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <span>
          <strong>Admin Override Active</strong> — this feature ({displayName}) is currently in maintenance for other users.
        </span>
      </div>
      <button
        onClick={() => setAdminOverrideAcknowledged(false)}
        style={{
          padding: '4px 10px',
          background: 'rgba(245, 158, 11, 0.2)',
          border: '1px solid #f59e0b',
          borderRadius: '4px',
          color: '#f59e0b',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
        }}
        title="Re-lock this view"
      >
        Re-lock
      </button>
    </div>
  );

  // 1. BANNER: Displays alert notice banner across top, children remain accessible
  // Admins see banner notice first; exempt non-admin roles (allowTeacher/allowStudent) get direct access without notice
  if (effectiveDisplayMode === 'BANNER') {
    if (!isRealAdmin && !isBlockedByBackend) {
      return <>{children}</>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        <div
          id={`maintenance-banner-${featureKey}`}
          data-testid={`maintenance-banner-${featureKey}`}
          style={{
            padding: '12px 18px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            color: '#f59e0b',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div>
            <strong>Notice:</strong> {message || `${displayName} is undergoing background maintenance.`}
            {endAt && (
              <span style={{ marginLeft: '8px', fontSize: '11px', opacity: 0.85 }}>
                (Expected completion: {new Date(endAt).toLocaleTimeString()})
              </span>
            )}
          </div>
        </div>
        {children}
      </div>
    );
  }

  // 2. BLUR: In-place content blur with centered maintenance overlay card
  if (effectiveDisplayMode === 'BLUR') {
    // If real admin has clicked override, reveal unblurred content
    if (isRealAdmin && adminOverrideAcknowledged) {
      return (
        <div style={{ width: '100%' }}>
          {renderAdminOverrideBanner()}
          {children}
        </div>
      );
    }

    // Non-admin exempt role (e.g. Teacher if allowTeacher: true) bypasses normally
    if (!isRealAdmin && !isBlockedByBackend) {
      return <>{children}</>;
    }

    // Blocked user OR Admin who hasn't acknowledged override yet:
    return (
      <div
        id={`maintenance-blur-${featureKey}`}
        data-testid={`maintenance-blur-${featureKey}`}
        style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px' }}
      >
        <div
          style={{
            filter: 'blur(6px)',
            pointerEvents: 'none',
            userSelect: 'none',
            opacity: 0.45,
            transition: 'filter 0.3s ease',
          }}
        >
          {children}
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 20,
          }}
        >
          <div
            data-testid={`maintenance-card-${featureKey}`}
            style={{
              background: 'var(--panel-bg)',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '14px',
              padding: '28px 36px',
              maxWidth: '520px',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
            <div
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                fontWeight: 700,
                color: '#ef4444',
                letterSpacing: '1px',
                marginBottom: '6px',
              }}
            >
              MODULE UNAVAILABLE // {status}
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
              {displayName}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'var(--text-muted)' }}>
              {message || `${displayName} is temporarily undergoing scheduled maintenance.`}
            </p>
            {endAt && (
              <div
                style={{
                  marginTop: '14px',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono',
                  color: 'var(--accent-color)',
                }}
              >
                Estimated resumption: {new Date(endAt).toLocaleTimeString()}
              </div>
            )}

            {/* Admin Override Action Button */}
            {isRealAdmin && (
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <button
                  id={`admin-override-btn-${featureKey}`}
                  data-testid={`admin-override-btn-${featureKey}`}
                  onClick={() => setAdminOverrideAcknowledged(true)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid #f59e0b',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
                  }}
                >
                  <span>👁</span>
                  <span>View Anyway (Admin Override)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. DISABLED_BUTTON: Degrades gracefully in place with disabled overlay and notice
  if (effectiveDisplayMode === 'DISABLED_BUTTON') {
    // If real admin has clicked override, re-enable elements and show banner
    if (isRealAdmin && adminOverrideAcknowledged) {
      return (
        <div style={{ width: '100%' }}>
          {renderAdminOverrideBanner()}
          {children}
        </div>
      );
    }

    // Non-admin exempt role bypasses normally
    if (!isRealAdmin && !isBlockedByBackend) {
      return <>{children}</>;
    }

    // Blocked user OR Admin who hasn't acknowledged override yet:
    return (
      <div
        id={`maintenance-disabled-${featureKey}`}
        data-testid={`maintenance-disabled-${featureKey}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
        }}
      >
        <div
          data-testid={`maintenance-notice-${featureKey}`}
          style={{
            padding: '10px 16px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⛔</span>
            <span>
              <strong>Feature Disabled:</strong> {message || `${displayName} actions are temporarily disabled.`}
            </span>
          </div>

          {/* Admin Override Action Button */}
          {isRealAdmin && (
            <button
              id={`admin-override-btn-${featureKey}`}
              data-testid={`admin-override-btn-${featureKey}`}
              onClick={() => setAdminOverrideAcknowledged(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #f59e0b',
                background: 'rgba(245, 158, 11, 0.18)',
                color: '#f59e0b',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>⚡</span>
              <span>Enable Controls (Admin Override)</span>
            </button>
          )}
        </div>
        <div
          style={{
            pointerEvents: 'none',
            opacity: 0.45,
            filter: 'grayscale(0.7)',
            cursor: 'not-allowed',
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  // 4. HIDDEN: Invisible to normal blocked users, minimal indicator + override for Admin
  if (effectiveDisplayMode === 'HIDDEN') {
    // If real admin has clicked override, reveal hidden feature
    if (isRealAdmin && adminOverrideAcknowledged) {
      return (
        <div style={{ width: '100%' }}>
          {renderAdminOverrideBanner()}
          {children}
        </div>
      );
    }

    // Non-admin exempt role (if backend allowed) bypasses normally
    if (!isRealAdmin && !isBlockedByBackend) {
      return <>{children}</>;
    }

    // For real admin who hasn't acknowledged override yet:
    // Show a clean, minimal admin-visible indicator with an override button
    if (isRealAdmin) {
      return (
        <div
          id={`maintenance-hidden-admin-${featureKey}`}
          data-testid={`maintenance-hidden-admin-${featureKey}`}
          style={{
            padding: '36px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-color)',
            borderRadius: '12px',
            margin: '20px',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🙈</div>
          <div
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: '11px',
              fontWeight: 700,
              color: '#a855f7',
              letterSpacing: '1.2px',
              marginBottom: '6px',
            }}
          >
            FEATURE HIDDEN // {status}
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
            {displayName} (Hidden from normal users)
          </h3>
          <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'var(--text-muted)', maxWidth: '480px' }}>
            {message || `This module is set to HIDDEN mode. Normal users cannot see or access it.`}
          </p>
          <button
            id={`admin-override-btn-${featureKey}`}
            data-testid={`admin-override-btn-${featureKey}`}
            onClick={() => setAdminOverrideAcknowledged(true)}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #a855f7',
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#d8b4fe',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.15)',
            }}
          >
            <span>👁</span>
            <span>Reveal Feature (Admin Override)</span>
          </button>
        </div>
      );
    }

    // For non-admin blocked user (e.g. Student):
    // Invisibility is preserved: render fallback if provided, else null
    return fallback ? <>{fallback}</> : null;
  }

  // 5. FULL_PAGE: Branded full maintenance screen
  // If real admin has acknowledged the override, reveal children
  if (isRealAdmin && adminOverrideAcknowledged) {
    return (
      <div style={{ width: '100%' }}>
        {renderAdminOverrideBanner()}
        {children}
      </div>
    );
  }

  // Non-admin exempt role bypasses normally
  if (!isRealAdmin && !isBlockedByBackend) {
    return <>{children}</>;
  }

  // Blocked user OR Admin who hasn't acknowledged override yet:
  return (
    <div
      id={`maintenance-screen-${featureKey}`}
      data-testid={`maintenance-screen-${featureKey}`}
      style={{
        flex: 1,
        minHeight: '480px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        margin: '20px',
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '34px',
          marginBottom: '20px',
        }}
      >
        🛠️
      </div>

      <div
        style={{
          fontFamily: 'JetBrains Mono',
          fontSize: '11px',
          fontWeight: 700,
          color: '#ef4444',
          letterSpacing: '1.5px',
          marginBottom: '8px',
        }}
      >
        UNDER SCHEDULED MAINTENANCE // {status}
      </div>

      <h2
        style={{
          margin: '0 0 12px',
          fontSize: '22px',
          fontWeight: 800,
          color: 'var(--text-main)',
          fontFamily: 'JetBrains Mono',
        }}
      >
        {displayName} Temporarily Offline
      </h2>

      <p
        data-testid={`maintenance-message-${featureKey}`}
        style={{
          margin: '0 auto',
          fontSize: '14px',
          lineHeight: '1.6',
          color: 'var(--text-muted)',
          maxWidth: '540px',
        }}
      >
        {message ||
          'This subsystem is currently undergoing scheduled platform upgrades and maintenance. Please check back shortly.'}
      </p>

      {reason && (
        <div
          data-testid={`maintenance-reason-${featureKey}`}
          style={{
            marginTop: '12px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
          }}
        >
          Reason: {reason}
        </div>
      )}

      {endAt && (
        <div
          style={{
            marginTop: '20px',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono',
            color: '#06b6d4',
          }}
        >
          ⏱️ Expected Service Resumption: {new Date(endAt).toLocaleString()}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {isRealAdmin && (
          <button
            id={`admin-override-btn-${featureKey}`}
            data-testid={`admin-override-btn-${featureKey}`}
            onClick={() => setAdminOverrideAcknowledged(true)}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              border: '1px solid #f59e0b',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>⚡</span>
            <span>Access Anyway (Admin Override)</span>
          </button>
        )}

        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-main)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>←</span>
            <span>Return to Dashboard</span>
          </button>
        )}
      </div>
    </div>
  );
};
