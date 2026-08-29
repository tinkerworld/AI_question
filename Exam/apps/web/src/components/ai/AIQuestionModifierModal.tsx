import React, { useState } from 'react';
import { getAuthHeaders } from '../../utils/api';

const API_BASE = 'http://localhost:4043/api/v1';

interface AIQuestionModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: any | null;
  onSuccess: (message: string) => void;
}

export const AIQuestionModifierModal: React.FC<AIQuestionModifierModalProps> = ({
  isOpen,
  onClose,
  question,
  onSuccess,
}) => {
  const [varianceLevel, setVarianceLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [instructions, setInstructions] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !question) return null;

  const handleModify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/ai/questions/modify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          questionId: question.id,
          varianceLevel,
          instructions: instructions || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create question variation');
      }

      onSuccess(`Created AI Variation (${data.data.id}) in DRAFT status linked to parent question.`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Modification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="ai-modifier-modal-overlay"
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
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        id="ai-modifier-modal"
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          maxWidth: '520px',
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
            <span style={{ fontSize: '18px' }}>✨</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontFamily: 'JetBrains Mono' }}>
              Generate AI Question Variation
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
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

        {/* Form Body */}
        <form onSubmit={handleModify} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {/* Reference Question Box */}
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>Parent Reference Item</span>
              <span style={{ fontFamily: 'JetBrains Mono', color: '#818cf8', fontWeight: 'bold' }}>{question.id}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-main)', fontStyle: 'italic', lineHeight: '1.4' }}>
              "{question.content}"
            </div>
          </div>

          {/* Variance Level Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>
              Variance Level
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map((lvl) => {
                const isSelected = varianceLevel === lvl;
                return (
                  <button
                    type="button"
                    key={lvl}
                    id={`variance-option-${lvl.toLowerCase()}`}
                    onClick={() => setVarianceLevel(lvl)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: isSelected ? '1px solid #6366f1' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                      color: isSelected ? '#a5b4fc' : 'var(--text-main)',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {lvl === 'LOW' && 'Low (Numbers only)'}
                    {lvl === 'MEDIUM' && 'Medium (Context)'}
                    {lvl === 'HIGH' && 'High (Scenario)'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Instructions */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
              Variation Instructions (Optional)
            </label>
            <textarea
              id="ai-mod-instructions-input"
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Change object to electric vehicle, scale speed by 3x, preserve underlying formula..."
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '13px',
                resize: 'none',
              }}
            />
          </div>

          <div style={{ padding: '10px 12px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#fbbf24', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>💡</span>
            <span>
              All generated variations inherit syllabus & topic linkage automatically and are saved in <strong>DRAFT</strong> status for quality review.
            </span>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-ai-modifier-btn"
              disabled={loading}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{loading ? '⏳' : '✨'}</span>
              <span>{loading ? 'Generating Variation...' : 'Create AI Variation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
