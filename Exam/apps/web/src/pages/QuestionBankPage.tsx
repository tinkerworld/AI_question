import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/I18nContext';
import { EntityDiffViewer } from '../components/EntityDiffViewer';
import { AIGeneratorModal } from '../components/ai/AIGeneratorModal';
import { AIQuestionModifierModal } from '../components/ai/AIQuestionModifierModal';
import { AIUsageModal } from '../components/ai/AIUsageModal';
import { API_BASE } from '../config/api';

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
  isAiGenerated?: boolean;
  derivedFromId?: string | null;
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
  changeSummary?: string | null;
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
  { id: 'INTERVIEW', label: 'AI Interview / Oral Assessment' },
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
  const [diffBaseVersion, setDiffBaseVersion] = useState<QuestionVersion | null>(null);
  const [diffTargetVersion, setDiffTargetVersion] = useState<QuestionVersion | null>(null);
  const [showDiffView, setShowDiffView] = useState<boolean>(false);
  const [examHistoryQuestion, setExamHistoryQuestion] = useState<Question | null>(null);
  const [examHistoryList, setExamHistoryList] = useState<PreviousExamUsage[]>([]);
  const [newExamName, setNewExamName] = useState<string>('JEE Main');
  const [newExamYear, setNewExamYear] = useState<number>(2024);
  const [newExamShift, setNewExamShift] = useState<string>('Shift 1');

  // Phase 11: AI Modals & Subtabs
  const [showAIGeneratorModal, setShowAIGeneratorModal] = useState<boolean>(false);
  const [modifyingQuestion, setModifyingQuestion] = useState<Question | null>(null);
  const [showAIUsageModal, setShowAIUsageModal] = useState<boolean>(false);
  const [activeSubtab, setActiveSubtab] = useState<'ALL' | 'DRAFT_REVIEW'>('ALL');
  const [draftQuestions, setDraftQuestions] = useState<any[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState<boolean>(false);

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

  // Phase 12: Interview Question Type Form States
  const [interviewScenario, setInterviewScenario] = useState<string>('');
  const [interviewPreset, setInterviewPreset] = useState<string>('UPSC_PERSONALITY');
  const [interviewMaxTurns, setInterviewMaxTurns] = useState<number>(4);
  const [interviewDuration, setInterviewDuration] = useState<number>(15);
  const [interviewInstructions, setInterviewInstructions] = useState<string>('');
  const [interviewOpeningQuestion, setInterviewOpeningQuestion] = useState<string>('');
  const [interviewRubric, setInterviewRubric] = useState<Array<{ id: string; name: string; description: string; maxScore: number }>>([
    { id: 'integrity', name: 'Ethical Integrity & Public Service', description: 'Constitutional compliance and impartiality', maxScore: 25 },
    { id: 'decision_making', name: 'Administrative Problem Solving', description: 'Practical stakeholder resolution', maxScore: 25 },
    { id: 'communication', name: 'Clarity, Articulation & Poise', description: 'Logical structure and calm composure', maxScore: 25 },
    { id: 'critical_thinking', name: 'Analytical Depth & Foresight', description: 'Multi-dimensional policy view', maxScore: 25 },
  ]);

  const loadInterviewPreset = (preset: string) => {
    setInterviewPreset(preset);
    if (preset === 'IELTS_SPEAKING') {
      setInterviewDuration(12);
      setInterviewMaxTurns(4);
      setFormMarks(9);
      setInterviewInstructions('You are a certified IELTS Speaking Examiner. Evaluate lexical resource, grammatical range, fluency, and pronunciation.');
      setInterviewRubric([
        { id: 'fluency', name: 'Fluency & Coherence', description: 'Speaks at length with ease, logical sequencing and smooth connectives', maxScore: 9 },
        { id: 'lexical', name: 'Lexical Resource', description: 'Uses wide range of academic and idiomatic vocabulary with precision', maxScore: 9 },
        { id: 'grammar', name: 'Grammatical Range & Accuracy', description: 'Uses mix of simple and complex sentence structures with high accuracy', maxScore: 9 },
        { id: 'pronunciation', name: 'Pronunciation & Intonation', description: 'Intelligible pronunciation with expressive rhythm and intonation', maxScore: 9 },
      ]);
    } else if (preset === 'UPSC_PERSONALITY') {
      setInterviewDuration(15);
      setInterviewMaxTurns(4);
      setFormMarks(100);
      setInterviewInstructions('You are the Chairperson of the UPSC Interview Board. Probe for ethical balance, constitutional adherence, and administrative realism.');
      setInterviewRubric([
        { id: 'integrity', name: 'Ethical Integrity & Public Service', description: 'Constitutional compliance and impartiality', maxScore: 25 },
        { id: 'decision_making', name: 'Administrative Problem Solving', description: 'Practical stakeholder resolution and resource optimization', maxScore: 25 },
        { id: 'communication', name: 'Clarity, Articulation & Poise', description: 'Logical structure and calm composure under scrutiny', maxScore: 25 },
        { id: 'critical_thinking', name: 'Analytical Depth & Foresight', description: 'Multi-dimensional socio-economic and policy understanding', maxScore: 25 },
      ]);
    } else if (preset === 'TECH_SYSTEM_DESIGN') {
      setInterviewDuration(20);
      setInterviewMaxTurns(5);
      setFormMarks(50);
      setInterviewInstructions('You are a Principal Software Architect. Conduct a rigorous technical system design interview.');
      setInterviewRubric([
        { id: 'architecture', name: 'Architectural Rigor & Scalability', description: 'Handling load, partitioning, and high availability', maxScore: 15 },
        { id: 'tradeoffs', name: 'Trade-off Evaluation', description: 'Weighing CAP theorem, latency vs throughput, consistency models', maxScore: 15 },
        { id: 'data_modeling', name: 'Data Storage & Caching Strategy', description: 'Database schema, caching layers, queueing systems', maxScore: 10 },
        { id: 'communication', name: 'Technical Articulation & Defense', description: 'Explaining design decisions clearly and concisely', maxScore: 10 },
      ]);
    } else if (preset === 'GENERAL_HR') {
      setInterviewDuration(15);
      setInterviewMaxTurns(4);
      setFormMarks(40);
      setInterviewInstructions('You are an Executive Hiring Manager. Conduct a behavioral STAR-method interview.');
      setInterviewRubric([
        { id: 'leadership', name: 'Leadership & Conflict Resolution', description: 'Handling team disagreement and guiding outcomes', maxScore: 10 },
        { id: 'adaptability', name: 'Adaptability & Problem Solving', description: 'Navigating ambiguity and unexpected blockers', maxScore: 10 },
        { id: 'communication', name: 'Interpersonal Articulation', description: 'Structured STAR method response clarity', maxScore: 10 },
        { id: 'cultural_fit', name: 'Values Alignment & Ownership', description: 'Demonstrating extreme ownership and integrity', maxScore: 10 },
      ]);
    }
  };

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

      const res = await fetch(`${API_BASE}/questions?${params.toString()}`, {
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
      fetch(`${API_BASE}/questions/analytics/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => d.success && setAnalytics(d.data))
        .catch(() => {});

      // 2. Tags
      fetch(`${API_BASE}/questions/tags/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => d.success && setAvailableTags(d.data))
        .catch(() => {});

      // 3. Courses
      fetch(`${API_BASE}/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => d.success && setCourses(d.data))
        .catch(() => {});

      // 4. Subjects & Syllabus tree
      fetch(`${API_BASE}/syllabus/tree`, {
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

  const fetchDraftQuestions = async () => {
    try {
      setLoadingDrafts(true);
      const res = await fetch(`${API_BASE}/ai/questions/drafts?isAiOnly=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDraftQuestions(data.data || []);
      }
    } catch {
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleReviewDraft = async (questionId: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) => {
    try {
      const res = await fetch(`${API_BASE}/ai/questions/drafts/${questionId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, rejectionReason }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess(action === 'APPROVE' ? `Question ${questionId} approved and published!` : `Draft ${questionId} rejected.`);
        fetchDraftQuestions();
        fetchQuestions();
      } else {
        setError(extractApiErrorMessage(data, 'Failed to review draft'));
      }
    } catch (err: any) {
      setError(err.message || 'Error processing review action');
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchMetadata();
    fetchDraftQuestions();
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
    setInterviewScenario('');
    setInterviewPreset('UPSC_PERSONALITY');
    setInterviewMaxTurns(4);
    setInterviewDuration(15);
    setInterviewInstructions('');
    setInterviewOpeningQuestion('');
    setInterviewRubric([
      { id: 'integrity', name: 'Ethical Integrity & Public Service', description: 'Constitutional compliance and impartiality', maxScore: 25 },
      { id: 'decision_making', name: 'Administrative Problem Solving', description: 'Practical stakeholder resolution', maxScore: 25 },
      { id: 'communication', name: 'Clarity, Articulation & Poise', description: 'Logical structure and calm composure', maxScore: 25 },
      { id: 'critical_thinking', name: 'Analytical Depth & Foresight', description: 'Multi-dimensional policy view', maxScore: 25 },
    ]);
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
    } else if (q.type === 'INTERVIEW') {
      setInterviewScenario(d.scenario || '');
      setInterviewPreset(d.preset || 'CUSTOM');
      setInterviewMaxTurns(Number(d.maxTurns || 4));
      setInterviewDuration(Number(d.expectedDurationMinutes || 15));
      setInterviewInstructions(d.systemInstructions || '');
      setInterviewOpeningQuestion(d.openingQuestion || '');
      setInterviewRubric(d.rubric || []);
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
      case 'INTERVIEW':
        return {
          scenario: interviewScenario.trim(),
          preset: interviewPreset,
          maxTurns: Number(interviewMaxTurns || 4),
          expectedDurationMinutes: Number(interviewDuration || 15),
          systemInstructions: interviewInstructions.trim(),
          openingQuestion: interviewOpeningQuestion.trim(),
          rubric: interviewRubric.filter((r) => r.name.trim().length > 0),
        };
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
        const res = await fetch(`${API_BASE}/questions/${editingQuestion.id}`, {
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
        const res = await fetch(`${API_BASE}/questions`, {
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
      const res = await fetch(`${API_BASE}/questions/${questionId}/status`, {
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
      const res = await fetch(`${API_BASE}/questions/${id}`, {
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
      const res = await fetch(`${API_BASE}/questions/${q.id}/versions`, {
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
      const res = await fetch(`${API_BASE}/questions/${qId}/versions/${versionNum}/rollback`, {
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
      const res = await fetch(`${API_BASE}/questions/${q.id}/exam-history`, {
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
      const res = await fetch(`${API_BASE}/questions/${examHistoryQuestion.id}/exam-history`, {
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            id="open-ai-usage-btn"
            onClick={() => setShowAIUsageModal(true)}
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid #6366f1',
              color: '#818cf8',
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⚡</span> AI Credits
          </button>
          <button
            id="open-ai-generator-btn"
            onClick={() => setShowAIGeneratorModal(true)}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
            }}
          >
            <span>✨</span> AI Generator
          </button>
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

      {/* Subtab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          id="qb-subtab-all"
          onClick={() => setActiveSubtab('ALL')}
          style={{
            background: activeSubtab === 'ALL' ? 'var(--primary-color)' : 'transparent',
            color: activeSubtab === 'ALL' ? '#fff' : 'var(--text-muted)',
            border: '1px solid ' + (activeSubtab === 'ALL' ? 'var(--primary-color)' : 'var(--border-color)'),
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>📚</span> All Questions ({questions.length})
        </button>
        <button
          id="qb-subtab-review-queue"
          onClick={() => setActiveSubtab('DRAFT_REVIEW')}
          style={{
            background: activeSubtab === 'DRAFT_REVIEW' ? '#6366f1' : 'transparent',
            color: activeSubtab === 'DRAFT_REVIEW' ? '#fff' : 'var(--text-muted)',
            border: '1px solid ' + (activeSubtab === 'DRAFT_REVIEW' ? '#6366f1' : 'var(--border-color)'),
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>✨</span> AI Draft Review Queue
          {draftQuestions.length > 0 && (
            <span
              style={{
                background: activeSubtab === 'DRAFT_REVIEW' ? '#fff' : '#6366f1',
                color: activeSubtab === 'DRAFT_REVIEW' ? '#6366f1' : '#fff',
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: 'bold',
              }}
            >
              {draftQuestions.length}
            </span>
          )}
        </button>
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

      {/* Question Cards Grid / List or AI Draft Review Queue */}
      {activeSubtab === 'DRAFT_REVIEW' ? (
        <div id="ai-draft-review-container" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', padding: '12px 16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#c7d2fe' }}>
                ✨ AI Generated Draft Review Queue
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                All AI-generated questions and modified variations default to DRAFT. Human educators must review and approve them before they are active.
              </p>
            </div>
            <button
              onClick={fetchDraftQuestions}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🔄 Refresh Queue
            </button>
          </div>

          {loadingDrafts ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading draft queue...
            </div>
          ) : draftQuestions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
              🎉 All AI drafts have been reviewed! Click "✨ AI Generator" or "✨ AI Variation" to create more.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {draftQuestions.map((dq) => {
                const dqData = typeof dq.data === 'string' ? JSON.parse(dq.data) : dq.data;
                return (
                  <div
                    key={dq.id}
                    className="ai-draft-card"
                    id={`draft-card-${dq.id}`}
                    style={{
                      background: 'var(--panel-bg)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#818cf8', fontWeight: 'bold' }}>
                          {dq.id}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: 'rgba(99, 102, 241, 0.15)', color: '#c7d2fe', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                          ✨ AI {dq.derivedFromId ? 'Variation' : 'Generated'}
                        </span>
                        {dq.derivedFromId && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Derived from: <span style={{ fontFamily: 'JetBrains Mono', color: '#818cf8' }}>{dq.derivedFromId}</span>
                          </span>
                        )}
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #f59e0b' }}>
                          {dq.difficulty}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Subject: {dq.subjectName || dq.subjectId} | Topic: {dq.topicName || dq.syllabusNodeId || 'General'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          id={`approve-draft-btn-${dq.id}`}
                          onClick={() => handleReviewDraft(dq.id, 'APPROVE')}
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid #10b981',
                            color: '#10b981',
                            padding: '5px 12px',
                            borderRadius: '5px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          ✅ Approve & Publish
                        </button>
                        <button
                          id={`reject-draft-btn-${dq.id}`}
                          onClick={() => handleReviewDraft(dq.id, 'REJECT', 'Rejected during human review')}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid #ef4444',
                            color: '#ef4444',
                            padding: '5px 12px',
                            borderRadius: '5px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          ❌ Reject (Archive)
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5', background: 'var(--bg-color)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      {dq.content}
                    </div>

                    {dqData?.options && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                        {dqData.options.map((opt: any) => {
                          const isCorrect = opt.id === dqData.correctOptionId;
                          return (
                            <div
                              key={opt.id}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)',
                                border: '1px solid ' + (isCorrect ? '#10b981' : 'var(--border-color)'),
                                fontSize: '12px',
                                color: isCorrect ? '#10b981' : 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span>{isCorrect ? '✓' : '•'}</span>
                              <span>{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {dqData?.explanation && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>Solution / Explanation: </span>
                        {dqData.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
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
                  {q.isAiGenerated && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono',
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid #6366f1',
                        color: '#a5b4fc',
                        fontWeight: 'bold',
                      }}
                    >
                      ✨ AI {q.derivedFromId ? 'Variation' : 'Generated'}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    id={`ai-modify-btn-${q.id}`}
                    onClick={() => setModifyingQuestion(q)}
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid #6366f1',
                      color: '#818cf8',
                      padding: '4px 10px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    ✨ AI Variation
                  </button>
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
    </>
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
                    id="select-question-type"
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
                    {mcqOptions.map((opt, idx) => {
                      const isCorrect = formType === 'MCQ'
                        ? mcqCorrectOptionId === opt.id
                        : multiCorrectOptionIds.includes(opt.id);

                      return (
                        <div
                          key={opt.id}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            border: isCorrect ? '1px solid #10b981' : '1px solid var(--border-color)',
                            borderLeft: isCorrect ? '4px solid #10b981' : '1px solid var(--border-color)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            {formType === 'MCQ' ? (
                              <input
                                type="radio"
                                name="correctOpt"
                                checked={isCorrect}
                                onChange={() => setMcqCorrectOptionId(opt.id)}
                                style={{ cursor: 'pointer', accentColor: '#10b981' }}
                                title="Mark as correct answer"
                              />
                            ) : (
                              <input
                                type="checkbox"
                                checked={isCorrect}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setMultiCorrectOptionIds([...multiCorrectOptionIds, opt.id]);
                                  } else {
                                    setMultiCorrectOptionIds(multiCorrectOptionIds.filter((id) => id !== opt.id));
                                  }
                                }}
                                style={{ cursor: 'pointer', accentColor: '#10b981' }}
                                title="Mark as correct option"
                              />
                            )}
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                fontFamily: 'JetBrains Mono',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                color: isCorrect ? '#10b981' : 'var(--text-muted)',
                                border: isCorrect ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {isCorrect ? '✓ Correct Answer' : 'Mark Correct'}
                            </span>
                          </label>

                          <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', width: '45px', color: isCorrect ? '#10b981' : 'var(--text-muted)' }}>
                            {opt.id}
                          </span>

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
                              border: isCorrect ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-color)',
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
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                              title="Delete option"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
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

                {/* INTERVIEW TYPE CONFIGURATION */}
                {formType === 'INTERVIEW' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Preset & Parameters Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          Rubric Preset
                        </label>
                        <select
                          id="select-rubric-preset"
                          value={interviewPreset}
                          onChange={(e) => loadInterviewPreset(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            background: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          <option value="UPSC_PERSONALITY">UPSC Personality Test (4 Criteria)</option>
                          <option value="IELTS_SPEAKING">IELTS Speaking (4 Bands)</option>
                          <option value="TECH_SYSTEM_DESIGN">Technical System Design (4 Criteria)</option>
                          <option value="GENERAL_HR">Behavioral / HR Interview (4 Criteria)</option>
                          <option value="CUSTOM">Custom Rubric</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          Max Turns
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="15"
                          value={interviewMaxTurns}
                          onChange={(e) => setInterviewMaxTurns(Number(e.target.value))}
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
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          Expected Duration (min)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={interviewDuration}
                          onChange={(e) => setInterviewDuration(Number(e.target.value))}
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

                    {/* Opening Scenario */}
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Interview Scenario & Context <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={interviewScenario}
                        onChange={(e) => setInterviewScenario(e.target.value)}
                        placeholder="e.g. You are facing the UPSC Personality Test Board discussing public administration and ethical crisis management..."
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: 'var(--bg-color)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                        required
                      />
                    </div>

                    {/* Opening Examiner Question */}
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Initial Examiner Question / Opening Prompt
                      </label>
                      <input
                        type="text"
                        value={interviewOpeningQuestion}
                        onChange={(e) => setInterviewOpeningQuestion(e.target.value)}
                        placeholder="e.g. Candidate, please introduce your immediate framework to address this crisis..."
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: 'var(--bg-color)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                      />
                    </div>

                    {/* Persona / System Instructions */}
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Examiner AI Persona & Socratic Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={interviewInstructions}
                        onChange={(e) => setInterviewInstructions(e.target.value)}
                        placeholder="e.g. You are the Chairperson of the board. Challenge candidate assumptions with realistic administrative constraints..."
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: 'var(--bg-color)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                      />
                    </div>

                    {/* Dynamic Rubric Builder */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Grading Rubric Criteria ({interviewRubric.length})
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setInterviewRubric([
                              ...interviewRubric,
                              {
                                id: `crit_${Date.now()}`,
                                name: 'New Criterion',
                                description: '',
                                maxScore: 25,
                              },
                            ])
                          }
                          style={{
                            background: 'none',
                            border: '1px dashed var(--border-color)',
                            color: 'var(--accent-color)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          + Add Criterion
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {interviewRubric.map((crit, idx) => (
                          <div
                            key={crit.id || idx}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 1fr 3fr auto',
                              gap: '8px',
                              alignItems: 'center',
                              padding: '8px',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                            }}
                          >
                            <input
                              type="text"
                              value={crit.name}
                              onChange={(e) => {
                                const copy = [...interviewRubric];
                                copy[idx].name = e.target.value;
                                setInterviewRubric(copy);
                              }}
                              placeholder="Criterion Name (e.g. Fluency)"
                              style={{
                                padding: '4px 8px',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                              required
                            />
                            <input
                              type="number"
                              min="0.5"
                              value={crit.maxScore}
                              onChange={(e) => {
                                const copy = [...interviewRubric];
                                copy[idx].maxScore = Number(e.target.value);
                                setInterviewRubric(copy);
                              }}
                              placeholder="Max Score"
                              style={{
                                padding: '4px 8px',
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
                              value={crit.description || ''}
                              onChange={(e) => {
                                const copy = [...interviewRubric];
                                copy[idx].description = e.target.value;
                                setInterviewRubric(copy);
                              }}
                              placeholder="Criterion Description / Descriptors"
                              style={{
                                padding: '4px 8px',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            />
                            {interviewRubric.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setInterviewRubric(interviewRubric.filter((_, i) => i !== idx))}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '4px',
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
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

              {previewQuestion.type === 'INTERVIEW' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {previewQuestion.data?.scenario && (
                    <div
                      style={{
                        padding: '12px',
                        background: 'rgba(6, 182, 212, 0.08)',
                        border: '1px solid rgba(6, 182, 212, 0.25)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: 'var(--text-main)',
                      }}
                    >
                      <strong style={{ color: '#06b6d4', display: 'block', marginBottom: '4px' }}>
                        🎙️ Oral Assessment Scenario:
                      </strong>
                      {previewQuestion.data.scenario}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>
                      Max Conversation Turns: <strong style={{ color: 'var(--text-main)' }}>{previewQuestion.data?.maxTurns || 4}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Duration: <strong style={{ color: 'var(--text-main)' }}>{previewQuestion.data?.expectedDurationMinutes || 15} mins</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Preset: <strong style={{ color: 'var(--accent-color)' }}>{previewQuestion.data?.preset || 'CUSTOM'}</strong>
                    </span>
                  </div>

                  {Array.isArray(previewQuestion.data?.rubric) && previewQuestion.data.rubric.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Evaluator Grading Rubric:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {previewQuestion.data.rubric.map((r: any, idx: number) => (
                          <div
                            key={r.id || idx}
                            style={{
                              padding: '8px 10px',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              fontSize: '11px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-main)' }}>
                              <span>{r.name}</span>
                              <span style={{ color: '#10b981' }}>{r.maxScore} marks</span>
                            </div>
                            {r.description && (
                              <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>
                                {r.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      padding: '10px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px dashed rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                    }}
                  >
                    Interactive Multi-Turn AI Audio/Text Interview room launches upon student attempt.
                  </div>
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
                onClick={() => {
                  setVersionDrawerQuestion(null);
                  setShowDiffView(false);
                  setDiffBaseVersion(null);
                  setDiffTargetVersion(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Inspect immutable audit snapshots, compare diffs, and rollback to any version.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowDiffView(false)}
                  style={{
                    background: !showDiffView ? 'var(--primary-color)' : 'transparent',
                    color: !showDiffView ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  📜 Revisions ({versionsList.length})
                </button>
                <button
                  onClick={() => {
                    if (versionsList.length > 0) {
                      setDiffBaseVersion(versionsList[0]);
                      setDiffTargetVersion(null);
                      setShowDiffView(true);
                    }
                  }}
                  style={{
                    background: showDiffView ? 'var(--primary-color)' : 'transparent',
                    color: showDiffView ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  🔍 Compare / Diff
                </button>
              </div>
            </div>

            {showDiffView ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-color)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>Base Version (Old):</label>
                    <select
                      value={diffBaseVersion?.version || ''}
                      onChange={(e) => {
                        const vNum = parseInt(e.target.value, 10);
                        const match = versionsList.find((v) => v.version === vNum);
                        if (match) setDiffBaseVersion(match);
                      }}
                      style={{ padding: '6px 8px', borderRadius: '4px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '12px' }}
                    >
                      {versionsList.map((v) => (
                        <option key={v.id} value={v.version}>
                          v{v.version} — {v.changeSummary || new Date(v.createdAt).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>Compare Against (New):</label>
                    <select
                      value={diffTargetVersion ? String(diffTargetVersion.version) : 'LIVE'}
                      onChange={(e) => {
                        if (e.target.value === 'LIVE') {
                          setDiffTargetVersion(null);
                        } else {
                          const vNum = parseInt(e.target.value, 10);
                          const match = versionsList.find((v) => v.version === vNum);
                          if (match) setDiffTargetVersion(match);
                        }
                      }}
                      style={{ padding: '6px 8px', borderRadius: '4px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '12px' }}
                    >
                      <option value="LIVE">⭐ Current Live Question</option>
                      {versionsList.map((v) => (
                        <option key={v.id} value={v.version}>
                          v{v.version} — {v.changeSummary || new Date(v.createdAt).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <EntityDiffViewer
                  title={`Field-Level Diff: Version ${diffBaseVersion?.version || 1} vs ${diffTargetVersion ? `Version ${diffTargetVersion.version}` : 'Current Live'}`}
                  oldLabel={`v${diffBaseVersion?.version || 1}`}
                  newLabel={diffTargetVersion ? `v${diffTargetVersion.version}` : 'Live Question'}
                  oldEntity={diffBaseVersion}
                  newEntity={diffTargetVersion || versionDrawerQuestion}
                  entityType="Question"
                />
              </div>
            ) : versionsList.length === 0 ? (
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
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setDiffBaseVersion(v);
                            setDiffTargetVersion(null);
                            setShowDiffView(true);
                          }}
                          style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid #38bdf8',
                            color: '#38bdf8',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: '500',
                          }}
                        >
                          🔍 Compare
                        </button>
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
                    </div>

                    {/* Inline Commit Message / Change Summary */}
                    <div
                      style={{
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono',
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>📝</span>
                      <span style={{ fontWeight: 'bold' }}>{v.changeSummary || 'Initial version / No commit summary'}</span>
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

      {/* PHASE 11: AI GENERATOR MODAL */}
      <AIGeneratorModal
        isOpen={showAIGeneratorModal}
        onClose={() => setShowAIGeneratorModal(false)}
        subjects={subjects}
        syllabusNodes={syllabusNodes}
        onSuccess={(msg) => {
          setActionSuccess(msg);
          fetchDraftQuestions();
          fetchQuestions();
        }}
      />

      {/* PHASE 11: AI QUESTION VARIATION MODIFIER MODAL */}
      <AIQuestionModifierModal
        isOpen={Boolean(modifyingQuestion)}
        onClose={() => setModifyingQuestion(null)}
        question={modifyingQuestion}
        onSuccess={(msg) => {
          setActionSuccess(msg);
          fetchDraftQuestions();
          fetchQuestions();
        }}
      />

      {/* PHASE 11: AI USAGE & CREDITS DASHBOARD MODAL */}
      <AIUsageModal
        isOpen={showAIUsageModal}
        onClose={() => setShowAIUsageModal(false)}
      />
    </div>
  );
};
