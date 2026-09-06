import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';
import { getAuthHeaders } from '../../utils/api';
import { MaintenanceConfigDTO, MaintenanceStatusDTO } from '@repo/types';

export const MaintenanceControlPanel: React.FC = () => {
  const [configs, setConfigs] = useState<MaintenanceConfigDTO[]>([]);
  const [globalStatus, setGlobalStatus] = useState<MaintenanceStatusDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [globalMessage, setGlobalMessage] = useState('Platform undergoing scheduled maintenance. Please check back shortly.');
  const [globalHours, setGlobalHours] = useState<number>(2);

  const [newFeatureKey, setNewFeatureKey] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfgRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/maintenance/configs`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/maintenance/status`),
      ]);
      const cfgData = await cfgRes.json();
      const statusData = await statusRes.json();

      if (cfgData.success) {
        setConfigs(cfgData.data);
      }
      if (statusData.success) {
        setGlobalStatus(statusData.data);
        setGlobalEnabled(Boolean(statusData.data.isGlobalMaintenance));
        if (statusData.data.globalMessage) setGlobalMessage(statusData.data.globalMessage);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load maintenance configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGlobalToggle = async () => {
    setError(null);
    setSuccess(null);
    try {
      const estimatedEndTime = globalEnabled
        ? undefined
        : new Date(Date.now() + globalHours * 60 * 60 * 1000).toISOString();

      const res = await fetch(`${API_BASE}/maintenance/global`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: !globalEnabled,
          message: globalMessage,
          estimatedEndTime,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update global maintenance mode');
      }
      setGlobalEnabled(!globalEnabled);
      setSuccess(`Global maintenance ${!globalEnabled ? 'ACTIVATED' : 'DEACTIVATED'} successfully.`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFeatureToggle = async (cfg: MaintenanceConfigDTO) => {
    if (!cfg.featureKey) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/maintenance/feature`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          featureKey: cfg.featureKey,
          isEnabled: !cfg.isActive,
          message: cfg.message,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update feature maintenance');
      }
      setSuccess(`Feature ${cfg.featureKey} maintenance updated.`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatureKey.trim()) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/maintenance/feature`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          featureKey: newFeatureKey.trim().toLowerCase(),
          isEnabled: true,
          message: newMessage || `${newFeatureKey} is temporarily offline for maintenance.`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to put feature in maintenance');
      }
      setNewFeatureKey('');
      setNewMessage('');
      setSuccess('Feature maintenance rule added.');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteConfig = async (featureKey?: string | null) => {
    if (!featureKey) return;
    if (!confirm(`Are you sure you want to remove maintenance rule for ${featureKey}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/maintenance/${featureKey}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete maintenance config');
      }
      setSuccess(`Maintenance configuration for ${featureKey} removed.`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
          {success}
        </div>
      )}

      {/* GLOBAL MAINTENANCE TOGGLE PANEL */}
      <div
        style={{
          background: globalEnabled ? 'rgba(239, 68, 68, 0.08)' : 'var(--panel-bg)',
          border: globalEnabled ? '2px solid #ef4444' : '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>{globalEnabled ? '🚨' : '🟢'}</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Global Maintenance Engine</h3>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              When active, non-admin student & teacher traffic receives HTTP 503 (Retry-After) with a maintenance lock screen.
            </p>
          </div>
          <button
            onClick={handleGlobalToggle}
            data-testid="global-maintenance-toggle-btn"
            style={{
              background: globalEnabled ? '#10b981' : '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {globalEnabled ? 'Deactivate Global Maintenance' : 'ACTIVATE GLOBAL LOCKDOWN'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Public User Message
            </label>
            <input
              type="text"
              value={globalMessage}
              onChange={(e) => setGlobalMessage(e.target.value)}
              disabled={globalEnabled}
              style={{
                width: '100%',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: 'var(--text-main)',
                fontSize: '13px',
              }}
            />
          </div>
          <div style={{ maxWidth: '160px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Estimated Duration
            </label>
            <select
              value={globalHours}
              onChange={(e) => setGlobalHours(Number(e.target.value))}
              disabled={globalEnabled}
              style={{
                width: '100%',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: 'var(--text-main)',
                fontSize: '13px',
              }}
            >
              <option value={1}>1 Hour</option>
              <option value={2}>2 Hours</option>
              <option value={4}>4 Hours</option>
              <option value={8}>8 Hours</option>
              <option value={24}>24 Hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* FEATURE-LEVEL MAINTENANCE TABLE */}
      <div
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Feature-Level Maintenance Rules</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Take individual capabilities offline without disturbing general exam players or student dashboards.
            </p>
          </div>
          <button
            onClick={fetchData}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px' }}>Feature Key</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>User Message</th>
                <th style={{ padding: '10px' }}>Updated At</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading maintenance rules...
                  </td>
                </tr>
              ) : configs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    All features are currently fully operational (0 active maintenance rules).
                  </td>
                </tr>
              ) : (
                configs.map((cfg) => (
                  <tr key={cfg.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 10px', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                      {cfg.featureKey || 'global'}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: cfg.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: cfg.isActive ? '#ef4444' : '#10b981',
                        }}
                      >
                        {cfg.isActive ? 'MAINTENANCE' : 'ONLINE'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', maxWidth: '300px', color: 'var(--text-muted)' }}>
                      {cfg.message}
                    </td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-muted)', fontSize: '11px' }}>
                      {new Date(cfg.updatedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleFeatureToggle(cfg)}
                          data-testid={`toggle-feature-maint-${cfg.featureKey || 'global'}`}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: cfg.isActive ? '#10b981' : '#f59e0b',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {cfg.isActive ? 'Restore Online' : 'Set Offline'}
                        </button>
                        <button
                          onClick={() => handleDeleteConfig(cfg.featureKey)}
                          data-testid={`delete-feature-maint-${cfg.featureKey || 'global'}`}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #ef4444',
                            background: 'transparent',
                            color: '#ef4444',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add new feature rule */}
        <form onSubmit={handleAddFeature} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Feature Key</label>
            <input
              type="text"
              placeholder="e.g. mock_interviews, ai_writing"
              value={newFeatureKey}
              onChange={(e) => setNewFeatureKey(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: 'var(--text-main)',
                fontSize: '12px',
              }}
            />
          </div>
          <div style={{ flex: 2, minWidth: '240px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>User Notification Message</label>
            <input
              type="text"
              placeholder="Notice shown when users try accessing this feature"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: 'var(--text-main)',
                fontSize: '12px',
              }}
            />
          </div>
          <button
            type="submit"
            data-testid="add-feature-maint-btn"
            style={{
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              height: '35px',
            }}
          >
            + Add Maintenance Rule
          </button>
        </form>
      </div>
    </div>
  );
};
