import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface ImpersonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: { id: string; name: string; email: string } | null;
}

export const ImpersonationModal: React.FC<ImpersonationModalProps> = ({
  isOpen,
  onClose,
  targetUser,
}) => {
  const { startImpersonation } = useAuth();
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !targetUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 10) {
      setError('A detailed justification (minimum 10 characters) is required for audit compliance.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await startImpersonation(targetUser.id, reason.trim());
    setIsSubmitting(false);

    if (res.success) {
      setReason('');
      onClose();
    } else {
      setError(res.message || 'Failed to start impersonation session');
    }
  };

  return (
    <div
      id="impersonation-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        id="impersonation-modal"
        data-testid="impersonation-modal"
        style={{
          background: 'var(--panel-bg)',
          color: 'var(--text-main)',
          border: '1px solid #dc2626',
          borderRadius: '12px',
          padding: '24px',
          width: '500px',
          maxWidth: '90vw',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          fontFamily: 'Inter, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#dc2626' }}>
              Confirm Real Student Impersonation
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '12px',
            lineHeight: '1.4',
            marginBottom: '16px',
          }}
        >
          <strong>Security Notice:</strong> You are about to view and interact with the platform as{' '}
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{targetUser.email}</span>.
          All actions performed during this session will be attributed to your administrator account in the permanent audit trail.
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              fontSize: '12px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="impersonation-reason-input"
              style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}
            >
              Justification & Reason <span style={{ color: '#dc2626' }}>*</span> (Min 10 characters)
            </label>
            <textarea
              id="impersonation-reason-input"
              data-testid="impersonation-reason-input"
              rows={3}
              placeholder="e.g. Investigating reported score discrepancy on JEE Main Physics Mock Exam #2..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-color)',
                color: 'var(--text-main)',
                fontSize: '13px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
              {reason.length} / 10 characters minimum
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-impersonation-btn"
              data-testid="confirm-impersonation-btn"
              disabled={isSubmitting || reason.trim().length < 10}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: reason.trim().length < 10 ? 'rgba(220, 38, 38, 0.4)' : '#dc2626',
                color: '#ffffff',
                fontWeight: 600,
                cursor: reason.trim().length < 10 || isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              {isSubmitting ? 'Starting...' : '⚠️ Impersonate Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
