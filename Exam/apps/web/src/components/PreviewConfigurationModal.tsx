import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface PreviewConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourseId?: string;
}

export const PreviewConfigurationModal: React.FC<PreviewConfigurationModalProps> = ({
  isOpen,
  onClose,
  initialCourseId,
}) => {
  const { startPreview } = useAuth();
  const [billingPlan, setBillingPlan] = useState<'FREE' | 'PREMIUM' | 'PREMIUM_PLUS'>('PREMIUM');
  const [contentVersion, setContentVersion] = useState<'DRAFT' | 'REVIEW' | 'PUBLISHED'>('PUBLISHED');
  const [usageMode, setUsageMode] = useState<'NORMAL' | 'UNLIMITED_QA'>('NORMAL');
  const [selectedPreset, setSelectedPreset] = useState<string>('PREMIUM');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const applyPreset = (preset: 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS' | 'DRAFT_REVIEWER') => {
    setSelectedPreset(preset);
    switch (preset) {
      case 'FREE':
        setBillingPlan('FREE');
        setContentVersion('PUBLISHED');
        setUsageMode('NORMAL');
        break;
      case 'PREMIUM':
        setBillingPlan('PREMIUM');
        setContentVersion('PUBLISHED');
        setUsageMode('NORMAL');
        break;
      case 'PREMIUM_PLUS':
        setBillingPlan('PREMIUM_PLUS');
        setContentVersion('PUBLISHED');
        setUsageMode('UNLIMITED_QA');
        break;
      case 'DRAFT_REVIEWER':
        setBillingPlan('PREMIUM_PLUS');
        setContentVersion('DRAFT');
        setUsageMode('UNLIMITED_QA');
        break;
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      billingPlan,
      contentVersion,
      usageMode,
      courseAccess: initialCourseId ? [initialCourseId] : ['*'],
      featureFlags: {},
    };

    const res = await startPreview(payload);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.message || 'Failed to start preview session');
    }
  };

  return (
    <div
      id="preview-config-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        id="preview-config-modal"
        data-testid="preview-config-modal"
        style={{
          background: 'var(--panel-bg)',
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '24px',
          width: '520px',
          maxWidth: '90vw',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          fontFamily: 'Inter, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Configure Preview Persona</h2>
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

        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Simulate the student experience with specific entitlements, billing tiers, and draft visibility without real login credentials or billing transactions.
        </p>

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

        {/* Quick Presets */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
            QUICK PRESETS
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {[
              { key: 'FREE', label: 'Free Student', desc: 'Free plan, published only' },
              { key: 'PREMIUM', label: 'Premium Student', desc: 'Standard full access' },
              { key: 'PREMIUM_PLUS', label: 'Premium+ QA', desc: 'Unlimited plan limits' },
              { key: 'DRAFT_REVIEWER', label: 'Draft Reviewer', desc: 'Preview unpublished drafts' },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                id={`preset-${p.key.toLowerCase()}`}
                data-testid={`preset-${p.key.toLowerCase()}`}
                onClick={() => applyPreset(p.key as any)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: selectedPreset === p.key ? '1px solid #06b6d4' : '1px solid var(--border-color)',
                  background: selectedPreset === p.key ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-color)',
                  color: selectedPreset === p.key ? '#06b6d4' : 'var(--text-main)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600 }}>{p.label}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleLaunch}>
          {/* Billing Plan */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>
                Simulated Billing Tier
              </label>
              <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 500 }}>
                (Active — Enforces plan tier limits and feature gates in preview)
              </span>
            </div>
            <select
              id="preview-billing-plan-select"
              data-testid="preview-billing-plan-select"
              value={billingPlan}
              onChange={(e) => {
                setBillingPlan(e.target.value as any);
                setSelectedPreset('CUSTOM');
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-color)',
                color: 'var(--text-main)',
                fontSize: '13px',
              }}
            >
              <option value="FREE">FREE — Limited questions & assessments</option>
              <option value="PREMIUM">PREMIUM — Full subject access & full analytics</option>
              <option value="PREMIUM_PLUS">PREMIUM+ — Unlimited practice & personalized weak topic tracking</option>
            </select>
          </div>

          {/* Content Version */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>
                Content Visibility Version
              </label>
              <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
                ● Active Filter Enforced
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { val: 'PUBLISHED', label: 'Published Content Only' },
                { val: 'DRAFT', label: 'Include Draft Content' },
                { val: 'REVIEW', label: 'Under Review Content' },
              ].map((c) => (
                <label key={c.val} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="contentVersion"
                    value={c.val}
                    checked={contentVersion === c.val}
                    onChange={() => {
                      setContentVersion(c.val as any);
                      setSelectedPreset('CUSTOM');
                    }}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          {/* Usage Mode */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>
                QA Limit Enforcement Mode
              </label>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                (Reserved for future rate-limit system — not currently enforced)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="usageMode"
                  value="NORMAL"
                  checked={usageMode === 'NORMAL'}
                  onChange={() => {
                    setUsageMode('NORMAL');
                    setSelectedPreset('CUSTOM');
                  }}
                />
                Normal (Plan limits enforced)
              </label>
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="usageMode"
                  value="UNLIMITED_QA"
                  checked={usageMode === 'UNLIMITED_QA'}
                  onChange={() => {
                    setUsageMode('UNLIMITED_QA');
                    setSelectedPreset('CUSTOM');
                  }}
                />
                Unlimited QA (Bypass attempt limits)
              </label>
            </div>
          </div>

          {/* Actions */}
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
              id="start-preview-btn"
              data-testid="start-preview-btn"
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isSubmitting ? 'Starting...' : '⚡ Launch Preview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
