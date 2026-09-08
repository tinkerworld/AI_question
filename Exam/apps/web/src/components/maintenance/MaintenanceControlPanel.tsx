import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';
import { getAuthHeaders } from '../../utils/api';
import {
  FeatureControlDTO,
  FeatureStatus,
  FeatureDisplayMode,
} from '@repo/types';

export const MaintenanceControlPanel: React.FC = () => {
  const [controls, setControls] = useState<FeatureControlDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selected feature for editing panel
  const [selectedFeature, setSelectedFeature] = useState<FeatureControlDTO | null>(null);
  const [editStatus, setEditStatus] = useState<FeatureStatus>('ACTIVE');
  const [editMessage, setEditMessage] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [editDisplayMode, setEditDisplayMode] = useState<FeatureDisplayMode>('FULL_PAGE');
  const [editAllowAdmin, setEditAllowAdmin] = useState<boolean>(true);
  const [editAllowTeacher, setEditAllowTeacher] = useState<boolean>(false);
  const [editAllowStudent, setEditAllowStudent] = useState<boolean>(false);
  const [editStartAt, setEditStartAt] = useState<string>('');
  const [editEndAt, setEditEndAt] = useState<string>('');
  const [savingFeature, setSavingFeature] = useState<boolean>(false);

  // Bulk Deactivate All modal state
  const [showDeactivateModal, setShowDeactivateModal] = useState<boolean>(false);
  const [bulkMessage, setBulkMessage] = useState<string>(
    'The platform is currently undergoing scheduled maintenance. Please check back shortly.'
  );
  const [bulkReason, setBulkReason] = useState<string>('Platform-wide scheduled upgrade');
  const [bulkExecuting, setBulkExecuting] = useState<boolean>(false);

  // Bulk Restore All state
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);

  const fetchControls = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/maintenance/controls`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setControls(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch feature controls');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load maintenance configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControls();
  }, []);

  const openEditPanel = (ctrl: FeatureControlDTO) => {
    setSelectedFeature(ctrl);
    setEditStatus(ctrl.status);
    setEditMessage(ctrl.message);
    setEditReason(ctrl.reason || '');
    setEditDisplayMode(ctrl.displayMode || 'FULL_PAGE');
    setEditAllowAdmin(ctrl.allowAdmin ?? true);
    setEditAllowTeacher(ctrl.allowTeacher ?? false);
    setEditAllowStudent(ctrl.allowStudent ?? false);

    // Format startAt and endAt for datetime-local input
    if (ctrl.startAt) {
      const d = new Date(ctrl.startAt);
      setEditStartAt(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    } else {
      setEditStartAt('');
    }
    if (ctrl.endAt) {
      const d = new Date(ctrl.endAt);
      setEditEndAt(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    } else {
      setEditEndAt('');
    }
    setError(null);
    setSuccess(null);
  };

  const closeEditPanel = () => {
    setSelectedFeature(null);
  };

  const saveFeatureControl = async (targetStatus?: FeatureStatus) => {
    if (!selectedFeature) return;
    setSavingFeature(true);
    setError(null);
    setSuccess(null);

    try {
      const statusToSave = targetStatus || editStatus;
      const payload = {
        status: statusToSave,
        message: editMessage.trim() || `${selectedFeature.name} is temporarily under maintenance.`,
        reason: editReason.trim() || null,
        displayMode: editDisplayMode,
        allowAdmin: editAllowAdmin,
        allowTeacher: editAllowTeacher,
        allowStudent: editAllowStudent,
        startAt: editStartAt ? new Date(editStartAt).toISOString() : null,
        endAt: editEndAt ? new Date(editEndAt).toISOString() : null,
      };

      const res = await fetch(`${API_BASE}/maintenance/controls/${selectedFeature.featureKey}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update feature control');
      }

      setSuccess(`Feature "${selectedFeature.name}" updated to [${statusToSave}] successfully.`);
      closeEditPanel();
      fetchControls();
    } catch (err: any) {
      setError(err.message || 'Failed to save feature control');
    } finally {
      setSavingFeature(false);
    }
  };

  const handleBulkAction = async (status: 'MAINTENANCE' | 'ACTIVE') => {
    setBulkExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/maintenance/bulk`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          message: status === 'MAINTENANCE' ? bulkMessage : undefined,
          reason: status === 'MAINTENANCE' ? bulkReason : 'Restored all features to ACTIVE',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Failed to execute bulk ${status} action`);
      }

      setShowDeactivateModal(false);
      setShowRestoreModal(false);
      setSuccess(
        status === 'MAINTENANCE'
          ? 'All features DEACTIVATED and set to MAINTENANCE successfully.'
          : 'All features RESTORED back to ACTIVE successfully.'
      );
      fetchControls();
    } catch (err: any) {
      setError(err.message || `Failed to bulk update features`);
    } finally {
      setBulkExecuting(false);
    }
  };

  const getStatusBadge = (status: FeatureStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span
            data-testid="status-badge-active"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            ACTIVE
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span
            data-testid="status-badge-maintenance"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
            MAINTENANCE
          </span>
        );
      case 'COMING_SOON':
        return (
          <span
            data-testid="status-badge-coming-soon"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono',
              background: 'rgba(14, 165, 233, 0.15)',
              color: '#0ea5e9',
              border: '1px solid rgba(14, 165, 233, 0.3)',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0ea5e9' }} />
            COMING SOON
          </span>
        );
      case 'DISABLED':
        return (
          <span
            data-testid="status-badge-disabled"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono',
              background: 'rgba(113, 113, 122, 0.15)',
              color: '#a1a1aa',
              border: '1px solid rgba(113, 113, 122, 0.3)',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a1a1aa' }} />
            DISABLED
          </span>
        );
      case 'BETA':
        return (
          <span
            data-testid="status-badge-beta"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono',
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#a855f7',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7' }} />
            BETA
          </span>
        );
    }
  };

  const activeCount = controls.filter((c) => c.status === 'ACTIVE').length;
  const maintenanceCount = controls.filter((c) => c.status === 'MAINTENANCE').length;
  const otherCount = controls.length - activeCount - maintenanceCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Header & Bulk Actions */}
      <div
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '22px' }}>🛠️</span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
              Feature-Level & Global Maintenance Engine
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', maxWidth: '620px' }}>
            Centralized runtime control over platform availability. Take individual features offline with custom user
            messages, configure scheduled maintenance windows with auto-transition, or execute emergency bulk controls.
          </p>
        </div>

        {/* Top Bar Bulk Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="btn-deactivate-all"
            data-testid="btn-deactivate-all"
            onClick={() => setShowDeactivateModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #ef4444',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>⚠️</span>
            <span>Deactivate All</span>
          </button>

          <button
            id="btn-restore-all"
            data-testid="btn-restore-all"
            onClick={() => setShowRestoreModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #10b981',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🔄</span>
            <span>Restore All</span>
          </button>

          <button
            onClick={fetchControls}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-main)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
            title="Refresh list"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {error && (
        <div
          data-testid="maintenance-error-banner"
          style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          data-testid="maintenance-success-banner"
          style={{
            padding: '12px 16px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10b981',
            borderRadius: '8px',
            color: '#10b981',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✅</span>
          <span>{success}</span>
        </div>
      )}

      {/* Summary KPI Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '16px 20px',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            REGISTERED SUBSYSTEMS
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', fontFamily: 'JetBrains Mono' }}>
            {controls.length}
          </div>
        </div>

        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '16px 20px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#10b981', fontFamily: 'JetBrains Mono' }}>ACTIVE ONLINE</div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              marginTop: '4px',
              color: '#10b981',
              fontFamily: 'JetBrains Mono',
            }}
          >
            {activeCount}
          </div>
        </div>

        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '16px 20px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#ef4444', fontFamily: 'JetBrains Mono' }}>UNDER MAINTENANCE</div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              marginTop: '4px',
              color: '#ef4444',
              fontFamily: 'JetBrains Mono',
            }}
          >
            {maintenanceCount}
          </div>
        </div>

        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '16px 20px',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            COMING SOON / BETA / OTHER
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', fontFamily: 'JetBrains Mono' }}>
            {otherCount}
          </div>
        </div>
      </div>

      {/* Main View: Selection-Based Feature Control Table */}
      <div
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '14px', fontFamily: 'JetBrains Mono' }}>
            PLATFORM SUBSYSTEM SWITCHBOARD ({controls.length} FEATURES)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Click any row to configure status, messages & scheduled windows
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Loading feature availability matrix...
          </div>
        ) : controls.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No feature controls found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              id="feature-controls-table"
              style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}
            >
              <thead>
                <tr
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                  }}
                >
                  <th style={{ padding: '12px 18px' }}>FEATURE SUBSYSTEM</th>
                  <th style={{ padding: '12px 18px' }}>FEATURE KEY</th>
                  <th style={{ padding: '12px 18px' }}>CURRENT STATUS</th>
                  <th style={{ padding: '12px 18px' }}>DISPLAY MODE</th>
                  <th style={{ padding: '12px 18px' }}>PUBLIC MESSAGE (STUDENTS)</th>
                  <th style={{ padding: '12px 18px' }}>SCHEDULED WINDOW</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {controls.map((ctrl) => {
                  const isUnderMaint = ctrl.status === 'MAINTENANCE';
                  const isSelected = selectedFeature?.featureKey === ctrl.featureKey;

                  return (
                    <tr
                      key={ctrl.featureKey}
                      id={`feature-row-${ctrl.featureKey}`}
                      data-testid={`feature-row-${ctrl.featureKey}`}
                      onClick={() => openEditPanel(ctrl)}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: isSelected
                          ? 'rgba(6, 182, 212, 0.08)'
                          : isUnderMaint
                          ? 'rgba(239, 68, 68, 0.03)'
                          : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.background = isUnderMaint
                            ? 'rgba(239, 68, 68, 0.03)'
                            : 'transparent';
                      }}
                    >
                      {/* Feature Subsystem Name & Desc */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>
                          {ctrl.name}
                        </div>
                        {ctrl.description && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              marginTop: '2px',
                              maxWidth: '300px',
                            }}
                          >
                            {ctrl.description}
                          </div>
                        )}
                      </td>

                      {/* Feature Key Pill */}
                      <td style={{ padding: '14px 18px' }}>
                        <code
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontFamily: 'JetBrains Mono',
                            color: '#06b6d4',
                          }}
                        >
                          {ctrl.featureKey}
                        </code>
                      </td>

                      {/* Current Status Badge */}
                      <td style={{ padding: '14px 18px' }}>{getStatusBadge(ctrl.status)}</td>

                      {/* Display Mode */}
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontFamily: 'JetBrains Mono',
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          {ctrl.displayMode}
                        </span>
                      </td>

                      {/* Public Message Preview */}
                      <td style={{ padding: '14px 18px', maxWidth: '320px' }}>
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: isUnderMaint ? '#f87171' : 'var(--text-muted)',
                            fontSize: '12px',
                          }}
                          title={ctrl.message}
                        >
                          {ctrl.message}
                        </div>
                        {ctrl.reason && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#a1a1aa',
                              marginTop: '2px',
                              fontStyle: 'italic',
                            }}
                          >
                            Note: {ctrl.reason}
                          </div>
                        )}
                      </td>

                      {/* Scheduled Window */}
                      <td style={{ padding: '14px 18px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {ctrl.startAt || ctrl.endAt ? (
                          <div style={{ fontFamily: 'JetBrains Mono' }}>
                            {ctrl.startAt && <div>From: {new Date(ctrl.startAt).toLocaleString()}</div>}
                            {ctrl.endAt && <div>To: {new Date(ctrl.endAt).toLocaleString()}</div>}
                          </div>
                        ) : (
                          <span style={{ opacity: 0.5 }}>None (Manual)</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          id={`btn-configure-${ctrl.featureKey}`}
                          data-testid={`btn-configure-${ctrl.featureKey}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditPanel(ctrl);
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                            color: isSelected ? '#06b6d4' : 'var(--text-main)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feature Configuration Drawer / Modal Panel */}
      {selectedFeature && (
        <div
          id="feature-edit-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={closeEditPanel}
        >
          <div
            id="feature-edit-panel"
            data-testid="feature-edit-panel"
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                    Configure: {selectedFeature.name}
                  </h3>
                  {getStatusBadge(selectedFeature.status)}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '6px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>Feature Key:</span>
                  <code
                    style={{
                      fontFamily: 'JetBrains Mono',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      color: '#06b6d4',
                    }}
                  >
                    {selectedFeature.featureKey}
                  </code>
                </div>
              </div>
              <button
                onClick={closeEditPanel}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Action Buttons: Set Offline / Restore */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px dashed var(--border-color)',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Quick Actions:</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  id="btn-set-offline"
                  data-testid="btn-set-offline"
                  onClick={() => saveFeatureControl('MAINTENANCE')}
                  disabled={savingFeature}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid #ef4444',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: savingFeature ? 'not-allowed' : 'pointer',
                  }}
                >
                  ⚡ Set Offline (Maintenance)
                </button>
                <button
                  id="btn-set-active"
                  data-testid="btn-set-active"
                  onClick={() => saveFeatureControl('ACTIVE')}
                  disabled={savingFeature}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid #10b981',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: savingFeature ? 'not-allowed' : 'pointer',
                  }}
                >
                  ✓ Restore (Active)
                </button>
              </div>
            </div>

            {/* Status Dropdown */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono',
                  marginBottom: '6px',
                }}
              >
                FEATURE AVAILABILITY STATUS
              </label>
              <select
                id="select-feature-status"
                data-testid="select-feature-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as FeatureStatus)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              >
                <option value="ACTIVE">ACTIVE — Normal operations, accessible to permitted roles</option>
                <option value="MAINTENANCE">MAINTENANCE — Offline with maintenance notice (403 for students)</option>
                <option value="COMING_SOON">COMING_SOON — Pre-release teaser mode</option>
                <option value="DISABLED">DISABLED — Subsystem completely turned off</option>
                <option value="BETA">BETA — Restricted beta testing</option>
              </select>
            </div>

            {/* Public Message Textarea */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono',
                  marginBottom: '6px',
                }}
              >
                STUDENT-FACING MESSAGE ("WHAT STUDENTS SEE")
              </label>
              <textarea
                id="textarea-feature-message"
                data-testid="textarea-feature-message"
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                placeholder="e.g. Practice Drills are undergoing database optimization and will resume shortly."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                This message is delivered directly in the 403 API response and displayed on the student screen.
              </div>
            </div>

            {/* Admin Reason Input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono',
                  marginBottom: '6px',
                }}
              >
                ADMIN-FACING REASON (OPTIONAL INTERNAL NOTE)
              </label>
              <input
                id="input-feature-reason"
                data-testid="input-feature-reason"
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="e.g. Upgrading PostgreSQL database indices, ticket INFRA-402"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Internal administrator rationale for audit logs. Students never see this reason.
              </div>
            </div>

            {/* Display Mode Selection */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono',
                  marginBottom: '6px',
                }}
              >
                FRONTEND DISPLAY MODE (WHEN OFFLINE)
              </label>
              <select
                id="select-display-mode"
                data-testid="select-display-mode"
                value={editDisplayMode}
                onChange={(e) => setEditDisplayMode(e.target.value as FeatureDisplayMode)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              >
                <option value="FULL_PAGE">FULL_PAGE — Dedicated branded Under Maintenance screen with message</option>
                <option value="BLUR">BLUR — In-place content blur with centered maintenance overlay card</option>
                <option value="DISABLED_BUTTON">DISABLED_BUTTON — Degrades gracefully in place with disabled controls</option>
                <option value="HIDDEN">HIDDEN — Removes entry points completely from navigation & UI</option>
                <option value="BANNER">BANNER — Displays alert banner across the top of the feature</option>
              </select>
            </div>

            {/* Role Bypass Checkboxes */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono',
                  marginBottom: '8px',
                }}
              >
                ROLE BYPASS PRIVILEGES
              </label>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editAllowAdmin}
                    onChange={(e) => setEditAllowAdmin(e.target.checked)}
                  />
                  <span>Allow Administrators (Staff Bypass)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editAllowTeacher}
                    onChange={(e) => setEditAllowTeacher(e.target.checked)}
                  />
                  <span>Allow Teachers / Faculty</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editAllowStudent}
                    onChange={(e) => setEditAllowStudent(e.target.checked)}
                  />
                  <span>Allow Students</span>
                </label>
              </div>
            </div>

            {/* Scheduled Maintenance Window */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono',
                  marginBottom: '6px',
                }}
              >
                SCHEDULED MAINTENANCE WINDOW (OPTIONAL AUTO-TRANSITION)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Start Time:</div>
                  <input
                    id="input-start-at"
                    type="datetime-local"
                    value={editStartAt}
                    onChange={(e) => setEditStartAt(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-color)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>End Time:</div>
                  <input
                    id="input-end-at"
                    type="datetime-local"
                    value={editEndAt}
                    onChange={(e) => setEditEndAt(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-color)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Status will auto-transition to MAINTENANCE when start time arrives, and automatically restore to ACTIVE
                once the end time passes without requiring manual intervention.
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <button
                onClick={closeEditPanel}
                disabled={savingFeature}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                id="btn-save-feature-control"
                data-testid="btn-save-feature-control"
                onClick={() => saveFeatureControl()}
                disabled={savingFeature}
                style={{
                  padding: '9px 22px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#06b6d4',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: savingFeature ? 'not-allowed' : 'pointer',
                }}
              >
                {savingFeature ? 'Saving Changes...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Deactivate All */}
      {showDeactivateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          onClick={() => setShowDeactivateModal(false)}
        >
          <div
            id="modal-confirm-deactivate-all"
            data-testid="modal-confirm-deactivate-all"
            style={{
              background: 'var(--panel-bg)',
              border: '2px solid #ef4444',
              borderRadius: '14px',
              maxWidth: '540px',
              width: '100%',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  color: '#ef4444',
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ef4444' }}>
                  Confirm Bulk Deactivate All Features
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  High Blast Radius System Action
                </div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'var(--text-main)' }}>
              Are you sure you want to take <strong>every feature offline</strong>? Every student request across Practice,
              AI Interview, Question Bank, Analytics, Exams, and Subscriptions will immediately return{' '}
              <strong>403 FEATURE_UNAVAILABLE</strong>.
            </p>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#10b981',
              }}
            >
              🛡️ <strong>Non-Disruption Guarantee:</strong> Active exam attempts currently in progress will NOT be
              disrupted mid-session.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Shared Student Notice Message:
              </label>
              <textarea
                id="bulk-deactivate-message"
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Admin Reason / Incident Ticket:
              </label>
              <input
                id="bulk-deactivate-reason"
                type="text"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setShowDeactivateModal(false)}
                disabled={bulkExecuting}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-deactivate-all"
                data-testid="btn-confirm-deactivate-all"
                onClick={() => handleBulkAction('MAINTENANCE')}
                disabled={bulkExecuting}
                style={{
                  padding: '9px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: bulkExecuting ? 'not-allowed' : 'pointer',
                }}
              >
                {bulkExecuting ? 'Deactivating...' : 'Confirm: Take All Offline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Restore All */}
      {showRestoreModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          onClick={() => setShowRestoreModal(false)}
        >
          <div
            id="modal-confirm-restore-all"
            data-testid="modal-confirm-restore-all"
            style={{
              background: 'var(--panel-bg)',
              border: '2px solid #10b981',
              borderRadius: '14px',
              maxWidth: '500px',
              width: '100%',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  color: '#10b981',
                }}
              >
                🔄
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#10b981' }}>
                  Restore All Features to Active
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Platform Availability Recovery
                </div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'var(--text-main)' }}>
              This action will immediately set every platform subsystem back to <strong>ACTIVE</strong>. Students and
              teachers will have unrestricted access restored across all modules.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setShowRestoreModal(false)}
                disabled={bulkExecuting}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-restore-all"
                data-testid="btn-confirm-restore-all"
                onClick={() => handleBulkAction('ACTIVE')}
                disabled={bulkExecuting}
                style={{
                  padding: '9px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: bulkExecuting ? 'not-allowed' : 'pointer',
                }}
              >
                {bulkExecuting ? 'Restoring...' : 'Confirm: Restore All Features'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
