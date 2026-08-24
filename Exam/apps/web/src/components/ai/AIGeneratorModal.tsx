import React, { useState } from 'react';
import { getAuthHeaders } from '../../utils/api';

const API_BASE = 'http://localhost:4000/api/v1';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: any[];
  syllabusNodes: any[];
  onSuccess: (message: string) => void;
}

export const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({
  isOpen,
  onClose,
  subjects,
  syllabusNodes,
  onSuccess,
}) => {
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id || '');
  const [topicId, setTopicId] = useState<string>('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [type, setType] = useState<string>('SINGLE_CHOICE');
  const [marks, setMarks] = useState<number>(4);
  const [count, setCount] = useState<number>(1);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredTopics = syllabusNodes.filter(
    (n) => !subjectId || n.subjectId === subjectId
  );

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      setError('Please select a subject');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(10);
    setStatusMessage(count > 1 ? `Queuing batch generation for ${count} questions...` : 'Generating question via AI Gateway...');

    try {
      const res = await fetch(`${API_BASE}/ai/questions/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          subjectId,
          topicId: topicId || undefined,
          difficulty,
          type,
          marks,
          count,
          customPrompt: customPrompt || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate questions');
      }

      if (count > 1 && data.data?.jobId) {
        // Poll batch job progress
        const jobId = data.data.jobId;
        setProgress(30);
        setStatusMessage('AI Worker processing batch items...');

        let isCompleted = false;
        let attempts = 0;
        while (!isCompleted && attempts < 20) {
          await new Promise((r) => setTimeout(r, 600));
          attempts++;

          const pollRes = await fetch(`${API_BASE}/ai/questions/generation-jobs/${jobId}`, {
            headers: getAuthHeaders(),
          });
          const pollData = await pollRes.json();
          if (pollRes.ok && pollData.data) {
            setProgress(Math.max(30, pollData.data.progress || 0));
            if (pollData.data.status === 'COMPLETED') {
              isCompleted = true;
              setProgress(100);
              break;
            } else if (pollData.data.status === 'FAILED') {
              throw new Error(pollData.data.errorMessage || 'Batch generation job failed');
            }
          }
        }
      } else {
        setProgress(100);
      }

      onSuccess(`Successfully generated ${count} AI question(s) in DRAFT status. Ready for review!`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="ai-generator-modal-overlay"
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
        id="ai-generator-modal"
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          maxWidth: '560px',
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
              AI Question Blueprint Generator
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
        <form onSubmit={handleGenerate} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                Subject *
              </label>
              <select
                id="ai-gen-subject-select"
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setTopicId('');
                }}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              >
                <option value="">-- Select Subject --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                Syllabus Topic
              </label>
              <select
                id="ai-gen-topic-select"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              >
                <option value="">-- All Topics (General) --</option>
                {filteredTopics.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title || n.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                Difficulty
              </label>
              <select
                id="ai-gen-difficulty-select"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                Question Type
              </label>
              <select
                id="ai-gen-type-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              >
                <option value="SINGLE_CHOICE">Single Choice (MCQ)</option>
                <option value="MULTIPLE_CHOICE">Multi-Select</option>
                <option value="NUMERICAL">Numerical</option>
                <option value="SUBJECTIVE">Subjective</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                Quantity (Count)
              </label>
              <input
                type="number"
                id="ai-gen-count-input"
                min={1}
                max={5}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1)))}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
              Custom Prompt Instructions (Optional)
            </label>
            <textarea
              id="ai-gen-prompt-input"
              rows={3}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Focus on rotational inertia, include 4 distractors with common calculation pitfalls..."
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

          {/* Progress Bar for Batch Operations */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>{statusMessage}</span>
                <span>{progress}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: '#6366f1', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

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
              id="submit-ai-generator-btn"
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
              <span>{loading ? 'Generating Items...' : 'Generate Question'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
