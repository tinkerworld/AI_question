import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/I18nContext';
import { API_BASE } from '../config/api';
import { getAuthHeaders } from '../utils/api';
import { ExamWritingEditor } from '../components/writing/ExamWritingEditor';
import { WritingScorecard } from '../components/writing/WritingScorecard';

export const WritingPracticePage: React.FC = () => {
  const { token, user } = useAuth();
  const { t } = useTranslation();

  const [activeView, setActiveView] = useState<'CATALOG' | 'ATTEMPT' | 'ANALYZING' | 'RESULTS' | 'HISTORY'>('CATALOG');
  const [selectedMode, setSelectedMode] = useState<'PRACTICE' | 'EXAM'>('PRACTICE');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('');
  const [selectedTaskTypeFilter, setSelectedTaskTypeFilter] = useState<'ALL' | 'TASK_1' | 'TASK_2'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [eligibility, setEligibility] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Session & Question
  const [activeSession, setActiveSession] = useState<any>(null);
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [essayText, setEssayText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Dedicated Exam & Rules Acceptance States
  const [hasAcceptedRules, setHasAcceptedRules] = useState<boolean>(false);
  const [rulesAgreedCheckbox, setRulesAgreedCheckbox] = useState<boolean>(true);
  const [editorFontSize, setEditorFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const [rubricsExpanded, setRubricsExpanded] = useState<boolean>(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string>('just now');

  // Submit Confirmation Modal
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState<boolean>(false);

  // Analyzing View States
  const [analyzingElapsedSeconds, setAnalyzingElapsedSeconds] = useState<number>(0);
  const [analyzingStepIndex, setAnalyzingStepIndex] = useState<number>(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [submittedSnapshot, setSubmittedSnapshot] = useState<{
    essayText: string;
    wordCount: number;
    paragraphCount: number;
    submittedAt: number;
  } | null>(null);

  // Result / Evaluation
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  // Past Sessions & History Review
  const [loadingHistorySessionId, setLoadingHistorySessionId] = useState<string | null>(null);
  const [isViewingFromHistory, setIsViewingFromHistory] = useState<boolean>(false);

  // Stimulus Image Lightbox / Zoom
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  const [imageModalZoom, setImageModalZoom] = useState<number>(1.0);
  const [inlineChartZoom, setInlineChartZoom] = useState<number>(1.0);
  const [showResultChart, setShowResultChart] = useState<boolean>(true);

  // Past Sessions
  const [pastSessions, setPastSessions] = useState<any[]>([]);

  const DRAFT_STORAGE_KEY = 'examos_writing_active_draft';
  const getUserDraftKey = (userId?: string) => (userId ? `${DRAFT_STORAGE_KEY}_${userId}` : DRAFT_STORAGE_KEY);
  const isSubmittedRef = useRef<boolean>(false);

  // Restore draft on initial load or when authenticated user changes
  useEffect(() => {
    if (!user) return;
    try {
      let saved = user.id ? localStorage.getItem(getUserDraftKey(user.id)) : null;
      let isFromFallback = false;
      if (!saved) {
        saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        isFromFallback = true;
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        // Privacy check 1: Explicit user mismatch
        const hasUserMismatch = (parsed.userId && parsed.userId !== user.id) || (parsed.userEmail && parsed.userEmail !== user.email);
        // Privacy check 2: Session owner mismatch
        const sessionOwnerId = parsed.activeSession?.userId || parsed.activeSession?.studentId;
        const hasSessionMismatch = sessionOwnerId && sessionOwnerId !== user.id;

        if (hasUserMismatch || hasSessionMismatch) {
          return; // Draft belongs to a different student, do NOT restore!
        }

        // Privacy check 3: Unowned/legacy draft validation
        // Reject unowned drafts by default, or migrate only if the saved session or metadata belongs to current user
        const hasVerifiedOwner = (parsed.userId === user.id) || (parsed.userEmail === user.email) || (sessionOwnerId === user.id);
        if (!hasVerifiedOwner) {
          return; // Unowned draft without verified ownership, do NOT restore!
        }

        // If restoring from shared/legacy key, migrate it into user-isolated key
        if (isFromFallback && user.id) {
          parsed.userId = user.id;
          parsed.userEmail = user.email;
          localStorage.setItem(getUserDraftKey(user.id), JSON.stringify(parsed));
        }

        if (parsed.activeQuestion && typeof parsed.essayText === 'string') {
          setActiveQuestion(parsed.activeQuestion);
          if (parsed.activeSession) setActiveSession(parsed.activeSession);
          if (parsed.selectedMode) setSelectedMode(parsed.selectedMode);
          if (parsed.startTime) setStartTime(parsed.startTime);
          setEssayText(parsed.essayText);
          setHasAcceptedRules(true); // Resuming an in-progress draft skips the rules screen
          isSubmittedRef.current = false;
          setActiveView('ATTEMPT');
        }
      }
    } catch (e) {
      console.warn('Failed to restore writing draft from storage', e);
    }
  }, [user?.id, user?.email]);

  // Autosave draft whenever state changes in ATTEMPT view
  useEffect(() => {
    if (isSubmittedRef.current || activeView !== 'ATTEMPT') return;
    if (activeQuestion && typeof essayText === 'string') {
      try {
        const payload = JSON.stringify({
          userId: user?.id,
          userEmail: user?.email,
          activeQuestion,
          activeSession,
          essayText,
          selectedMode,
          startTime,
          savedAt: Date.now(),
        });
        if (user?.id) {
          localStorage.setItem(getUserDraftKey(user.id), payload);
        }
        localStorage.setItem(DRAFT_STORAGE_KEY, payload);
        setLastAutoSavedTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Failed to autosave writing draft', e);
      }
    }
  }, [essayText, activeView, activeQuestion, activeSession, selectedMode, startTime, user?.id, user?.email]);

  const handleAutoSaveDraft = (text: string) => {
    if (isSubmittedRef.current || activeView !== 'ATTEMPT') return;
    if (activeQuestion && typeof text === 'string') {
      try {
        const payload = JSON.stringify({
          userId: user?.id,
          userEmail: user?.email,
          activeQuestion,
          activeSession,
          essayText: text,
          selectedMode,
          startTime,
          savedAt: Date.now(),
        });
        if (user?.id) {
          localStorage.setItem(getUserDraftKey(user.id), payload);
        }
        localStorage.setItem(DRAFT_STORAGE_KEY, payload);
        setLastAutoSavedTime(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('Failed to autosave writing draft callback', e);
      }
    }
  };

  // Official Countdown Timer for active exam session
  useEffect(() => {
    if (activeView !== 'ATTEMPT' || !hasAcceptedRules || !activeQuestion) return;

    const recommendedMins =
      activeQuestion.data?.recommendedMinutes ||
      (activeQuestion.data?.preset === 'IELTS_TASK_1' || (activeQuestion.content && /task\s*1/i.test(activeQuestion.content)) ? 20 : 40);
    const totalDurationSeconds = recommendedMins * 60;

    const updateTimer = () => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, totalDurationSeconds - elapsedSeconds);
      setTimeRemainingSeconds(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeView, hasAcceptedRules, activeQuestion, startTime]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
      isSubmittedRef.current = false;
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
        setHasAcceptedRules(false);
        setRulesAgreedCheckbox(true);
        isSubmittedRef.current = false;
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

  // Step progression and elapsed timer during ANALYZING view
  useEffect(() => {
    let interval: any = null;
    if (activeView === 'ANALYZING' && isSubmitting) {
      interval = setInterval(() => {
        setAnalyzingElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next < 5) setAnalyzingStepIndex(0);
          else if (next < 14) setAnalyzingStepIndex(1);
          else if (next < 24) setAnalyzingStepIndex(2);
          else setAnalyzingStepIndex(3);
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeView, isSubmitting]);

  const handleOpenSubmitConfirm = () => {
    if (!essayText.trim()) return;
    setShowSubmitConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitConfirmModal(false);
    setAnalysisError(null);
    setSubmittedSnapshot({
      essayText,
      wordCount: (essayText.trim().match(/\S+/g) || []).length,
      paragraphCount: essayText.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length || (essayText.trim() ? 1 : 0),
      submittedAt: Date.now(),
    });
    setAnalyzingElapsedSeconds(0);
    setAnalyzingStepIndex(0);
    setActiveView('ANALYZING');
    executeSubmitAttempt();
  };

  const executeSubmitAttempt = async () => {
    if (!token || !activeSession) return;
    try {
      isSubmittedRef.current = true;
      setIsSubmitting(true);
      setAnalysisError(null);
      setError(null);
      try {
        if (user?.id) localStorage.removeItem(getUserDraftKey(user.id));
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
      const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);
      const res = await fetch(`${API_BASE}/writing/sessions/${activeSession.id}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          essayText,
          timeSpentSeconds,
        }),
      });

      let data: any = null;
      try {
        const rawText = await res.text();
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(`The connection was interrupted during evaluation (HTTP ${res.status}). Please click "Retry Analysis".`);
      }

      if (!data) {
        throw new Error(`Server returned an empty response (HTTP ${res.status}). Please click "Retry Analysis".`);
      }

      if (data.success) {
        try {
          if (user?.id) localStorage.removeItem(getUserDraftKey(user.id));
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {}
        setEvaluationResult(data.data);
        setIsViewingFromHistory(false);
        setActiveView('RESULTS');
        fetchPastSessions();
      } else {
        setAnalysisError(data.message || 'Failed to submit essay for evaluation');
        isSubmittedRef.current = false;
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'Error submitting attempt');
      isSubmittedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToEditor = () => {
    setIsSubmitting(false);
    isSubmittedRef.current = false;
    setAnalysisError(null);
    setActiveView('ATTEMPT');
  };

  const handleViewPastSession = async (sessionId: string) => {
    if (!token) return;
    try {
      setLoadingHistorySessionId(sessionId);
      setError(null);
      const res = await fetch(`${API_BASE}/writing/sessions/${sessionId}`, {
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const session = data.data;
        setActiveSession(session);
        setActiveQuestion(
          session.question || {
            id: session.questionId,
            content: session.questionContent || 'IELTS Writing Task',
            marks: session.maxScore || 9,
            data: {},
          }
        );
        setEssayText(session.essayText || '');
        setEvaluationResult(session);
        setIsViewingFromHistory(true);
        setActiveView('RESULTS');
      } else {
        setError(data.message || 'Failed to load writing session details');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading past writing session');
    } finally {
      setLoadingHistorySessionId(null);
    }
  };

  const isQuestionTask1 = (q: any): boolean => {
    return Boolean(
      q.type === 'IELTS_WRITING_TASK_1' ||
      q.data?.preset === 'IELTS_TASK_1' ||
      (q.data?.taskType && q.data.taskType.startsWith('TASK_1')) ||
      (q.content && /task\s*1/i.test(q.content)) ||
      Number(q.data?.minWords || q.data?.minWordCount || 0) <= 200
    );
  };

  const isQuestionTask2 = (q: any): boolean => {
    return Boolean(
      q.type === 'IELTS_WRITING_TASK_2' ||
      q.data?.preset === 'IELTS_TASK_2' ||
      (q.data?.taskType && q.data.taskType.startsWith('TASK_2')) ||
      (q.content && /task\s*2/i.test(q.content)) ||
      !isQuestionTask1(q)
    );
  };

  const baseFilteredQuestions = (eligibility?.availableQuestions || []).filter((q: any) => {
    if (selectedCourseFilter && q.courseId !== selectedCourseFilter) return false;
    if (searchQuery.trim()) {
      const qText = `${q.content} ${q.data?.promptStem || ''} ${q.data?.taskType || ''} ${q.difficulty || ''} ${q.courseName || ''}`.toLowerCase();
      if (!qText.includes(searchQuery.trim().toLowerCase())) return false;
    }
    return true;
  });

  const task1Questions = baseFilteredQuestions.filter(isQuestionTask1);
  const task2Questions = baseFilteredQuestions.filter(isQuestionTask2);
  const filteredQuestions = baseFilteredQuestions;

  const minWords = Number(activeQuestion?.data?.minWords || activeQuestion?.data?.minWordCount || 150);
  const maxWords = Number(activeQuestion?.data?.maxWords || activeQuestion?.data?.maxWordCount || 400);
  const essayWordCount = (essayText.trim().match(/\S+/g) || []).length;
  const paragraphCount = essayText.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length || (essayText.trim() ? 1 : 0);

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
      {activeView !== 'ATTEMPT' && activeView !== 'ANALYZING' && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
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
              📋 {t('writing_catalog', 'Writing Catalog')}
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
              📊 {t('my_attempts', 'My Attempts')} ({pastSessions.length})
            </button>
          </div>
        </div>
      )}

      {error && activeView !== 'ATTEMPT' && activeView !== 'ANALYZING' && (
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
          {/* Controls & Filtering Bar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '16px 20px',
              background: 'var(--panel-bg)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Row 1: Mode Toggle, Course Filter, and Search */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                {/* Practice / Exam Mode */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{t('practice_mode', 'Mode')}:</span>
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
                      🌱 {t('practice_mode', 'Practice')}
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
                      ⚡ {t('exam_mode', 'Exam')}
                    </button>
                  </div>
                </div>

                {/* Course Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="select-writing-course-filter" style={{ fontSize: '13px', fontWeight: 600 }}>
                    {t('filter_by_course', 'Course')}:
                  </label>
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
                    <option value="">{t('all_courses_option', 'All Eligible Courses')} ({eligibility?.eligibleCourses?.length || 0})</option>
                    {(eligibility?.eligibleCourses || []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.questionCount} {t('questions', 'Questions')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search input */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="input-writing-search"
                  type="text"
                  placeholder={t('search_writing_placeholder', 'Search topics, charts, or keywords...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '7px 12px 7px 32px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    minWidth: '240px',
                  }}
                />
                <span style={{ position: 'absolute', left: '10px', fontSize: '13px', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                  🔍
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      padding: 0,
                    }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Section Tabs: All, Task 1, Task 2 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, marginRight: '4px' }}>
                {t('task_type_view', 'Sections')}:
              </span>

              <button
                id="tab-task-all"
                onClick={() => setSelectedTaskTypeFilter('ALL')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: selectedTaskTypeFilter === 'ALL' ? '1px solid #10b981' : '1px solid var(--border-color)',
                  background: selectedTaskTypeFilter === 'ALL' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                  color: selectedTaskTypeFilter === 'ALL' ? '#10b981' : 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>📑</span> {t('all_tasks_tab', 'All Tasks')}
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: selectedTaskTypeFilter === 'ALL' ? '#10b981' : 'var(--border-color)',
                    color: selectedTaskTypeFilter === 'ALL' ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {baseFilteredQuestions.length}
                </span>
              </button>

              <button
                id="tab-task-1"
                onClick={() => setSelectedTaskTypeFilter('TASK_1')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: selectedTaskTypeFilter === 'TASK_1' ? '1px solid #0ea5e9' : '1px solid var(--border-color)',
                  background: selectedTaskTypeFilter === 'TASK_1' ? 'rgba(14, 165, 233, 0.15)' : 'var(--bg-secondary)',
                  color: selectedTaskTypeFilter === 'TASK_1' ? '#0ea5e9' : 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>📊</span> {t('task_1_tab', 'IELTS Writing Task 1')}
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: selectedTaskTypeFilter === 'TASK_1' ? '#0ea5e9' : 'var(--border-color)',
                    color: selectedTaskTypeFilter === 'TASK_1' ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {task1Questions.length}
                </span>
              </button>

              <button
                id="tab-task-2"
                onClick={() => setSelectedTaskTypeFilter('TASK_2')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: selectedTaskTypeFilter === 'TASK_2' ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                  background: selectedTaskTypeFilter === 'TASK_2' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-secondary)',
                  color: selectedTaskTypeFilter === 'TASK_2' ? '#8b5cf6' : 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>📝</span> {t('task_2_tab', 'IELTS Writing Task 2')}
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: selectedTaskTypeFilter === 'TASK_2' ? '#8b5cf6' : 'var(--border-color)',
                    color: selectedTaskTypeFilter === 'TASK_2' ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {task2Questions.length}
                </span>
              </button>
            </div>
          </div>

          {/* Helper Card Renderer */}
          {(() => {
            const renderCard = (q: any) => {
              const isQTask1 = isQuestionTask1(q);
              const qMinWords = Number(q.data?.minWords || q.data?.minWordCount || (isQTask1 ? 150 : 250));
              const qMaxWords = Number(q.data?.maxWords || q.data?.maxWordCount || (isQTask1 ? 250 : 400));
              const qMinutes = Number(q.data?.recommendedMinutes || q.data?.recommendedTimeMinutes || (isQTask1 ? 20 : 40));
              const qImageUrl = q.data?.promptImageUrl || q.promptImageUrl || q.data?.imageUrl || null;

              let formatLabel = isQTask1 ? 'TASK 1: REPORT' : 'TASK 2: ESSAY';
              if (isQTask1) {
                if (q.data?.taskType === 'TASK_1_TABLE') formatLabel = 'TASK 1: TABLE';
                else if (q.data?.taskType === 'TASK_1_PROCESS') formatLabel = 'TASK 1: PROCESS';
                else if (q.data?.taskType === 'TASK_1_MAP') formatLabel = 'TASK 1: MAP';
                else if (q.data?.taskType === 'TASK_1_PIE') formatLabel = 'TASK 1: PIE CHART';
                else if (q.data?.taskType === 'TASK_1_GENERAL') formatLabel = 'TASK 1: GENERAL LETTER';
                else if (q.data?.taskType === 'TASK_1_GRAPH') formatLabel = 'TASK 1: GRAPH / CHART';
              } else {
                if (q.data?.taskType === 'TASK_2_TWO_PART') formatLabel = 'TASK 2: TWO-PART';
                else if (q.data?.taskType === 'TASK_2_PROBLEM_SOLUTION') formatLabel = 'TASK 2: PROBLEM & SOLUTION';
                else if (q.data?.taskType === 'TASK_2_ADVANTAGES_DISADVANTAGES') formatLabel = 'TASK 2: ADVANTAGES / DISADVANTAGES';
                else formatLabel = 'TASK 2: DISCURSIVE ESSAY';
              }

              const accentColor = isQTask1 ? '#0ea5e9' : '#8b5cf6';
              const accentBg = isQTask1 ? 'rgba(14, 165, 233, 0.12)' : 'rgba(139, 92, 246, 0.12)';
              const accentBorder = isQTask1 ? 'rgba(14, 165, 233, 0.3)' : 'rgba(139, 92, 246, 0.3)';

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
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: accentBg,
                            color: accentColor,
                            border: `1px solid ${accentBorder}`,
                            letterSpacing: '0.3px',
                          }}
                        >
                          {formatLabel}
                        </span>
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
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              q.difficulty === 'EASY'
                                ? '#10b981'
                                : q.difficulty === 'MEDIUM'
                                ? '#f59e0b'
                                : '#ef4444',
                          }}
                        >
                          {q.difficulty}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {q.marks || 9} {t('marks', 'Marks')}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 10px 0', lineHeight: 1.45 }}>
                      {q.content}
                    </h3>

                    {/* Visual Stimulus Preview for Task 1 */}
                    {qImageUrl && (
                      <div
                        style={{
                          margin: '12px 0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-color)',
                          background: '#0a0f1d',
                          position: 'relative',
                          cursor: 'pointer',
                          height: '140px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnlargedImageUrl(qImageUrl);
                          setImageModalZoom(1.0);
                        }}
                        title={t('click_to_zoom', 'Click to Enlarge Visual Stimulus Diagram')}
                      >
                        <img
                          src={qImageUrl}
                          alt="Visual Stimulus Diagram"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            padding: '6px',
                            boxSizing: 'border-box',
                          }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '6px',
                            left: '6px',
                            background: 'rgba(14, 165, 233, 0.9)',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>📊</span> {t('task_stimulus_chart', 'Task 1 Visual Diagram')}
                        </div>
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '6px',
                            right: '6px',
                            background: 'rgba(0,0,0,0.75)',
                            color: '#0ea5e9',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                          }}
                        >
                          🔍 {t('preview_enlarge', 'Zoom')}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          fontWeight: 500,
                        }}
                      >
                        {q.courseName || 'IELTS Preparation'}
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
                        📏 {qMinWords}–{qMaxWords} {t('words', 'words')}
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
                        ⏱️ {qMinutes} {t('minutes_abbrev', 'min')}
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
                      background: isQTask1 ? '#0ea5e9' : '#8b5cf6',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    ▶️ {isQTask1 ? t('start_task1', 'Start Task 1 Practice') : t('start_task2', 'Start Task 2 Practice')}
                  </button>
                </div>
              );
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* SECTION 1: TASK 1 */}
                {(selectedTaskTypeFilter === 'ALL' || selectedTaskTypeFilter === 'TASK_1') && (
                  <div id="section-task-1" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Task 1 Section Banner */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(14, 165, 233, 0.02) 100%)',
                        border: '1px solid rgba(14, 165, 233, 0.25)',
                        borderRadius: '10px',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '22px' }}>📊</span>
                          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                            {t('task_1_section_title', 'IELTS Writing Task 1')}
                          </h2>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#0ea5e9',
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: '10px',
                            }}
                          >
                            {task1Questions.length} {t('questions_badge', 'Questions')}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          {t('task_1_section_desc', 'Academic report synthesis: Summarise data from bar charts, line graphs, pie charts, comparative tables, process workflows & maps (or General Training letter prompts).')}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                          ⏱️ <strong>20</strong> min
                        </span>
                        <span style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                          📏 <strong>150+</strong> words
                        </span>
                        <span style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                          ⚖️ <strong>33%</strong> weight
                        </span>
                      </div>
                    </div>

                    {/* Task 1 Cards Grid */}
                    {task1Questions.length > 0 ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                          gap: '16px',
                        }}
                      >
                        {task1Questions.map(renderCard)}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '36px 20px',
                          textAlign: 'center',
                          background: 'var(--panel-bg)',
                          borderRadius: '8px',
                          border: '1px dashed var(--border-color)',
                          color: 'var(--text-muted)',
                          fontSize: '13px',
                        }}
                      >
                        {t('no_task1_match', 'No Task 1 questions match your active filters or search.')}
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 2: TASK 2 */}
                {(selectedTaskTypeFilter === 'ALL' || selectedTaskTypeFilter === 'TASK_2') && (
                  <div
                    id="section-task-2"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      marginTop: selectedTaskTypeFilter === 'ALL' ? '12px' : '0',
                    }}
                  >
                    {/* Task 2 Section Banner */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.02) 100%)',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        borderRadius: '10px',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '22px' }}>📝</span>
                          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                            {t('task_2_section_title', 'IELTS Writing Task 2')}
                          </h2>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#8b5cf6',
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: '10px',
                            }}
                          >
                            {task2Questions.length} {t('questions_badge', 'Questions')}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          {t('task_2_section_desc', 'Formal discursive essay: Formulate clear positions, substantiate arguments with evidence, and evaluate diverse perspectives across modern academic topics.')}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                          ⏱️ <strong>40</strong> min
                        </span>
                        <span style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                          📏 <strong>250+</strong> words
                        </span>
                        <span style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                          ⚖️ <strong>67%</strong> weight
                        </span>
                      </div>
                    </div>

                    {/* Task 2 Cards Grid */}
                    {task2Questions.length > 0 ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                          gap: '16px',
                        }}
                      >
                        {task2Questions.map(renderCard)}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '36px 20px',
                          textAlign: 'center',
                          background: 'var(--panel-bg)',
                          borderRadius: '8px',
                          border: '1px dashed var(--border-color)',
                          color: 'var(--text-muted)',
                          fontSize: '13px',
                        }}
                      >
                        {t('no_task2_match', 'No Task 2 questions match your active filters or search.')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Overall Empty State (both sections empty) */}
          {baseFilteredQuestions.length === 0 && !loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'var(--panel-bg)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                {t('no_writing_drills_title', 'No Writing Prompts Found')}
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>
                {searchQuery
                  ? t('no_search_results', `No writing questions match your search for "${searchQuery}".`)
                  : t('no_writing_drills', 'No writing prompts available for your enrolled course(s).')}
              </p>
              {(searchQuery || selectedCourseFilter || selectedTaskTypeFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCourseFilter('');
                    setSelectedTaskTypeFilter('ALL');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🔄 {t('reset_filters', 'Reset All Filters')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ATTEMPT TAKING VIEW (ISOLATED DEDICATED FULLSCREEN WINDOW) */}
      {activeView === 'ATTEMPT' && activeQuestion && (
        <div
          id="writing-exam-fullscreen-container"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: '#0b0f19',
            color: '#f0f6fc',
            display: 'flex',
            flexDirection: 'column',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
          }}
        >
          {(() => {
            const isTask1Attempt = Boolean(
              activeQuestion?.data?.taskType?.startsWith('TASK_1') ||
              activeQuestion?.taskType?.startsWith('TASK_1') ||
              activeQuestion?.data?.preset === 'IELTS_TASK_1' ||
              (activeQuestion?.content && /task\s*1/i.test(activeQuestion.content)) ||
              minWords <= 200
            );
            const taskTitle = isTask1Attempt
              ? 'IELTS Academic Writing — Task 1 (Data Report)'
              : 'IELTS Academic Writing — Task 2 (Argumentative Essay)';
            const recommendedMins = activeQuestion?.data?.recommendedMinutes || (isTask1Attempt ? 20 : 40);

            if (!hasAcceptedRules) {
              return (
                <div
                  id="writing-rules-onboarding-screen"
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px 20px',
                    background: 'radial-gradient(ellipse at top, #1e293b 0%, #0b0f19 100%)',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '760px',
                      width: '100%',
                      background: '#161b22',
                      borderRadius: '16px',
                      border: '1px solid #30363d',
                      padding: '36px 40px',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '24px',
                    }}
                  >
                    {/* Top Header */}
                    <div style={{ textAlign: 'center', borderBottom: '1px solid #21262d', paddingBottom: '20px' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#10b981',
                          fontSize: '12px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '12px',
                        }}
                      >
                        <span>✍️</span> {t('official_cd_ielts_exam', 'Official CD-IELTS Examination')}
                      </div>
                      <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', color: '#f0f6fc' }}>
                        {taskTitle}
                      </h1>
                      <p style={{ fontSize: '14px', color: '#8b949e', margin: 0 }}>
                        {t('writing_rules_subtitle', 'Review the examination specifications and candidate conduct rules before beginning.')}
                      </p>
                    </div>

                    {/* 4 Summary Spec Badges */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', fontWeight: 600 }}>{t('allocated_time', 'Allocated Time')}</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>{recommendedMins} min</div>
                      </div>
                      <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', fontWeight: 600 }}>{t('min_word_limit', 'Minimum Words')}</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{minWords} words</div>
                      </div>
                      <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', fontWeight: 600 }}>{t('grading_scale', 'Evaluation Scale')}</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#a855f7', marginTop: '4px' }}>Band 1.0 – 9.0</div>
                      </div>
                      <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', fontWeight: 600 }}>{t('draft_protection', 'Draft Protection')}</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>Autosaved</div>
                      </div>
                    </div>

                    {/* Rules list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6fc', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {t('candidate_exam_guidelines', 'Candidate Examination Instructions')}:
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#c9d1d9', lineHeight: 1.55 }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#0d1117', padding: '12px 14px', borderRadius: '8px', border: '1px solid #21262d' }}>
                          <span style={{ fontSize: '16px' }}>⏳</span>
                          <div>
                            <strong style={{ color: '#f0f6fc' }}>1. {t('rule_timed_env', 'Timed Environment')}:</strong>{' '}
                            {t('rule_timed_desc', 'Once you begin, the countdown timer starts immediately. Manage your time effectively to leave at least 3 minutes for proofreading.')}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#0d1117', padding: '12px 14px', borderRadius: '8px', border: '1px solid #21262d' }}>
                          <span style={{ fontSize: '16px' }}>✍️</span>
                          <div>
                            <strong style={{ color: '#f0f6fc' }}>2. {t('rule_composition', 'Independent Composition')}:</strong>{' '}
                            {t('rule_composition_desc', 'Write your own response directly in the provided editor. External assistance, spellcheck extensions, or copying pre-prepared materials is prohibited.')}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#0d1117', padding: '12px 14px', borderRadius: '8px', border: '1px solid #21262d' }}>
                          <span style={{ fontSize: '16px' }}>🎯</span>
                          <div>
                            <strong style={{ color: '#f0f6fc' }}>3. {t('rule_wordcount', 'Word Count Compliance')}:</strong>{' '}
                            {t('rule_wordcount_desc', `You must write at least ${minWords} words. Writing fewer than the required minimum will incur an underlength penalty on your score.`)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#0d1117', padding: '12px 14px', borderRadius: '8px', border: '1px solid #21262d' }}>
                          <span style={{ fontSize: '16px' }}>⚖️</span>
                          <div>
                            <strong style={{ color: '#f0f6fc' }}>4. {t('rule_criteria', '4-Criteria Evaluation')}:</strong>{' '}
                            {t('rule_criteria_desc', 'Your essay will be evaluated on Task Achievement/Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy.')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Honor Declaration Checkbox */}
                    <div
                      style={{
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '10px',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <input
                        type="checkbox"
                        id="checkbox-accept-writing-rules"
                        checked={rulesAgreedCheckbox}
                        onChange={(e) => setRulesAgreedCheckbox(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                      />
                      <label htmlFor="checkbox-accept-writing-rules" style={{ fontSize: '13px', color: '#f0f6fc', cursor: 'pointer', lineHeight: 1.4 }}>
                        {t('honor_declaration_text', 'I declare that I have read and agree to the examination instructions, timing constraints, and evaluation criteria. I am ready to begin my writing exam.')}
                      </label>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          isSubmittedRef.current = true;
                          try {
                            if (user?.id) localStorage.removeItem(getUserDraftKey(user.id));
                            localStorage.removeItem(DRAFT_STORAGE_KEY);
                          } catch {}
                          setActiveView('CATALOG');
                          setEssayText('');
                          setActiveQuestion(null);
                          setActiveSession(null);
                        }}
                        style={{
                          padding: '12px 20px',
                          borderRadius: '8px',
                          border: '1px solid #30363d',
                          background: 'transparent',
                          color: '#8b949e',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✕ {t('cancel_return_catalog', 'Cancel & Return to Catalog')}
                      </button>

                      <button
                        type="button"
                        id="btn-accept-rules-start-writing"
                        disabled={!rulesAgreedCheckbox}
                        onClick={() => setHasAcceptedRules(true)}
                        style={{
                          padding: '14px 32px',
                          borderRadius: '8px',
                          border: 'none',
                          background: rulesAgreedCheckbox ? '#10b981' : '#30363d',
                          color: rulesAgreedCheckbox ? '#ffffff' : '#8b949e',
                          fontWeight: 700,
                          fontSize: '15px',
                          cursor: rulesAgreedCheckbox ? 'pointer' : 'not-allowed',
                          boxShadow: rulesAgreedCheckbox ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        🚀 {t('accept_rules_and_begin', 'Accept Rules & Begin Writing Exam')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                id="writing-exam-studio"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                {/* Top Exam Control Bar */}
                <header
                  id="writing-exam-header-bar"
                  style={{
                    height: '52px',
                    background: '#161b22',
                    borderBottom: '1px solid #30363d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 20px',
                    flexShrink: 0,
                    zIndex: 10,
                  }}
                >
                  {/* Left: Task Identity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      CD-IELTS
                    </span>
                    <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#f0f6fc' }}>
                      {taskTitle}
                    </h2>
                  </div>

                  {/* Center: Live Countdown Timer */}
                  <div
                    id="writing-exam-countdown-timer"
                    title="Remaining Examination Time"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: timeRemainingSeconds <= 300 ? 'rgba(239, 68, 68, 0.15)' : '#0d1117',
                      border: `1px solid ${timeRemainingSeconds <= 300 ? '#ef4444' : '#30363d'}`,
                      borderRadius: '8px',
                      padding: '6px 16px',
                      color: timeRemainingSeconds <= 300 ? '#ef4444' : '#38bdf8',
                      fontWeight: 800,
                      fontSize: '16px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <span>⏳</span>
                    <span>{formatTimer(timeRemainingSeconds)}</span>
                    {timeRemainingSeconds <= 300 && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                        {t('time_low', 'Time Low')}
                      </span>
                    )}
                  </div>

                  {/* Right: Controls & Exit */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Font Size Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '2px 4px', gap: '2px' }}>
                      <button
                        type="button"
                        onClick={() => setEditorFontSize('sm')}
                        title={t('font_small', 'Small Font')}
                        style={{
                          padding: '3px 7px',
                          border: 'none',
                          borderRadius: '4px',
                          background: editorFontSize === 'sm' ? '#238636' : 'transparent',
                          color: editorFontSize === 'sm' ? '#fff' : '#8b949e',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        A-
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorFontSize('md')}
                        title={t('font_medium', 'Normal Font')}
                        style={{
                          padding: '3px 7px',
                          border: 'none',
                          borderRadius: '4px',
                          background: editorFontSize === 'md' ? '#238636' : 'transparent',
                          color: editorFontSize === 'md' ? '#fff' : '#8b949e',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorFontSize('lg')}
                        title={t('font_large', 'Large Font')}
                        style={{
                          padding: '3px 7px',
                          border: 'none',
                          borderRadius: '4px',
                          background: editorFontSize === 'lg' ? '#238636' : 'transparent',
                          color: editorFontSize === 'lg' ? '#fff' : '#8b949e',
                          fontSize: '15px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        A+
                      </button>
                    </div>

                    {/* Exit Exam Button */}
                    <button
                      type="button"
                      id="btn-cancel-writing-attempt"
                      onClick={() => setShowExitConfirmModal(true)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #30363d',
                        background: 'transparent',
                        color: '#8b949e',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      ✕ {t('exit_exam', 'Exit Exam')}
                    </button>
                  </div>
                </header>

                {/* 50/50 Dual-Pane Content Body */}
                <div
                  style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    height: 'calc(100% - 52px - 54px)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Left Pane (50%): Prompt stimulus, visual charts & rubric criteria */}
                  <div
                    id="writing-exam-left-pane"
                    style={{
                      borderRight: '1px solid #30363d',
                      background: '#161b22',
                      padding: '24px 28px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                    }}
                  >
                    {/* Task Stimulus Card */}
                    <div
                      style={{
                        background: '#0d1117',
                        border: '1px solid #30363d',
                        borderRadius: '10px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {t('task_instructions', 'Task Instructions')}
                        </span>
                        <span style={{ fontSize: '12px', color: '#8b949e' }}>
                          {t('target_min', 'Min')}: <strong style={{ color: '#f0f6fc' }}>{minWords} {t('words', 'words')}</strong>
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          lineHeight: 1.65,
                          color: '#f0f6fc',
                          fontWeight: 500,
                        }}
                      >
                        {activeQuestion.data?.promptStem || activeQuestion.content}
                      </div>
                    </div>

                    {/* Task Stimulus Chart / Diagram (IELTS Task 1 & Visual Stimuli) */}
                    {(() => {
                      const stimulusUrl =
                        activeQuestion?.data?.promptImageUrl ||
                        activeQuestion?.promptImageUrl ||
                        activeQuestion?.data?.imageUrl ||
                        activeQuestion?.data?.stimulusImageUrl ||
                        null;

                      if (!stimulusUrl) return null;

                      return (
                        <div
                          style={{
                            background: '#0d1117',
                            border: '1px solid #30363d',
                            borderRadius: '10px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#f0f6fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>📊</span> {t('task_stimulus_chart', 'Task Stimulus Chart / Diagram')}:
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {/* Inline Zoom Controls */}
                              <div style={{ display: 'flex', alignItems: 'center', background: '#161b22', borderRadius: '6px', border: '1px solid #30363d', padding: '2px 4px', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => setInlineChartZoom((z) => Math.max(0.7, Number((z - 0.2).toFixed(1))))}
                                  title={t('zoom_out', 'Zoom Out')}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#f0f6fc',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  –
                                </button>
                                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, minWidth: '36px', textAlign: 'center' }}>
                                  {Math.round(inlineChartZoom * 100)}%
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setInlineChartZoom((z) => Math.min(2.5, Number((z + 0.2).toFixed(1))))}
                                  title={t('zoom_in', 'Zoom In')}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#f0f6fc',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInlineChartZoom(1.0)}
                                  title={t('reset_zoom', 'Reset Zoom')}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#8b949e',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    padding: '2px 4px',
                                  }}
                                >
                                  ↺
                                </button>
                              </div>

                              <button
                                type="button"
                                id="btn-enlarge-stimulus-chart"
                                onClick={() => {
                                  setEnlargedImageUrl(stimulusUrl);
                                  setImageModalZoom(1.0);
                                }}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  border: '1px solid #38bdf8',
                                  color: '#38bdf8',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span>🔍</span> {t('enlarge_fullscreen', 'Fullscreen')}
                              </button>
                            </div>
                          </div>

                          <div
                            onClick={() => {
                              setEnlargedImageUrl(stimulusUrl);
                              setImageModalZoom(1.0);
                            }}
                            style={{
                              background: '#0f172a',
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid #30363d',
                              textAlign: 'center',
                              cursor: 'zoom-in',
                              position: 'relative',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '100%',
                              boxSizing: 'border-box',
                            }}
                            title={t('click_to_zoom', 'Click to Enlarge Chart / Diagram')}
                          >
                            <img
                              src={stimulusUrl}
                              alt="Writing Task Stimulus"
                              style={{
                                transform: `scale(${inlineChartZoom})`,
                                transformOrigin: 'center center',
                                transition: 'transform 0.15s ease-out',
                                width: '100%',
                                height: 'auto',
                                maxHeight: inlineChartZoom <= 1.0 ? '580px' : undefined,
                                objectFit: 'contain',
                                borderRadius: '6px',
                                display: 'block',
                              }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '8px',
                                right: '8px',
                                background: 'rgba(0,0,0,0.75)',
                                color: '#38bdf8',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                              }}
                            >
                              🔍 {t('click_to_zoom', 'Click to Enlarge')}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Background Context (if present) */}
                    {activeQuestion.data?.context && (
                      <div
                        style={{
                          background: '#0d1117',
                          border: '1px solid #30363d',
                          borderRadius: '8px',
                          padding: '14px 16px',
                        }}
                      >
                        <h4 style={{ fontSize: '12px', fontWeight: 700, margin: '0 0 6px 0', color: '#8b949e', textTransform: 'uppercase' }}>
                          {t('background_context', 'Background Context')}:
                        </h4>
                        <p style={{ fontSize: '13px', lineHeight: 1.5, margin: 0, color: '#c9d1d9' }}>
                          {activeQuestion.data.context}
                        </p>
                      </div>
                    )}

                    {/* Assessment Criteria (Rubrics) Accordion */}
                    <div
                      style={{
                        background: '#0d1117',
                        border: '1px solid #30363d',
                        borderRadius: '10px',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setRubricsExpanded(!rubricsExpanded)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          color: '#f0f6fc',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>📋</span> {t('assessment_rubrics', 'Official Assessment Criteria')}
                        </span>
                        <span style={{ color: '#8b949e', fontSize: '12px' }}>
                          {rubricsExpanded ? '▲ Hide' : '▼ Show'}
                        </span>
                      </button>

                      {rubricsExpanded && (
                        <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {((activeQuestion.data?.rubrics && activeQuestion.data.rubrics.length > 0)
                            ? activeQuestion.data.rubrics
                            : [
                                { id: 'TA', name: isTask1Attempt ? 'Task Achievement' : 'Task Response', description: 'Degree to which the prompt requirements, main trends, or arguments are fully addressed.' },
                                { id: 'CC', name: 'Coherence and Cohesion', description: 'Logical organization of ideas, clear progression, paragraphing, and appropriate cohesive devices.' },
                                { id: 'LR', name: 'Lexical Resource', description: 'Range and precision of vocabulary, collocation awareness, and minimal spelling errors.' },
                                { id: 'GRA', name: 'Grammatical Range and Accuracy', description: 'Variety of complex sentence structures with accurate grammar and punctuation.' },
                              ]
                          ).map((r: any) => (
                            <div
                              key={r.id || r.name}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #21262d',
                                background: '#161b22',
                                fontSize: '12px',
                              }}
                            >
                              <div style={{ fontWeight: 700, color: '#10b981' }}>{r.name}</div>
                              <div style={{ color: '#8b949e', marginTop: '2px', lineHeight: 1.4 }}>{r.description}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Pane (50%): Full-height Writing Studio */}
                  <div
                    id="writing-exam-right-pane"
                    style={{
                      background: '#0d1117',
                      padding: '20px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                    }}
                  >
                    <ExamWritingEditor
                      value={essayText}
                      onChange={setEssayText}
                      onAutoSave={handleAutoSaveDraft}
                      autoSaveIntervalMs={2000}
                      minWords={minWords}
                      maxWords={maxWords}
                      fontSize={editorFontSize}
                      fullHeight={true}
                      hideHeaderStats={true}
                      placeholder={t('begin_composition_placeholder', 'Begin composing your response here...')}
                    />
                  </div>
                </div>

                {/* Pinned Bottom Status Bar */}
                <footer
                  id="writing-exam-bottom-bar"
                  style={{
                    height: '54px',
                    background: '#161b22',
                    borderTop: '1px solid #30363d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 24px',
                    flexShrink: 0,
                    zIndex: 10,
                  }}
                >
                  {/* Left: Live Word & Paragraph Metrics */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#8b949e' }}>{t('words_label', 'Word Count')}:</span>
                      <span
                        data-testid="writing-word-count"
                        style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          color: essayWordCount >= minWords ? '#10b981' : '#f59e0b',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: essayWordCount >= minWords ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          border: `1px solid ${essayWordCount >= minWords ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                        }}
                      >
                        {essayWordCount}
                      </span>
                      <span style={{ fontSize: '12px', color: '#8b949e' }}>
                        / {minWords} {t('min_required', 'min required')}
                      </span>
                    </div>

                    <div style={{ height: '16px', width: '1px', background: '#30363d' }} />

                    <div style={{ fontSize: '12px', color: '#8b949e' }}>
                      {paragraphCount} {paragraphCount === 1 ? t('paragraph', 'paragraph') : t('paragraphs', 'paragraphs')}
                    </div>

                    <div style={{ height: '16px', width: '1px', background: '#30363d' }} />

                    {/* Autosave timestamp */}
                    <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>☁️</span>
                      <span>{lastAutoSavedTime ? `${t('autosaved_at', 'Saved at')} ${lastAutoSavedTime}` : t('autosave_active', 'Autosave active')}</span>
                    </div>
                  </div>

                  {/* Right: Submit Button */}
                  <button
                    id="btn-submit-writing-attempt"
                    type="button"
                    onClick={handleOpenSubmitConfirm}
                    disabled={isSubmitting || !essayText.trim()}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#10b981',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: isSubmitting || !essayText.trim() ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting || !essayText.trim() ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: isSubmitting || !essayText.trim() ? 'none' : '0 2px 10px rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                        <span>{t('evaluating_essay', 'Evaluating Essay...')}</span>
                      </>
                    ) : (
                      <>
                        <span>✓</span>
                        <span>{t('submit_writing_drill', 'Submit Essay for AI Evaluation')}</span>
                      </>
                    )}
                  </button>
                </footer>

                {/* Exit Confirmation Modal */}
                {showExitConfirmModal && (
                  <div
                    id="modal-exit-writing-confirm"
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 100001,
                      padding: '20px',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '460px',
                        width: '100%',
                        background: '#161b22',
                        border: '1px solid #30363d',
                        borderRadius: '12px',
                        padding: '24px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>⚠️</span>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f0f6fc' }}>
                          {t('exit_exam_modal_title', 'Exit Examination Session?')}
                        </h3>
                      </div>
                      <p style={{ fontSize: '13px', color: '#8b949e', margin: 0, lineHeight: 1.5 }}>
                        {t('exit_exam_modal_desc', 'Your current in-progress draft will be discarded and your active timer will end. Are you sure you wish to exit to the catalog?')}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setShowExitConfirmModal(false)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid #30363d',
                            background: 'transparent',
                            color: '#f0f6fc',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {t('continue_exam', 'Resume Writing')}
                        </button>
                        <button
                          type="button"
                          id="btn-confirm-exit-writing"
                          onClick={() => {
                            isSubmittedRef.current = true;
                            try {
                              if (user?.id) localStorage.removeItem(getUserDraftKey(user.id));
                              localStorage.removeItem(DRAFT_STORAGE_KEY);
                            } catch {}
                            setShowExitConfirmModal(false);
                            setActiveView('CATALOG');
                            setEssayText('');
                            setActiveQuestion(null);
                            setActiveSession(null);
                          }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#ef4444',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {t('confirm_exit_discard', 'Exit & Discard Draft')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Confirmation Modal (Yes / No) */}
                {showSubmitConfirmModal && (
                  <div
                    id="modal-submit-writing-confirm"
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.78)',
                      backdropFilter: 'blur(6px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 100002,
                      padding: '20px',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '520px',
                        width: '100%',
                        background: '#161b22',
                        border: '1px solid #30363d',
                        borderRadius: '12px',
                        padding: '24px',
                        boxShadow: '0 20px 30px rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '26px' }}>📝</span>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f0f6fc' }}>
                            {t('confirm_submit_title', 'Submit Essay for AI Evaluation?')}
                          </h3>
                          <p style={{ fontSize: '12px', color: '#8b949e', margin: '3px 0 0 0' }}>
                            {t('confirm_submit_subtitle', 'Please verify your word count and paragraphs before submitting.')}
                          </p>
                        </div>
                      </div>

                      {/* Word & Paragraph Metrics Box */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '12px',
                          background: '#0d1117',
                          padding: '14px',
                          borderRadius: '8px',
                          border: '1px solid #21262d',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', fontWeight: 600 }}>
                            {t('word_count', 'Word Count')}
                          </div>
                          <div
                            style={{
                              fontSize: '18px',
                              fontWeight: 800,
                              color: essayWordCount >= minWords ? '#10b981' : '#f59e0b',
                              marginTop: '2px',
                            }}
                          >
                            {essayWordCount} <span style={{ fontSize: '12px', color: '#8b949e', fontWeight: 500 }}>/ {minWords} {t('min_required', 'min required')}</span>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', fontWeight: 600 }}>
                            {t('paragraph_count', 'Paragraphs')}
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f0f6fc', marginTop: '2px' }}>
                            {paragraphCount}
                          </div>
                        </div>
                      </div>

                      {/* Under-length warning or Word count met notice */}
                      {essayWordCount < minWords ? (
                        <div
                          style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#fbbf24',
                            fontSize: '13px',
                            lineHeight: 1.5,
                            display: 'flex',
                            gap: '10px',
                          }}
                        >
                          <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
                          <div>
                            <strong>{t('under_length_warning', 'Under-Length Warning')}:</strong>{' '}
                            {t(
                              'under_length_explanation',
                              `Your essay currently has ${essayWordCount} words, which is under the minimum requirement of ${minWords} words. Submitting an under-length essay incurs penalty deductions on Task Achievement / Task Response under official IELTS descriptors.`
                            )}
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#34d399',
                            fontSize: '13px',
                            lineHeight: 1.5,
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>✓</span>
                          <div>
                            <strong>{t('length_satisfied', 'Word Count Met')}:</strong>{' '}
                            {t('length_satisfied_msg', `Your essay meets the minimum requirement of ${minWords} words.`)}
                          </div>
                        </div>
                      )}

                      <p style={{ fontSize: '12px', color: '#8b949e', margin: 0, lineHeight: 1.5 }}>
                        {t(
                          'confirm_submit_notice',
                          'Once you confirm, you will be taken to the analyzing screen where you can view your submitted response alongside the question while the AI examiner evaluates your test.'
                        )}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                        <button
                          type="button"
                          id="btn-cancel-submit-essay"
                          onClick={() => setShowSubmitConfirmModal(false)}
                          style={{
                            padding: '10px 18px',
                            borderRadius: '6px',
                            border: '1px solid #30363d',
                            background: 'transparent',
                            color: '#f0f6fc',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {t('cancel_keep_writing', 'No, Keep Writing')}
                        </button>
                        <button
                          type="button"
                          id="btn-confirm-submit-essay"
                          onClick={handleConfirmSubmit}
                          style={{
                            padding: '10px 22px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#10b981',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 12px rgba(16, 185, 129, 0.4)',
                          }}
                        >
                          <span>✓</span>
                          <span>{t('confirm_submit_btn', 'Yes, Submit Essay')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* DEDICATED ANALYZING / LOADING SCREEN */}
      {activeView === 'ANALYZING' && (
        <div
          id="writing-analyzing-screen"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: '#0b0f19',
            color: '#f0f6fc',
            display: 'flex',
            flexDirection: 'column',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
          }}
        >
          {(() => {
            const isTask1Analyzing = Boolean(
              activeQuestion?.data?.taskType?.startsWith('TASK_1') ||
              activeQuestion?.taskType?.startsWith('TASK_1') ||
              activeQuestion?.data?.preset === 'IELTS_TASK_1' ||
              (activeQuestion?.content && /task\s*1/i.test(activeQuestion.content)) ||
              minWords <= 200
            );
            const analyzingImageUrl =
              activeQuestion?.data?.promptImageUrl ||
              activeQuestion?.promptImageUrl ||
              activeQuestion?.data?.imageUrl ||
              null;

            const pipelineStages = [
              { label: t('stage_metrics', 'Text Structure & Metrics'), desc: t('stage_metrics_desc', 'Length & paragraph validation') },
              { label: t('stage_grounding', 'Visual Grounding & Prompt Coverage'), desc: t('stage_grounding_desc', 'Fact checking & key trend coverage') },
              { label: t('stage_lexical', 'Lexical & Syntactic Diagnostic'), desc: t('stage_lexical_desc', 'Vocabulary range, collocations & grammar') },
              { label: t('stage_descriptors', 'Examiner Descriptors & Scoring'), desc: t('stage_descriptors_desc', 'Band scores & detailed annotations') },
            ];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {/* Header */}
                <header
                  style={{
                    padding: '14px 24px',
                    borderBottom: '1px solid #21262d',
                    background: '#161b22',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '22px' }}>🤖</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f0f6fc' }}>
                          {t('analyzing_title', 'AI Examiner Evaluating Essay')}
                        </h1>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#60a5fa',
                            fontWeight: 600,
                          }}
                        >
                          {isTask1Analyzing ? 'IELTS Task 1 (Academic)' : 'IELTS Task 2 (Essay)'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '2px' }}>
                        {t('analyzing_subtitle', 'Evaluating response against official IELTS Band Descriptors (TR/TA, CC, LR, GRA)')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#0d1117',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid #30363d',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        color: '#e6edf3',
                      }}
                    >
                      <span>⏱️</span>
                      <span>{t('elapsed', 'Elapsed')}: {analyzingElapsedSeconds}s</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.1)',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      <span className="spinner" style={{ display: 'inline-block', width: '10px', height: '10px', border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      <span>qwen3.5-ielts</span>
                    </div>
                  </div>
                </header>

                {/* Animated Pipeline Stages Bar */}
                <div
                  style={{
                    padding: '16px 24px',
                    background: '#0d1117',
                    borderBottom: '1px solid #21262d',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      height: '4px',
                      width: '100%',
                      background: '#21262d',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      marginBottom: '14px',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(96, 20 + analyzingElapsedSeconds * 3.2)}%`,
                        background: 'linear-gradient(90deg, #3b82f6, #10b981, #6366f1)',
                        borderRadius: '2px',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {pipelineStages.map((stage, idx) => {
                      const isDone = analyzingStepIndex > idx;
                      const isCurrent = analyzingStepIndex === idx;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: isCurrent ? 'rgba(59, 130, 246, 0.12)' : isDone ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                            border: isCurrent ? '1px solid #3b82f6' : isDone ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #21262d',
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 700,
                              flexShrink: 0,
                              marginTop: '2px',
                              background: isDone ? '#10b981' : isCurrent ? '#3b82f6' : '#21262d',
                              color: isDone || isCurrent ? '#fff' : '#8b949e',
                            }}
                          >
                            {isDone ? '✓' : isCurrent ? (
                              <span className="spinner" style={{ display: 'inline-block', width: '10px', height: '10px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: isCurrent ? '#93c5fd' : isDone ? '#6ee7b7' : '#8b949e',
                              }}
                            >
                              {stage.label}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6e7681', marginTop: '2px', lineHeight: 1.3 }}>
                              {stage.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Analysis Error Alert (if failure occurs) */}
                {analysisError && (
                  <div
                    style={{
                      margin: '16px 24px 0 24px',
                      padding: '14px 18px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>⚠️</span>
                      <div>
                        <strong>{t('evaluation_error', 'Evaluation Error')}:</strong> {analysisError}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        id="btn-retry-analysis"
                        onClick={executeSubmitAttempt}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#ef4444',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        🔄 {t('retry_analysis', 'Retry Analysis')}
                      </button>
                      <button
                        type="button"
                        id="btn-return-editor"
                        onClick={handleReturnToEditor}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: '1px solid #30363d',
                          background: '#21262d',
                          color: '#f0f6fc',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ {t('return_to_editor', 'Return to Editor')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Two-Column Review Layout: Prompt & Stimulus on Left, Answer on Right */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'grid',
                    gridTemplateColumns: 'minmax(340px, 42%) 1fr',
                    gap: '16px',
                    padding: '20px 24px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Left Column: Task Prompt & Stimulus Reference */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      background: '#161b22',
                      border: '1px solid #30363d',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '14px 18px',
                        background: '#1c2128',
                        borderBottom: '1px solid #30363d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📋</span>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#f0f6fc' }}>
                          {t('exam_prompt_reference', 'Task Question & Instructions')}
                        </h3>
                      </div>
                      <span style={{ fontSize: '11px', color: '#8b949e' }}>
                        {minWords} {t('words_minimum', 'words minimum')}
                      </span>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
                      <div
                        style={{
                          fontSize: '14px',
                          lineHeight: 1.6,
                          color: '#f0f6fc',
                          fontWeight: 500,
                          marginBottom: '16px',
                        }}
                      >
                        {activeQuestion?.content}
                      </div>

                      {/* Visual Stimulus diagram if Task 1 */}
                      {analyzingImageUrl && (
                        <div
                          style={{
                            marginTop: '12px',
                            background: '#0d1117',
                            borderRadius: '8px',
                            border: '1px solid #30363d',
                            padding: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#58a6ff' }}>
                              📊 {t('visual_stimulus_chart', 'Visual Stimulus Diagram')}
                            </span>
                            <button
                              type="button"
                              id="btn-zoom-analyzing-chart"
                              onClick={() => {
                                setImageModalZoom(1.0);
                                setEnlargedImageUrl(analyzingImageUrl);
                              }}
                              style={{
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: '#60a5fa',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              🔍 {t('zoom_chart', 'Zoom Chart')}
                            </button>
                          </div>
                          <img
                            src={analyzingImageUrl}
                            alt="Task Stimulus"
                            style={{
                              width: '100%',
                              maxHeight: '260px',
                              objectFit: 'contain',
                              borderRadius: '6px',
                              background: '#ffffff',
                              padding: '6px',
                              boxSizing: 'border-box',
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              setImageModalZoom(1.0);
                              setEnlargedImageUrl(analyzingImageUrl);
                            }}
                          />
                        </div>
                      )}

                      {/* Official Criteria Reference */}
                      <div
                        style={{
                          marginTop: '18px',
                          padding: '14px',
                          borderRadius: '8px',
                          background: '#0d1117',
                          border: '1px solid #21262d',
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#8b949e', marginBottom: '8px', textTransform: 'uppercase' }}>
                          {t('scoring_criteria_evaluated', 'Scoring Criteria Evaluated')}
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#c9d1d9', lineHeight: 1.7 }}>
                          <li><strong style={{ color: '#58a6ff' }}>Task Achievement / Response (25%):</strong> Data reporting, overview, prompt coverage</li>
                          <li><strong style={{ color: '#58a6ff' }}>Coherence & Cohesion (25%):</strong> Paragraphing, progression, logical connectors</li>
                          <li><strong style={{ color: '#58a6ff' }}>Lexical Resource (25%):</strong> Precision, academic collocations, spelling accuracy</li>
                          <li><strong style={{ color: '#58a6ff' }}>Grammatical Range & Accuracy (25%):</strong> Sentence structures, complex clauses</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Submitted Answer (Read-Only) */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      background: '#161b22',
                      border: '1px solid #30363d',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '14px 18px',
                        background: '#1c2128',
                        borderBottom: '1px solid #30363d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>✍️</span>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#f0f6fc' }}>
                          {t('your_submitted_answer', 'Your Submitted Essay')}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: (submittedSnapshot?.wordCount || essayWordCount) >= minWords ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: (submittedSnapshot?.wordCount || essayWordCount) >= minWords ? '#34d399' : '#fbbf24',
                            fontWeight: 600,
                            border: `1px solid ${(submittedSnapshot?.wordCount || essayWordCount) >= minWords ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          }}
                        >
                          {submittedSnapshot?.wordCount || essayWordCount} words
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#21262d',
                            color: '#8b949e',
                            border: '1px solid #30363d',
                          }}
                        >
                          {submittedSnapshot?.paragraphCount || paragraphCount} paragraphs
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#a5b4fc',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            fontWeight: 600,
                          }}
                        >
                          🔒 {t('locked_for_evaluation', 'Locked for Evaluation')}
                        </span>
                      </div>
                    </div>

                    {/* Formatted Paper Preview */}
                    <div
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '24px',
                        background: '#0d1117',
                      }}
                    >
                      <div
                        style={{
                          background: '#161b22',
                          border: '1px solid #21262d',
                          borderRadius: '8px',
                          padding: '24px 28px',
                          fontFamily: 'Georgia, Cambria, serif',
                          fontSize: '15px',
                          lineHeight: 1.85,
                          color: '#e6edf3',
                          whiteSpace: 'pre-wrap',
                          minHeight: '260px',
                          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
                        }}
                      >
                        {submittedSnapshot?.essayText || essayText || (
                          <em style={{ color: '#8b949e' }}>{t('no_essay_content', 'No essay content submitted.')}</em>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
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
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>{t('practice_complete', 'PRACTICE COMPLETE')}</span>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0 0' }}>
                {t('writing_assessment_report', 'Essay Assessment & Scorecard')}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                {activeQuestion?.content}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isViewingFromHistory ? (
                <button
                  id="btn-back-to-history"
                  onClick={() => {
                    setActiveView('HISTORY');
                    fetchPastSessions();
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '6px',
                    border: '1px solid #3b82f6',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#3b82f6',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  ← {t('back_to_attempts', 'Back to My Attempts')}
                </button>
              ) : (
                <button
                  id="btn-view-in-history"
                  onClick={() => {
                    setActiveView('HISTORY');
                    fetchPastSessions();
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '6px',
                    border: '1px solid #3b82f6',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#3b82f6',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  📊 {t('my_attempts', 'My Attempts')}
                </button>
              )}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📋 {t('back_to_catalog', 'Back to Catalog')}
              </button>
            </div>
          </div>

          {/* Visual Stimulus Chart Reference in Results View */}
          {(() => {
            const isTask1Results = Boolean(
              activeQuestion?.data?.taskType?.startsWith('TASK_1') ||
              activeQuestion?.taskType?.startsWith('TASK_1') ||
              activeQuestion?.data?.preset === 'IELTS_TASK_1' ||
              (activeQuestion?.content && /task\s*1/i.test(activeQuestion.content)) ||
              evaluationResult?.evaluation?.taskType === 'TASK_1'
            );
            const resImageUrl =
              activeQuestion?.data?.promptImageUrl ||
              activeQuestion?.promptImageUrl ||
              activeQuestion?.data?.imageUrl ||
              null;

            if (!resImageUrl) return null;

            return (
              <div
                style={{
                  background: 'var(--panel-bg)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  padding: '18px 24px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showResultChart ? '12px' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>📊</span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                      {t('task_stimulus_chart', 'Task 1 Visual Stimulus Reference')}
                    </strong>
                    <span style={{ fontSize: '11px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Stimulus Diagram
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowResultChart((s) => !s)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {showResultChart ? t('hide_chart', 'Hide Chart') : t('show_chart', 'Show Chart')}
                    </button>
                    {showResultChart && (
                      <button
                        type="button"
                        onClick={() => {
                          setEnlargedImageUrl(resImageUrl);
                          setImageModalZoom(1.0);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(6, 182, 212, 0.15)',
                          border: '1px solid #06b6d4',
                          color: '#06b6d4',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        🔍 {t('enlarge_fullscreen', 'Fullscreen')}
                      </button>
                    )}
                  </div>
                </div>

                {showResultChart && (
                  <div
                    onClick={() => {
                      setEnlargedImageUrl(resImageUrl);
                      setImageModalZoom(1.0);
                    }}
                    style={{
                      background: '#0a0f1d',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      padding: '12px',
                      textAlign: 'center',
                      cursor: 'zoom-in',
                    }}
                  >
                    <img
                      src={resImageUrl}
                      alt="Task 1 Stimulus Reference"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '260px',
                        objectFit: 'contain',
                        borderRadius: '6px',
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })()}

          {/* Reusable Writing Scorecard */}
          <WritingScorecard result={evaluationResult.evaluation} essayText={evaluationResult.essayText} />

          {/* Submitted Essay Review */}
          <div
            style={{
              background: 'var(--panel-bg)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>{t('submitted_essay_text', 'Submitted Essay Text')}</h3>
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
            {t('my_writing_attempts', 'My Standalone Writing Attempts')}
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
                  flexWrap: 'wrap',
                  gap: '12px',
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
                    Attempted on {new Date(s.startedAt).toLocaleString()} • {t('word_count', 'Word Count')}: {s.wordCount || 0} • {t('duration', 'Duration')}: {s.timeSpentSeconds || 0}s
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>
                      {t('score', 'Score')}: {s.score} / {s.maxScore}
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

                  <button
                    id={`btn-view-analysis-${s.id}`}
                    type="button"
                    onClick={() => handleViewPastSession(s.id)}
                    disabled={loadingHistorySessionId === s.id}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: '1px solid #3b82f6',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: loadingHistorySessionId === s.id ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {loadingHistorySessionId === s.id ? (
                      <>
                        <span className="spinner" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <span>{t('loading_report', 'Loading Report...')}</span>
                      </>
                    ) : (
                      <>
                        <span>📊</span>
                        <span>{t('view_analysis_report', 'View Analysis & Full Report')}</span>
                      </>
                    )}
                  </button>
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
                {t('no_writing_history', 'No past writing attempts recorded yet. Start practicing from the catalog!')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox / High-Resolution Image Zoom Modal */}
      {enlargedImageUrl && (
        <div
          id="modal-stimulus-lightbox"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 100005,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setEnlargedImageUrl(null)}
        >
          {/* Modal Header Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '90%',
              maxWidth: '1100px',
              marginBottom: '12px',
              color: '#fff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                📊 {t('task_stimulus_chart', 'IELTS Task 1 Stimulus Diagram')}
              </span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                ({Math.round(imageModalZoom * 100)}%)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                id="btn-zoom-out-lightbox"
                onClick={() => setImageModalZoom((prev) => Math.max(0.5, Math.round((prev - 0.2) * 10) / 10))}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                - {t('zoom_out', 'Zoom Out')}
              </button>
              <button
                type="button"
                id="btn-zoom-reset-lightbox"
                onClick={() => setImageModalZoom(1.0)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                {t('reset_zoom', 'Reset')} (100%)
              </button>
              <button
                type="button"
                id="btn-zoom-in-lightbox"
                onClick={() => setImageModalZoom((prev) => Math.min(3.0, Math.round((prev + 0.2) * 10) / 10))}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                + {t('zoom_in', 'Zoom In')}
              </button>
              <button
                type="button"
                id="btn-close-lightbox"
                onClick={() => setEnlargedImageUrl(null)}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  marginLeft: '8px',
                }}
              >
                ✕ {t('close_lightbox', 'Close')}
              </button>
            </div>
          </div>

          {/* Modal Image Body with Scrolling if zoomed */}
          <div
            style={{
              width: '90%',
              maxWidth: '1100px',
              height: '80vh',
              background: '#0a0f1d',
              borderRadius: '12px',
              border: '1px solid #374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              padding: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={enlargedImageUrl}
              alt="Stimulus Full Size"
              style={{
                transform: `scale(${imageModalZoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
                maxWidth: imageModalZoom <= 1.0 ? '100%' : undefined,
                maxHeight: imageModalZoom <= 1.0 ? '100%' : undefined,
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
