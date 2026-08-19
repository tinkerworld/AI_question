import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/I18nContext';

interface Question {
  id: string;
  type: string;
  content: string;
  data: any;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  marks: number;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  version: number;
  courseId?: string | null;
  subjectId?: string | null;
  syllabusNodeId?: string | null;
  tags?: string[];
  versions?: QuestionVersion[];
  examUsages?: PreviousExamUsage[];
  createdAt: string;
  updatedAt: string;
}

interface QuestionVersion {
  id: string;
  questionId: string;
  version: number;
  content: string;
  data: any;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  marks: number;
  changedById: string;
  createdAt: string;
}

interface PreviousExamUsage {
  id: string;
  questionId: string;
  examName: string;
  year: number;
  shift?: string | null;
}

interface Tag {
  id: string;
  name: string;
}

interface AnalyticsSummary {
  totalQuestions: number;
  byDifficulty: Record<string, number>;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  syllabusCoverageRatio: number;
}

const QUESTION_TYPES = [
  { id: 'MCQ', label: 'Single Choice (MCQ)' },
  { id: 'MULTIPLE_SELECT', label: 'Multiple Choice (Multi-Select)' },
  { id: 'TRUE_FALSE', label: 'True / False' },
  { id: 'FILL_IN_BLANK', label: 'Fill in the Blank' },
  { id: 'SHORT_ANSWER', label: 'Short Answer' },
  { id: 'NUMERICAL', label: 'Numerical Value' },
  { id: 'MATCHING', label: 'Matrix Matching' },
  { id: 'SUBJECTIVE', label: 'Subjective / Long Answer' },
];

const extractApiErrorMessage = (data: any, fallback: string = 'Operation failed'): string => {
  if (!data) return fallback;
  const mainMessage = data.message || data.error?.message || data.error || fallback;
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
    return `${mainMessage}: ${formattedIssues}`;
  }
  return mainMessage;
};

export const QuestionBankPage: React.FC = () => {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [syllabusNodes, setSyllabusNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters State
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCourseId, setFilterCourseId] = useState<string>('');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('');
  const [filterSyllabusNodeId, setFilterSyllabusNodeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [versionDrawerQuestion, setVersionDrawerQuestion] = useState<Question | null>(null);
  const [versionsList, setVersionsList] = useState<QuestionVersion[]>([]);
  const [examHistoryQuestion, setExamHistoryQuestion] = useState<Question | null>(null);
  const [examHistoryList, setExamHistoryList] = useState<PreviousExamUsage[]>([]);
  const [newExamName, setNewExamName] = useState<string>('JEE Main');
  const [newExamYear, setNewExamYear] = useState<number>(2024);
  const [newExamShift, setNewExamShift] = useState<string>('Shift 1');

  // Form State for Create / Edit
  const [formType, setFormType] = useState<string>('MCQ');
  const [formContent, setFormContent] = useState<string>('');
  const [formDifficulty, setFormDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [formMarks, setFormMarks] = useState<number>(4.0);
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [formCourseId, setFormCourseId] = useState<string>('');
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [formSyllabusNodeId, setFormSyllabusNodeId] = useState<string>('');

  // Dynamic Type Data State
  const [mcqOptions, setMcqOptions] = useState<{ id: string; text: string }[]>([
    { id: 'opt_1', text: 'Option A' },
    { id: 'opt_2', text: 'Option B' },
    { id: 'opt_3', text: 'Option C' },
    { id: 'opt_4', text: 'Option D' },
  ]);
  const [mcqCorrectOptionId, setMcqCorrectOptionId] = useState<string>('opt_1');
  const [multiCorrectOptionIds, setMultiCorrectOptionIds] = useState<string[]>(['opt_1']);
  const [tfCorrectValue, setTfCorrectValue] = useState<boolean>(true);
  const [fibAnswers, setFibAnswers] = useState<string[]>(['']);
  const [fibCaseSensitive, setFibCaseSensitive] = useState<boolean>(false);
  const [saKeywords, setSaKeywords] = useState<string[]>(['']);
  const [saSampleAnswer, setSaSampleAnswer] = useState<string>('');
  const [numTargetValue, setNumTargetValue] = useState<number>(0);
  const [numTolerance, setNumTolerance] = useState<number>(0.05);
  const [matchPairs, setMatchPairs] = useState<{ left: string; right: string }[]>([
    { left: 'Column A1', right: 'Column B1' },
    { left: 'Column A2', right: 'Column B2' },
  ]);
  const [subRubric, setSubRubric] = useState<string[]>(['Accuracy of reasoning']);
  const [subSampleAnswer, setSubSampleAnswer] = useState<string>('');

  const token = localStorage.getItem('token') || '';

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterDifficulty) params.append('difficulty', filterDifficulty);
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      if (filterCourseId) params.append('courseId', filterCourseId);
      if (filterSubjectId) params.append('subjectId', filterSubjectId);
      if (filterSyllabusNodeId) params.append('syllabusNodeId', filterSyllabusNodeId);
      params.append('limit', '200');

      const res = await fetch(`http://localhost:4000/api/v1/questions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data.items || []);
      } else {
        setError(extractApiErrorMessage(data, 'Failed to fetch questions'));
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to question bank service');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      // 1. Analytics
      fetch('http://localhost:4000/api/v1/questions/analytics/summary', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => d.success && setAnalytics(d.data))
        .catch(() => {});

      // 2. Tags
      fetch('http://localhost:4000/api/v1/questions/tags/all', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => d.success && setAvailableTags(d.data))
        .catch(() => {});

      // 3. Courses
      fetch('http://localhost:4000/api/v1/courses', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => d.success && setCourses(d.data))
        .catch(() => {});

      // 4. Subjects & Syllabus tree
      fetch('http://localhost:4000/api/v1/syllabus/tree', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            const flatten = (nodes: any[]): any[] => {
              let list: any[] = [];
              for (const n of nodes) {
                list.push(n);
                if (n.children && n.children.length > 0) {
                  list = list.concat(flatten(n.children));
                }
              }
              return list;
            };
            setSyllabusNodes(flatten(d.data || []));
          }
        })
        .catch(() => {});
    } catch {}
  };

  useEffect(() => {
    fetchQuestions();
    fetchMetadata();
  }, [filterDifficulty, filterType, filterStatus, filterCourseId, filterSubjectId, filterSyllabusNodeId]);

  const resetForm = () => {
    setFormType('MCQ');
    setFormContent('');
    setFormDifficulty('MEDIUM');
    setFormMarks(4.0);
    setFormStatus('DRAFT');
    setFormCourseId('');
    setFormSubjectId('');
    setFormSyllabusNodeId('');
    setMcqOptions([
      { id: 'opt_1', text: 'Option A' },
      { id: 'opt_2', text: 'Option B' },
      { id: 'opt_3', text: 'Option C' },
      { id: 'opt_4', text: 'Option D' },
    ]);
    setMcqCorrectOptionId('opt_1');
    setMultiCorrectOptionIds(['opt_1']);
    setTfCorrectValue(true);
    setFibAnswers(['']);
    setFibCaseSensitive(false);
    setSaKeywords(['']);
    setSaSampleAnswer('');
    setNumTargetValue(0);
    setNumTolerance(0.05);
    setMatchPairs([
      { left: 'Column A1', right: 'Column B1' },
      { left: 'Column A2', right: 'Column B2' },
    ]);
    setSubRubric(['Accuracy of reasoning']);
    setSubSampleAnswer('');
    setEditingQuestion(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (q: Question) => {
    setEditingQuestion(q);
    setFormType(q.type);
    setFormContent(q.content);
    setFormDifficulty(q.difficulty);
    setFormMarks(q.marks);
    setFormStatus(q.status);
    setFormCourseId(q.courseId || '');
    setFormSubjectId(q.subjectId || '');
    setFormSyllabusNodeId(q.syllabusNodeId || '');

    const d = typeof q.data === 'string' ? JSON.parse(q.data) : q.data || {};
    if (q.type === 'MCQ') {
      setMcqOptions(d.options || [{ id: 'opt_1', text: '' }, { id: 'opt_2', text: '' }]);
      setMcqCorrectOptionId(d.correctOptionId || 'opt_1');
    } else if (q.type === 'MULTIPLE_SELECT') {
      setMcqOptions(d.options || [{ id: 'opt_1', text: '' }, { id: 'opt_2', text: '' }]);
      setMultiCorrectOptionIds(d.correctOptionIds || []);
    } else if (q.type === 'TRUE_FALSE') {
      setTfCorrectValue(Boolean(d.correctValue));
    } else if (q.type === 'FILL_IN_BLANK') {
      setFibAnswers(d.acceptedAnswers || ['']);
      setFibCaseSensitive(Boolean(d.caseSensitive));
    } else if (q.type === 'SHORT_ANSWER') {
      setSaKeywords(d.keywords || ['']);
      setSaSampleAnswer(d.sampleAnswer || '');
    } else if (q.type === 'NUMERICAL') {
      setNumTargetValue(Number(d.targetValue || 0));
      setNumTolerance(Number(d.tolerance || 0.05));
    } else if (q.type === 'MATCHING') {
      setMatchPairs(d.pairs || [{ left: '', right: '' }]);
    } else if (q.type === 'SUBJECTIVE') {
      setSubRubric(d.rubricCriteria || ['']);
      setSubSampleAnswer(d.sampleAnswer || '');
    }

    setShowCreateModal(true);
  };

  const buildTypePayload = () => {
    switch (formType) {
      case 'MCQ':
        return { options: mcqOptions, correctOptionId: mcqCorrectOptionId };
      case 'MULTIPLE_SELECT':
        return { options: mcqOptions, correctOptionIds: multiCorrectOptionIds };
      case 'TRUE_FALSE':
        return { correctValue: tfCorrectValue };
      case 'FILL_IN_BLANK':
        return { acceptedAnswers: fibAnswers.filter((a) => a.trim().length > 0), caseSensitive: fibCaseSensitive };
      case 'SHORT_ANSWER':
        return { keywords: saKeywords.filter((k) => k.trim().length > 0), sampleAnswer: saSampleAnswer };
      case 'NUMERICAL':
        return { targetValue: Number(numTargetValue), tolerance: Number(numTolerance) };
      case 'MATCHING':
        return { pairs: matchPairs.filter((p) => p.left.trim() && p.right.trim()) };
      case 'SUBJECTIVE':
        return { rubricCriteria: subRubric.filter((r) => r.trim().length > 0), sampleAnswer: subSampleAnswer };
      default:
        return {};
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setActionSuccess(null);

      const payload: any = {
        type: formType,
        content: formContent,
        difficulty: formDifficulty,
        marks: Number(formMarks),
        status: formStatus,
        data: buildTypePayload(),
        courseId: formCourseId || undefined,
        subjectId: formSubjectId || undefined,
        syllabusNodeId: formSyllabusNodeId || undefined,
      };

      if (editingQuestion) {
        const res = await fetch(`http://localhost:4000/api/v1/questions/${editingQuestion.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setActionSuccess(`Question ${editingQuestion.id} updated to version ${data.data.version}`);
          setShowCreateModal(false);
          fetchQuestions();
        } else {
          setError(extractApiErrorMessage(data, 'Failed to update question'));
        }
      } else {
        const res = await fetch('http://localhost:4000/api/v1/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setActionSuccess(`Question ${data.data.id} created successfully`);
          setShowCreateModal(false);
          fetchQuestions();
        } else {
          setError(extractApiErrorMessage(data, 'Failed to create question'));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error saving question');
    }
  };

  const handleStatusChange = async (questionId: string, newStatus: string) => {
    try {
      setError(null);
      const res = await fetch(`http://localhost:4000/api/v1/questions/${questionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess(`Question ${questionId} status updated to ${newStatus}`);
        fetchQuestions();
      } else {
        setError(extractApiErrorMessage(data, 'Status transition failed'));
      }
    } catch (err: any) {
      setError(err.message || 'Error changing status');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete question ${id}?`)) return;
    try {
      setError(null);
      const res = await fetch(`http://localhost:4000/api/v1/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess(`Question ${id} deleted successfully`);
        fetchQuestions();
      } else {
        setError(extractApiErrorMessage(data, 'Failed to delete question'));
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting question');
    }
  };

  const openVersionHistory = async (q: Question) => {
    try {
      setVersionDrawerQuestion(q);
      const res = await fetch(`http://localhost:4000/api/v1/questions/${q.id}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setVersionsList(data.data || []);
      }
    } catch {}
  };

  const handleRollback = async (qId: string, versionNum: number) => {
    if (!window.confirm(`Roll back question ${qId} to Version ${versionNum}?`)) return;
    try {
      setError(null);
      const res = await fetch(`http://localhost:4000/api/v1/questions/${qId}/versions/${versionNum}/rollback`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess(`Question ${qId} rolled back to content of version ${versionNum}`);
        setVersionDrawerQuestion(null);
        fetchQuestions();
      } else {
        setError(extractApiErrorMessage(data, 'Rollback failed'));
      }
    } catch (err: any) {
      setError(err.message || 'Error rolling back');
    }
  };

  const openExamHistory = async (q: Question) => {
    try {
      setExamHistoryQuestion(q);
      const res = await fetch(`http://localhost:4000/api/v1/questions/${q.id}/exam-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setExamHistoryList(data.data || []);
      }
    } catch {}
  };

  const handleAddExamHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examHistoryQuestion) return;
    try {
      setError(null);
      const res = await fetch(`http://localhost:4000/api/v1/questions/${examHistoryQuestion.id}/exam-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          examName: newExamName,
          year: Number(newExamYear),
          shift: newExamShift,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess('Exam appearance logged successfully');
        openExamHistory(examHistoryQuestion);
      } else {
        setError(extractApiErrorMessage(data, 'Failed to log exam history'));
      }
    } catch (err: any) {
      setError(err.message || 'Error adding exam history');
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.id.toLowerCase().includes(query) ||
      q.content.toLowerCase().includes(query) ||
      (q.tags && q.tags.some((t) => t.toLowerCase().includes(query)))
    );
  });

  return (
    <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontFamily: 'JetBrains Mono' }}>
            Question Bank Workbench
          </h1>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Author, version, tag, review, and organize curriculum question assets
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={openCreateModal}
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              border: 'none',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>+</span> Create Question
          </button>
        </div>
      </div>

      {/* Analytics Summary Widget */}
      {analytics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
              TOTAL QUESTIONS
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>
              {analytics.totalQuestions}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
              BY DIFFICULTY
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '12px' }}>
              <span style={{ color: '#10b981' }}>Easy: {analytics.byDifficulty.EASY || 0}</span>
              <span style={{ color: '#f59e0b' }}>Med: {analytics.byDifficulty.MEDIUM || 0}</span>
              <span style={{ color: '#ef4444' }}>Hard: {analytics.byDifficulty.HARD || 0}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
              BY STATUS
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '12px' }}>
              <span style={{ color: '#06b6d4' }}>Pub: {analytics.byStatus.PUBLISHED || 0}</span>
              <span style={{ color: '#8b5cf6' }}>Draft: {analytics.byStatus.DRAFT || 0}</span>
              <span style={{ color: '#64748b' }}>Arch: {analytics.byStatus.ARCHIVED || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {actionSuccess && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10b981',
            color: '#10b981',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          {actionSuccess}
        </div>
      )}

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Search question text, tags, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: 'var(--text-main)',
            padding: '6px 12px',
            fontSize: '12px',
            minWidth: '220px',
          }}
        />

        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          <option value="">All Question Types</option>
          {QUESTION_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="REVIEW">Review</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        <select
          value={filterCourseId}
          onChange={(e) => setFilterCourseId(e.target.value)}
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setFilterDifficulty('');
            setFilterType('');
            setFilterStatus('');
            setFilterCourseId('');
            setFilterSubjectId('');
            setFilterSyllabusNodeId('');
            setSearchQuery('');
          }}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Reset Filters
        </button>

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
          Showing {filteredQuestions.length} of {questions.length} items
        </div>
      </div>

      {/* Question Cards Grid / List */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading Question Bank...
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            background: 'var(--panel-bg)',
            borderRadius: '8px',
            border: '1px dashed var(--border-color)',
            color: 'var(--text-muted)',
          }}
        >
          No questions match the current filter selection. Click "+ Create Question" to author new questions.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredQuestions.map((q) => (
            <div
              key={q.id}
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Top Row: Meta Badges & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: '11px',
                      color: 'var(--accent-color)',
                      fontWeight: 'bold',
                    }}
                  >
                    {q.id}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {q.type}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono',
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
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono',
                      background:
                        q.status === 'PUBLISHED'
                          ? 'rgba(6, 182, 212, 0.15)'
                          : q.status === 'REVIEW'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(100, 116, 139, 0.15)',
                      color:
                        q.status === 'PUBLISHED'
                          ? '#06b6d4'
                          : q.status === 'REVIEW'
                          ? '#f59e0b'
                          : '#94a3b8',
                    }}
                  >
                    {q.status}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Marks: {q.marks} | v{q.version}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setPreviewQuestion(q)}
                    style={{
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid #06b6d4',
                      color: '#06b6d4',
                      padding: '4px 10px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Student Preview
                  </button>
                  <button
                    onClick={() => openEditModal(q)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      padding: '4px 10px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Edit / Revise
                  </button>
                  <button
                    onClick={() => openVersionHistory(q)}
                    style={{
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid #8b5cf6',
                      color: '#8b5cf6',
                      padding: '4px 10px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Versions (v{q.version})
                  </button>
                  <button
                    onClick={() => openExamHistory(q)}
                    style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid #f59e0b',
                      color: '#f59e0b',
                      padding: '4px 10px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Exam History
                  </button>
                  <select
                    value={q.status}
                    onChange={(e) => handleStatusChange(q.id, e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      borderRadius: '5px',
                      fontSize: '11px',
                      padding: '2px 6px',
                    }}
                  >
                    <option value="DRAFT">Set: Draft</option>
                    <option value="REVIEW">Set: Review</option>
                    <option value="PUBLISHED">Set: Published</option>
                    <option value="ARCHIVED">Set: Archived</option>
                  </select>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      padding: '4px 8px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                    title="Delete Question"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content Snippet */}
              <div
                style={{
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: 'var(--text-main)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {q.content}
              </div>

              {/* Tags and Metadata Footer */}
              {q.tags && q.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {q.tags.map((t, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        background: 'rgba(6, 182, 212, 0.08)',
                        border: '1px solid rgba(6, 182, 212, 0.2)',
                        borderRadius: '4px',
                        color: '#06b6d4',
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT QUESTION MODAL */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '750px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontFamily: 'JetBrains Mono' }}>
                {editingQuestion ? `Revise Question (${editingQuestion.id})` : 'Author New Question'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Type, Difficulty, Marks */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Question Type
                  </label>
                  <select
                    value={formType}
                    disabled={Boolean(editingQuestion)}
                    onChange={(e) => setFormType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      background: 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                    }}
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Difficulty
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      background: 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Default Marks
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formMarks}
                    onChange={(e) => setFormMarks(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      background: 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                    }}
                    required
                  />
                </div>
              </div>

              {/* Content Textarea */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Question Stem / Problem Statement (Supports Markdown & LaTeX)
                </label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Enter the complete question statement..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                  required
                />
              </div>

              {/* Dynamic Type-Specific Schema Form Fields */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'JetBrains Mono', color: 'var(--accent-color)' }}>
                  Type Payload Configuration: {formType}
                </div>

                {/* MCQ / MULTIPLE_SELECT */}
                {(formType === 'MCQ' || formType === 'MULTIPLE_SELECT') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Define options and specify the correct key(s):
                    </div>
                    {mcqOptions.map((opt, idx) => (
                      <div key={opt.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {formType === 'MCQ' ? (
                          <input
                            type="radio"
                            name="correctOpt"
                            checked={mcqCorrectOptionId === opt.id}
                            onChange={() => setMcqCorrectOptionId(opt.id)}
                            title="Mark as correct answer"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={multiCorrectOptionIds.includes(opt.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMultiCorrectOptionIds([...multiCorrectOptionIds, opt.id]);
                              } else {
                                setMultiCorrectOptionIds(multiCorrectOptionIds.filter((id) => id !== opt.id));
                              }
                            }}
                            title="Mark as correct option"
                          />
                        )}
                        <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', width: '40px' }}>{opt.id}</span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const copy = [...mcqOptions];
                            copy[idx].text = e.target.value;
                            setMcqOptions(copy);
                          }}
                          placeholder={`Option ${idx + 1} text...`}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            background: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                          required
                        />
                        {mcqOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setMcqOptions(mcqOptions.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setMcqOptions([
                          ...mcqOptions,
                          { id: `opt_${mcqOptions.length + 1}`, text: `Option ${mcqOptions.length + 1}` },
                        ])
                      }
                      style={{
                        alignSelf: 'flex-start',
                        background: 'none',
                        border: '1px dashed var(--border-color)',
                        color: 'var(--accent-color)',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        marginTop: '4px',
                      }}
                    >
                      + Add Option
                    </button>
                  </div>
                )}

                {/* TRUE / FALSE */}
                {formType === 'TRUE_FALSE' && (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="tfValue"
                        checked={tfCorrectValue === true}
                        onChange={() => setTfCorrectValue(true)}
                      />
                      TRUE
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="tfValue"
                        checked={tfCorrectValue === false}
                        onChange={() => setTfCorrectValue(false)}
                      />
                      FALSE
                    </label>
                  </div>
                )}

                {/* NUMERICAL */}
                {formType === 'NUMERICAL' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target Numerical Answer</label>
                      <input
                        type="number"
                        step="any"
                        value={numTargetValue}
                        onChange={(e) => setNumTargetValue(parseFloat(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: 'var(--bg-color)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Acceptable Tolerance Margin (±)</label>
                      <input
                        type="number"
                        step="any"
                        value={numTolerance}
                        onChange={(e) => setNumTolerance(parseFloat(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: 'var(--bg-color)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* FILL IN THE BLANK */}
                {formType === 'FILL_IN_BLANK' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Accepted Answer Variations</label>
                    {fibAnswers.map((ans, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={ans}
                          onChange={(e) => {
                            const copy = [...fibAnswers];
                            copy[idx] = e.target.value;
                            setFibAnswers(copy);
                          }}
                          placeholder={`Accepted variation ${idx + 1}...`}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            background: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                          required
                        />
                        {fibAnswers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setFibAnswers(fibAnswers.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFibAnswers([...fibAnswers, ''])}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'none',
                        border: '1px dashed var(--border-color)',
                        color: 'var(--accent-color)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      + Add Variation
                    </button>
                  </div>
                )}

                {/* MATCHING */}
                {formType === 'MATCHING' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Matching Pairs (Left &rarr; Right)</label>
                    {matchPairs.map((p, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
                        <input
                          type="text"
                          value={p.left}
                          onChange={(e) => {
                            const copy = [...matchPairs];
                            copy[idx].left = e.target.value;
                            setMatchPairs(copy);
                          }}
                          placeholder="Column A item..."
                          style={{
                            padding: '6px 10px',
                            background: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                          required
                        />
                        <input
                          type="text"
                          value={p.right}
                          onChange={(e) => {
                            const copy = [...matchPairs];
                            copy[idx].right = e.target.value;
                            setMatchPairs(copy);
                          }}
                          placeholder="Column B matching item..."
                          style={{
                            padding: '6px 10px',
                            background: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                          required
                        />
                        {matchPairs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setMatchPairs(matchPairs.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setMatchPairs([...matchPairs, { left: '', right: '' }])}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'none',
                        border: '1px dashed var(--border-color)',
                        color: 'var(--accent-color)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      + Add Matching Pair
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {editingQuestion ? 'Save & Create Revision' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT PREVIEW MODAL (Zero Answer Key Leak) */}
      {previewQuestion && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '650px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(6, 182, 212, 0.1)',
                    color: '#06b6d4',
                    fontFamily: 'JetBrains Mono',
                  }}
                >
                  Student Preview Mode
                </span>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  No correct answers, evaluation keys, or teacher rubrics are visible.
                </div>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Question Stem */}
            <div
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'var(--text-main)',
                padding: '12px',
                background: 'var(--bg-color)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              {previewQuestion.content}
            </div>

            {/* Student-facing Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {previewQuestion.type === 'MCQ' && previewQuestion.data?.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {previewQuestion.data.options.map((opt: any) => (
                    <label
                      key={opt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                      }}
                    >
                      <input type="radio" name="previewRadio" />
                      <span style={{ fontSize: '13px' }}>{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {previewQuestion.type === 'TRUE_FALSE' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <input type="radio" name="previewTf" style={{ marginRight: '8px' }} />
                    TRUE
                  </label>
                  <label
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <input type="radio" name="previewTf" style={{ marginRight: '8px' }} />
                    FALSE
                  </label>
                </div>
              )}

              {previewQuestion.type === 'NUMERICAL' && (
                <div>
                  <input
                    type="number"
                    placeholder="Enter numerical answer..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      background: 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              )}

              {previewQuestion.type === 'SUBJECTIVE' && (
                <div>
                  <textarea
                    rows={4}
                    placeholder="Type subjective response..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      background: 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => setPreviewQuestion(null)}
                style={{
                  background: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VERSION HISTORY DRAWER / MODAL */}
      {versionDrawerQuestion && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontFamily: 'JetBrains Mono' }}>
                Version History: {versionDrawerQuestion.id}
              </h2>
              <button
                onClick={() => setVersionDrawerQuestion(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Inspect immutable audit snapshots and rollback to any previous version.
            </div>

            {versionsList.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No prior revisions recorded for this question.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {versionsList.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      background: 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span
                          style={{
                            fontFamily: 'JetBrains Mono',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#8b5cf6',
                          }}
                        >
                          Version {v.version}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(v.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRollback(versionDrawerQuestion.id, v.version)}
                        style={{
                          background: 'rgba(139, 92, 246, 0.15)',
                          border: '1px solid #8b5cf6',
                          color: '#8b5cf6',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        Rollback to v{v.version}
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.4' }}>
                      {v.content}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Difficulty: {v.difficulty} | Marks: {v.marks}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXAM HISTORY MODAL */}
      {examHistoryQuestion && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '550px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontFamily: 'JetBrains Mono' }}>
                Previous Exam History
              </h2>
              <button
                onClick={() => setExamHistoryQuestion(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {examHistoryList.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                  No prior entrance exam usage recorded.
                </div>
              ) : (
                examHistoryList.map((eh) => (
                  <div
                    key={eh.id}
                    style={{
                      background: 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ fontWeight: 'bold' }}>{eh.examName}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {eh.year} {eh.shift ? `(${eh.shift})` : ''}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Log New Appearance Form */}
            <form
              onSubmit={handleAddExamHistory}
              style={{
                display: 'flex',
                gap: '8px',
                flexDirection: 'column',
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                Log New Exam Appearance
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Exam Name (e.g. JEE Main)"
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                  }}
                  required
                />
                <input
                  type="number"
                  placeholder="Year"
                  value={newExamYear}
                  onChange={(e) => setNewExamYear(parseInt(e.target.value, 10))}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                  }}
                  required
                />
                <input
                  type="text"
                  placeholder="Shift / Slot"
                  value={newExamShift}
                  onChange={(e) => setNewExamShift(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  alignSelf: 'flex-end',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  color: '#fff',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                + Log Appearance
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
