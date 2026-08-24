import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useExamLock } from '../context/ExamLockContext';

interface QuestionOption {
  id: string;
  text: string;
}

interface QuestionItem {
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
  options?: QuestionOption[];
  pairs?: { left: string; right: string }[];
  rubricCriteria?: string[];
  studentAnswer: any;
  isMarkedForReview: boolean;
  timeSpentSeconds: number;
}

interface SectionMeta {
  id: string;
  name: string;
  sequenceOrder: number;
  numQuestions: number;
  marksCorrect: number;
  marksWrong: number;
  totalMarks: number;
}

interface AttemptState {
  id: string;
  examId: string;
  examName: string;
  userId: string;
  shuffleSeed: string;
  startTime: string;
  endTime: string | null;
  status: string;
  durationMinutes: number;
  timeRemainingSeconds: number;
  totalQuestions: number;
  sections: SectionMeta[];
  questions: QuestionItem[];
}

interface ExamPlayerPageProps {
  attemptId: string;
  onComplete: (attemptId: string) => void;
  onExit: () => void;
}

const API_BASE = 'http://localhost:4000/api/v1';

export const ExamPlayerPage: React.FC<ExamPlayerPageProps> = ({
  attemptId,
  onComplete,
  onExit,
}) => {
  const { token, user } = useAuth();
  const { setExamLocked, registerExitWarningHandler, unregisterExitWarningHandler } = useExamLock();
  const [attemptState, setAttemptState] = useState<AttemptState | null>(null);
  const attemptStateRef = useRef<AttemptState | null>(null);
  attemptStateRef.current = attemptState;
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active navigation
  const [currentSectionId, setCurrentSectionId] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Answer local buffer & sync status
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({});
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('SAVED');

  // Submit & Exit Modals
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const isCompletedRef = useRef<boolean>(false);
  (window as any).__triggerExamExitModal = () => setShowExitModal(true);

  // Split pane ratio & independent zoom state (exam-v5 architecture)
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [questionZoom, setQuestionZoom] = useState<number>(1.0);
  const [optionsZoom, setOptionsZoom] = useState<number>(1.0);

  const questionScrollRef = useRef<HTMLDivElement | null>(null);
  const optionsScrollRef = useRef<HTMLDivElement | null>(null);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingDivider = useRef<boolean>(false);

  const adjustZoom = (pane: 'question' | 'options', delta: number) => {
    const clamp = (val: number) => Math.min(2.2, Math.max(0.6, Math.round((val + delta) * 10) / 10));
    if (pane === 'question') {
      setQuestionZoom((prev) => clamp(prev));
    } else {
      setOptionsZoom((prev) => clamp(prev));
    }
  };

  const resetZoom = (pane: 'question' | 'options') => {
    if (pane === 'question') setQuestionZoom(1.0);
    else setOptionsZoom(1.0);
  };

  // Reset scroll positions whenever active question or section changes
  useEffect(() => {
    if (questionScrollRef.current) questionScrollRef.current.scrollTop = 0;
    if (optionsScrollRef.current) optionsScrollRef.current.scrollTop = 0;
  }, [currentQuestionIndex, currentSectionId]);

  // Non-passive wheel event listener for Ctrl+Scroll / Trackpad Pinch zoom
  useEffect(() => {
    const qEl = questionScrollRef.current;
    const oEl = optionsScrollRef.current;

    const handleWheel = (e: WheelEvent, pane: 'question' | 'options') => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        adjustZoom(pane, delta);
      }
    };

    const qHandler = (e: WheelEvent) => handleWheel(e, 'question');
    const oHandler = (e: WheelEvent) => handleWheel(e, 'options');

    if (qEl) qEl.addEventListener('wheel', qHandler, { passive: false });
    if (oEl) oEl.addEventListener('wheel', oHandler, { passive: false });

    return () => {
      if (qEl) qEl.removeEventListener('wheel', qHandler);
      if (oEl) oEl.removeEventListener('wheel', oHandler);
    };
  }, [currentQuestionIndex, currentSectionId]);

  // Draggable divider mouse handler
  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingDivider.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingDivider.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const totalH = rect.height;
      if (totalH <= 0) return;
      const relativeY = moveEvent.clientY - rect.top;
      const percent = (relativeY / totalH) * 100;
      // Clamp to ensure both top and bottom panes maintain at least 60px
      const minPercent = (60 / totalH) * 100;
      const maxPercent = 100 - minPercent;
      const clamped = Math.min(Math.max(percent, minPercent), maxPercent);
      setSplitPercent(clamped);
    };

    const handleMouseUp = () => {
      isDraggingDivider.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // 1. App-Level Exam Lock (Disables sidebar navigation & header logout mid-exam)
  useEffect(() => {
    setExamLocked(true);
    registerExitWarningHandler(() => setShowExitModal(true));
    return () => {
      setExamLocked(false);
      unregisterExitWarningHandler();
    };
  }, []);

  useEffect(() => {
    if (attemptState) {
      if (attemptState.status === 'IN_PROGRESS' && !isCompleted) {
        setExamLocked(true);
        registerExitWarningHandler(() => setShowExitModal(true));
      } else {
        setExamLocked(false);
        unregisterExitWarningHandler();
      }
    }
  }, [attemptState?.status, isCompleted]);

  // 2. Protection against accidental tab close / refresh / navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const status = attemptStateRef.current?.status || 'IN_PROGRESS';
      if (status === 'IN_PROGRESS' && !isCompletedRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 3. Protection against accidental browser Back-button navigation
  useEffect(() => {
    window.history.pushState({ inExam: true }, '', window.location.href);

    const handlePopState = (e?: any) => {
      if (isCompletedRef.current) return;
      setShowExitModal(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      delete (window as any).__triggerExamExitModal;
    };
  }, []);

  // Load state
  const fetchState = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/attempts/${attemptId}/state`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const state: AttemptState = data.data;
        setAttemptState(state);
        setTimeRemaining(state.timeRemainingSeconds);

        if (state.sections.length > 0) {
          setCurrentSectionId(state.sections[0].id);
        }

        // Initialize local answers
        const ansMap: Record<string, any> = {};
        const revMap: Record<string, boolean> = {};
        state.questions.forEach((q) => {
          if (q.studentAnswer !== null && q.studentAnswer !== undefined) {
            ansMap[q.questionId] = q.studentAnswer;
          }
          revMap[q.questionId] = q.isMarkedForReview;
        });
        setUserAnswers(ansMap);
        setReviewFlags(revMap);
      } else {
        setError(data.message || 'Failed to load exam state');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching exam state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, [attemptId, token]);

  // Timer countdown hook
  useEffect(() => {
    if (timeRemaining <= 0 && attemptState) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeRemaining, attemptState]);

  // Auto-sync function
  const syncAnswerToServer = async (questionId: string, answer: any, isReview: boolean) => {
    setSyncStatus('SAVING');
    try {
      const res = await fetch(`${API_BASE}/attempts/${attemptId}/sync`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId,
          studentAnswer: answer,
          isMarkedForReview: isReview,
          timeSpentSeconds: 5,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatus('SAVED');
      } else {
        setSyncStatus('ERROR');
      }
    } catch (err) {
      setSyncStatus('ERROR');
    }
  };

  const handleSelectAnswer = (questionId: string, answer: any) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: answer }));
    const isRev = reviewFlags[questionId] || false;
    syncAnswerToServer(questionId, answer, isRev);
  };

  const handleToggleReview = (questionId: string) => {
    const nextVal = !reviewFlags[questionId];
    setReviewFlags((prev) => ({ ...prev, [questionId]: nextVal }));
    const currentAns = userAnswers[questionId] ?? null;
    syncAnswerToServer(questionId, currentAns, nextVal);
  };

  const handleClearResponse = (questionId: string) => {
    setUserAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
    const isRev = reviewFlags[questionId] || false;
    syncAnswerToServer(questionId, null, isRev);
  };

  const handleContinueExam = () => {
    setShowExitModal(false);
    if (!window.location.hash.includes('in-exam')) {
      window.history.pushState({ inExam: true }, '', window.location.pathname + '#in-exam');
    }
  };

  const handleConfirmExit = () => {
    isCompletedRef.current = true;
    setIsCompleted(true);
    setShowExitModal(false);
    onExit();
  };

  const handleAutoSubmit = async () => {
    setSubmitting(true);
    isCompletedRef.current = true;
    setIsCompleted(true);
    try {
      const res = await fetch(`${API_BASE}/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        onComplete(attemptId);
      } else {
        alert(data.message || 'Auto-submit completed');
        onComplete(attemptId);
      }
    } catch (err) {
      onComplete(attemptId);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success || data.data?.status === 'EVALUATED' || data.message?.includes('already')) {
        isCompletedRef.current = true;
        setIsCompleted(true);
        setShowSubmitModal(false);
        onComplete(attemptId);
      } else {
        alert(data.message || 'Failed to submit exam');
      }
    } catch (err: any) {
      alert(err.message || 'Submission network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Format timer HH:MM:SS
  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(6, 182, 212, 0.2)', borderTopColor: '#06b6d4', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          Loading Exam Environment...
        </div>
      </div>
    );
  }

  if (error || !attemptState) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#fff' }}>
        <div style={{ background: '#131826', padding: '32px', borderRadius: '12px', textAlign: 'center', maxWidth: '400px', border: '1px solid #ef4444' }}>
          <h3 style={{ color: '#ef4444', margin: '0 0 12px' }}>Exam Error</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>{error || 'Unable to load attempt'}</p>
          <button onClick={onExit} style={{ padding: '8px 16px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Filter questions for current section
  const sectionQuestions = attemptState.questions.filter((q) => q.examSectionId === currentSectionId);
  const currentQuestion = sectionQuestions[currentQuestionIndex] || sectionQuestions[0];
  const globalIndex = attemptState.questions.findIndex((q) => q.id === currentQuestion?.id);

  // Palette counts
  let answeredCount = 0;
  let markedCount = 0;
  let unattemptedCount = 0;
  attemptState.questions.forEach((q) => {
    const ans = userAnswers[q.questionId];
    const hasAns = ans !== null && ans !== undefined && ans !== '' && (!Array.isArray(ans) || ans.length > 0);
    const isRev = reviewFlags[q.questionId];
    if (hasAns) answeredCount++;
    else unattemptedCount++;
    if (isRev) markedCount++;
  });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0b0f19', color: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      {/* Top Exam Header (Fixed 56px) */}
      <header
        id="exam-header"
        style={{
          height: '56px',
          flexShrink: 0,
          background: '#111827',
          borderBottom: '1px solid #1f2937',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#06b6d4', fontFamily: 'JetBrains Mono' }}>
            {attemptState.examName}
          </span>
          <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#9ca3af' }}>
            Candidate: {user?.firstName} {user?.lastName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Sync Status Badge */}
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'JetBrains Mono',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: syncStatus === 'SAVING' ? '#f59e0b' : syncStatus === 'SAVED' ? '#10b981' : '#ef4444',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: syncStatus === 'SAVING' ? '#f59e0b' : syncStatus === 'SAVED' ? '#10b981' : '#ef4444',
              }}
            />
            {syncStatus === 'SAVING' ? 'Saving Answer...' : syncStatus === 'SAVED' ? 'Auto-Saved' : 'Sync Error'}
          </span>

          {/* Real-time Countdown Timer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: timeRemaining < 300 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(6, 182, 212, 0.15)',
              border: `1px solid ${timeRemaining < 300 ? '#ef4444' : '#06b6d4'}`,
              padding: '6px 14px',
              borderRadius: '8px',
            }}
          >
            <span style={{ fontSize: '14px' }}>⏱</span>
            <span
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '16px',
                fontWeight: 'bold',
                color: timeRemaining < 300 ? '#ef4444' : '#06b6d4',
              }}
            >
              {formatTimer(timeRemaining)}
            </span>
          </div>

          {/* Hidden Exit Modal Trigger for Automation */}
          <button
            id="btn-trigger-exit-modal"
            type="button"
            onClick={() => setShowExitModal(true)}
            style={{ position: 'fixed', top: -9999, left: -9999, width: '1px', height: '1px', opacity: 0 }}
          />

          <button
            id="btn-open-submit-modal"
            onClick={() => setShowSubmitModal(true)}
            style={{
              padding: '8px 20px',
              background: '#10b981',
              border: 'none',
              borderRadius: '6px',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
            }}
          >
            ✓ Submit Test
          </button>
        </div>
      </header>

      {/* Section Tabs Bar (Fixed 48px) */}
      <div
        style={{
          height: '48px',
          flexShrink: 0,
          background: '#131b2e',
          borderBottom: '1px solid #1f2937',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        {attemptState.sections.map((sec) => {
          const isActive = sec.id === currentSectionId;
          const secQs = attemptState.questions.filter((q) => q.examSectionId === sec.id);
          const secAnsCount = secQs.filter((q) => userAnswers[q.questionId] !== undefined && userAnswers[q.questionId] !== null && userAnswers[q.questionId] !== '').length;

          return (
            <button
              key={sec.id}
              onClick={() => {
                setCurrentSectionId(sec.id);
                setCurrentQuestionIndex(0);
              }}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                background: isActive ? '#06b6d4' : 'rgba(255, 255, 255, 0.05)',
                color: isActive ? '#000' : '#d1d5db',
                border: 'none',
                fontWeight: isActive ? 'bold' : 'normal',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              {sec.name}
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                }}
              >
                {secAnsCount}/{sec.numQuestions}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Examination Layout (flex: 1, minHeight: 0, overflow: hidden) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Question Area Wrapper (flex: 1, minHeight: 0) */}
        <div style={{ flex: 1, minHeight: 0, padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {currentQuestion ? (
            <div
              id="exam-question-card"
              style={{
                height: '100%',
                minHeight: 0,
                background: '#131b2e',
                border: '1px solid #1f2937',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Question Meta Header (Fixed 48px) */}
              <div
                id="exam-question-meta-row"
                style={{
                  height: '48px',
                  flexShrink: 0,
                  padding: '0 20px',
                  borderBottom: '1px solid #1f2937',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#0e1526',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#06b6d4', fontFamily: 'JetBrains Mono' }}>
                    Question {globalIndex + 1} of {attemptState.totalQuestions}
                  </span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#9ca3af', fontFamily: 'JetBrains Mono' }}>
                    {currentQuestion.type}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', fontSize: '12px', fontFamily: 'JetBrains Mono' }}>
                  <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    +{currentQuestion.marksCorrect}
                  </span>
                  <span style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {currentQuestion.marksWrong}
                  </span>
                </div>
              </div>

              {/* Split Panes Container (flex: 1, minHeight: 0) */}
              <div
                ref={splitContainerRef}
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* 1. TOP PANE: Question Statement */}
                <div
                  id="exam-question-pane"
                  style={{
                    flex: `${splitPercent} 1 0`,
                    minHeight: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Question Pane Header (Fixed 36px) */}
                  <div
                    style={{
                      height: '36px',
                      flexShrink: 0,
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      padding: '0 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'JetBrains Mono' }}>
                      📖 Question Statement
                    </span>

                    {/* Zoom Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#6b7280', marginRight: '4px', fontFamily: 'JetBrains Mono' }}>
                        Ctrl+Scroll to zoom
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustZoom('question', -0.1)}
                        title="Zoom out"
                        style={{
                          width: '24px',
                          height: '24px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid #374151',
                          color: '#d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                        }}
                      >
                        −
                      </button>
                      <span style={{ fontSize: '11px', color: '#06b6d4', minWidth: '40px', textAlign: 'center', fontFamily: 'JetBrains Mono' }}>
                        {Math.round(questionZoom * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustZoom('question', 0.1)}
                        title="Zoom in"
                        style={{
                          width: '24px',
                          height: '24px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid #374151',
                          color: '#d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                        }}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => resetZoom('question')}
                        title="Reset zoom to 100%"
                        style={{
                          padding: '2px 6px',
                          height: '24px',
                          background: 'transparent',
                          border: '1px solid #374151',
                          color: '#9ca3af',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '10px',
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Question Statement Scroll Body */}
                  <div
                    ref={questionScrollRef}
                    id="exam-question-text-scroll"
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: 'auto',
                      scrollbarGutter: 'stable',
                      padding: '16px 20px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: `${15 * questionZoom}px`,
                        lineHeight: '1.65',
                        color: '#f3f4f6',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {currentQuestion.content}
                    </div>

                    {/* MATCHING Question Column Preview */}
                    {currentQuestion.type === 'MATCHING' && currentQuestion.pairs && (
                      <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid #1f2937', borderRadius: '8px', padding: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: `${13 * questionZoom}px` }}>
                          <div>
                            <strong style={{ color: '#06b6d4', display: 'block', marginBottom: '8px' }}>Column A</strong>
                            {currentQuestion.pairs.map((p, idx) => (
                              <div key={idx} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: '#9ca3af', marginRight: '6px' }}>{idx + 1}.</span>
                                <span>{p.left}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <strong style={{ color: '#06b6d4', display: 'block', marginBottom: '8px' }}>Column B</strong>
                            {currentQuestion.pairs.map((p, idx) => (
                              <div key={idx} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: '#9ca3af', marginRight: '6px' }}>{String.fromCharCode(65 + idx)}.</span>
                                <span>{p.right}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* DRAGGABLE DIVIDER (Fixed 10px) */}
                <div
                  id="exam-panes-divider"
                  onMouseDown={handleDividerMouseDown}
                  title="Drag to resize Question and Answer panes"
                  style={{
                    height: '10px',
                    flexShrink: 0,
                    cursor: 'row-resize',
                    background: '#1a233a',
                    borderTop: '1px solid #28354f',
                    borderBottom: '1px solid #0d1322',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    userSelect: 'none',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#06b6d4')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#1a233a')}
                >
                  <div style={{ width: '42px', height: '4px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.4)' }} />
                </div>

                {/* 2. BOTTOM PANE: Select Your Answer */}
                <div
                  id="exam-answer-pane"
                  style={{
                    flex: `${100 - splitPercent} 1 0`,
                    minHeight: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Answer Pane Header (Fixed 36px) */}
                  <div
                    style={{
                      height: '36px',
                      flexShrink: 0,
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      padding: '0 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'JetBrains Mono' }}>
                      ✍️ Select Your Answer
                    </span>

                    {/* Zoom Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#6b7280', marginRight: '4px', fontFamily: 'JetBrains Mono' }}>
                        Ctrl+Scroll to zoom
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustZoom('options', -0.1)}
                        title="Zoom out"
                        style={{
                          width: '24px',
                          height: '24px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid #374151',
                          color: '#d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                        }}
                      >
                        −
                      </button>
                      <span style={{ fontSize: '11px', color: '#06b6d4', minWidth: '40px', textAlign: 'center', fontFamily: 'JetBrains Mono' }}>
                        {Math.round(optionsZoom * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustZoom('options', 0.1)}
                        title="Zoom in"
                        style={{
                          width: '24px',
                          height: '24px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid #374151',
                          color: '#d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                        }}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => resetZoom('options')}
                        title="Reset zoom to 100%"
                        style={{
                          padding: '2px 6px',
                          height: '24px',
                          background: 'transparent',
                          border: '1px solid #374151',
                          color: '#9ca3af',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '10px',
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Answer Options Scroll Body */}
                  <div
                    ref={optionsScrollRef}
                    id="exam-answer-options-scroll"
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: 'auto',
                      scrollbarGutter: 'stable',
                      padding: '16px 20px',
                    }}
                  >
                    {/* Single Choice MCQ */}
                    {currentQuestion.type === 'MCQ' && currentQuestion.options && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {currentQuestion.options.map((opt, idx) => {
                          const isSelected = userAnswers[currentQuestion.questionId] === opt.id;
                          const optionLabel = String.fromCharCode(65 + idx);
                          return (
                            <div
                              key={opt.id}
                              id={`exam-option-${opt.id}`}
                              onClick={() => handleSelectAnswer(currentQuestion.questionId, opt.id)}
                              style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                border: `1px solid ${isSelected ? '#06b6d4' : '#1f2937'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: isSelected ? '#06b6d4' : 'rgba(255,255,255,0.06)',
                                  color: isSelected ? '#000' : '#9ca3af',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  fontFamily: 'JetBrains Mono',
                                  flexShrink: 0,
                                }}
                              >
                                {optionLabel}
                              </div>
                              <input
                                type="radio"
                                name={`q_${currentQuestion.questionId}`}
                                checked={isSelected}
                                onChange={() => {}}
                                style={{ width: '18px', height: '18px', accentColor: '#06b6d4' }}
                              />
                              <span style={{ fontSize: `${14 * optionsZoom}px`, color: isSelected ? '#fff' : '#d1d5db' }}>
                                {opt.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Multiple Select */}
                    {currentQuestion.type === 'MULTIPLE_SELECT' && currentQuestion.options && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {currentQuestion.options.map((opt, idx) => {
                          const currentArr = Array.isArray(userAnswers[currentQuestion.questionId]) ? userAnswers[currentQuestion.questionId] : [];
                          const isSelected = currentArr.includes(opt.id);
                          const optionLabel = String.fromCharCode(65 + idx);
                          return (
                            <div
                              key={opt.id}
                              id={`exam-option-${opt.id}`}
                              onClick={() => {
                                const nextArr = isSelected
                                  ? currentArr.filter((id: string) => id !== opt.id)
                                  : [...currentArr, opt.id];
                                handleSelectAnswer(currentQuestion.questionId, nextArr);
                              }}
                              style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                border: `1px solid ${isSelected ? '#06b6d4' : '#1f2937'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '4px',
                                  background: isSelected ? '#06b6d4' : 'rgba(255,255,255,0.06)',
                                  color: isSelected ? '#000' : '#9ca3af',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  fontFamily: 'JetBrains Mono',
                                  flexShrink: 0,
                                }}
                              >
                                {optionLabel}
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                style={{ width: '18px', height: '18px', accentColor: '#06b6d4' }}
                              />
                              <span style={{ fontSize: `${14 * optionsZoom}px`, color: isSelected ? '#fff' : '#d1d5db' }}>
                                {opt.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Numerical Input */}
                    {currentQuestion.type === 'NUMERICAL' && (
                      <div style={{ maxWidth: '360px' }}>
                        <label style={{ display: 'block', fontSize: `${12 * optionsZoom}px`, color: '#9ca3af', marginBottom: '8px' }}>
                          Enter Numeric Value (Decimal / Integer):
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={userAnswers[currentQuestion.questionId] ?? ''}
                          onChange={(e) => handleSelectAnswer(currentQuestion.questionId, e.target.value)}
                          placeholder="e.g. 42.5"
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            background: '#090d16',
                            border: '1px solid #374151',
                            color: '#fff',
                            fontSize: `${16 * optionsZoom}px`,
                            fontFamily: 'JetBrains Mono',
                          }}
                        />
                      </div>
                    )}

                    {/* Fill in the Blank / Short Answer */}
                    {(currentQuestion.type === 'FILL_IN_BLANK' || currentQuestion.type === 'SHORT_ANSWER') && (
                      <div style={{ maxWidth: '500px' }}>
                        <label style={{ display: 'block', fontSize: `${12 * optionsZoom}px`, color: '#9ca3af', marginBottom: '8px' }}>
                          Your Answer:
                        </label>
                        <input
                          type="text"
                          value={userAnswers[currentQuestion.questionId] ?? ''}
                          onChange={(e) => handleSelectAnswer(currentQuestion.questionId, e.target.value)}
                          placeholder="Type answer here..."
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            background: '#090d16',
                            border: '1px solid #374151',
                            color: '#fff',
                            fontSize: `${15 * optionsZoom}px`,
                          }}
                        />
                      </div>
                    )}

                    {/* True / False */}
                    {currentQuestion.type === 'TRUE_FALSE' && (
                      <div style={{ display: 'flex', gap: '14px', maxWidth: '360px' }}>
                        {['true', 'false'].map((val) => {
                          const isSelected = String(userAnswers[currentQuestion.questionId]) === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleSelectAnswer(currentQuestion.questionId, val === 'true')}
                              style={{
                                flex: 1,
                                padding: '14px',
                                borderRadius: '8px',
                                background: isSelected ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                border: `1px solid ${isSelected ? '#06b6d4' : '#374151'}`,
                                color: isSelected ? '#06b6d4' : '#d1d5db',
                                fontWeight: 'bold',
                                fontSize: `${15 * optionsZoom}px`,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {val.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* MATCHING Question Selection Table */}
                    {currentQuestion.type === 'MATCHING' && currentQuestion.pairs && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '560px' }}>
                        <div style={{ fontSize: `${13 * optionsZoom}px`, color: '#9ca3af', marginBottom: '4px' }}>
                          Select the matching Column B choice for each item in Column A:
                        </div>
                        {currentQuestion.pairs.map((pair, idx) => {
                          const currentMatching = userAnswers[currentQuestion.questionId] || {};
                          const selectedVal = currentMatching[idx] ?? '';

                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '8px',
                                border: '1px solid #1f2937',
                                gap: '12px',
                              }}
                            >
                              <div style={{ fontSize: `${14 * optionsZoom}px`, color: '#e5e7eb', flex: 1 }}>
                                <span style={{ color: '#06b6d4', fontWeight: 'bold', marginRight: '8px' }}>{idx + 1}.</span>
                                {pair.left}
                              </div>
                              <select
                                value={selectedVal}
                                onChange={(e) => {
                                  const updated = { ...currentMatching, [idx]: e.target.value };
                                  handleSelectAnswer(currentQuestion.questionId, updated);
                                }}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  background: '#090d16',
                                  border: '1px solid #374151',
                                  color: '#fff',
                                  fontSize: `${13 * optionsZoom}px`,
                                  cursor: 'pointer',
                                  minWidth: '180px',
                                }}
                              >
                                <option value="">-- Select Match --</option>
                                {currentQuestion.pairs?.map((p, targetIdx) => (
                                  <option key={targetIdx} value={String.fromCharCode(65 + targetIdx)}>
                                    {String.fromCharCode(65 + targetIdx)}. {p.right}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar (Fixed 60px) */}
              <div
                id="exam-action-bar"
                style={{
                  height: '60px',
                  flexShrink: 0,
                  padding: '0 20px',
                  borderTop: '1px solid #1f2937',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#0e1526',
                }}
              >
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleReview(currentQuestion.questionId)}
                    style={{
                      padding: '8px 16px',
                      background: reviewFlags[currentQuestion.questionId] ? '#8b5cf6' : 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid #8b5cf6',
                      color: reviewFlags[currentQuestion.questionId] ? '#fff' : '#a78bfa',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    🏷 {reviewFlags[currentQuestion.questionId] ? 'Marked for Review' : 'Mark for Review'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleClearResponse(currentQuestion.questionId)}
                    style={{
                      padding: '8px 14px',
                      background: 'transparent',
                      border: '1px solid #374151',
                      color: '#9ca3af',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Clear Response
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid #374151',
                      color: currentQuestionIndex === 0 ? '#4b5563' : '#d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ◀ Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (currentQuestionIndex < sectionQuestions.length - 1) {
                        setCurrentQuestionIndex((prev) => prev + 1);
                      } else {
                        // Switch to next section if available
                        const secIdx = attemptState.sections.findIndex((s) => s.id === currentSectionId);
                        if (secIdx < attemptState.sections.length - 1) {
                          setCurrentSectionId(attemptState.sections[secIdx + 1].id);
                          setCurrentQuestionIndex(0);
                        }
                      }
                    }}
                    style={{
                      padding: '8px 20px',
                      background: '#06b6d4',
                      border: 'none',
                      color: '#000',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(6, 182, 212, 0.3)',
                    }}
                  >
                    Save & Next ▶
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
              No questions found in this section.
            </div>
          )}
        </div>

        {/* Right: Question Palette Sidebar (Fixed 320px width, flex: 1 scroll body) */}
        <aside
          id="exam-palette-sidebar"
          style={{
            width: '320px',
            flexShrink: 0,
            height: '100%',
            background: '#111827',
            borderLeft: '1px solid #1f2937',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Palette Header (Fixed 40px) */}
          <div
            style={{
              height: '40px',
              flexShrink: 0,
              padding: '0 20px',
              borderBottom: '1px solid #1f2937',
              display: 'flex',
              alignItems: 'center',
              background: '#0e1526',
            }}
          >
            <h4 style={{ margin: 0, fontSize: '13px', fontFamily: 'JetBrains Mono', color: '#e5e7eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Question Palette
            </h4>
          </div>

          {/* Palette Scroll Body (flex: 1, minHeight: 0, overflowY: auto) */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              scrollbarGutter: 'stable',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Legend */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }} />
                <span>Answered ({answeredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#374151' }} />
                <span>Unattempted ({unattemptedCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#8b5cf6' }} />
                <span>Review ({markedCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid #06b6d4', background: 'transparent' }} />
                <span>Current</span>
              </div>
            </div>

            {/* Questions Grid for current section */}
            <div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontFamily: 'JetBrains Mono' }}>
                Section Questions ({sectionQuestions.length}):
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '8px',
                  paddingRight: '4px',
                }}
              >
                {sectionQuestions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex;
                  const ans = userAnswers[q.questionId];
                  const hasAnswer = ans !== null && ans !== undefined && ans !== '' && (!Array.isArray(ans) || ans.length > 0);
                  const isReview = reviewFlags[q.questionId];

                  let bg = '#1f2937';
                  let textColor = '#d1d5db';
                  if (isReview) {
                    bg = '#8b5cf6';
                    textColor = '#fff';
                  } else if (hasAnswer) {
                    bg = '#10b981';
                    textColor = '#000';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(idx)}
                      style={{
                        height: '38px',
                        borderRadius: '6px',
                        background: bg,
                        color: textColor,
                        border: isCurrent ? '2px solid #06b6d4' : 'none',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono',
                        cursor: 'pointer',
                        boxShadow: isCurrent ? '0 0 8px rgba(6, 182, 212, 0.5)' : 'none',
                      }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Palette Footer (Fixed) */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #1f2937', background: '#0e1526' }}>
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#10b981',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
              }}
            >
              Finish & Submit Examination
            </button>
          </div>
        </aside>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#131b2e',
              border: '1px solid #374151',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#fff', fontFamily: 'JetBrains Mono' }}>
              Confirm Examination Submission
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.5', margin: '0 0 20px' }}>
              Are you sure you want to end and submit your examination? Once submitted, answers cannot be modified.
            </p>

            <div
              style={{
                background: '#090d16',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                padding: '14px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '12px',
                marginBottom: '24px',
              }}
            >
              <div>Total Questions: <strong style={{ color: '#fff' }}>{attemptState.totalQuestions}</strong></div>
              <div>Answered: <strong style={{ color: '#10b981' }}>{answeredCount}</strong></div>
              <div>Unattempted: <strong style={{ color: '#ef4444' }}>{unattemptedCount}</strong></div>
              <div>Marked for Review: <strong style={{ color: '#8b5cf6' }}>{markedCount}</strong></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                style={{
                  padding: '9px 16px',
                  background: 'transparent',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#d1d5db',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Return to Exam
              </button>
              <button
                id="btn-confirm-submit-exam"
                disabled={submitting}
                onClick={handleManualSubmit}
                style={{
                  padding: '9px 20px',
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >
                {submitting ? 'Submitting & Evaluating...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal (Back-Button / Navigation Trap) */}
      {showExitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1100,
          }}
        >
          <div
            id="exam-exit-modal"
            style={{
              background: '#131b2e',
              border: '1px solid #f59e0b',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 30px -5px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#f59e0b', fontFamily: 'JetBrains Mono' }}>
                Active Examination in Progress
              </h3>
            </div>

            <p style={{ color: '#f3f4f6', fontSize: '14px', lineHeight: '1.6', margin: '0 0 14px', fontWeight: '500' }}>
              Your exam is still in progress and the timer is still running - are you sure you want to leave?
            </p>

            <p style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.5', margin: '0 0 24px', background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '8px', border: '1px solid #1f2937' }}>
              ℹ️ Your answered questions are auto-saved, but the examination timer will continue running in the background server-side. You can re-enter and resume before time expires.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={handleContinueExam}
                style={{
                  padding: '10px 20px',
                  background: '#06b6d4',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Continue Exam
              </button>
              <button
                onClick={handleConfirmExit}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Yes, Leave Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
