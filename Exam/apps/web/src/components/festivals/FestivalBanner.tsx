import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useExamLock } from '../../context/ExamLockContext';
import { X, Sparkles, RotateCcw } from 'lucide-react';

export const FestivalBanner: React.FC = () => {
  const {
    festivalTheme,
    setSiteWideFestivalTheme,
    suggestedFestival,
    dismissedFestival,
    dismissFestivalSuggestion,
    activeFestivalConfig,
    highContrast,
  } = useTheme();

  const { user } = useAuth();
  const { isExamLocked } = useExamLock();
  const [activeBannerCollapsed, setActiveBannerCollapsed] = useState(false);

  // STRICT EXCLUSION: Never render festival banner during live exams or assessments
  if (isExamLocked) return null;

  const isAdmin =
    user?.roles?.includes('MAIN_ADMIN') ||
    user?.roles?.includes('SUB_ADMIN') ||
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('system.maintenance');

  // Case 1: An active festival theme is currently selected
  if (activeFestivalConfig && !activeBannerCollapsed) {
    return (
      <div
        id="festival-active-strip"
        data-testid="festival-active-strip"
        style={{
          background: highContrast
            ? 'var(--panel-bg)'
            : 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          borderBottom: '1px solid var(--border-color)',
          padding: '6px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          fontFamily: 'Inter, system-ui, sans-serif',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>{activeFestivalConfig.badge}</span>
          <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>
            {activeFestivalConfig.name} Theme Active
          </span>
          <span style={{ color: 'var(--text-muted)' }}>— {activeFestivalConfig.title}</span>
          {highContrast && (
            <span
              style={{
                marginLeft: '8px',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: '#ffffff',
                color: '#000000',
                fontWeight: 'bold',
              }}
            >
              HIGH CONTRAST OVERRIDE ACTIVE
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAdmin && (
            <button
              id="btn-reset-festival"
              data-testid="btn-reset-festival"
              onClick={() => setSiteWideFestivalTheme(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
              title="Revert to standard base accent palette"
            >
              <RotateCcw style={{ width: '12px', height: '12px' }} />
              <span>Reset to Standard</span>
            </button>
          )}
          <button
            onClick={() => setActiveBannerCollapsed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
            }}
            title="Collapse notification"
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>
    );
  }

  // Case 2: Today's date falls within a festival window, and admin has not dismissed or applied it
  if (
    isAdmin &&
    suggestedFestival &&
    festivalTheme !== suggestedFestival.key &&
    dismissedFestival !== suggestedFestival.key
  ) {
    return (
      <div
        id="festival-suggestion-banner"
        data-testid="festival-suggestion-banner"
        style={{
          background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.12), rgba(249, 115, 22, 0.08))',
          borderBottom: '1px solid rgba(234, 179, 8, 0.3)',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          fontFamily: 'Inter, system-ui, sans-serif',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>{suggestedFestival.badge}</span>
          <div>
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>
              {suggestedFestival.name} Season Detected:
            </span>{' '}
            <span style={{ color: 'var(--text-main)' }}>
              Celebrate with our authentic {suggestedFestival.name} ({suggestedFestival.title}) palette.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="btn-apply-suggested-festival"
            data-testid="btn-apply-suggested-festival"
            onClick={() => setSiteWideFestivalTheme(suggestedFestival.key)}
            style={{
              background: '#f59e0b',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
            }}
          >
            <Sparkles style={{ width: '13px', height: '13px' }} />
            <span>Apply {suggestedFestival.name} Theme Site-Wide</span>
          </button>

          <button
            id="btn-dismiss-suggested-festival"
            data-testid="btn-dismiss-suggested-festival"
            onClick={() => dismissFestivalSuggestion(suggestedFestival.key)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return null;
};
