import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';
import { useTranslation } from '../../context/I18nContext';
import { MaintenanceStatusDTO } from '@repo/types';

export const MaintenanceBanner: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<MaintenanceStatusDTO | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/maintenance/status`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.isGlobalMaintenance) {
          setStatus(data.data);
        }
      })
      .catch(() => {});
  }, []);

  if (!status || !status.isGlobalMaintenance || dismissed) {
    return null;
  }

  return (
    <div
      data-testid="global-maintenance-banner"
      style={{
        background: 'linear-gradient(90deg, #b91c1c, #991b1b)',
        color: '#ffffff',
        padding: '10px 16px',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 500 }}>
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <span>
          <strong>{t('platform_maintenance_active')}:</strong> {status.globalMessage || t('default_maintenance_message')}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ffffff',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '0 4px',
          opacity: 0.8,
        }}
        title={t('dismiss_notice')}
      >
        ✕
      </button>
    </div>
  );
};
