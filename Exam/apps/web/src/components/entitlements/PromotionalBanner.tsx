import React, { useEffect, useState } from 'react';
import { API_BASE } from '../../config/api';
import { getAuthHeaders } from '../../utils/api';
import { useTranslation } from '../../context/I18nContext';

export const PromotionalBanner: React.FC = () => {
  const { t } = useTranslation();
  const [promotions, setPromotions] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/entitlements/my-status`, {
      headers: getAuthHeaders(),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data?.activePromotions)) {
          setPromotions(res.data.activePromotions);
        }
      })
      .catch(() => {});
  }, []);

  if (promotions.length === 0) return null;

  const promo = promotions[0];
  const expireDate = promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : 'Limited Time';

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #d97706, #f59e0b)',
        color: '#000000',
        padding: '6px 16px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      <span>🎉</span>
      <span>
        <strong>{t('promotional_window')}:</strong> {promo.description || 'Full premium access is active!'} ({t('valid_until')} {expireDate})
      </span>
    </div>
  );
};
