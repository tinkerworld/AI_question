import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';
import { getAuthHeaders } from '../../utils/api';

export const FeatureMatrixEditor: React.FC = () => {
  const [matrix, setMatrix] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New feature modal / form state
  const [showNewFeatModal, setShowNewFeatModal] = useState<boolean>(false);
  const [newKey, setNewKey] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newType, setNewType] = useState<'BOOLEAN' | 'NUMBER'>('BOOLEAN');
  const [newDefault, setNewDefault] = useState<string>('false');
  const [newDesc, setNewDesc] = useState<string>('');

  // Promotional window form state
  const [showPromoModal, setShowPromoModal] = useState<boolean>(false);
  const [promoKey, setPromoKey] = useState<string>('');
  const [promoExpiresAt, setPromoExpiresAt] = useState<string>('');
  const [promoDesc, setPromoDesc] = useState<string>('');

  const fetchMatrix = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/entitlements/matrix`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load matrix');
      setMatrix(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const handleUpdateRule = async (planCode: string, featureKey: string, val: any) => {
    try {
      const res = await fetch(`${API_BASE}/entitlements/rules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ planCode, featureKey, value: String(val) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setSuccessMsg(`Updated ${featureKey} on ${planCode}`);
      fetchMatrix();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/entitlements/features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          key: newKey,
          name: newName,
          type: newType,
          defaultValue: newDefault,
          description: newDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Feature registration failed');
      setShowNewFeatModal(false);
      setNewKey('');
      setNewName('');
      setNewDesc('');
      fetchMatrix();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/entitlements/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          featureKey: promoKey,
          expiresAt: promoExpiresAt,
          description: promoDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Promotion creation failed');
      setShowPromoModal(false);
      setPromoKey('');
      setPromoExpiresAt('');
      setPromoDesc('');
      fetchMatrix();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div style={{ padding: '24px', color: 'var(--text-muted)' }}>Loading Entitlement Matrix...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontFamily: 'JetBrains Mono' }}>Dynamic Plan Entitlement Matrix</h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Real-time feature gating, quotas, and date-based promotional windows.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowPromoModal(true)}
            style={{
              background: 'rgba(217, 119, 6, 0.15)',
              border: '1px solid #d97706',
              color: '#d97706',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Launch Promo Window
          </button>
          <button
            onClick={() => setShowNewFeatModal(true)}
            style={{
              background: 'var(--accent-color)',
              border: 'none',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Register Feature
          </button>
        </div>
      </div>

      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>{error}</div>}
      {successMsg && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>{successMsg}</div>}

      {/* Feature Matrix Table */}
      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: 'var(--panel-bg)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px' }}>Feature / Capability</th>
              <th style={{ padding: '12px 16px', width: '100px' }}>Type</th>
              <th style={{ padding: '12px 16px', width: '150px' }}>FREE Tier</th>
              <th style={{ padding: '12px 16px', width: '150px' }}>PREMIUM Tier</th>
              <th style={{ padding: '12px 16px', width: '150px' }}>PREMIUM_PLUS Tier</th>
            </tr>
          </thead>
          <tbody>
            {matrix?.features?.map((feat: any) => {
              const freeVal = matrix?.plans?.FREE?.[feat.key];
              const premVal = matrix?.plans?.PREMIUM?.[feat.key];
              const plusVal = matrix?.plans?.PREMIUM_PLUS?.[feat.key];

              return (
                <tr key={feat.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{feat.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{feat.key}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)' }}>
                      {feat.type}
                    </span>
                  </td>

                  {/* Free Tier Cell */}
                  <td style={{ padding: '12px 16px' }}>
                    {feat.type === 'BOOLEAN' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(freeVal)}
                        onChange={(e) => handleUpdateRule('FREE', feat.key, e.target.checked)}
                      />
                    ) : (
                      <input
                        type="number"
                        defaultValue={freeVal}
                        onBlur={(e) => handleUpdateRule('FREE', feat.key, e.target.value)}
                        style={{ width: '80px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
                      />
                    )}
                  </td>

                  {/* Premium Tier Cell */}
                  <td style={{ padding: '12px 16px' }}>
                    {feat.type === 'BOOLEAN' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(premVal)}
                        onChange={(e) => handleUpdateRule('PREMIUM', feat.key, e.target.checked)}
                      />
                    ) : (
                      <input
                        type="number"
                        defaultValue={premVal}
                        onBlur={(e) => handleUpdateRule('PREMIUM', feat.key, e.target.value)}
                        style={{ width: '80px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
                      />
                    )}
                  </td>

                  {/* Premium Plus Tier Cell */}
                  <td style={{ padding: '12px 16px' }}>
                    {feat.type === 'BOOLEAN' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(plusVal)}
                        onChange={(e) => handleUpdateRule('PREMIUM_PLUS', feat.key, e.target.checked)}
                      />
                    ) : (
                      <input
                        type="number"
                        defaultValue={plusVal}
                        onBlur={(e) => handleUpdateRule('PREMIUM_PLUS', feat.key, e.target.value)}
                        style={{ width: '80px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Promotional Windows List */}
      <div style={{ marginTop: '10px' }}>
        <h3 style={{ fontSize: '15px', fontFamily: 'JetBrains Mono', marginBottom: '10px' }}>Active & Historical Promotional Campaigns</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {matrix?.promotions?.map((p: any) => (
            <div key={p.id} style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{p.featureKey}</span>
                <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: p.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)', color: p.isActive ? '#10b981' : 'var(--text-muted)' }}>
                  {p.isActive ? 'ACTIVE' : 'EXPIRED'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{p.description}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Expires: {new Date(p.expiresAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
