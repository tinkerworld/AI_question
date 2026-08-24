import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface QuestionReviewItem {
  id: string;
  questionId: string;
  examSectionId: string;
  sectionName: string;
  sequenceOrder: number;
  type: string;
  content: string;
  difficulty: string;
  marks: number;
  marksCorrect: number;
  marksWrong: number;
  options?: { id: string; text: string }[];
  studentAnswer: any;
  isMarkedForReview: boolean;
  timeSpentSeconds: number;
  isCorrect: boolean | null;
  marksAwarded: number;
  correctAnswer: any;
  explanation: string;
  evaluatorComments?: string;
}

interface SectionScore {
  sectionId: string;
  sectionName: string;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  maxScore: number;
}

interface AttemptResultData {
  attemptId: string;
  examId: string;
  examName: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  timeSpentSeconds: number;
  status: string;
  totalScore: number;
  maxMarks: number;
  percentage: number;
  accuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  isFlagged: boolean;
  flagReason: string | null;
  sectionScores: SectionScore[];
  questions: QuestionReviewItem[];
}

interface ExamResultPageProps {
  attemptId: string;
  onBack: () => void;
}

const API_BASE = 'http://localhost:4000/api/v1';

export const ExamResultPage: React.FC<ExamResultPageProps> = ({ attemptId, onBack }) => {
  const { token } = useAuth();
  const [result, setResult] = useState<AttemptResultData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Review Filter
  const [filter, setFilter] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'UNATTEMPTED'>('ALL');

  // Flag Modal State
  const [showFlagModal, setShowFlagModal] = useState<boolean>(false);
  const [flagReason, setFlagReason] = useState<string>('');
  const [flagging, setFlagging] = useState<boolean>(false);
  const [flagSuccessMessage, setFlagSuccessMessage] = useState<string | null>(null);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/attempts/${attemptId}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(data.message || 'Failed to retrieve examination results');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching scorecard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [attemptId, token]);

  const handleFlagResult = async () => {
    if (!flagReason.trim()) return;
    setFlagging(true);
    try {
      const res = await fetch(`${API_BASE}/attempts/${attemptId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: flagReason }),
      });
      const data = await res.json();
      if (data.success) {
        setShowFlagModal(false);
        setFlagSuccessMessage('Your response has been flagged and submitted to faculty for review.');
        fetchResults();
      } else {
        alert(data.message || 'Failed to flag result');
      }
    } catch (err: any) {
      alert(err.message || 'Network error submitting flag');
    } finally {
      setFlagging(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '3px solid rgba(6, 182, 212, 0.2)',
            borderTopColor: '#06b6d4',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 14px',
          }}
        />
        Computing Comprehensive Scorecard & Solutions...
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <h3 style={{ color: '#ef4444' }}>Result Not Available</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{error || 'Unable to load attempt results'}</p>
        <button
          onClick={onBack}
          style={{
            marginTop: '16px',
            padding: '8px 18px',
            background: 'var(--accent-color)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Return to Assessments
        </button>
      </div>
    );
  }

  const filteredQuestions = result.questions.filter((q) => {
    if (filter === 'CORRECT') return q.isCorrect === true;
    if (filter === 'WRONG') return q.isCorrect === false;
    if (filter === 'UNATTEMPTED') return q.studentAnswer === null || q.studentAnswer === undefined || q.studentAnswer === '';
    return true;
  });

  return (
    <div style={{ padding: '28px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div>
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-color)',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
              marginBottom: '8px',
            }}
          >
            ◀ Back to My Exams
          </button>
          <h1 style={{ margin: 0, fontSize: '22px', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
            {result.examName} — Scorecard & Solution Analysis
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Completed on {new Date(result.endTime).toLocaleString()} • Duration: {formatDuration(result.timeSpentSeconds)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {result.isFlagged ? (
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid #f59e0b',
                color: '#f59e0b',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🚩 Flagged for Review
            </span>
          ) : (
            <button
              onClick={() => setShowFlagModal(true)}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🚩 Flag / Dispute Result
            </button>
          )}
        </div>
      </div>

      {flagSuccessMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#10b981',
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          ✓ {flagSuccessMessage}
        </div>
      )}

      {/* Hero Scorecard Overview Card */}
      <div
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', textAlign: 'center' }}>
          <div style={{ borderRight: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '4px' }}>
              TOTAL SCORE
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-color)', fontFamily: 'JetBrains Mono' }}>
              {result.totalScore}
              <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}> / {result.maxMarks}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
              {result.percentage}% Marks
            </div>
          </div>

          <div style={{ borderRight: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '4px' }}>
              ACCURACY
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', fontFamily: 'JetBrains Mono' }}>
              {result.accuracy}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {result.correctAnswers} of {result.correctAnswers + result.wrongAnswers} attempted
            </div>
          </div>

          <div style={{ borderRight: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '4px' }}>
              CORRECT ANSWERS
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', fontFamily: 'JetBrains Mono' }}>
              {result.correctAnswers}
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
              +{result.correctAnswers * 4} Marks gained
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '4px' }}>
              INCORRECT / NEGATIVE
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444', fontFamily: 'JetBrains Mono' }}>
              {result.wrongAnswers}
            </div>
            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
              -{result.wrongAnswers * 1} Penalty marks
            </div>
          </div>
        </div>
      </div>

      {/* Section-Wise Breakdown Table */}
      <div
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '28px',
        }}
      >
        <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
          Section-Wise Performance
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.02)' }}>
              <th style={{ padding: '10px' }}>Section Name</th>
              <th style={{ padding: '10px' }}>Total Questions</th>
              <th style={{ padding: '10px' }}>Attempted</th>
              <th style={{ padding: '10px' }}>Correct</th>
              <th style={{ padding: '10px' }}>Wrong</th>
              <th style={{ padding: '10px' }}>Score Obtained</th>
            </tr>
          </thead>
          <tbody>
            {result.sectionScores.map((sec) => (
              <tr key={sec.sectionId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px', color: 'var(--text-main)', fontWeight: 'bold' }}>{sec.sectionName}</td>
                <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{sec.totalQuestions}</td>
                <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{sec.attemptedCount}</td>
                <td style={{ padding: '10px', color: '#10b981' }}>{sec.correctCount}</td>
                <td style={{ padding: '10px', color: '#ef4444' }}>{sec.wrongCount}</td>
                <td style={{ padding: '10px', color: 'var(--accent-color)', fontWeight: 'bold', fontFamily: 'JetBrains Mono' }}>
                  {sec.score} / {sec.maxScore}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Solutions & Explanations Review Section */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
            Question-by-Question Solution Review
          </h3>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['ALL', 'CORRECT', 'WRONG', 'UNATTEMPTED'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: filter === mode ? 'var(--accent-color)' : 'var(--panel-bg)',
                  border: filter === mode ? 'none' : '1px solid var(--border-color)',
                  color: filter === mode ? '#fff' : 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: filter === mode ? 'bold' : 'normal',
                }}
              >
                {mode === 'ALL' ? `All (${result.questions.length})` : mode === 'CORRECT' ? `Correct (${result.correctAnswers})` : mode === 'WRONG' ? `Wrong (${result.wrongAnswers})` : `Unattempted (${result.unattempted})`}
              </button>
            ))}
          </div>
        </div>

        {/* Questions Review List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredQuestions.map((q, idx) => {
            const isUnanswered = q.studentAnswer === null || q.studentAnswer === undefined || q.studentAnswer === '';

            return (
              <div
                key={q.id}
                style={{
                  background: 'var(--panel-bg)',
                  border: `1px solid ${q.isCorrect === true ? 'rgba(16, 185, 129, 0.3)' : q.isCorrect === false ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}`,
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                {/* Question Review Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
                      Question #{q.sequenceOrder}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                      {q.sectionName}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                      {q.type}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono',
                      fontWeight: 'bold',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: q.marksAwarded > 0 ? 'rgba(16, 185, 129, 0.15)' : q.marksAwarded < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: q.marksAwarded > 0 ? '#10b981' : q.marksAwarded < 0 ? '#ef4444' : 'var(--text-muted)',
                    }}
                  >
                    Marks Awarded: {q.marksAwarded > 0 ? `+${q.marksAwarded}` : q.marksAwarded}
                  </span>
                </div>

                {/* Statement */}
                <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-main)', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
                  {q.content}
                </div>

                {/* Options Review (for MCQ / Multi-select) */}
                {q.options && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    {q.options.map((opt) => {
                      const isStudentChoice =
                        q.studentAnswer === opt.id || (Array.isArray(q.studentAnswer) && q.studentAnswer.includes(opt.id));
                      const isCorrectChoice =
                        q.correctAnswer === opt.id || (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.id));

                      let border = '1px solid var(--border-color)';
                      let bg = 'transparent';
                      let icon = '';

                      if (isCorrectChoice) {
                        border = '1px solid #10b981';
                        bg = 'rgba(16, 185, 129, 0.1)';
                        icon = ' ✓ (Correct Answer)';
                      }
                      if (isStudentChoice && !isCorrectChoice) {
                        border = '1px solid #ef4444';
                        bg = 'rgba(239, 68, 68, 0.1)';
                        icon = ' ✗ (Your Choice)';
                      } else if (isStudentChoice && isCorrectChoice) {
                        icon = ' ✓ (Your Choice - Correct)';
                      }

                      return (
                        <div
                          key={opt.id}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border,
                            background: bg,
                            fontSize: '13px',
                            color: isCorrectChoice ? '#10b981' : isStudentChoice ? '#ef4444' : 'var(--text-muted)',
                          }}
                        >
                          <strong>{opt.text}</strong>
                          <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{icon}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Non-MCQ Answer Summary */}
                {!q.options && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', marginBottom: '14px', fontSize: '13px' }}>
                    <div>Your Response: <strong style={{ color: isUnanswered ? 'var(--text-muted)' : q.isCorrect ? '#10b981' : '#ef4444' }}>{isUnanswered ? 'Unattempted' : JSON.stringify(q.studentAnswer)}</strong></div>
                    <div style={{ marginTop: '4px' }}>Correct Key: <strong style={{ color: '#10b981' }}>{JSON.stringify(q.correctAnswer)}</strong></div>
                  </div>
                )}

                {/* Step-by-Step Explanation Box */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'rgba(6, 182, 212, 0.05)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    fontSize: '13px',
                    lineHeight: '1.5',
                  }}
                >
                  <strong style={{ color: '#06b6d4' }}>Explanation & Working:</strong>
                  <div style={{ color: 'var(--text-main)', marginTop: '4px' }}>
                    {q.explanation}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flag / Dispute Modal */}
      {showFlagModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', color: 'var(--text-main)', fontFamily: 'JetBrains Mono' }}>
              Flag Examination Result for Review
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5', margin: '0 0 16px' }}>
              If you found ambiguity in question phrasing or have a grading query, submit your explanation below for faculty evaluation.
            </p>

            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Describe the question number and rationale for review..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                fontSize: '13px',
                boxSizing: 'border-box',
                marginBottom: '20px',
                fontFamily: 'inherit',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                disabled={flagging}
                onClick={() => setShowFlagModal(false)}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                disabled={flagging || !flagReason.trim()}
                onClick={handleFlagResult}
                style={{
                  padding: '8px 18px',
                  background: '#f59e0b',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: flagging || !flagReason.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >
                {flagging ? 'Submitting Flag...' : 'Submit Flag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
