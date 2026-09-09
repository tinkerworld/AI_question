import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/I18nContext';
import { API_BASE } from '../config/api';
import { getAuthHeaders } from '../utils/api';
import { ExamAudioPlayer } from '../components/listening/ExamAudioPlayer';

export const ListeningPracticePage: React.FC = () => {
  const { token } = useAuth();
  const { t } = useTranslation();

  const [activeView, setActiveView] = useState<'CATALOG' | 'ATTEMPT' | 'RESULTS' | 'HISTORY'>('CATALOG');
  const [selectedMode, setSelectedMode] = useState<'PRACTICE' | 'EXAM'>('PRACTICE');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('');

  const [eligibility, setEligibility] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Session & Question
  const [activeSession, setActiveSession] = useState<any>(null);
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
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
      const res = await fetch(`${API_BASE}/listening/eligibility`, {
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (data.success) {
        setEligibility(data.data);
      } else {
        setError(data.message || 'Failed to load listening eligibility');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching listening questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPastSessions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/listening/sessions`, {
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
      const res = await fetch(`${API_BASE}/listening/sessions/start`, {
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
        setUserAnswers({});
        setStartTime(Date.now());
        setActiveView('ATTEMPT');
      } else {
        setError(data.message || 'Failed to start listening practice');
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
      const res = await fetch(`${API_BASE}/listening/sessions/${activeSession.id}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          userAnswers,
          timeSpentSeconds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEvaluationResult(data.data);
        setActiveView('RESULTS');
        fetchPastSessions();
      } else {
        setError(data.message || 'Failed to submit listening attempt');
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
            🎧 {t('listening_lab_title')}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            {t('listening_lab_subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            id="btn-listening-catalog"
            onClick={() => setActiveView('CATALOG')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeView === 'CATALOG' ? '1px solid #06b6d4' : '1px solid var(--border-color)',
              background: activeView === 'CATALOG' ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-secondary)',
              color: activeView === 'CATALOG' ? '#06b6d4' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            📋 {t('listening_catalog')}
          </button>
          <button
            id="btn-listening-history"
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
            📊 {t('my_attempts')} ({pastSessions.length})
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
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{t('practice_mode')}:</span>
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
                  id="btn-mode-practice"
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
                  🌱 {t('practice_mode')}
                </button>
                <button
                  id="btn-mode-exam"
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
                  ⚡ {t('exam_mode')}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label htmlFor="select-listening-course-filter" style={{ fontSize: '13px', fontWeight: 600 }}>{t('filter_by_course')}</label>
              <select
                id="select-listening-course-filter"
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
                <option value="">{t('all_courses_option')} ({eligibility?.eligibleCourses?.length || 0})</option>
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
              const subQCount = q.data?.subQuestions?.length || 0;
              return (
                <div
                  key={q.id}
                  id={`listening-card-${q.id}`}
                  style={{
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'border-color 0.2s, transform 0.15s',
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
                          background: 'rgba(6, 182, 212, 0.1)',
                          color: '#06b6d4',
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
                        📝 {subQCount} Sub-Questions
                      </span>
                    </div>
                  </div>

                  <button
                    id={`btn-start-listening-${q.id}`}
                    onClick={() => handleStartAttempt(q.id)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#06b6d4',
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
                    ▶️ {t('start_listening_practice')}
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
              {t('no_listening_drills')}
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
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#06b6d4', fontWeight: 700 }}>
                {activeQuestion.courseName} // {selectedMode} MODE
              </span>
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '4px 0 0 0' }}>
                {activeQuestion.content}
              </h2>
            </div>

            <button
              id="btn-cancel-attempt"
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
              ✕ {t('exit_attempt')}
            </button>
          </div>

          {/* Dual-Pane Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) minmax(400px, 1.3fr)', gap: '20px' }}>
            {/* Left: Audio Player */}
            <div
              style={{
                background: 'var(--panel-bg)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>🎧 {t('audio_passage')}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Listen carefully to the recorded conversation. In Exam mode, play limits are enforced.
              </p>

              <ExamAudioPlayer
                speechText={activeQuestion.data?.audioScript || (activeQuestion as any).speechText}
                audioUrl={activeQuestion.data?.audioUrl || (activeQuestion as any).audioUrl}
                maxPlays={selectedMode === 'EXAM' ? (activeQuestion.data?.playbackLimit || 2) : 99}
                allowTranscript={selectedMode === 'PRACTICE'}
              />

              <div
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>💡 Candidate Instructions:</div>
                • Answer all sub-questions based strictly on information stated or implied in the audio.<br />
                • For form completion items, ensure precise spelling.<br />
                • You may adjust speed between 0.75x and 1.25x using the player toggles.
              </div>
            </div>

            {/* Right: Sub-Questions Form */}
            <div
              style={{
                background: 'var(--panel-bg)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{t('comprehension_questions')}</h3>

              {(activeQuestion.data?.subQuestions || []).map((sq: any, idx: number) => {
                const currentAns = userAnswers[sq.id];
                return (
                  <div
                    key={sq.id}
                    id={`sq-container-${sq.id}`}
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#06b6d4' }}>
                        Question {idx + 1}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sq.marks} Marks</span>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>{sq.prompt}</div>

                    {sq.type === 'MCQ' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        {(sq.options || []).map((opt: any) => {
                          const isSelected = currentAns === opt.id;
                          return (
                            <button
                              key={opt.id}
                              id={`opt-${sq.id}-${opt.id}`}
                              onClick={() => setUserAnswers((prev) => ({ ...prev, [sq.id]: opt.id }))}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 14px',
                                borderRadius: '6px',
                                border: isSelected ? '2px solid #06b6d4' : '1px solid var(--border-color)',
                                background: isSelected ? 'rgba(6, 182, 212, 0.1)' : 'var(--panel-bg)',
                                color: 'var(--text-main)',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '13px',
                              }}
                            >
                              <div
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  border: isSelected ? '5px solid #06b6d4' : '2px solid var(--border-color)',
                                  boxSizing: 'border-box',
                                }}
                              />
                              {opt.text}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {sq.type === 'FILL_IN_BLANK' && (
                      <div style={{ marginTop: '4px' }}>
                        <input
                          id={`input-blank-${sq.id}`}
                          type="text"
                          value={currentAns || ''}
                          onChange={(e) => setUserAnswers((prev) => ({ ...prev, [sq.id]: e.target.value }))}
                          placeholder="Type your answer here..."
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--panel-bg)',
                            color: 'var(--text-main)',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                id="btn-submit-listening-attempt"
                onClick={handleSubmitAttempt}
                disabled={isSubmitting}
                style={{
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isSubmitting ? t('submitting_evaluating') : `✓ ${t('submit_listening_drill')}`}
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
                {t('scorecard')}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                {activeQuestion?.content}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {t('total_score')}
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981' }}>
                  {evaluationResult.score} / {evaluationResult.maxScore}
                </div>
              </div>

              <button
                id="btn-back-to-listening-catalog"
                onClick={() => setActiveView('CATALOG')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#06b6d4',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                📋 {t('back_to_catalog')}
              </button>
            </div>
          </div>

          {/* Review Audio Player */}
          <div
            style={{
              background: 'var(--panel-bg)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              🔄 Replay Audio Passage for Review
            </h3>
            <ExamAudioPlayer
              speechText={activeQuestion?.data?.audioScript || (activeQuestion as any)?.speechText}
              audioUrl={activeQuestion?.data?.audioUrl || (activeQuestion as any)?.audioUrl}
              maxPlays={99}
              allowTranscript={true}
            />
          </div>

          {/* Sub-Question Detailed Breakdown */}
          <div
            style={{
              background: 'var(--panel-bg)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{t('solution_review')}</h3>

            {(activeQuestion?.data?.subQuestions || []).map((sq: any, idx: number) => {
              const studentAnswer = userAnswers[sq.id];
              let isCorrect = false;
              let correctAnswer = '';

              if (sq.type === 'MCQ') {
                isCorrect = String(studentAnswer) === sq.correctOptionId;
                const correctOpt = sq.options?.find((o: any) => o.id === sq.correctOptionId);
                correctAnswer = correctOpt ? correctOpt.text : sq.correctOptionId;
              } else if (sq.type === 'FILL_IN_BLANK') {
                isCorrect =
                  String(studentAnswer || '').trim().toLowerCase() === String(sq.blankKey || '').trim().toLowerCase();
                correctAnswer = sq.blankKey;
              }

              return (
                <div
                  key={sq.id}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                    background: isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: isCorrect ? '#10b981' : '#ef4444',
                          color: '#fff',
                        }}
                      >
                        {isCorrect ? `✓ ${t('correct')}` : `✗ ${t('wrong')}`}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Question {idx + 1}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>
                      {isCorrect ? `+${sq.marks}` : '0'} / {sq.marks} Marks
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', margin: '10px 0 6px 0' }}>{sq.prompt}</div>

                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>{t('your_choice_label')}: </span>
                      <span style={{ fontWeight: 600, color: isCorrect ? '#10b981' : '#ef4444' }}>
                        {sq.type === 'MCQ'
                          ? sq.options?.find((o: any) => o.id === studentAnswer)?.text || studentAnswer || 'No response'
                          : studentAnswer || 'No response'}
                      </span>
                    </div>
                    {!isCorrect && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>{t('correct_choice_label')}: </span>
                        <span style={{ fontWeight: 600, color: '#10b981' }}>{correctAnswer}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HISTORY VIEW */}
      {activeView === 'HISTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>
            {t('practice_history')}
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
                  <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 700 }}>
                    {s.courseName} // {s.mode}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, margin: '2px 0' }}>
                    {s.questionContent}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Attempted on {new Date(s.startedAt).toLocaleString()} • Duration: {s.timeSpentSeconds || 0}s
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>
                    {s.score} / {s.maxScore}
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
                {t('no_listening_drills')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
