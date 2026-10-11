import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { EntityDiffViewer } from '../components/EntityDiffViewer';
import { AIGeneratorModal } from '../components/ai/AIGeneratorModal';
import { AIQuestionModifierModal } from '../components/ai/AIQuestionModifierModal';
import { AIUsageModal } from '../components/ai/AIUsageModal';
import { ListeningAuthoringPanel, ListeningQuestionConfig } from '../components/listening/ListeningAuthoringPanel';
import { WritingAuthoringPanel, WritingQuestionConfig } from '../components/writing/WritingAuthoringPanel';
import { ExamAudioPlayer } from '../components/listening/ExamAudioPlayer';
import { ImportExportModal } from '../components/import-export/ImportExportModal';
import { API_BASE } from '../config/api';
import { getAuthHeaders } from '../utils/api';

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
  { id: 'LISTENING', label: 'Listening Comprehension' },
  { id: 'IELTS_WRITING_TASK_1', label: 'IELTS Writing Task 1 (Visual Data / Report)' },
  { id: 'IELTS_WRITING_TASK_2', label: 'IELTS Writing Task 2 (Discursive Essay)' },
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
  const { token: authToken, logout } = useAuth();
  const token = authToken || (typeof window !== 'undefined' ? sessionStorage.getItem('token') : '') || '';
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
  const [showImportExportModal, setShowImportExportModal] = useState<boolean>(false);
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

  // Phase 15.3: Decoupled Knowledge Dataset & Behavioral Prompt States
  const [interviewKnowledgeSummary, setInterviewKnowledgeSummary] = useState<string>('');
  const [interviewFacts, setInterviewFacts] = useState<string[]>([]);
  const [newFactInput, setNewFactInput] = useState<string>('');
  const [interviewSourceDocuments, setInterviewSourceDocuments] = useState<Array<{ title: string; content: string }>>([]);
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [newDocContent, setNewDocContent] = useState<string>('');

  const [interviewPersona, setInterviewPersona] = useState<string>('');
  const [interviewTone, setInterviewTone] = useState<'FORMAL' | 'SOCRATIC' | 'CHALLENGING' | 'SUPPORTIVE'>('FORMAL');
  const [interviewDifficultyLevel, setInterviewDifficultyLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'>('INTERMEDIATE');
  const [interviewFocusAreas, setInterviewFocusAreas] = useState<string[]>([]);
  const [newFocusAreaInput, setNewFocusAreaInput] = useState<string>('');
  const [interviewAvoidList, setInterviewAvoidList] = useState<string[]>([]);
  const [newAvoidTopicInput, setNewAvoidTopicInput] = useState<string>('');
  const [interviewAggressiveness, setInterviewAggressiveness] = useState<'LOW' | 'MODERATE' | 'HIGH'>('MODERATE');

  // Authoring Workbench Tab State
  const [interviewActiveTab, setInterviewActiveTab] = useState<'SETTINGS' | 'KNOWLEDGE' | 'BEHAVIOR' | 'SIMULATE'>('SETTINGS');

  // Simulation Workbench States
  const [simulationCandidateMessage, setSimulationCandidateMessage] = useState<string>('');
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  // Ground Truth Non-Negotiable Axioms
  const [interviewAxioms, setInterviewAxioms] = useState<string[]>([]);
  const [newAxiomInput, setNewAxiomInput] = useState<string>('');

  // Boundary Simulator Generated Test Cases
  const [interviewBoundaryTests, setInterviewBoundaryTests] = useState<Array<{
    candidateMessage: string;
    testType: string;
    expectedBehavior: string;
    failSignal: string;
  }>>([]);
  const [selectedBoundaryTest, setSelectedBoundaryTest] = useState<any | null>(null);

  // Generate from Document Modal States
  const [showDocUploadModal, setShowDocUploadModal] = useState<boolean>(false);
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [docRoleContext, setDocRoleContext] = useState<string>('');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState<boolean>(false);
  const [docGenerateError, setDocGenerateError] = useState<string | null>(null);

  // Listening & Writing Config States
  const [listeningConfig, setListeningConfig] = useState<ListeningQuestionConfig>({
    maxPlays: 3,
    playbackSpeed: 1.0,
    allowTranscriptInReview: true,
    speechText: '',
    transcript: '',
    subQuestions: [
      {
        id: 'sq_1',
        type: 'MCQ',
        prompt: 'What is the primary theme discussed in the audio clip?',
        marks: 1,
        options: [
          { id: 'opt_1', text: 'Effective learning and preparation strategies' },
          { id: 'opt_2', text: 'Automobile manufacturing mechanics' },
          { id: 'opt_3', text: 'Meteorological tracking systems' },
          { id: 'opt_4', text: 'Ocean current salinity levels' },
        ],
        correctOptionId: 'opt_1',
      },
    ],
  });

  const [writingConfig, setWritingConfig] = useState<WritingQuestionConfig>({
    promptStem: '',
    minWords: 150,
    maxWords: 250,
    recommendedTimeMinutes: 20,
    rubricCriteria: [
      { id: 'task_achievement', name: 'Task Achievement', weight: 0.25, maxScore: 9, description: 'Accurate overview, key features selected and illustrated with data/stages.' },
      { id: 'coherence_cohesion', name: 'Coherence and Cohesion', weight: 0.25, maxScore: 9, description: 'Logical paragraph progression, cohesive devices, and sequencing.' },
      { id: 'lexical_resource', name: 'Lexical Resource', weight: 0.25, maxScore: 9, description: 'Accurate academic data vocabulary, proportions, verbs of change, and precision.' },
      { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', weight: 0.25, maxScore: 9, description: 'Variety of complex structures, passive forms for processes, and error-free sentences.' },
    ],
    preset: 'IELTS_TASK_1',
    taskType: 'TASK_1_GRAPH',
  });

  const loadInterviewPreset = (preset: string) => {
    setInterviewPreset(preset);
    if (preset === 'IELTS_SPEAKING') {
      setInterviewDuration(12);
      setInterviewMaxTurns(4);
      setFormMarks(9);
      setInterviewInstructions('You are a certified IELTS Speaking Examiner. Evaluate lexical resource, grammatical range, fluency, and pronunciation.');
      setInterviewPersona('Certified British Council / IDP IELTS Senior Examiner');
      setInterviewTone('FORMAL');
      setInterviewDifficultyLevel('ADVANCED');
      setInterviewKnowledgeSummary('Academic IELTS oral testing framework covering personal life, societal views, and abstract hypothesis reasoning.');
      setInterviewFacts(['Candidate must speak at length with coherent sequencing', 'Avoid one-word answers or excessive pauses']);
      setInterviewFocusAreas(['Fluency & Coherence', 'Lexical Resource', 'Grammatical Accuracy', 'Pronunciation']);
      setInterviewAvoidList(['Premature answer revelation', 'Unprofessional casual slang']);
      setInterviewAggressiveness('MODERATE');
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
      setInterviewPersona('Chairperson of the UPSC Personality Test Board');
      setInterviewTone('CHALLENGING');
      setInterviewDifficultyLevel('EXPERT');
      setInterviewKnowledgeSummary('Constitutional values, public interest administration, disaster relief ethics, and statutory governance rules.');
      setInterviewFacts(['Constitutional Articles 14 to 21 protection', 'Civil servant code of conduct and political neutrality']);
      setInterviewFocusAreas(['Ethical Balance', 'Constitutional Grounding', 'Crisis Decision Making']);
      setInterviewAvoidList(['Partisan politics', 'Personal speculation outside administrative facts']);
      setInterviewAggressiveness('HIGH');
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
      setInterviewPersona('Principal Infrastructure & Distributed Systems Architect');
      setInterviewTone('SOCRATIC');
      setInterviewDifficultyLevel('ADVANCED');
      setInterviewKnowledgeSummary('Scalable microservices topology handling 100,000 RPS, multi-region database replication, Redis caching, and circuit breaking.');
      setInterviewFacts(['Single primary database with 3 asynchronous read replicas', 'Redis volatile-lru eviction policy']);
      setInterviewFocusAreas(['Scalability & Partitioning', 'CAP Theorem Trade-offs', 'Resilience & Circuit Breaking']);
      setInterviewAvoidList(['Frontend styling', 'Cloud vendor pricing tiers']);
      setInterviewAggressiveness('HIGH');
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
      setInterviewPersona('Head of People & Organizational Talent');
      setInterviewTone('SUPPORTIVE');
      setInterviewDifficultyLevel('INTERMEDIATE');
      setInterviewKnowledgeSummary('Behavioral competency evaluation based on Situation, Task, Action, and Result (STAR) framework.');
      setInterviewFacts(['Candidate responses must outline specific actions taken rather than generic team efforts']);
      setInterviewFocusAreas(['Conflict Resolution', 'Ownership & Integrity', 'STAR Method Articulation']);
      setInterviewAvoidList(['Discriminatory personal inquiries', 'Unstructured banter']);
      setInterviewAggressiveness('MODERATE');
      setInterviewRubric([
        { id: 'leadership', name: 'Leadership & Conflict Resolution', description: 'Handling team disagreement and guiding outcomes', maxScore: 10 },
        { id: 'adaptability', name: 'Adaptability & Problem Solving', description: 'Navigating ambiguity and unexpected blockers', maxScore: 10 },
        { id: 'communication', name: 'Interpersonal Articulation', description: 'Structured STAR method response clarity', maxScore: 10 },
        { id: 'cultural_fit', name: 'Values Alignment & Ownership', description: 'Demonstrating extreme ownership and integrity', maxScore: 10 },
      ]);
    }
  };

  const handleSimulateTurn = async (customCandidateMsg?: string) => {
    const msgToUse = typeof customCandidateMsg === 'string' ? customCandidateMsg : simulationCandidateMessage;
    if (!msgToUse.trim()) return;
    setSimulationCandidateMessage(msgToUse);
    setIsSimulating(true);
    setSimulationError(null);
    setSimulationResult(null);
    try {
      const res = await fetch(`${API_BASE}/interview/simulate-turn`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          knowledgeDataset: {
            summary: interviewKnowledgeSummary.trim(),
            facts: interviewFacts.filter((f) => f.trim().length > 0),
            groundTruthAxioms: interviewAxioms.filter((a) => a.trim().length > 0),
            sourceDocuments: interviewSourceDocuments.filter((d) => d.title.trim() && d.content.trim()),
          },
          behavioralPrompt: {
            persona: interviewPersona.trim() || interviewInstructions.trim(),
            tone: interviewTone,
            difficultyLevel: interviewDifficultyLevel,
            focusAreas: interviewFocusAreas.filter((f) => f.trim().length > 0),
            avoidList: interviewAvoidList.filter((a) => a.trim().length > 0),
            followUpAggressiveness: interviewAggressiveness,
          },
          candidateMessage: msgToUse.trim(),
          conversationHistory: [],
        }),
      });
      if (res.status === 401) {
        setSimulationError('Session expired or unauthorized (401). Please re-login to ExamOS.');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSimulationResult(data.data);
      } else {
        setSimulationError(data.message || 'Simulation turn failed');
      }
    } catch (err: any) {
      setSimulationError(err.message || 'Network error executing simulation turn');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleGenerateFromDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUploadFile) {
      setDocGenerateError('Please select a reference document (PDF, TXT, or MD).');
      return;
    }
    if (docUploadFile.size > 50 * 1024 * 1024) {
      setDocGenerateError(`Selected file exceeds the maximum 50MB limit (${(docUploadFile.size / (1024 * 1024)).toFixed(1)}MB). Please upload a file up to 50MB.`);
      return;
    }

    try {
      setIsGeneratingDoc(true);
      setDocGenerateError(null);

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.includes('base64,') ? res.split('base64,')[1] : res;
          resolve(base64);
        };
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(docUploadFile);
      const fileBase64 = await base64Promise;

      const res = await fetch(`${API_BASE}/interview/generate-from-document`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileBase64,
          fileName: docUploadFile.name,
          mimeType: docUploadFile.type || (docUploadFile.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain'),
          roleContext: docRoleContext.trim() || undefined,
        }),
      });

      if (res.status === 401) {
        setDocGenerateError('Session expired or unauthorized (401). Please re-login to ExamOS.');
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        console.error('[GENERATE_FROM_DOC_ERROR]', res.status, json);
        setDocGenerateError(extractApiErrorMessage(json, `Failed to generate interview fields (${res.status})`));
        return;
      }

      const generated = json.data;

      // Populate form fields across all three authoring tabs (never auto-publish)
      if (generated.questionStem) {
        setFormContent(generated.questionStem);
      }
      if (generated.scenarioContext) {
        setInterviewScenario(generated.scenarioContext);
      }
      if (generated.openingPrompt) {
        setInterviewOpeningQuestion(generated.openingPrompt);
      }
      if (generated.knowledgeDataset) {
        if (generated.knowledgeDataset.summary) {
          setInterviewKnowledgeSummary(generated.knowledgeDataset.summary);
        }
        if (Array.isArray(generated.knowledgeDataset.facts)) {
          setInterviewFacts(generated.knowledgeDataset.facts);
        }
        if (Array.isArray(generated.knowledgeDataset.groundTruthAxioms)) {
          setInterviewAxioms(generated.knowledgeDataset.groundTruthAxioms);
        }
        if (Array.isArray(generated.knowledgeDataset.sourceDocuments)) {
          setInterviewSourceDocuments(generated.knowledgeDataset.sourceDocuments);
        }
      }
      if (generated.behavioralPrompt) {
        if (generated.behavioralPrompt.persona) {
          setInterviewPersona(generated.behavioralPrompt.persona);
        }
        if (generated.behavioralPrompt.tone) {
          setInterviewTone(generated.behavioralPrompt.tone);
        }
        if (generated.behavioralPrompt.difficultyLevel) {
          setInterviewDifficultyLevel(generated.behavioralPrompt.difficultyLevel);
        }
        if (Array.isArray(generated.behavioralPrompt.focusAreas)) {
          setInterviewFocusAreas(generated.behavioralPrompt.focusAreas);
        }
        if (Array.isArray(generated.behavioralPrompt.avoidList)) {
          setInterviewAvoidList(generated.behavioralPrompt.avoidList);
        }
        if (generated.behavioralPrompt.followUpAggressiveness) {
          setInterviewAggressiveness(generated.behavioralPrompt.followUpAggressiveness as any);
        }
      }
      if (Array.isArray(generated.boundarySimulatorTests)) {
        setInterviewBoundaryTests(generated.boundarySimulatorTests);
        if (generated.boundarySimulatorTests.length > 0) {
          setSelectedBoundaryTest(generated.boundarySimulatorTests[0]);
          setSimulationCandidateMessage(generated.boundarySimulatorTests[0].candidateMessage);
        }
      }

      setShowDocUploadModal(false);
      setDocUploadFile(null);
      setDocRoleContext('');
      setActionSuccess('Interview fields populated from document! Review and edit each tab before saving.');
      setInterviewActiveTab('KNOWLEDGE');
    } catch (err: any) {
      setDocGenerateError(err.message || 'Error generating interview fields from document');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

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
      if (res.status === 401) {
        setError('Session expired or unauthorized (401). Please re-login to ExamOS.');
        return;
      }
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
    setInterviewKnowledgeSummary('');
    setInterviewFacts([]);
    setNewFactInput('');
    setInterviewSourceDocuments([]);
    setNewDocTitle('');
    setNewDocContent('');
    setInterviewPersona('');
    setInterviewTone('FORMAL');
    setInterviewDifficultyLevel('INTERMEDIATE');
    setInterviewFocusAreas([]);
    setNewFocusAreaInput('');
    setInterviewAvoidList([]);
    setNewAvoidTopicInput('');
    setInterviewAggressiveness('MODERATE');
    setInterviewActiveTab('SETTINGS');
    setSimulationCandidateMessage('');
    setSimulationResult(null);
    setSimulationError(null);
    setInterviewRubric([
      { id: 'integrity', name: 'Ethical Integrity & Public Service', description: 'Constitutional compliance and impartiality', maxScore: 25 },
      { id: 'decision_making', name: 'Administrative Problem Solving', description: 'Practical stakeholder resolution', maxScore: 25 },
      { id: 'communication', name: 'Clarity, Articulation & Poise', description: 'Logical structure and calm composure', maxScore: 25 },
      { id: 'critical_thinking', name: 'Analytical Depth & Foresight', description: 'Multi-dimensional policy view', maxScore: 25 },
    ]);
    setInterviewAxioms([]);
    setNewAxiomInput('');
    setInterviewBoundaryTests([]);
    setSelectedBoundaryTest(null);
    setShowDocUploadModal(false);
    setDocUploadFile(null);
    setDocRoleContext('');
    setDocGenerateError(null);
    setIsGeneratingDoc(false);
    setWritingConfig({
      promptStem: '',
      promptImageUrl: '',
      stimulusText: '',
      minWords: 150,
      maxWords: 250,
      recommendedTimeMinutes: 20,
      rubricCriteria: [
        { id: 'task_achievement', name: 'Task Achievement', weight: 0.25, maxScore: 9, description: 'Accurate overview, key features selected and illustrated with data/stages.' },
        { id: 'coherence_cohesion', name: 'Coherence and Cohesion', weight: 0.25, maxScore: 9, description: 'Logical paragraph progression, cohesive devices, and sequencing.' },
        { id: 'lexical_resource', name: 'Lexical Resource', weight: 0.25, maxScore: 9, description: 'Accurate academic data vocabulary, proportions, verbs of change, and precision.' },
        { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', weight: 0.25, maxScore: 9, description: 'Variety of complex structures, passive forms for processes, and error-free sentences.' },
      ],
      sampleAnswer: '',
      preset: 'IELTS_TASK_1',
      taskType: 'TASK_1_GRAPH',
    });
    setEditingQuestion(null);
  };

  const openCreateModal = () => {
    resetForm();
    if (filterType === 'IELTS_WRITING_TASK_1') {
      setFormType('IELTS_WRITING_TASK_1');
      setFormMarks(9.0);
    } else if (filterType === 'IELTS_WRITING_TASK_2') {
      setFormType('IELTS_WRITING_TASK_2');
      setFormMarks(9.0);
      setWritingConfig({
        promptStem: '',
        promptImageUrl: '',
        stimulusText: '',
        minWords: 250,
        maxWords: 400,
        recommendedTimeMinutes: 40,
        rubricCriteria: [
          { id: 'task_response', name: 'Task Response', weight: 0.25, maxScore: 9, description: 'Addressing all parts of the task with clear position throughout and extended, supported ideas.' },
          { id: 'coherence_cohesion', name: 'Coherence and Cohesion', weight: 0.25, maxScore: 9, description: 'Logical sequencing, clear central topic per paragraph, and linking devices.' },
          { id: 'lexical_resource', name: 'Lexical Resource', weight: 0.25, maxScore: 9, description: 'Range, accuracy, natural academic collocations, and sophistication of vocabulary.' },
          { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', weight: 0.25, maxScore: 9, description: 'Complex sentence structures, high accuracy, punctuation control, and communicative effect.' },
        ],
        sampleAnswer: '',
        preset: 'IELTS_TASK_2',
        taskType: 'TASK_2_ESSAY',
      });
    }
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
      setInterviewRubric(
        Array.isArray(d.rubric)
          ? d.rubric.map((r: any) => ({
              ...r,
              maxScore: typeof r.maxScore === 'number' && !isNaN(r.maxScore) ? r.maxScore : Number(r.maxScore) || 5,
            }))
          : []
      );
      setInterviewKnowledgeSummary(d.knowledgeDataset?.summary || '');
      setInterviewFacts(d.knowledgeDataset?.facts || d.knowledgeDataset?.groundTruthFacts || []);
      setInterviewAxioms(d.knowledgeDataset?.groundTruthAxioms || []);
      setInterviewSourceDocuments(d.knowledgeDataset?.sourceDocuments || []);
      setInterviewPersona(d.behavioralPrompt?.persona || d.systemInstructions || '');
      setInterviewTone(d.behavioralPrompt?.tone || 'FORMAL');
      setInterviewDifficultyLevel(d.behavioralPrompt?.difficultyLevel || 'INTERMEDIATE');
      setInterviewFocusAreas(d.behavioralPrompt?.focusAreas || []);
      setInterviewAvoidList(d.behavioralPrompt?.avoidList || []);
      setInterviewAggressiveness(d.behavioralPrompt?.followUpAggressiveness || 'MODERATE');
      setInterviewBoundaryTests(d.boundarySimulatorTests || []);
      if (d.boundarySimulatorTests && d.boundarySimulatorTests.length > 0) {
        setSelectedBoundaryTest(d.boundarySimulatorTests[0]);
      }
      setInterviewActiveTab('SETTINGS');
      setSimulationResult(null);
      setSimulationError(null);
    } else if (q.type === 'LISTENING') {
      setListeningConfig({
        audioUrl: d.audioUrl || '',
        speechText: d.speechText || d.audioScript || '',
        transcript: d.transcript || d.speechText || '',
        voiceProfileId: d.voiceProfileId || '',
        maxPlays: d.maxPlays || d.playbackLimit || 3,
        playbackSpeed: d.playbackSpeed || 1.0,
        allowTranscriptInReview: d.allowTranscriptInReview ?? true,
        subQuestions: d.subQuestions || [],
      });
    } else if (q.type === 'WRITING' || q.type === 'IELTS_WRITING_TASK_1' || q.type === 'IELTS_WRITING_TASK_2') {
      const isT1 = q.type === 'IELTS_WRITING_TASK_1' ||
        d.preset === 'IELTS_TASK_1' ||
        d.taskType?.startsWith('TASK_1') ||
        Boolean(d.promptImageUrl) ||
        Boolean(d.aiVisualContext) ||
        (q.content && /task\s*1/i.test(q.content)) ||
        (d.minWords && d.minWords <= 200);

      setFormType(isT1 ? 'IELTS_WRITING_TASK_1' : 'IELTS_WRITING_TASK_2');
      setWritingConfig({
        promptStem: d.promptStem || d.promptText || q.content,
        promptImageUrl: d.promptImageUrl || '',
        stimulusText: d.stimulusText || '',
        aiVisualContext: d.aiVisualContext || (typeof d.chartFacts === 'string' ? d.chartFacts : d.chartFacts?.contextText || d.chartFacts?.notes) || '',
        minWords: d.minWords || d.minWordCount || (isT1 ? 150 : 250),
        maxWords: d.maxWords || d.maxWordCount || (isT1 ? 250 : 400),
        recommendedTimeMinutes: d.recommendedTimeMinutes || d.timeLimitMinutes || (isT1 ? 20 : 40),
        rubricCriteria: d.rubricCriteria || d.rubric || [],
        sampleAnswer: d.sampleAnswer || '',
        preset: isT1 ? 'IELTS_TASK_1' : 'IELTS_TASK_2',
        taskType: d.taskType || (isT1 ? 'TASK_1_GRAPH' : 'TASK_2_ESSAY'),
        chartFacts: d.chartFacts,
      });
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
          knowledgeDataset: {
            summary: interviewKnowledgeSummary.trim(),
            facts: interviewFacts.filter((f) => f.trim().length > 0),
            groundTruthAxioms: interviewAxioms.filter((a) => a.trim().length > 0),
            sourceDocuments: interviewSourceDocuments.filter((d) => d.title.trim() && d.content.trim()),
          },
          boundarySimulatorTests: interviewBoundaryTests,
          behavioralPrompt: {
            persona: interviewPersona.trim() || interviewInstructions.trim(),
            tone: interviewTone,
            difficultyLevel: interviewDifficultyLevel,
            focusAreas: interviewFocusAreas.filter((f) => f.trim().length > 0),
            avoidList: interviewAvoidList.filter((a) => a.trim().length > 0),
            followUpAggressiveness: interviewAggressiveness,
          },
        };
      case 'LISTENING':
        return {
          audioSource: listeningConfig.audioUrl ? 'UPLOADED' : 'SYNTHESIZED',
          audioUrl: listeningConfig.audioUrl || undefined,
          speechText: listeningConfig.speechText || undefined,
          audioScript: listeningConfig.speechText || listeningConfig.transcript || undefined,
          transcript: listeningConfig.transcript || listeningConfig.speechText || undefined,
          voiceProfileId: listeningConfig.voiceProfileId || undefined,
          playbackLimit: Number(listeningConfig.maxPlays || 3),
          maxPlays: Number(listeningConfig.maxPlays || 3),
          playbackSpeed: Number(listeningConfig.playbackSpeed || 1.0),
          allowTranscriptInReview: Boolean(listeningConfig.allowTranscriptInReview),
          subQuestions: listeningConfig.subQuestions || [],
        };
      case 'WRITING':
      case 'IELTS_WRITING_TASK_1':
      case 'IELTS_WRITING_TASK_2':
        const isTask1 = formType === 'IELTS_WRITING_TASK_1' || writingConfig.preset?.startsWith('IELTS_TASK_1') || false;
        const defaultT1Rubrics = [
          { id: 'task_achievement', name: 'Task Achievement', weight: 0.25, maxScore: 9, description: 'Accurate overview, key features selected and illustrated with data/stages.' },
          { id: 'coherence_cohesion', name: 'Coherence and Cohesion', weight: 0.25, maxScore: 9, description: 'Logical paragraph progression, cohesive devices, and sequencing.' },
          { id: 'lexical_resource', name: 'Lexical Resource', weight: 0.25, maxScore: 9, description: 'Accurate academic data vocabulary, proportions, verbs of change, and precision.' },
          { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', weight: 0.25, maxScore: 9, description: 'Variety of complex structures, passive forms for processes, and error-free sentences.' },
        ];
        const defaultT2Rubrics = [
          { id: 'task_response', name: 'Task Response', weight: 0.25, maxScore: 9, description: 'Addressing all parts of the task with clear position throughout and extended, supported ideas.' },
          { id: 'coherence_cohesion', name: 'Coherence and Cohesion', weight: 0.25, maxScore: 9, description: 'Logical sequencing, clear central topic per paragraph, and linking devices.' },
          { id: 'lexical_resource', name: 'Lexical Resource', weight: 0.25, maxScore: 9, description: 'Range, accuracy, natural academic collocations, and sophistication of vocabulary.' },
          { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', weight: 0.25, maxScore: 9, description: 'Complex sentence structures, high accuracy, punctuation control, and communicative effect.' },
        ];
        const cleanRubrics = isTask1
          ? (writingConfig.rubricCriteria?.length && !writingConfig.rubricCriteria.some((r) => r.id === 'task_response')
              ? writingConfig.rubricCriteria
              : defaultT1Rubrics)
          : (writingConfig.rubricCriteria?.length && !writingConfig.rubricCriteria.some((r) => r.id === 'task_achievement')
              ? writingConfig.rubricCriteria
              : defaultT2Rubrics);

        return {
          preset: isTask1 ? (writingConfig.preset === 'IELTS_TASK_1_GT' ? 'IELTS_TASK_1_GT' : 'IELTS_TASK_1') : 'IELTS_TASK_2',
          taskType: isTask1 ? (writingConfig.taskType?.startsWith('TASK_1') ? writingConfig.taskType : 'TASK_1_GRAPH') : 'TASK_2_ESSAY',
          promptStem: writingConfig.promptStem || formContent,
          promptText: writingConfig.promptStem || formContent,
          promptImageUrl: isTask1 ? (writingConfig.promptImageUrl || undefined) : undefined,
          stimulusText: writingConfig.stimulusText || undefined,
          aiVisualContext: isTask1 ? (writingConfig.aiVisualContext || undefined) : undefined,
          chartFacts: isTask1 && writingConfig.aiVisualContext ? {
            chartTitle: writingConfig.promptStem?.slice(0, 100) || 'Visual Stimulus Chart',
            chartType: writingConfig.taskType || 'CHART',
            notes: writingConfig.aiVisualContext,
            contextText: writingConfig.aiVisualContext,
            majorTrends: [writingConfig.aiVisualContext],
          } : (writingConfig.chartFacts || undefined),
          minWords: Number(writingConfig.minWords || (isTask1 ? 150 : 250)),
          minWordCount: Number(writingConfig.minWords || (isTask1 ? 150 : 250)),
          maxWords: Number(writingConfig.maxWords || (isTask1 ? 250 : 400)),
          maxWordCount: Number(writingConfig.maxWords || (isTask1 ? 250 : 400)),
          recommendedTimeMinutes: Number(writingConfig.recommendedTimeMinutes || (isTask1 ? 20 : 40)),
          timeLimitMinutes: Number(writingConfig.recommendedTimeMinutes || (isTask1 ? 20 : 40)),
          rubricCriteria: cleanRubrics,
          rubric: cleanRubrics,
          sampleAnswer: writingConfig.sampleAnswer || undefined,
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

      const isWritingForm = formType === 'WRITING' || formType === 'IELTS_WRITING_TASK_1' || formType === 'IELTS_WRITING_TASK_2';
      let effectiveContent = formContent;
      if (isWritingForm && (!effectiveContent.trim() || effectiveContent.trim().length === 0)) {
        effectiveContent = writingConfig.promptStem || (formType === 'IELTS_WRITING_TASK_1' ? 'IELTS Task 1 Visual Report' : 'IELTS Task 2 Discursive Essay');
      }

      if (formType === 'IELTS_WRITING_TASK_1') {
        if (!writingConfig.promptImageUrl || !writingConfig.promptImageUrl.trim()) {
          setError('A stimulus image/picture is required for IELTS Writing Task 1. Please provide an image URL or choose a preset asset.');
          return;
        }
      }

      const payload: any = {
        type: formType,
        content: effectiveContent,
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
        if (res.status === 401) {
          setError('Session expired or unauthorized (401). Please re-login to ExamOS.');
          return;
        }
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
        if (res.status === 401) {
          setError('Session expired or unauthorized (401). Please re-login to ExamOS.');
          return;
        }
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
            {t('qb_title')}
          </h1>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {t('qb_desc')}
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
            id="open-import-export-btn"
            onClick={() => setShowImportExportModal(true)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
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
            <span>📁</span> Import / Export
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
            <span>+</span> {t('qb_add_question')}
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
          placeholder={t('qb_search_placeholder')}
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
          <option value="">{t('qb_filter_difficulty')}</option>
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
              {t('qb_no_questions')}
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
                  {(() => {
                    const qData = typeof q.data === 'string' ? JSON.parse(q.data) : q.data || {};
                    const isT1 = q.type === 'IELTS_WRITING_TASK_1' || 
                      (q.type === 'WRITING' && (
                        qData?.preset === 'IELTS_TASK_1' ||
                        qData?.taskType?.startsWith('TASK_1') ||
                        Boolean(qData?.promptImageUrl) ||
                        Boolean(qData?.aiVisualContext) ||
                        (q.content && /task\s*1/i.test(q.content)) ||
                        (qData?.minWords && qData.minWords <= 200)
                      ));
                    const isT2 = q.type === 'IELTS_WRITING_TASK_2' || 
                      (q.type === 'WRITING' && !isT1 && (
                        qData?.preset === 'IELTS_TASK_2' ||
                        qData?.taskType?.startsWith('TASK_2') ||
                        (q.content && /task\s*2/i.test(q.content)) ||
                        (qData?.minWords && qData.minWords > 200)
                      ));

                    if (isT1) {
                      return (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontFamily: 'JetBrains Mono',
                            background: 'rgba(6, 182, 212, 0.15)',
                            border: '1px solid #06b6d4',
                            color: '#06b6d4',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>📊</span> IELTS Task 1
                        </span>
                      );
                    }
                    if (isT2) {
                      return (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontFamily: 'JetBrains Mono',
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid #818cf8',
                            color: '#818cf8',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>📝</span> IELTS Task 2
                        </span>
                      );
                    }

                    return (
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
                    );
                  })()}
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
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormType(newType);
                      if (newType === 'WRITING' || newType === 'IELTS_WRITING_TASK_1' || newType === 'IELTS_WRITING_TASK_2') {
                        setFormMarks(9.0);
                        if (newType === 'IELTS_WRITING_TASK_1') {
                          setWritingConfig((prev) => ({
                            ...prev,
                            preset: 'IELTS_TASK_1',
                            taskType: 'TASK_1_GRAPH',
                            minWords: 150,
                            maxWords: 250,
                            recommendedTimeMinutes: 20,
                            rubricCriteria: [
                              { id: 'task_achievement', name: 'Task Achievement', weight: 0.25, maxScore: 9, description: 'Accurate overview, key features selected and illustrated with data/stages.' },
                              { id: 'coherence_cohesion', name: 'Coherence and Cohesion', weight: 0.25, maxScore: 9, description: 'Logical paragraph progression, cohesive devices, and sequencing.' },
                              { id: 'lexical_resource', name: 'Lexical Resource', weight: 0.25, maxScore: 9, description: 'Accurate academic data vocabulary, proportions, verbs of change, and precision.' },
                              { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', weight: 0.25, maxScore: 9, description: 'Variety of complex structures, passive forms for processes, and error-free sentences.' },
                            ],
                          }));
                        } else if (newType === 'IELTS_WRITING_TASK_2') {
                          setWritingConfig((prev) => ({
                            ...prev,
                            preset: 'IELTS_TASK_2',
                            taskType: 'TASK_2_ESSAY',
                            minWords: 250,
                            maxWords: 400,
                            recommendedTimeMinutes: 40,
                            rubricCriteria: [
                              { id: 'task_response', name: 'Task Response', weight: 0.25, maxScore: 9, description: 'Addressing all parts of the task with clear position throughout and extended, supported ideas.' },
                              { id: 'coherence_cohesion', name: 'Coherence and Cohesion', weight: 0.25, maxScore: 9, description: 'Logical sequencing, clear central topic per paragraph, and linking devices.' },
                              { id: 'lexical_resource', name: 'Lexical Resource', weight: 0.25, maxScore: 9, description: 'Range, accuracy, natural academic collocations, and sophistication of vocabulary.' },
                              { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', weight: 0.25, maxScore: 9, description: 'Complex sentence structures, high accuracy, punctuation control, and communicative effect.' },
                            ],
                          }));
                        }
                      } else if (newType === 'INTERVIEW') {
                        setFormMarks(100.0);
                      } else if (formMarks === 9.0 || formMarks === 100.0) {
                        setFormMarks(4.0);
                      }
                    }}
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
                    value={isNaN(formMarks) || formMarks === null || formMarks === undefined ? '' : formMarks}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setFormMarks(isNaN(v) ? ('' as any) : v);
                    }}
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
                        value={isNaN(numTargetValue) || numTargetValue === null || numTargetValue === undefined ? '' : numTargetValue}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setNumTargetValue(isNaN(v) ? ('' as any) : v);
                        }}
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
                        value={isNaN(numTolerance) || numTolerance === null || numTolerance === undefined ? '' : numTolerance}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setNumTolerance(isNaN(v) ? ('' as any) : v);
                        }}
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

                {/* INTERVIEW TYPE CONFIGURATION (Phase 15.3 Decoupled Authoring Workbench) */}
                {formType === 'INTERVIEW' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Workbench Sub-Navigation Tabs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        id="tab-interview-settings"
                        onClick={() => setInterviewActiveTab('SETTINGS')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: interviewActiveTab === 'SETTINGS' ? '1px solid #06b6d4' : '1px solid var(--border-color)',
                          background: interviewActiveTab === 'SETTINGS' ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-secondary)',
                          color: interviewActiveTab === 'SETTINGS' ? '#06b6d4' : 'var(--text-main)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ⚙️ General & Scenario
                      </button>
                      <button
                        type="button"
                        id="tab-interview-knowledge"
                        onClick={() => setInterviewActiveTab('KNOWLEDGE')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: interviewActiveTab === 'KNOWLEDGE' ? '1px solid #10b981' : '1px solid var(--border-color)',
                          background: interviewActiveTab === 'KNOWLEDGE' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                          color: interviewActiveTab === 'KNOWLEDGE' ? '#10b981' : 'var(--text-main)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        📚 Knowledge Dataset ({interviewFacts.length} Facts, {interviewAxioms.length} Axioms)
                      </button>
                      <button
                        type="button"
                        id="tab-interview-behavior"
                        onClick={() => setInterviewActiveTab('BEHAVIOR')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: interviewActiveTab === 'BEHAVIOR' ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                          background: interviewActiveTab === 'BEHAVIOR' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-secondary)',
                          color: interviewActiveTab === 'BEHAVIOR' ? '#f59e0b' : 'var(--text-main)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        🎭 Examiner Persona & Behavior ({interviewFocusAreas.length} Focus, {interviewAvoidList.length} Avoid)
                      </button>
                      <button
                        type="button"
                        id="tab-interview-simulate"
                        onClick={() => setInterviewActiveTab('SIMULATE')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: interviewActiveTab === 'SIMULATE' ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                          background: interviewActiveTab === 'SIMULATE' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-secondary)',
                          color: interviewActiveTab === 'SIMULATE' ? '#8b5cf6' : 'var(--text-main)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        🧪 Boundary Simulator {interviewBoundaryTests.length > 0 ? `(${interviewBoundaryTests.length} Tests)` : ''}
                      </button>
                      <button
                        type="button"
                        id="btn-interview-generate-doc"
                        onClick={() => {
                          setDocGenerateError(null);
                          setShowDocUploadModal(true);
                        }}
                        style={{
                          marginLeft: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: '1px solid #3b82f6',
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
                          color: '#60a5fa',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <span>📄</span>
                        <span>Generate from Document</span>
                      </button>
                    </div>

                    {/* TAB 1: General & Scenario */}
                    {interviewActiveTab === 'SETTINGS' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                              value={isNaN(interviewMaxTurns) || interviewMaxTurns === null || interviewMaxTurns === undefined ? '' : interviewMaxTurns}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                setInterviewMaxTurns(isNaN(v) ? ('' as any) : v);
                              }}
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
                              value={isNaN(interviewDuration) || interviewDuration === null || interviewDuration === undefined ? '' : interviewDuration}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                setInterviewDuration(isNaN(v) ? ('' as any) : v);
                              }}
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
                                  value={isNaN(crit.maxScore) || crit.maxScore === null || crit.maxScore === undefined ? '' : crit.maxScore}
                                  onChange={(e) => {
                                    const copy = [...interviewRubric];
                                    const val = parseFloat(e.target.value);
                                    copy[idx].maxScore = isNaN(val) ? ('' as any) : val;
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

                    {/* TAB 2: Knowledge Dataset */}
                    {interviewActiveTab === 'KNOWLEDGE' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Ground Truth Factual Summary / Context Narrative
                          </label>
                          <textarea
                            rows={3}
                            value={interviewKnowledgeSummary}
                            onChange={(e) => setInterviewKnowledgeSummary(e.target.value)}
                            placeholder="Provide exhaustive context facts and domain rules that the examiner must strictly ground their questions in..."
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

                        {/* Ground Truth Facts Builder */}
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Ground Truth Discrete Facts ({interviewFacts.length}) <span style={{ fontSize: '10px', color: '#10b981' }}>— Verifiable technical realities and metrics</span>
                          </label>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                              type="text"
                              value={newFactInput}
                              onChange={(e) => setNewFactInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newFactInput.trim()) {
                                  e.preventDefault();
                                  setInterviewFacts([...interviewFacts, newFactInput.trim()]);
                                  setNewFactInput('');
                                }
                              }}
                              placeholder="e.g. Redis cache eviction policy is volatile-lru..."
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newFactInput.trim()) {
                                  setInterviewFacts([...interviewFacts, newFactInput.trim()]);
                                  setNewFactInput('');
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              + Add Fact
                            </button>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {interviewFacts.map((fact, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '4px 8px',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  border: '1px solid #10b981',
                                  color: '#10b981',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <span>{fact}</span>
                                <button
                                  type="button"
                                  onClick={() => setInterviewFacts(interviewFacts.filter((_, i) => i !== idx))}
                                  style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: 0 }}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Non-Negotiable Axioms Builder */}
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Non-Negotiable Axioms ({interviewAxioms.length}) <span style={{ fontSize: '10px', color: '#f59e0b' }}>— Hard boundary rules ("X is true; do not accept claims that Y")</span>
                          </label>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                              type="text"
                              id="input-interview-axiom"
                              value={newAxiomInput}
                              onChange={(e) => setNewAxiomInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newAxiomInput.trim()) {
                                  e.preventDefault();
                                  setInterviewAxioms([...interviewAxioms, newAxiomInput.trim()]);
                                  setNewAxiomInput('');
                                }
                              }}
                              placeholder="e.g. eBPF programs must pass static verifier before loading; reject claims that verifier can be disabled at runtime..."
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            />
                            <button
                              type="button"
                              id="btn-add-interview-axiom"
                              onClick={() => {
                                if (newAxiomInput.trim()) {
                                  setInterviewAxioms([...interviewAxioms, newAxiomInput.trim()]);
                                  setNewAxiomInput('');
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                background: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid #f59e0b',
                                color: '#f59e0b',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              + Add Axiom
                            </button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {interviewAxioms.map((axiom, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '6px 10px',
                                  background: 'rgba(245, 158, 11, 0.08)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  color: 'var(--text-main)',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                              >
                                <span style={{ flex: 1, lineHeight: '1.4' }}>⚖️ <strong>Axiom {idx + 1}:</strong> {axiom}</span>
                                <button
                                  type="button"
                                  onClick={() => setInterviewAxioms(interviewAxioms.filter((_, i) => i !== idx))}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Source Reference Documents Builder */}
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Source Documents & Reference Files ({interviewSourceDocuments.length})
                          </label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                            <input
                              type="text"
                              value={newDocTitle}
                              onChange={(e) => setNewDocTitle(e.target.value)}
                              placeholder="Document Title (e.g. Incident Report RC-402)"
                              style={{
                                padding: '6px 10px',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            />
                            <textarea
                              rows={2}
                              value={newDocContent}
                              onChange={(e) => setNewDocContent(e.target.value)}
                              placeholder="Document Text / Context Specifications..."
                              style={{
                                padding: '6px 10px',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newDocTitle.trim() && newDocContent.trim()) {
                                  setInterviewSourceDocuments([...interviewSourceDocuments, { title: newDocTitle.trim(), content: newDocContent.trim() }]);
                                  setNewDocTitle('');
                                  setNewDocContent('');
                                }
                              }}
                              style={{
                                alignSelf: 'flex-start',
                                padding: '4px 10px',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                color: '#06b6d4',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              + Add Document
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {interviewSourceDocuments.map((doc, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '8px 12px',
                                  background: 'var(--bg-secondary)',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-color)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)' }}>📄 {doc.title}</span>
                                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0', maxWidth: '480px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {doc.content}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setInterviewSourceDocuments(interviewSourceDocuments.filter((_, i) => i !== idx))}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: Examiner Persona & Behavior */}
                    {interviewActiveTab === 'BEHAVIOR' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Examiner AI Persona Definition
                          </label>
                          <textarea
                            rows={2}
                            value={interviewPersona}
                            onChange={(e) => setInterviewPersona(e.target.value)}
                            placeholder="e.g. Senior Principal Infrastructure Architect evaluating candidate system trade-offs..."
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

                        {/* Tone, Difficulty, Aggressiveness Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                              Examiner Tone
                            </label>
                            <select
                              value={interviewTone}
                              onChange={(e) => setInterviewTone(e.target.value as any)}
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
                              <option value="FORMAL">Formal / Objective</option>
                              <option value="SOCRATIC">Socratic / Probing</option>
                              <option value="CHALLENGING">Challenging / Rigorous</option>
                              <option value="SUPPORTIVE">Supportive / Mentoring</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                              Target Difficulty Level
                            </label>
                            <select
                              value={interviewDifficultyLevel}
                              onChange={(e) => setInterviewDifficultyLevel(e.target.value as any)}
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
                              <option value="BEGINNER">Beginner (Foundational)</option>
                              <option value="INTERMEDIATE">Intermediate (Competent)</option>
                              <option value="ADVANCED">Advanced (Senior)</option>
                              <option value="EXPERT">Expert (Domain Master)</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                              Follow-Up Aggressiveness
                            </label>
                            <select
                              value={interviewAggressiveness}
                              onChange={(e) => setInterviewAggressiveness(e.target.value as any)}
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
                              <option value="LOW">Low (Allow topic pivots)</option>
                              <option value="MODERATE">Moderate (Standard Socratic drill)</option>
                              <option value="HIGH">High (Aggressively challenge vague statements)</option>
                            </select>
                          </div>
                        </div>

                        {/* Focus Areas Checklist */}
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Mandatory Focus Areas Agenda ({interviewFocusAreas.length})
                          </label>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                              type="text"
                              value={newFocusAreaInput}
                              onChange={(e) => setNewFocusAreaInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newFocusAreaInput.trim()) {
                                  e.preventDefault();
                                  setInterviewFocusAreas([...interviewFocusAreas, newFocusAreaInput.trim()]);
                                  setNewFocusAreaInput('');
                                }
                              }}
                              placeholder="e.g. Database replica lag identification..."
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newFocusAreaInput.trim()) {
                                  setInterviewFocusAreas([...interviewFocusAreas, newFocusAreaInput.trim()]);
                                  setNewFocusAreaInput('');
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              + Add Focus Area
                            </button>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {interviewFocusAreas.map((area, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '4px 8px',
                                  background: 'rgba(6, 182, 212, 0.12)',
                                  border: '1px solid #06b6d4',
                                  color: '#06b6d4',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <span>🎯 {area}</span>
                                <button
                                  type="button"
                                  onClick={() => setInterviewFocusAreas(interviewFocusAreas.filter((_, i) => i !== idx))}
                                  style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', padding: 0 }}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Avoid-List Topics */}
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Strict Prohibited Topics / Avoid-List ({interviewAvoidList.length})
                          </label>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                              type="text"
                              value={newAvoidTopicInput}
                              onChange={(e) => setNewAvoidTopicInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newAvoidTopicInput.trim()) {
                                  e.preventDefault();
                                  setInterviewAvoidList([...interviewAvoidList, newAvoidTopicInput.trim()]);
                                  setNewAvoidTopicInput('');
                                }
                              }}
                              placeholder="e.g. Frontend rendering, cloud billing pricing..."
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newAvoidTopicInput.trim()) {
                                  setInterviewAvoidList([...interviewAvoidList, newAvoidTopicInput.trim()]);
                                  setNewAvoidTopicInput('');
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              + Add Prohibited Topic
                            </button>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {interviewAvoidList.map((topic, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '4px 8px',
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid #ef4444',
                                  color: '#ef4444',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <span>🚫 {topic}</span>
                                <button
                                  type="button"
                                  onClick={() => setInterviewAvoidList(interviewAvoidList.filter((_, i) => i !== idx))}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: Boundary Simulator Workbench */}
                    {interviewActiveTab === 'SIMULATE' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🧪</span>
                            <span>Examiner Boundary & Grounding Simulator</span>
                          </h4>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                            Test conversational turns in real time against the configured Knowledge Dataset and Behavioral Prompt boundaries before saving.
                          </p>
                        </div>

                        {/* Opening Question Preview */}
                        <div style={{ padding: '10px 12px', background: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#06b6d4' }}>
                              🎯 Examiner Opening Question
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              Initial viva prompt sent to candidate
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-main)', margin: 0, fontStyle: 'italic', lineHeight: '1.4' }}>
                            "{interviewOpeningQuestion || 'No opening question configured yet. Go to General & Scenario tab to set one.'}"
                          </p>
                        </div>

                        {/* Adversarial Boundary Test Cases */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                                🧪 Adversarial Boundary Test Cases ({interviewBoundaryTests.length})
                              </span>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                                Pre-constructed boundary stress tests (including fabrication probes, drift bypasses, and axiom defenses). Click any test case to test examiner grounding:
                              </p>
                            </div>
                          </div>

                          {interviewBoundaryTests.length === 0 ? (
                            <div style={{ padding: '12px', background: 'var(--bg-color)', borderRadius: '6px', border: '1px dashed var(--border-color)', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                              No boundary test cases loaded yet. Use <strong>"📄 Generate from Document"</strong> above to auto-generate adversarial stress test cases from your technical materials.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {interviewBoundaryTests.map((tc, idx) => {
                                const isSelected = selectedBoundaryTest === tc;
                                const isFabrication = tc.testType.toLowerCase().includes('fabrication') || tc.testType.toLowerCase().includes('hallucination');
                                return (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: '10px 12px',
                                      background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-color)',
                                      borderRadius: '6px',
                                      border: isSelected ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '6px',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span
                                          style={{
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            background: isFabrication ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                                            color: isFabrication ? '#ef4444' : '#a78bfa',
                                            border: `1px solid ${isFabrication ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
                                          }}
                                        >
                                          {isFabrication ? '🔥 ' : '⚡ '} Test {idx + 1}: {tc.testType}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedBoundaryTest(tc);
                                            setSimulationCandidateMessage(tc.candidateMessage);
                                          }}
                                          style={{
                                            padding: '3px 8px',
                                            borderRadius: '4px',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-main)',
                                            fontSize: '10px',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          📋 Copy to Input
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedBoundaryTest(tc);
                                            handleSimulateTurn(tc.candidateMessage);
                                          }}
                                          style={{
                                            padding: '3px 10px',
                                            borderRadius: '4px',
                                            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          ⚡ Run This Test
                                        </button>
                                      </div>
                                    </div>

                                    <div style={{ fontSize: '11px', color: 'var(--text-main)', lineHeight: '1.4' }}>
                                      <strong style={{ color: 'var(--text-muted)' }}>Candidate Prompt:</strong> "{tc.candidateMessage}"
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                      <div style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '4px' }}>
                                        <span style={{ color: '#10b981', fontWeight: 600 }}>Expected: </span>
                                        {tc.expectedBehavior}
                                      </div>
                                      <div style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '4px' }}>
                                        <span style={{ color: '#ef4444', fontWeight: 600 }}>Fail Signal: </span>
                                        {tc.failSignal}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {simulationError && (
                          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', fontSize: '12px' }}>
                            ⚠️ {simulationError}
                          </div>
                        )}

                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Test Candidate Speech Input
                          </label>
                          <textarea
                            rows={3}
                            id="input-simulate-candidate-message"
                            value={simulationCandidateMessage}
                            onChange={(e) => setSimulationCandidateMessage(e.target.value)}
                            placeholder="Enter a test response to see how the AI examiner responds (e.g. 'I propose sharding the database by customer ID to mitigate write replication lag')..."
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

                        <button
                          type="button"
                          id="btn-run-simulation"
                          onClick={() => handleSimulateTurn()}
                          disabled={!simulationCandidateMessage.trim() || isSimulating}
                          style={{
                            alignSelf: 'flex-start',
                            padding: '8px 18px',
                            borderRadius: '4px',
                            border: 'none',
                            background: simulationCandidateMessage.trim() && !isSimulating ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'var(--border-color)',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: simulationCandidateMessage.trim() && !isSimulating ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {isSimulating ? '⏳ Simulating Turn...' : '⚡ Run Simulation Turn'}
                        </button>

                        {simulationResult && (
                          <div style={{ padding: '12px', background: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#8b5cf6' }}>
                                🤖 SIMULATED EXAMINER OUTPUT:
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: simulationResult.boundaryCheck?.passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: simulationResult.boundaryCheck?.passed ? '#10b981' : '#ef4444',
                                  border: `1px solid ${simulationResult.boundaryCheck?.passed ? '#10b981' : '#ef4444'}`,
                                }}
                              >
                                {simulationResult.boundaryCheck?.passed ? '✅ Boundary Check: Passed' : '❌ Boundary Violation'}
                              </span>
                            </div>

                            <p id="simulated-ai-message" style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0, lineHeight: '1.5' }}>
                              {simulationResult.aiMessage}
                            </p>

                            {simulationResult.coveredFocusAreas && simulationResult.coveredFocusAreas.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Covered Focus Areas:</span>
                                {simulationResult.coveredFocusAreas.map((fa: string, i: number) => (
                                  <span key={i} style={{ padding: '2px 6px', borderRadius: '3px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', fontWeight: 600 }}>
                                    ✓ {fa}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* LISTENING TYPE CONFIGURATION */}
                {formType === 'LISTENING' && (
                  <div style={{ marginTop: '8px' }}>
                    <ListeningAuthoringPanel
                      initialConfig={listeningConfig}
                      onChange={(cfg) => setListeningConfig(cfg)}
                    />
                  </div>
                )}

                {/* WRITING TYPE CONFIGURATION */}
                {(formType === 'WRITING' || formType === 'IELTS_WRITING_TASK_1' || formType === 'IELTS_WRITING_TASK_2') && (
                  <div style={{ marginTop: '8px' }}>
                    <WritingAuthoringPanel
                      key={formType}
                      forcedTask={formType === 'IELTS_WRITING_TASK_1' ? 'TASK_1' : formType === 'IELTS_WRITING_TASK_2' ? 'TASK_2' : undefined}
                      initialConfig={{
                        ...writingConfig,
                        promptStem: writingConfig.promptStem || formContent,
                      }}
                      onChange={(cfg) => {
                        setWritingConfig(cfg);
                        if (cfg.promptStem && (!formContent || formContent.trim() === '')) {
                          setFormContent(cfg.promptStem);
                        }
                      }}
                    />
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

      {/* GENERATE INTERVIEW FROM DOCUMENT MODAL */}
      {showDocUploadModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📄</span>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Generate Interview from Document
                </h3>
              </div>
              <button
                type="button"
                id="btn-close-doc-upload-modal"
                disabled={isGeneratingDoc}
                onClick={() => {
                  if (!isGeneratingDoc) {
                    setShowDocUploadModal(false);
                    setDocGenerateError(null);
                  }
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: isGeneratingDoc ? 'not-allowed' : 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Upload a technical specification, textbook chapter, or reference document (<strong>PDF</strong>, <strong>TXT</strong>, or <strong>MD</strong>).
              ExamOS will automatically synthesize structured facts, non-negotiable axioms, examiner persona, opening questions, and boundary test cases.
            </p>

            {docGenerateError && (
              <div style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '12px', lineHeight: '1.4' }}>
                ⚠️ {docGenerateError}
              </div>
            )}

            <form onSubmit={handleGenerateFromDocument} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* File Input */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Reference Document File (PDF, TXT, or Markdown) *
                </label>
                <div
                  style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    background: 'var(--bg-color)',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('input-doc-upload')?.click()}
                >
                  <input
                    type="file"
                    id="input-doc-upload"
                    accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (file.size > 50 * 1024 * 1024) {
                          setDocGenerateError(`Selected file exceeds the maximum 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a file up to 50MB.`);
                          setDocUploadFile(null);
                          return;
                        }
                        setDocUploadFile(file);
                        setDocGenerateError(null);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  {docUploadFile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '24px' }}>📑</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6' }}>{docUploadFile.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {docUploadFile.size >= 1024 * 1024
                          ? `${(docUploadFile.size / (1024 * 1024)).toFixed(2)} MB`
                          : `${(docUploadFile.size / 1024).toFixed(1)} KB`} • Click to choose another file
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '24px' }}>📁</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                        Click to select or drop a file here
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Supports PDF (text layer), TXT, and Markdown up to 50MB
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Role / Scenario Context */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Target Role / Scenario Context (Optional)
                </label>
                <input
                  type="text"
                  id="input-doc-role-context"
                  value={docRoleContext}
                  onChange={(e) => setDocRoleContext(e.target.value)}
                  placeholder="e.g. Kernel Driver Developer Technical Interview or Systems SRE Incident Lead"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Provides directional context to align examiner persona, tone, and questioning depth beyond the document text.
                </span>
              </div>

              {/* Information / Entitlement Banner */}
              <div style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                ℹ️ <strong>Human-in-the-Loop:</strong> Generation populates all tabs for your review and editing. The question is <strong>never auto-published</strong> until you inspect and save it.
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  id="btn-cancel-doc-upload"
                  disabled={isGeneratingDoc}
                  onClick={() => {
                    setShowDocUploadModal(false);
                    setDocGenerateError(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: isGeneratingDoc ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-doc-generate"
                  disabled={isGeneratingDoc || !docUploadFile}
                  style={{
                    background: isGeneratingDoc || !docUploadFile ? 'var(--border-color)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: isGeneratingDoc || !docUploadFile ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isGeneratingDoc ? (
                    <>
                      <span>⏳</span>
                      <span>Synthesizing Interview Fields (AI)...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Generate Interview Fields</span>
                    </>
                  )}
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

              {previewQuestion.type === 'LISTENING' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <ExamAudioPlayer
                    audioUrl={previewQuestion.data?.audioUrl}
                    speechText={previewQuestion.data?.speechText || previewQuestion.data?.audioScript}
                    maxPlays={previewQuestion.data?.maxPlays || previewQuestion.data?.playbackLimit || 3}
                    playbackSpeed={previewQuestion.data?.playbackSpeed || 1.0}
                    allowTranscript={true}
                    transcript={previewQuestion.data?.transcript || previewQuestion.data?.speechText}
                  />
                  {Array.isArray(previewQuestion.data?.subQuestions) && previewQuestion.data.subQuestions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <strong style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Comprehension Questions ({previewQuestion.data.subQuestions.length}):
                      </strong>
                      {previewQuestion.data.subQuestions.map((sq: any, idx: number) => (
                        <div
                          key={sq.id || idx}
                          style={{
                            padding: '10px 12px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                            {idx + 1}. {sq.prompt} ({sq.marks} marks)
                          </div>
                          {sq.type === 'MCQ' && Array.isArray(sq.options) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '12px' }}>
                              {sq.options.map((opt: any) => (
                                <div key={opt.id} style={{ color: opt.id === sq.correctOptionId ? '#10b981' : 'var(--text-muted)' }}>
                                  • {opt.text} {opt.id === sq.correctOptionId && ' ✓ (Key)'}
                                </div>
                              ))}
                            </div>
                          )}
                          {sq.type === 'FILL_IN_BLANK' && (
                            <div style={{ color: '#10b981', fontSize: '11px', marginLeft: '12px' }}>
                              Expected Key: {sq.blankKey}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(previewQuestion.type === 'WRITING' || previewQuestion.type === 'IELTS_WRITING_TASK_1' || previewQuestion.type === 'IELTS_WRITING_TASK_2') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>Target: <strong style={{ color: '#10b981' }}>{previewQuestion.data?.minWords || previewQuestion.data?.minWordCount || 150}–{previewQuestion.data?.maxWords || previewQuestion.data?.maxWordCount || 400} words</strong></span>
                    <span>•</span>
                    <span>Recommended Time: <strong style={{ color: '#06b6d4' }}>{previewQuestion.data?.recommendedTimeMinutes || previewQuestion.data?.timeLimitMinutes || 40} mins</strong></span>
                  </div>

                  {/* Stimulus Chart / Diagram */}
                  {(() => {
                    const qImg =
                      previewQuestion.data?.promptImageUrl ||
                      (previewQuestion as any).promptImageUrl ||
                      previewQuestion.data?.imageUrl ||
                      null;

                    if (!qImg) return null;

                    return (
                      <div style={{ background: '#0a0f1d', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 600 }}>📊 Visual Stimulus (Task 1 Chart / Diagram):</span>
                          <a href={qImg} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#06b6d4', textDecoration: 'none' }}>Open original ↗</a>
                        </div>
                        <img
                          src={qImg}
                          alt="Writing Stimulus Diagram"
                          style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '4px' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    );
                  })()}

                  {previewQuestion.data?.stimulusText && (
                    <div style={{ padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' }}>
                      <strong style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>Stimulus Context:</strong>
                      {previewQuestion.data.stimulusText}
                    </div>
                  )}

                  {previewQuestion.data?.aiVisualContext && (
                    <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '6px', fontSize: '12px' }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', marginBottom: '4px' }}>
                        <span>🧠</span> AI Image Visual Context (For AI Evaluation — Hidden from Candidates):
                      </strong>
                      <div style={{ whiteSpace: 'pre-wrap', color: '#e2e8f0', lineHeight: 1.5, fontFamily: 'monospace', fontSize: '11px' }}>
                        {previewQuestion.data.aiVisualContext}
                      </div>
                    </div>
                  )}
                  {Array.isArray(previewQuestion.data?.rubricCriteria || previewQuestion.data?.rubric) && (
                    <div>
                      <strong style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Evaluation Rubric:</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {(previewQuestion.data?.rubricCriteria || previewQuestion.data?.rubric).map((r: any, idx: number) => (
                          <div key={r.id || idx} style={{ padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '11px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                              <span>{r.name}</span>
                              <span style={{ color: '#10b981' }}>Max {r.maxScore}</span>
                            </div>
                            {r.description && <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{r.description}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                  value={isNaN(newExamYear) || newExamYear === null || newExamYear === undefined ? '' : newExamYear}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setNewExamYear(isNaN(val) ? ('' as any) : val);
                  }}
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

      {/* FEATURE 15.16: SCHEMA-VALIDATED JSON IMPORT & EXPORT MODAL */}
      {showImportExportModal && (
        <ImportExportModal
          isOpen={showImportExportModal}
          onClose={() => setShowImportExportModal(false)}
          defaultEntityType="QUESTIONS"
          onSuccess={() => {
            fetchQuestions();
            fetchMetadata();
          }}
        />
      )}
    </div>
  );
};
