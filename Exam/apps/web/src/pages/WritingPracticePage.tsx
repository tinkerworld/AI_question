import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import { getAuthHeaders } from '../utils/api';
import { ExamWritingEditor } from '../components/writing/ExamWritingEditor';
import { WritingScorecard } from '../components/writing/WritingScorecard';

export const WritingPracticePage: React.FC = () => {
  const { token } = useAuth();

  const [activeView, setActiveView] = useState<'CATALOG' | 'ATTEMPT' | 'RESULTS' | 'HISTORY'>('CATALOG');
  const [selectedMode, setSelectedMode] = useState<'PRACTICE' | 'EXAM'>('PRACTICE');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('');

  const [eligibility, setEligibility] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Session & Question
  const [activeSession, setActiveSession] = useState<any>(null);
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [essayText, setEssayText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Result / Evaluation
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  // Past Sessions
  const [pastSessions, setPastSessions] = useState<any[]>([]);

  useEffect(() => {
    fetchEligibility();
    fetchPastSessions();
  }, [token]);

  const fetchEligibility = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/writing/eligibility`, {
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (data.success) {
        setEligibility(data.data);
      } else {
        setError(data.message || 'Failed to load writing eligibility');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching writing questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPastSessions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/writing/sessions`, {
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (data.success) {
        setPastSessions(data.data || []);
      }
    } catch {}
  };

  const handleStartAttempt = async (questionId: string) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/writing/sessions/start`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          questionId,
          mode: selectedMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveSession(data.data.session);
        setActiveQuestion(data.data.question);
        setEssayText('');
        setStartTime(Date.now());
        setActiveView('ATTEMPT');
      } else {
        setError(data.message || 'Failed to start writing practice');
      }
    } catch (err: any) {
      setError(err.message || 'Error starting attempt');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAttempt = async () => {
    if (!token || !activeSession) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);
      const res = await fetch(`${API_BASE}/writing/sessions/${activeSession.id}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          essayText,
          timeSpentSeconds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEvaluationResult(data.data);
        setActiveView('RESULTS');
        fetchPastSessions();
      } else {
        setError(data.message || 'Failed to submit essay');
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting attempt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredQuestions = (eligibility?.availableQuestions || []).filter((q: any) => {
    if (selectedCourseFilter && q.courseId !== selectedCourseFilter) return false;
    return true;
  });

  const minWords = Number(activeQuestion?.data?.minWords || activeQuestion?.data?.minWordCount || 150);
  const maxWords = Number(activeQuestion?.data?.maxWords || activeQuestion?.data?.maxWordCount || 400);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '24px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        background: 'var(--bg-color)',
        color: 'var(--text-main)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            ✍️ Standalone Writing Practice & AI Evaluation Studio
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Academic essay composition, real-time word counting compliance, and multi-criteria rubric evaluation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            id="btn-writing-catalog"
            onClick={() => setActiveView('CATALOG')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeView === 'CATALOG' ? '1px solid #10b981' : '1px solid var(--border-color)',
              background: activeView === 'CATALOG' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
              color: activeView === 'CATALOG' ? '#10b981' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            📋 Writing Catalog
          </button>
          <button
            id="btn-writing-history"
            onClick={() => {
              setActiveView('HISTORY');
              fetchPastSessions();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeView === 'HISTORY' ? '1px solid #3b82f6' : '1px solid var(--border-color)',
              background: activeView === 'HISTORY' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary)',
              color: activeView === 'HISTORY' ? '#3b82f6' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            📊 My Attempts ({pastSessions.length})
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            marginBottom: '16px',
            fontSize: '13px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* CATALOG VIEW */}
      {activeView === 'CATALOG' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Controls Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              background: 'var(--panel-bg)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Practice Mode:</span>
              <div
                style={{
                  display: 'flex',
                  background: 'var(--bg-secondary)',
                  padding: '3px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <button
                  id="btn-writing-mode-practice"
                  onClick={() => setSelectedMode('PRACTICE')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '4px',
                    border: 'none',
                    background: selectedMode === 'PRACTICE' ? '#10b981' : 'transparent',
                    color: selectedMode === 'PRACTICE' ? '#fff' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  🌱 Practice Mode
                </button>
                <button
                  id="btn-writing-mode-exam"
                  onClick={() => setSelectedMode('EXAM')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '4px',
                    border: 'none',
                    background: selectedMode === 'EXAM' ? '#6366f1' : 'transparent',
                    color: selectedMode === 'EXAM' ? '#fff' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Exam Mode
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label htmlFor="select-writing-course-filter" style={{ fontSize: '13px', fontWeight: 600 }}>Course Filter:</label>
              <select
                id="select-writing-course-filter"
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                }}
              >
                <option value="">All Eligible Courses ({eligibility?.eligibleCourses?.length || 0})</option>
                {(eligibility?.eligibleCourses || []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.questionCount} Questions)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredQuestions.map((q: any) => {
              const qMinWords = q.data?.minWords || q.data?.minWordCount || 150;
              const qMaxWords = q.data?.maxWords || q.data?.maxWordCount || 400;
              const qMinutes = q.data?.recommendedMinutes || 40;
              return (
                <div
                  key={q.id}
                  id={`writing-card-${q.id}`}
                  style={{
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background:
                            q.difficulty === 'EASY'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : q.difficulty === 'MEDIUM'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(168, 85, 247, 0.15)',
                          color:
                            q.difficulty === 'EASY'
                              ? '#10b981'
                              : q.difficulty === 'MEDIUM'
                              ? '#f59e0b'
                              : '#a855f7',
                        }}
                      >
                        {q.difficulty}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{q.marks} Marks</span>
                    </div>

                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px 0', lineHeight: 1.4 }}>
                      {q.content}
                    </h3>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                        }}
                      >
                        {q.courseName}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        📏 {qMinWords}–{qMaxWords} words
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        ⏱️ {qMinutes} min
                      </span>
                    </div>
                  </div>

                  <button
                    id={`btn-start-writing-${q.id}`}
                    onClick={() => handleStartAttempt(q.id)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#10b981',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    ▶️ Start Writing Practice
                  </button>
                </div>
              );
            })}
          </div>

          {filteredQuestions.length === 0 && !loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'var(--panel-bg)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
              }}
            >
              No writing prompts available for your enrolled course(s).
            </div>
          )}
        </div>
      )}

      {/* ATTEMPT TAKING VIEW */}
      {activeView === 'ATTEMPT' && activeQuestion && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              background: 'var(--panel-bg)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#10b981', fontWeight: 700 }}>
                {activeQuestion.courseName} // {selectedMode} MODE
              </span>
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '4px 0 0 0' }}>
                {activeQuestion.content}
              </h2>
            </div>

            <button
              id="btn-cancel-writing-attempt"
              onClick={() => setActiveView('CATALOG')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ✕ Exit Attempt
            </button>
          </div>

          {/* Dual-Pane Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) minmax(450px, 1.4fr)', gap: '20px' }}>
            {/* Left: Prompt, Context & Rubrics */}
            <div
              style={{
                background: 'var(--panel-bg)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px 0' }}>Prompt Stimulus</h3>
                <div
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.6,
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {activeQuestion.data?.promptStem || activeQuestion.content}
                </div>
              </div>

              {activeQuestion.data?.context && (
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text-muted)' }}>
                    Background Context:
                  </h4>
                  <p style={{ fontSize: '13px', lineHeight: 1.5, margin: 0 }}>{activeQuestion.data.context}</p>
                </div>
              )}

              {/* Target Boundaries */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Target: </span>
                  <strong>{minWords} – {maxWords} words</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Time: </span>
                  <strong>{activeQuestion.data?.recommendedMinutes || 40} minutes</strong>
                </div>
              </div>

              {/* Rubric Criteria List */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 10px 0' }}>Evaluation Criteria:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(activeQuestion.data?.rubrics || []).map((r: any) => (
                    <div
                      key={r.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--panel-bg)',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#10b981' }}>{r.name}</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{r.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Composition Editor */}
            <div
              style={{
                background: 'var(--panel-bg)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Candidate Essay Composition</h3>

              <ExamWritingEditor
                value={essayText}
                onChange={setEssayText}
                minWords={minWords}
                maxWords={maxWords}
                placeholder="Begin composing your response here..."
              />

              <button
                id="btn-submit-writing-attempt"
                onClick={handleSubmitAttempt}
                disabled={isSubmitting || !essayText.trim()}
                style={{
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: isSubmitting || !essayText.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || !essayText.trim() ? 0.6 : 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isSubmitting ? 'Evaluating Essay...' : '✓ Submit Essay for AI Evaluation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS SCORECARD VIEW */}
      {activeView === 'RESULTS' && evaluationResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              background: 'var(--panel-bg)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>PRACTICE COMPLETE</span>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0 0' }}>
                Essay Assessment & Scorecard
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                {activeQuestion?.content}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button
                id="btn-back-to-writing-catalog"
                onClick={() => setActiveView('CATALOG')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                📋 Back to Catalog
              </button>
            </div>
          </div>

          {/* Reusable Writing Scorecard */}
          <WritingScorecard result={evaluationResult.evaluation} />

          {/* Submitted Essay Review */}
          <div
            style={{
              background: 'var(--panel-bg)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Submitted Essay Text</h3>
            <div
              style={{
                fontSize: '13px',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                padding: '16px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                fontFamily: 'Georgia, serif',
              }}
            >
              {evaluationResult.essayText}
            </div>
          </div>
        </div>
      )}

      {/* HISTORY VIEW */}
      {activeView === 'HISTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>
            My Standalone Writing Attempts
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pastSessions.map((s: any) => (
              <div
                key={s.id}
                style={{
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                    {s.courseName} // {s.mode}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, margin: '2px 0' }}>
                    {s.questionContent}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Attempted on {new Date(s.startedAt).toLocaleString()} • Word Count: {s.wordCount || 0} • Duration: {s.timeSpentSeconds || 0}s
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>
                    Score: {s.score} / {s.maxScore}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      fontWeight: 600,
                    }}
                  >
                    {s.status}
                  </span>
                </div>
              </div>
            ))}

            {pastSessions.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px',
                  background: 'var(--panel-bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                }}
              >
                No past writing attempts recorded yet. Start practicing from the catalog!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
