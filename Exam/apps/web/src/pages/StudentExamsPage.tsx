import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ExamPlayerPage } from './ExamPlayerPage';
import { ExamResultPage } from './ExamResultPage';
import { API_BASE } from '../config/api';

interface ExamItem {
  id: string;
  name: string;
  courseId: string;
  durationMinutes: number;
  totalMarks: number;
  startTime: string | null;
  endTime: string | null;
  status: string;
  timeStatus: 'OPEN' | 'UPCOMING' | 'EXPIRED';
  isEnrolled: boolean;
  sectionCount: number;
  totalQuestions: number;
  attemptsCount: number;
  latestAttempt: {
    id: string;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'EVALUATED' | 'PENDING_REVIEW';
    startTime: string;
    endTime: string | null;
    totalScore: number | null;
    percentage: number | null;
  } | null;
}

interface ExamInstructions {
  id: string;
  name: string;
  instructions: string;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
  sections: {
    id: string;
    name: string;
    sequenceOrder: number;
    numQuestions: number;
    marksCorrect: number;
    marksWrong: number;
    totalMarks: number;
  }[];
}

export const StudentExamsPage: React.FC = () => {
  const { token, user, previewTargetExamId, setPreviewTargetExamId } = useAuth();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Navigation States
  const [selectedExamForInstructions, setSelectedExamForInstructions] = useState<ExamItem | null>(null);
  const [instructionsData, setInstructionsData] = useState<ExamInstructions | null>(null);
  const [instructionsLoading, setInstructionsLoading] = useState<boolean>(false);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);

  // Active Player or Active Result View
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [activeResultAttemptId, setActiveResultAttemptId] = useState<string | null>(null);

  const fetchExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/student/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setExams(data.data || []);
      } else {
        setError(data.message || 'Failed to load exams');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [token]);

  useEffect(() => {
    if (previewTargetExamId && token) {
      const autoExamId = previewTargetExamId;
      setPreviewTargetExamId(null);
      handleStartExam(autoExamId);
    }
  }, [previewTargetExamId, token]);

  const handleOpenInstructions = async (exam: ExamItem) => {
    setSelectedExamForInstructions(exam);
    setAgreedToTerms(false);
    setInstructionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/student/exams/${exam.id}/instructions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setInstructionsData(data.data);
      }
    } catch (err) {
      console.error('Error fetching instructions:', err);
    } finally {
      setInstructionsLoading(false);
    }
  };

  const handleStartExam = async (examId: string) => {
    try {
      const activeToken = token || localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/attempts/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ examId }),
      });
      const data = await res.json();
      const attemptId = data.data?.attemptId || data.data?.id || data.data?.attempt?.id;
      if (data.success && attemptId) {
        setSelectedExamForInstructions(null);
        setActiveAttemptId(attemptId);
      } else {
        alert(data.message || 'Unable to initialize exam session');
      }
    } catch (err: any) {
      alert(err.message || 'Error starting exam');
    }
  };

  // If in Player Mode
  if (activeAttemptId) {
    return (
      <ExamPlayerPage
        attemptId={activeAttemptId}
        onComplete={(attemptId) => {
          setActiveAttemptId(null);
          setActiveResultAttemptId(attemptId);
          fetchExams();
        }}
        onExit={() => {
          setActiveAttemptId(null);
          fetchExams();
        }}
      />
    );
  }

  // If in Results Mode
  if (activeResultAttemptId) {
    return (
      <ExamResultPage
        attemptId={activeResultAttemptId}
        onBack={() => {
          setActiveResultAttemptId(null);
          fetchExams();
        }}
      />
    );
  }

  return (
    <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
            My Assessments & Examination Hall
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Enrolled assessments, timed grand tests, and authentic examination simulations.
          </p>
        </div>
        <button
          onClick={fetchExams}
          style={{
            padding: '8px 16px',
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: 'var(--text-main)',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '3px solid rgba(6, 182, 212, 0.2)',
              borderTopColor: '#06b6d4',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          Loading available assessments...
        </div>
      ) : exams.length === 0 ? (
        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-main)', fontFamily: 'JetBrains Mono' }}>
            No Active Examinations Scheduled
          </h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
            You do not have any active or pending published exams at this moment.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {exams.map((exam) => {
            const hasActiveAttempt = exam.latestAttempt?.status === 'IN_PROGRESS';
            const hasCompletedAttempt =
              exam.latestAttempt?.status === 'EVALUATED' || exam.latestAttempt?.status === 'SUBMITTED' || exam.latestAttempt?.status === 'PENDING_REVIEW';

            return (
              <div
                key={exam.id}
                style={{
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background:
                          exam.timeStatus === 'OPEN'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : exam.timeStatus === 'UPCOMING'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        color:
                          exam.timeStatus === 'OPEN'
                            ? '#10b981'
                            : exam.timeStatus === 'UPCOMING'
                            ? '#f59e0b'
                            : '#ef4444',
                        fontWeight: 'bold',
                      }}
                    >
                      {exam.timeStatus}
                    </span>

                    {hasCompletedAttempt && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: 'rgba(6, 182, 212, 0.15)',
                          color: '#06b6d4',
                          fontWeight: 'bold',
                        }}
                      >
                        Score: {exam.latestAttempt?.totalScore} ({exam.latestAttempt?.percentage}%)
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: 'var(--text-main)', fontFamily: 'JetBrains Mono' }}>
                    {exam.name}
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '14px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <div>⏱ Duration: <strong style={{ color: 'var(--text-main)' }}>{exam.durationMinutes} mins</strong></div>
                    <div>🎯 Max Marks: <strong style={{ color: 'var(--text-main)' }}>{exam.totalMarks}</strong></div>
                    <div>📑 Sections: <strong style={{ color: 'var(--text-main)' }}>{exam.sectionCount}</strong></div>
                    <div>❓ Questions: <strong style={{ color: 'var(--text-main)' }}>{exam.totalQuestions}</strong></div>
                  </div>
                </div>

                <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
                  {hasActiveAttempt ? (
                    <button
                      onClick={() => handleStartExam(exam.id)}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        background: '#f59e0b',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#000',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      ▶ Resume In-Progress Exam
                    </button>
                  ) : hasCompletedAttempt ? (
                    <>
                      <button
                        onClick={() => setActiveResultAttemptId(exam.latestAttempt!.id)}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          background: 'rgba(6, 182, 212, 0.15)',
                          border: '1px solid #06b6d4',
                          borderRadius: '6px',
                          color: '#06b6d4',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        📊 View Scorecard & Solutions
                      </button>
                      <button
                        onClick={() => handleOpenInstructions(exam)}
                        style={{
                          padding: '9px 12px',
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-main)',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                        title="Re-attempt Assessment"
                      >
                        🔄 Retake
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleOpenInstructions(exam)}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        background: 'var(--accent-color)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      📖 Read Instructions & Start
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Instructions & Readiness Modal */}
      {selectedExamForInstructions && (
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
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
                Exam Hall Instructions
              </h2>
              <button
                onClick={() => setSelectedExamForInstructions(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {instructionsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Loading instructions...
              </div>
            ) : (
              <div>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'rgba(6, 182, 212, 0.1)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    marginBottom: '16px',
                  }}
                >
                  <strong style={{ color: '#06b6d4' }}>{selectedExamForInstructions.name}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Duration: {selectedExamForInstructions.durationMinutes} Minutes • Total Questions: {selectedExamForInstructions.totalQuestions} • Total Marks: {selectedExamForInstructions.totalMarks}
                  </div>
                </div>

                <h4 style={{ margin: '14px 0 8px', color: 'var(--text-main)', fontSize: '14px' }}>General Guidelines:</h4>
                <ul style={{ margin: '0 0 16px', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  <li>The clock will be set at the server. A countdown timer in the top right will display remaining time.</li>
                  <li>When the timer reaches zero, the examination will end automatically and your responses will be submitted.</li>
                  <li>You can navigate between sections and questions at any time using the Question Palette.</li>
                  <li>Clicking <strong>Save & Next</strong> saves your answer for evaluation.</li>
                  <li>Clicking <strong>Mark for Review</strong> allows you to flag questions to revisit later.</li>
                </ul>

                {instructionsData?.sections && (
                  <>
                    <h4 style={{ margin: '14px 0 8px', color: 'var(--text-main)', fontSize: '14px' }}>Section Breakdown & Marking Scheme:</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255, 255, 255, 0.05)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '8px' }}>Section</th>
                          <th style={{ padding: '8px' }}>Questions</th>
                          <th style={{ padding: '8px' }}>Correct</th>
                          <th style={{ padding: '8px' }}>Wrong</th>
                          <th style={{ padding: '8px' }}>Section Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {instructionsData.sections.map((sec) => (
                          <tr key={sec.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px', color: 'var(--text-main)' }}>{sec.name}</td>
                            <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{sec.numQuestions}</td>
                            <td style={{ padding: '8px', color: '#10b981' }}>+{sec.marksCorrect}</td>
                            <td style={{ padding: '8px', color: '#ef4444' }}>{sec.marksWrong}</td>
                            <td style={{ padding: '8px', color: 'var(--text-main)' }}><strong>{sec.totalMarks}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '20px',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    I have read and understood all examination instructions and agree to abide by the rules.
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    onClick={() => setSelectedExamForInstructions(null)}
                    style={{
                      padding: '9px 16px',
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
                    disabled={!agreedToTerms}
                    onClick={() => handleStartExam(selectedExamForInstructions.id)}
                    style={{
                      padding: '9px 20px',
                      background: agreedToTerms ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      color: agreedToTerms ? '#fff' : 'var(--text-muted)',
                      fontWeight: 'bold',
                      cursor: agreedToTerms ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                    }}
                  >
                    🚀 Enter Exam Hall & Start
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
