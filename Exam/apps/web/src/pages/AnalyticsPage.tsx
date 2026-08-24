import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StudentAnalyticsPage } from './StudentAnalyticsPage';
import { TeacherAnalyticsPage } from './TeacherAnalyticsPage';

export const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const roles = user?.roles || [];

  const isFacultyOrAdmin =
    permissions.includes('analytics.read') ||
    permissions.includes('*') ||
    roles.includes('TEACHER') ||
    roles.includes('SUB_ADMIN') ||
    roles.includes('MAIN_ADMIN');

  const [viewMode, setViewMode] = useState<'class' | 'student'>(isFacultyOrAdmin ? 'class' : 'student');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {isFacultyOrAdmin && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            background: 'var(--panel-bg)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setViewMode('class')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: viewMode === 'class' ? '#06b6d4' : 'transparent',
                color: viewMode === 'class' ? '#fff' : 'var(--text-main)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Class & Cohort Analytics
            </button>
            <button
              onClick={() => setViewMode('student')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: viewMode === 'student' ? '#06b6d4' : 'transparent',
                color: viewMode === 'student' ? '#fff' : 'var(--text-main)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              My Personal Mastery
            </button>
          </div>

          <span
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#06b6d4',
              fontWeight: 600,
            }}
          >
            Faculty / Admin View Gated
          </span>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {viewMode === 'class' && isFacultyOrAdmin ? (
          <TeacherAnalyticsPage />
        ) : (
          <StudentAnalyticsPage />
        )}
      </div>
    </div>
  );
};
