import React, { useState, useEffect } from 'react';
import { getAuthHeaders } from '../../utils/api';

const API_BASE = 'http://localhost:4000/api/v1';

interface AIUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIUsageModal: React.FC<AIUsageModalProps> = ({ isOpen, onClose }) => {
  const [credits, setCredits] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsage();
    }
  }, [isOpen]);

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/ai/usage`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load usage data');
      setCredits(data.data.credits);
      setHistory(data.data.history || []);
    } catch (err: any) {
      setError(err.message || 'Error loading usage');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const capRatio = credits?.monthlyTokenCap
    ? Math.min(100, Math.round((credits.tokensUsedThisMonth / credits.monthlyTokenCap) * 100))
    : 0;

  return (
    <div
      id="ai-usage-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="ai-usage-modal"
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          maxWidth: '640px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          color: 'var(--text-main)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚡</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontFamily: 'JetBrains Mono' }}>
              AI Credits & Usage Dashboard
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {loading && !credits ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              Loading AI usage and credits...
            </div>
          ) : (
            <>
              {/* Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div
                  id="credits-daily-included"
                  style={{
                    padding: '14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
                    Daily Allowance
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {credits?.remainingDailyCredits ?? 0}
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                      {' '}
                      / {credits?.includedDailyCredits ?? 20}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Resets at 00:00 UTC
                  </div>
                </div>

                <div
                  id="credits-purchased"
                  style={{
                    padding: '14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
                    Purchased Credits
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>
                    {credits?.purchasedCredits ?? 0}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Non-expiring balance
                  </div>
                </div>

                <div
                  id="credits-total-available"
                  style={{
                    padding: '14px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid #6366f1',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
                    Total Available
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#818cf8' }}>
                    {credits?.totalAvailableCredits ?? 0}
                  </div>
                  <div style={{ fontSize: '10px', color: '#a5b4fc', marginTop: '4px' }}>
                    Ready for generation
                  </div>
                </div>
              </div>

              {/* Monthly Token Quota Bar */}
              <div
                id="tokens-used-month"
                style={{
                  padding: '14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Monthly Token Quota Consumption</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 'bold' }}>
                    {credits?.tokensUsedThisMonth?.toLocaleString() ?? 0} / {credits?.monthlyTokenCap?.toLocaleString() ?? 500000} tokens ({capRatio}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${capRatio}%`,
                      height: '100%',
                      background: capRatio > 85 ? '#ef4444' : capRatio > 60 ? '#f59e0b' : '#10b981',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Audit History Log */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Recent AI Action Audit Log
                </div>
                {history.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    No AI usage recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                    {history.map((h: any) => (
                      <div
                        key={h.id}
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{h.action}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({h.provider})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
                          <span style={{ color: '#818cf8' }}>{h.tokensUsed} tokens</span>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(h.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
