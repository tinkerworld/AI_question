import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';

interface FeatureMaintenanceWrapperProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureMaintenanceWrapper: React.FC<FeatureMaintenanceWrapperProps> = ({
  featureKey,
  children,
  fallback,
}) => {
  const [inMaintenance, setInMaintenance] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE}/maintenance/feature/${featureKey}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.data?.isInMaintenance) {
          setInMaintenance(true);
          setMessage(data.data.message);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [featureKey]);

  if (!inMaintenance) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      style={{
        padding: '32px 24px',
        textAlign: 'center',
        background: 'var(--panel-bg)',
        border: '1px dashed #f59e0b',
        borderRadius: '10px',
        margin: '16px 0',
      }}
      data-testid={`maintenance-notice-${featureKey}`}
    >
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛠️</div>
      <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
        Feature Temporarily Offline
      </h4>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', maxWidth: '480px', marginInline: 'auto' }}>
        {message || 'This feature is undergoing scheduled maintenance and will be available shortly.'}
      </p>
    </div>
  );
};
