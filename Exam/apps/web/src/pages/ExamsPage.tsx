import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/I18nContext';

interface ExamItem {
  id: string;
  patternId?: string;
  courseId?: string;
  courseName?: string;
  patternName?: string;
  name: string;
  instructions?: string;
  durationMinutes: number;
  totalMarks: number;
  startTime?: string;
  endTime?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'ARCHIVED';
  sectionCount?: number;
  questionCount?: number;
  createdAt: string;
}

interface ExamQuestionItem {
  id: string;
  examId: string;
  examSectionId: string;
  questionId: string;
  sequenceOrder: number;
  marksCorrect: number;
  marksWrong: number;
  content: string;
  type: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  topicTitle?: string;
  subjectName?: string;
}

interface ExamSectionItem {
  id: string;
  examId: string;
  name: string;
  sequenceOrder: number;
  subjectId?: string;
  subjectName?: string;
  numQuestions: number;
  marksPerQuestion: number;
  totalMarks: number;
  marksCorrect: number;
  marksWrong: number;
  questions?: ExamQuestionItem[];
}

interface ExamDetailResponse {
  exam: ExamItem;
  sections: ExamSectionItem[];
  stats: {
    totalQuestions: number;
    totalMarks: number;
    topics: { topicId: string; topicTitle: string; count: number; marks: number }[];
    difficulties: Record<string, number>;
    types: Record<string, number>;
  };
}

// Helper to extract granular field-level validation errors or standard messages
const extractApiErrorMessage = (data: any, fallback: string = 'Operation failed'): string => {
  if (!data) return fallback;
  const mainMessage = data.message || data.error?.message || data.error || fallback;
  
  // Extract issues / details array from any standard backend format (details, issues, errors)
  const details = data.details || data.error?.issues || data.error?.details || data.issues || data.errors;
  if (Array.isArray(details) && details.length > 0) {
    const formattedIssues = details
      .map((d: any) => {
        if (typeof d === 'string') return d;
        const path = d.path ? (Array.isArray(d.path) ? d.path.join('.') : d.path) : '';
        const msg = d.message || JSON.stringify(d);
        return path ? `"${path}": ${msg}` : msg;
      })
      .filter(Boolean)
      .join('; ');
    if (formattedIssues) {
      return `${mainMessage} (${formattedIssues})`;
    }
  }
  return mainMessage;
};

export const ExamsPage: React.FC = () => {
  const { user, startPreview, previewReturnExamId, setPreviewReturnExamId } = useAuth();
  const { t } = useTranslation();

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Exam for Draft Inspection
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [examDetails, setExamDetails] = useState<ExamDetailResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  // Modals state
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showSwapModal, setShowSwapModal] = useState<boolean>(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState<boolean>(false);
  const [showQuestionPickerModal, setShowQuestionPickerModal] = useState<boolean>(false);

  // Generation form state
  const [genPatternId, setGenPatternId] = useState<string>('');
  const [genName, setGenName] = useState<string>('');
  const [genInstructions, setGenInstructions] = useState<string>('');
  const [genAvoidRecentDays, setGenAvoidRecentDays] = useState<string>('0');
  const [genStartTime, setGenStartTime] = useState<string>('');
  const [genEndTime, setGenEndTime] = useState<string>('');
  const [genError, setGenError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);

  // Manual exam creation state
  const [manualName, setManualName] = useState<string>('');
  const [manualCourseId, setManualCourseId] = useState<string>('');
  const [manualDuration, setManualDuration] = useState<string>('60');
  const [manualInstructions, setManualInstructions] = useState<string>('');
  const [manualError, setManualError] = useState<string | null>(null);

  // Settings / Metadata state
  const [editName, setEditName] = useState<string>('');
  const [editDuration, setEditDuration] = useState<string>('60');
  const [editInstructions, setEditInstructions] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Swap question state
  const [targetSwapQuestion, setTargetSwapQuestion] = useState<ExamQuestionItem | null>(null);
  const [candidateQuestions, setCandidateQuestions] = useState<any[]>([]);
  const [swapLoading, setSwapLoading] = useState<boolean>(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Add section to manual exam
  const [newSecName, setNewSecName] = useState<string>('');
  const [newSecMarksPerQ, setNewSecMarksPerQ] = useState<string>('1.0');
  const [newSecMarksWrong, setNewSecMarksWrong] = useState<string>('0.0');
  const [sectionError, setSectionError] = useState<string | null>(null);

  // Question picker state
  const [targetSectionId, setTargetSectionId] = useState<string>('');
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [selectedPickerQIds, setSelectedPickerQIds] = useState<string[]>([]);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [pickerError, setPickerError] = useState<string | null>(null);

  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:4043/api/v1/exams';
      if (statusFilter !== 'ALL') url += `?status=${statusFilter}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setExams(data.data.items || []);
      }
    } catch (e) {
      console.error('Failed to fetch exams:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatternsAndCourses = async () => {
    try {
      const [patRes, crsRes] = await Promise.all([
        fetch('http://localhost:4043/api/v1/exam-patterns', { headers }),
        fetch('http://localhost:4043/api/v1/courses', { headers }),
      ]);
      const patData = await patRes.json();
      const crsData = await crsRes.json();
      if (patData.success) {
        const publishedPatterns = (patData.data.items || patData.data || []).filter(
          (p: any) => p.status !== 'ARCHIVED'
        );
        setPatterns(publishedPatterns);
        if (publishedPatterns.length > 0 && !genPatternId) {
          setGenPatternId(publishedPatterns[0].id);
        }
      }
      if (crsData.success) {
        const crsList = crsData.data || [];
        setCourses(crsList);
        if (crsList.length > 0 && !manualCourseId) {
          setManualCourseId(crsList[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch patterns or courses:', e);
    }
  };

  const fetchExamDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const res = await fetch(`http://localhost:4043/api/v1/exams/${id}/draft`, { headers });
      const data = await res.json();
      if (data.success) {
        setExamDetails(data.data);
        setSelectedExamId(id);
      }
    } catch (e) {
      console.error('Failed to fetch exam details:', e);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchPatternsAndCourses();
  }, [statusFilter]);

  useEffect(() => {
    if (previewReturnExamId) {
      const retId = previewReturnExamId;
      setPreviewReturnExamId(null);
      fetchExamDetails(retId);
    }
  }, [previewReturnExamId]);

  // Handle Generate Exam Submit (Feature 5.1)
  const handleGenerateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenError(null);
    setGenerating(true);

    try {
      const avoidDays = parseInt(genAvoidRecentDays, 10);
      const res = await fetch('http://localhost:4043/api/v1/exams/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          patternId: genPatternId,
          name: genName.trim() || undefined,
          instructions: genInstructions.trim() || undefined,
          avoidRecentDays: !isNaN(avoidDays) && avoidDays > 0 ? avoidDays : undefined,
          startTime: genStartTime || undefined,
          endTime: genEndTime || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setGenError(extractApiErrorMessage(data, 'Generation failed'));
        setGenerating(false);
        return;
      }

      setShowGenerateModal(false);
      setGenerating(false);
      await fetchExams();
      if (data.data && data.data.exam) {
        await fetchExamDetails(data.data.exam.id);
      }
    } catch (err: any) {
      setGenError(err.message || 'Network error during generation');
      setGenerating(false);
    }
  };

  // Handle Create Manual Blank Exam Submit (Feature 5.4)
  const handleCreateManualExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);

    try {
      const res = await fetch('http://localhost:4043/api/v1/exams/manual', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: manualName.trim(),
          courseId: manualCourseId || undefined,
          durationMinutes: parseInt(manualDuration, 10) || 60,
          instructions: manualInstructions.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setManualError(extractApiErrorMessage(data, 'Creation failed'));
        return;
      }

      setShowManualModal(false);
      setManualName('');
      await fetchExams();
      if (data.data && data.data.exam) {
        fetchExamDetails(data.data.exam.id);
      }
    } catch (err: any) {
      setManualError(err.message || 'Network error');
    }
  };

  // Handle Open Swap Modal (Feature 5.2)
  const handleOpenSwapModal = async (q: ExamQuestionItem) => {
    setTargetSwapQuestion(q);
    setSwapError(null);
    setShowSwapModal(true);
    setSwapLoading(true);

    try {
      const res = await fetch(
        `http://localhost:4043/api/v1/questions?status=PUBLISHED&difficulty=${q.difficulty}&limit=20`,
        { headers }
      );
      const data = await res.json();
      if (data.success) {
        // Filter out existing exam questions to prevent duplicates
        const existingQIds = new Set(
          examDetails?.sections.flatMap((s) => s.questions?.map((item) => item.questionId) || []) || []
        );
        const available = (data.data.items || data.data || []).filter(
          (item: any) => item.id !== q.questionId && !existingQIds.has(item.id)
        );
        setCandidateQuestions(available);
      }
    } catch (e) {
      console.error('Failed to fetch swap candidates:', e);
    } finally {
      setSwapLoading(false);
    }
  };

  // Handle Swap Question (Feature 5.2)
  const handleSwapQuestion = async (newQId: string) => {
    if (!selectedExamId || !targetSwapQuestion) return;
    setSwapError(null);

    try {
      const res = await fetch(
        `http://localhost:4043/api/v1/exams/${selectedExamId}/questions/${targetSwapQuestion.questionId}/swap`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ newQuestionId: newQId }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSwapError(extractApiErrorMessage(data, 'Swap failed'));
        return;
      }

      setShowSwapModal(false);
      setExamDetails(data.data);
    } catch (err: any) {
      setSwapError(err.message || 'Network error');
    }
  };

  const handleExecuteSwap = handleSwapQuestion;

  // Handle Regenerate Section (Feature 5.2)
  const handleRegenerateSection = async (secId: string) => {
    if (!selectedExamId) return;
    if (!window.confirm('Regenerate all questions in this section with new random picks?')) return;

    try {
      const res = await fetch(
        `http://localhost:4043/api/v1/exams/${selectedExamId}/sections/${secId}/regenerate`,
        {
          method: 'PATCH',
          headers,
        }
      );
      const data = await res.json();
      if (data.success) {
        setExamDetails(data.data);
      } else {
        alert(extractApiErrorMessage(data, 'Regeneration failed'));
      }
    } catch (e: any) {
      console.error('Regenerate failed:', e);
      alert(e.message || 'Regeneration network error');
    }
  };

  // Handle Reorder Questions (Feature 5.2)
  const handleMoveQuestion = async (secId: string, qIndex: number, direction: 'UP' | 'DOWN') => {
    if (!selectedExamId || !examDetails) return;
    const sec = examDetails.sections.find((s) => s.id === secId);
    if (!sec || !sec.questions) return;

    const targetIdx = direction === 'UP' ? qIndex - 1 : qIndex + 1;
    if (targetIdx < 0 || targetIdx >= sec.questions.length) return;

    const newOrderList = [...sec.questions];
    const temp = newOrderList[qIndex];
    newOrderList[qIndex] = newOrderList[targetIdx];
    newOrderList[targetIdx] = temp;

    const qIds = newOrderList.map((q) => q.questionId);

    try {
      const res = await fetch(`http://localhost:4043/api/v1/exams/${selectedExamId}/reorder`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ sectionId: secId, questionIds: qIds }),
      });
      const data = await res.json();
      if (data.success) {
        setExamDetails(data.data);
      } else {
        alert(extractApiErrorMessage(data, 'Reorder failed'));
      }
    } catch (e: any) {
      console.error('Reorder failed:', e);
      alert(e.message || 'Reorder network error');
    }
  };

  // Handle Open Settings Modal (Feature 5.3)
  const handleOpenSettings = () => {
    if (!examDetails) return;
    const ex = examDetails.exam;
    setEditName(ex.name);
    setEditDuration(String(ex.durationMinutes || 60));
    setEditInstructions(ex.instructions || '');
    setEditStartTime(ex.startTime ? new Date(ex.startTime).toISOString().slice(0, 16) : '');
    setEditEndTime(ex.endTime ? new Date(ex.endTime).toISOString().slice(0, 16) : '');
    setSettingsError(null);
    setShowSettingsModal(true);
  };

  // Handle Save Settings (Feature 5.3)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return;
    setSettingsError(null);

    try {
      const res = await fetch(`http://localhost:4043/api/v1/exams/${selectedExamId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          name: editName.trim(),
          durationMinutes: parseInt(editDuration, 10) || 60,
          instructions: editInstructions.trim() || undefined,
          startTime: editStartTime || null,
          endTime: editEndTime || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSettingsError(extractApiErrorMessage(data, 'Update failed'));
        return;
      }

      setShowSettingsModal(false);
      setExamDetails(data.data);
      fetchExams();
    } catch (err: any) {
      setSettingsError(err.message || 'Network error');
    }
  };

  // Handle Publish Exam (Feature 5.3)
  const handlePublishExam = async () => {
    if (!selectedExamId) return;
    if (!window.confirm('Publish this exam? Published exams are locked for student attempt sessions.')) return;

    try {
      const res = await fetch(`http://localhost:4043/api/v1/exams/${selectedExamId}/publish`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(extractApiErrorMessage(data, 'Publishing failed'));
        return;
      }

      setExamDetails(data.data);
      fetchExams();
      alert('Exam successfully published!');
    } catch (e: any) {
      console.error('Publish error:', e);
      alert(e.message || 'Publish network error');
    }
  };

  // Handle Add Section (Feature 5.4)
  const handleAddSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !newSecName.trim()) return;
    setSectionError(null);

    try {
      const marksPerQ = parseFloat(newSecMarksPerQ) || 1.0;
      const penalty = newSecMarksWrong ? -Math.abs(parseFloat(newSecMarksWrong)) : 0.0;
      const res = await fetch(`http://localhost:4043/api/v1/exams/${selectedExamId}/sections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newSecName.trim(),
          marksPerQuestion: marksPerQ,
          marksCorrect: marksPerQ,
          marksWrong: penalty,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddSectionModal(false);
        setNewSecName('');
        setNewSecMarksPerQ('1.0');
        setNewSecMarksWrong('0.0');
        setSectionError(null);
        setExamDetails(data.data);
        await fetchExams();
      } else {
        setSectionError(extractApiErrorMessage(data, 'Failed to add section'));
      }
    } catch (e: any) {
      console.error('Add section error:', e);
      setSectionError(e.message || 'Add section network error');
    }
  };

  // Handle Open Question Picker (Feature 5.4)
  const handleOpenQuestionPicker = async (secId: string) => {
    setTargetSectionId(secId);
    setSelectedPickerQIds([]);
    setPickerError(null);
    setShowQuestionPickerModal(true);

    try {
      const res = await fetch('http://localhost:4043/api/v1/questions?status=PUBLISHED&limit=100', { headers });
      const data = await res.json();
      if (data.success) {
        const existingQIds = new Set(
          examDetails?.sections.flatMap((s) => s.questions?.map((item) => item.questionId) || []) || []
        );
        setBankQuestions((data.data.items || data.data || []).filter((q: any) => !existingQIds.has(q.id)));
      }
    } catch (e) {
      console.error('Failed to fetch bank questions:', e);
    }
  };

  // Submit Question Picker (Feature 5.4)
  const handleAddPickedQuestions = async () => {
    if (!selectedExamId || !targetSectionId || selectedPickerQIds.length === 0) return;
    setPickerError(null);

    try {
      const res = await fetch(`http://localhost:4043/api/v1/exams/${selectedExamId}/questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sectionId: targetSectionId,
          questionIds: selectedPickerQIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPickerError(extractApiErrorMessage(data, 'Failed to add questions'));
        return;
      }

      setShowQuestionPickerModal(false);
      setExamDetails(data.data);
      fetchExams();
    } catch (err: any) {
      setPickerError(err.message || 'Network error');
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 65px)', background: 'var(--bg-color)', color: 'var(--text-main)' }}>
      {/* Left Sidebar: Exam Papers List */}
      <div style={{ width: '380px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--panel-bg)' }}>
        {/* Sidebar Header & Action CTAs */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontFamily: 'JetBrains Mono' }}>Exam Papers</h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                id="btn-trigger-generate"
                onClick={() => { setGenError(null); setShowGenerateModal(true); }}
                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ⚡ Generate
              </button>
              <button
                id="btn-trigger-manual"
                onClick={() => { setManualError(null); setShowManualModal(true); }}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >
                + Manual
              </button>
            </div>
          </div>

          {/* Status Filter Badges */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'DRAFT', 'PUBLISHED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono',
                  border: statusFilter === st ? '1px solid #06b6d4' : '1px solid var(--border-color)',
                  background: statusFilter === st ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                  color: statusFilter === st ? '#06b6d4' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Exams List Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>Loading exams...</div>
          ) : exams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📝</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>No Exam Papers Found</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>Click "⚡ Generate" from an Exam Pattern or create one manually.</div>
            </div>
          ) : (
            exams.map((ex) => {
              const isSelected = selectedExamId === ex.id;
              return (
                <div
                  key={ex.id}
                  id={`exam-card-${ex.id}`}
                  onClick={() => fetchExamDetails(ex.id)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid #06b6d4' : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: isSelected ? '#06b6d4' : 'var(--text-main)' }}>
                      {ex.name}
                    </div>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 'bold',
                        fontFamily: 'JetBrains Mono',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: ex.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: ex.status === 'PUBLISHED' ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {ex.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>⏱️ {ex.durationMinutes}m</span>
                    <span>•</span>
                    <span>🎯 {ex.totalMarks} Marks</span>
                    <span>•</span>
                    <span>📂 {ex.sectionCount || 0} Secs</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Panel: Draft Inspector & Paper Workbench */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {detailsLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading exam blueprint & questions...</div>
        ) : !examDetails ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📑</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>Select an Exam to Inspect</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Review generated questions, swap items, reorder, and configure schedule metadata.</div>
          </div>
        ) : (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Exam Header Banner */}
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h1 style={{ margin: 0, fontSize: '18px', fontFamily: 'JetBrains Mono' }}>{examDetails.exam.name}</h1>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        fontFamily: 'JetBrains Mono',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: examDetails.exam.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: examDetails.exam.status === 'PUBLISHED' ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {examDetails.exam.status}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {examDetails.exam.instructions || 'No special instructions configured.'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    id="btn-preview-exam"
                    data-testid="btn-preview-exam"
                    onClick={() => {
                      startPreview({
                        billingPlan: 'PREMIUM_PLUS',
                        contentVersion: 'DRAFT',
                        usageMode: 'UNLIMITED_QA',
                        courseAccess: examDetails.exam.courseId ? [examDetails.exam.courseId] : ['*'],
                        featureFlags: {},
                        targetExamId: examDetails.exam.id,
                        returnTab: 'exams',
                        returnExamId: examDetails.exam.id,
                      });
                    }}
                    style={{
                      background: 'rgba(217, 119, 6, 0.15)',
                      border: '1px solid #d97706',
                      color: '#d97706',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    ⚡ Preview as Student
                  </button>

                  <button
                    id="btn-edit-exam-settings"
                    onClick={handleOpenSettings}
                    style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#3b82f6', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    ⚙️ Settings & Schedule
                  </button>

                  {examDetails.exam.status === 'DRAFT' && (
                    <button
                      id="btn-publish-exam"
                      onClick={handlePublishExam}
                      style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      🚀 Publish Exam
                    </button>
                  )}
                </div>
              </div>

              {/* Statistics & Distribution Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ background: 'var(--bg-color)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL QUESTIONS</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px', color: '#06b6d4' }}>{examDetails.stats.totalQuestions}</div>
                </div>
                <div style={{ background: 'var(--bg-color)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL MARKS</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px', color: '#10b981' }}>{examDetails.stats.totalMarks} pts</div>
                </div>
                <div style={{ background: 'var(--bg-color)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DIFFICULTY MIX</div>
                  <div style={{ fontSize: '11px', marginTop: '4px', display: 'flex', gap: '6px' }}>
                    <span style={{ color: '#10b981' }}>E: {examDetails.stats.difficulties.EASY || 0}</span>
                    <span style={{ color: '#f59e0b' }}>M: {examDetails.stats.difficulties.MEDIUM || 0}</span>
                    <span style={{ color: '#ef4444' }}>H: {examDetails.stats.difficulties.HARD || 0}</span>
                  </div>
                </div>
                <div style={{ background: 'var(--bg-color)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SCHEDULE WINDOW</div>
                  <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-main)' }}>
                    {examDetails.exam.startTime ? new Date(examDetails.exam.startTime).toLocaleDateString() : 'Self-Paced / Anytime'}
                  </div>
                </div>
              </div>
            </div>

            {/* Sections & Questions List */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontFamily: 'JetBrains Mono' }}>Exam Sections & Questions</h2>
              {examDetails.exam.status === 'DRAFT' && (
                <button
                  id="btn-add-manual-section"
                  onClick={() => setShowAddSectionModal(true)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                >
                  + Add Section
                </button>
              )}
            </div>

            {examDetails.sections.map((sec, sIdx) => (
              <div
                key={sec.id}
                style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}
              >
                {/* Section Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', fontFamily: 'JetBrains Mono' }}>
                        Section {sIdx + 1}: {sec.name}
                      </span>
                      {sec.subjectName && (
                        <span style={{ fontSize: '10px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', padding: '2px 6px', borderRadius: '4px' }}>
                          {sec.subjectName}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {sec.questions?.length || 0} Questions | {sec.marksPerQuestion} marks/Q | Correct: +{sec.marksCorrect}, Wrong: {sec.marksWrong} | Total: {sec.totalMarks} pts
                    </div>
                  </div>

                  {examDetails.exam.status === 'DRAFT' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenQuestionPicker(sec.id)}
                        style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid #06b6d4', color: '#06b6d4', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        + Pick Questions
                      </button>
                      <button
                        onClick={() => handleRegenerateSection(sec.id)}
                        style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', color: '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        🔄 Regenerate Section
                      </button>
                    </div>
                  )}
                </div>

                {/* Section Questions */}
                {(!sec.questions || sec.questions.length === 0) ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No questions in this section yet. Click "+ Pick Questions" to add.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sec.questions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        style={{
                          background: 'var(--bg-color)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 'bold', fontSize: '12px', color: 'var(--text-muted)', minWidth: '24px' }}>
                            Q{qIdx + 1}.
                          </span>
                          <div>
                            <div style={{ fontSize: '13px', lineHeight: '1.4' }}>{q.content}</div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', fontSize: '10px' }}>
                              <span style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px', color: 'var(--text-muted)' }}>
                                {q.type}
                              </span>
                              <span
                                style={{
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  background: q.difficulty === 'EASY' ? 'rgba(16, 185, 129, 0.1)' : q.difficulty === 'HARD' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                  color: q.difficulty === 'EASY' ? '#10b981' : q.difficulty === 'HARD' ? '#ef4444' : '#f59e0b',
                                }}
                              >
                                {q.difficulty}
                              </span>
                              {q.topicTitle && (
                                <span style={{ background: 'rgba(6, 182, 212, 0.08)', color: '#06b6d4', padding: '1px 5px', borderRadius: '3px' }}>
                                  {q.topicTitle}
                                </span>
                              )}
                              <span style={{ color: 'var(--text-muted)' }}>+{q.marksCorrect} pts</span>
                            </div>
                          </div>
                        </div>

                        {examDetails.exam.status === 'DRAFT' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              title="Move Up"
                              disabled={qIdx === 0}
                              onClick={() => handleMoveQuestion(sec.id, qIdx, 'UP')}
                              style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '3px', cursor: qIdx === 0 ? 'not-allowed' : 'pointer' }}
                            >
                              ▲
                            </button>
                            <button
                              title="Move Down"
                              disabled={!sec.questions || qIdx === sec.questions.length - 1}
                              onClick={() => handleMoveQuestion(sec.id, qIdx, 'DOWN')}
                              style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '3px', cursor: (!sec.questions || qIdx === sec.questions.length - 1) ? 'not-allowed' : 'pointer' }}
                            >
                              ▼
                            </button>
                            <button
                              id={`btn-swap-question-${q.questionId}`}
                              onClick={() => handleOpenSwapModal(q)}
                              style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', marginLeft: '6px' }}
                            >
                              ⇄ Swap
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Generate Exam Modal (Feature 5.1) */}
      {showGenerateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontFamily: 'JetBrains Mono' }}>⚡ Generate Exam from Pattern</h3>
              <button onClick={() => setShowGenerateModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {genError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
                ⚠️ {genError}
              </div>
            )}

            <form onSubmit={handleGenerateExam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Select Pattern Blueprint</label>
                <select
                  required
                  value={genPatternId}
                  onChange={(e) => setGenPatternId(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                >
                  {patterns.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.durationMinutes}m, {p.totalMarks} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Exam Paper Name (Optional)</label>
                <input
                  placeholder="e.g. Midterm Physics Mock Exam"
                  value={genName}
                  onChange={(e) => setGenName(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Optional — if provided, must be at least 2 characters
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Avoid Recently Used Questions (Days)</label>
                <input
                  type="number"
                  min={0}
                  value={genAvoidRecentDays}
                  onChange={(e) => setGenAvoidRecentDays(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Optional — exclude questions used in last N days (min 0)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', padding: '8px 16px', fontWeight: 'bold', borderRadius: '4px', cursor: generating ? 'not-allowed' : 'pointer' }}
                >
                  {generating ? 'Generating...' : '⚡ Generate Paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Swap Question Modal (Feature 5.2) */}
      {showSwapModal && targetSwapQuestion && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'JetBrains Mono' }}>⇄ Swap Question</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Replacing: "{targetSwapQuestion.content.slice(0, 50)}..." ({targetSwapQuestion.difficulty})
                </div>
              </div>
              <button onClick={() => setShowSwapModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {swapError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
                ⚠️ {swapError}
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {swapLoading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Loading candidate replacements...</div>
              ) : candidateQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No candidate questions available in bank.</div>
              ) : (
                candidateQuestions.map((cand) => (
                  <div
                    key={cand.id}
                    style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div style={{ flex: 1, marginRight: '12px' }}>
                      <div style={{ fontSize: '12px' }}>{cand.content}</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', fontSize: '10px' }}>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: '3px' }}>{cand.type}</span>
                        <span style={{ color: cand.difficulty === 'EASY' ? '#10b981' : cand.difficulty === 'HARD' ? '#ef4444' : '#f59e0b' }}>{cand.difficulty}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExecuteSwap(cand.id)}
                      style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Select
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Exam Settings & Metadata Modal (Feature 5.3) */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontFamily: 'JetBrains Mono' }}>⚙️ Exam Settings & Schedule</h3>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {settingsError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
                ⚠️ {settingsError}
              </div>
            )}

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Exam Name</label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Required — must be at least 2 characters
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Duration (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Required — must be at least 1 minute
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Start Time</label>
                  <input
                    type="datetime-local"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                  />
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Optional scheduled window
                  </span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>End Time</label>
                  <input
                    type="datetime-local"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                  />
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Must be strictly after start time
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Instructions</label>
                <textarea
                  rows={3}
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Manual Blank Exam Modal (Feature 5.4) */}
      {showManualModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontFamily: 'JetBrains Mono' }}>+ Create Manual Exam</h3>
              <button onClick={() => setShowManualModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {manualError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
                ⚠️ {manualError}
              </div>
            )}

            <form onSubmit={handleCreateManualExam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Exam Name</label>
                <input
                  required
                  placeholder="e.g. Physics Weekly Assessment"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Required — must be at least 2 characters
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Linked Course</label>
                <select
                  value={manualCourseId}
                  onChange={(e) => setManualCourseId(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                >
                  <option value="">No Course (Standalone)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Duration (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Required — must be at least 1 minute
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Create Blank Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Question Picker Modal (Feature 5.4) */}
      {showQuestionPickerModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'JetBrains Mono' }}>+ Pick Questions from Bank</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Select questions to add directly to this exam section.
                </div>
              </div>
              <button onClick={() => setShowQuestionPickerModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {pickerError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
                ⚠️ {pickerError}
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <input
                placeholder="Search questions by keyword..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px 12px', borderRadius: '4px', fontSize: '12px' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {bankQuestions
                .filter((q) => !pickerSearch || q.content.toLowerCase().includes(pickerSearch.toLowerCase()))
                .map((q) => {
                  const isChecked = selectedPickerQIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => {
                        if (isChecked) setSelectedPickerQIds(selectedPickerQIds.filter((id) => id !== q.id));
                        else setSelectedPickerQIds([...selectedPickerQIds, q.id]);
                      }}
                      style={{
                        background: isChecked ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-color)',
                        border: isChecked ? '1px solid #06b6d4' : '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px' }}>{q.content}</div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px', fontSize: '10px' }}>
                          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: '3px' }}>{q.type}</span>
                          <span style={{ color: q.difficulty === 'EASY' ? '#10b981' : q.difficulty === 'HARD' ? '#ef4444' : '#f59e0b' }}>{q.difficulty}</span>
                          <span>+{q.marks || 1.0} pts</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div style={{ fontSize: '12px', color: '#06b6d4' }}>
                {selectedPickerQIds.length} question(s) selected
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowQuestionPickerModal(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedPickerQIds.length === 0}
                  onClick={handleAddPickedQuestions}
                  style={{ background: '#06b6d4', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: selectedPickerQIds.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  Add to Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Add Section Modal (Feature 5.4) */}
      {showAddSectionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontFamily: 'JetBrains Mono' }}>+ Add Exam Section</h3>
              <button onClick={() => setShowAddSectionModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {sectionError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
                ⚠️ {sectionError}
              </div>
            )}

            <form onSubmit={handleAddSectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Section Name *</label>
                <input
                  id="input-section-name"
                  required
                  placeholder="e.g. Section A (Physics MCQs)"
                  value={newSecName}
                  onChange={(e) => setNewSecName(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Required — section name
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Marks per Question *</label>
                  <input
                    id="input-section-marks"
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={newSecMarksPerQ}
                    onChange={(e) => setNewSecMarksPerQ(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                  />
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    e.g. 1, 2, 2.5, 4 — any positive value (min 0.1)
                  </span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Negative Penalty (0 or negative)</label>
                  <input
                    id="input-section-penalty"
                    type="number"
                    step="any"
                    max="0"
                    value={newSecMarksWrong}
                    onChange={(e) => setNewSecMarksWrong(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                  />
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    e.g. -0.25 for -1/4, -0.33 for -1/3, or 0 for no penalty (max 0)
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-add-section"
                  type="submit"
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Add Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
