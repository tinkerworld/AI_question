import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/I18nContext';

interface ExamPattern {
  id: string;
  name: string;
  courseId: string;
  courseName?: string;
  levelId?: string | null;
  durationMinutes: number;
  description?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  type: 'SINGLE' | 'MULTI';
  totalMarks: number;
  version: number;
  subjects?: Array<{
    subjectId: string;
    targetMarks?: number | null;
    subjectName?: string;
    subjectCode?: string;
  }>;
  sections?: Section[];
}

interface SectionRule {
  id?: string;
  sectionId: string;
  allowedQuestionTypes?: string[] | null;
  allowedCategories?: string[] | null;
  selectionMode: 'RANDOM' | 'BALANCED';
  sourceFilters?: Record<string, any> | null;
  tags?: string[] | null;
}

interface SectionTopic {
  id?: string;
  sectionId: string;
  topicId: string;
  distributionType: 'COUNT' | 'PERCENT';
  value: number;
}

interface SectionDifficulty {
  id?: string;
  sectionId: string;
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD';
  distributionType: 'COUNT' | 'PERCENT';
  value: number;
  isAutomatic: boolean;
}

interface Section {
  id: string;
  examPatternId: string;
  subjectId?: string | null;
  name: string;
  sequenceOrder: number;
  numQuestions: number;
  marksPerQuestion: number;
  totalMarks: number;
  marksCorrect: number;
  marksWrong: number;
  marksUnattempted: number;
  rules?: SectionRule | null;
  topics?: SectionTopic[];
  difficulties?: SectionDifficulty[];
}

interface EntityVersion {
  id: string;
  version: number;
  data: any;
  changeSummary: string;
  createdBy: string;
  createdAt: string;
}

const QUESTION_TYPES = [
  { id: 'MCQ_SINGLE', label: 'Single Choice (MCQ)' },
  { id: 'MCQ_MULTI', label: 'Multiple Choice (MCQ Multi)' },
  { id: 'NUMERICAL', label: 'Numerical Answer' },
  { id: 'ASSERTION_REASON', label: 'Assertion & Reason' },
  { id: 'MATCH_THE_FOLLOWING', label: 'Matrix Match' },
  { id: 'FILL_IN_BLANKS', label: 'Fill in Blanks' },
];

// Helper to extract granular field-level validation errors or standard messages
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
    if (formattedIssues) {
      return `${mainMessage} (${formattedIssues})`;
    }
  }
  return mainMessage;
};

export const ExamPatternsPage: React.FC = () => {
  const { t } = useTranslation();
  const [patterns, setPatterns] = useState<ExamPattern[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPattern, setSelectedPattern] = useState<ExamPattern | null>(null);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [activeSectionTab, setActiveSectionTab] = useState<'rules' | 'topics' | 'difficulty' | 'marking'>('rules');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingPattern, setEditingPattern] = useState<ExamPattern | null>(null);
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [showVersionsModal, setShowVersionsModal] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [versionHistory, setVersionHistory] = useState<EntityVersion[]>([]);

  // Courses & Subjects lookup
  const [courses, setCourses] = useState<Array<{ id: string; name: string; code: string; subjects?: any[] }>>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [availableTopics, setAvailableTopics] = useState<Array<{ id: string; title: string }>>([]);

  // Create Pattern Form State
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [type, setType] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [description, setDescription] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Pattern Form State
  const [editName, setEditName] = useState('');
  const [editDurationMinutes, setEditDurationMinutes] = useState('60');
  const [editType, setEditType] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [editDescription, setEditDescription] = useState('');
  const [editSelectedSubjectIds, setEditSelectedSubjectIds] = useState<string[]>([]);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // New Section Form State
  const [secName, setSecName] = useState('Section A');
  const [secSubjectId, setSecSubjectId] = useState('');
  const [numQuestions, setNumQuestions] = useState('10');
  const [marksPerQuestion, setMarksPerQuestion] = useState('2');
  const [secMarksCorrect, setSecMarksCorrect] = useState('2');
  const [secMarksWrong, setSecMarksWrong] = useState('-0.5');
  const [secMarksUnattempted, setSecMarksUnattempted] = useState('0');

  // Section Configuration Sub-panel Form States
  // 1. Question Rules (Feature 4.3)
  const [allowedTypes, setAllowedTypes] = useState<string[]>(['MCQ_SINGLE']);
  const [selectionMode, setSelectionMode] = useState<'RANDOM' | 'BALANCED'>('RANDOM');
  const [tagFilterString, setTagFilterString] = useState('');

  // 2. Topic Distribution (Feature 4.4)
  const [topicDistType, setTopicDistType] = useState<'COUNT' | 'PERCENT'>('COUNT');
  const [topicRows, setTopicRows] = useState<Array<{ topicId: string; value: any }>>([
    { topicId: 'top_mech', value: '5' },
    { topicId: 'top_optics', value: '5' },
  ]);

  // 3. Difficulty Distribution (Feature 4.5)
  const [diffDistType, setDiffDistType] = useState<'COUNT' | 'PERCENT'>('PERCENT');
  const [isDiffAutomatic, setIsDiffAutomatic] = useState<boolean>(false);
  const [easyVal, setEasyVal] = useState<string>('30');
  const [medVal, setMedVal] = useState<string>('50');
  const [hardVal, setHardVal] = useState<string>('20');

  // 4. Negative Marking (Feature 4.6)
  const [editMarksCorrect, setEditMarksCorrect] = useState<string>('2');
  const [editMarksWrong, setEditMarksWrong] = useState<string>('-0.5');
  const [editMarksUnattempted, setEditMarksUnattempted] = useState<string>('0');

  // 5. Multi-Subject Allocation (Feature 4.7)
  const [subjectTargetMarks, setSubjectTargetMarks] = useState<Record<string, string>>({});
  const [sectionSubjectMap, setSectionSubjectMap] = useState<Record<string, string>>({});

  // Status & Notification
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Auth Helper
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    fetchPatterns();
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/courses', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const body = await res.json();
        const courseList = body.data || [];
        setCourses(courseList);
        if (courseList.length > 0) {
          const subs = courseList.flatMap((c: any) => c.subjects || []);
          setAvailableSubjects(subs);
        }
      }
    } catch (e) {
      console.warn('Could not load courses lookup');
    }
  };

  // Endpoint 2: GET /api/v1/exam-patterns — List Patterns
  const fetchPatterns = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/exam-patterns', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const body = await res.json();
        setPatterns(body.data || []);
      }
    } catch (e) {
      console.warn('API connection offline or dev mode');
    } finally {
      setLoading(false);
    }
  };

  // Endpoint 3: GET /api/v1/exam-patterns/:id — Pattern Details
  const fetchPatternDetails = async (patternId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const body = await res.json();
        const pat: ExamPattern = body.data;
        setSelectedPattern(pat);

        // Populate multi-subject state
        if (pat.subjects) {
          const targets: Record<string, string> = {};
          pat.subjects.forEach((s) => {
            if (s.targetMarks !== undefined) targets[s.subjectId] = String(s.targetMarks);
          });
          setSubjectTargetMarks(targets);
        }

        if (pat.sections) {
          const sMap: Record<string, string> = {};
          pat.sections.forEach((sec) => {
            if (sec.subjectId) sMap[sec.id] = sec.subjectId;
          });
          setSectionSubjectMap(sMap);
        }

        // Fetch topics for course
        if (pat.courseId) {
          fetchTopicsForCourse(pat.courseId);
        }
      }
    } catch (e) {
      console.error('Failed to load pattern details', e);
    }
  };

  const fetchTopicsForCourse = async (cId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/courses/${cId}/subjects`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const body = await res.json();
        const subs = body.data || [];
        setAvailableSubjects(subs);
        if (subs.length > 0) {
          const sId = subs[0].id;
          const topRes = await fetch(`http://localhost:4000/api/v1/subjects/${sId}/syllabus`, {
            headers: getAuthHeaders(),
          });
          if (topRes.ok) {
            const topBody = await topRes.json();
            setAvailableTopics(topBody.data || []);
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch syllabus topics');
    }
  };

  // Endpoint 1: POST /api/v1/exam-patterns — Create Pattern
  const handleCreatePattern = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await fetch('http://localhost:4000/api/v1/exam-patterns', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name,
          courseId,
          durationMinutes: parseInt(durationMinutes, 10) || 60,
          type,
          description: description || undefined,
          subjectIds: selectedSubjectIds.length > 0 ? selectedSubjectIds : undefined,
        }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        setShowCreateModal(false);
        setName('');
        setDescription('');
        setSelectedSubjectIds([]);
        setStatusNotice(`Created pattern "${body.data.name}" successfully.`);
        await fetchPatterns();
        if (body.data.id) {
          await fetchPatternDetails(body.data.id);
        }
      } else {
        setFormError(extractApiErrorMessage(body, 'Failed to create exam pattern'));
      }
    } catch (e: any) {
      console.error('Failed to create pattern', e);
      setFormError(e.message || 'Network error creating exam pattern');
    }
  };

  // Open Edit Pattern Modal
  const handleOpenEditModal = (pat: ExamPattern) => {
    setEditingPattern(pat);
    setEditName(pat.name);
    setEditDurationMinutes(String(pat.durationMinutes || 60));
    setEditType(pat.type);
    setEditDescription(pat.description || '');
    setEditSelectedSubjectIds(pat.subjects?.map((s) => s.subjectId) || []);
    setEditFormError(null);
    setShowEditModal(true);
  };

  // Endpoint 4: PATCH /api/v1/exam-patterns/:id — Update Pattern Fields
  const handleSavePatternEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPattern) return;
    setEditFormError(null);

    try {
      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${editingPattern.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editName,
          durationMinutes: parseInt(editDurationMinutes, 10) || 60,
          type: editType,
          description: editDescription || undefined,
          subjectIds: editSelectedSubjectIds.length > 0 ? editSelectedSubjectIds : undefined,
        }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        setShowEditModal(false);
        setStatusNotice(`Updated pattern "${body.data.name}" successfully.`);
        await fetchPatterns();
        if (selectedPattern?.id === editingPattern.id) {
          await fetchPatternDetails(editingPattern.id);
        }
      } else {
        setEditFormError(extractApiErrorMessage(body, 'Failed to update exam pattern'));
      }
    } catch (e: any) {
      console.error('Failed to update pattern', e);
      setEditFormError(e.message || 'Network error updating exam pattern');
    }
  };

  // Endpoint 4: PATCH /api/v1/exam-patterns/:id — Update Status Transition
  const handleUpdateStatus = async (patternId: string, newStatus: 'PUBLISHED' | 'ARCHIVED') => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        setStatusNotice(`Exam pattern status updated to ${newStatus}.`);
        await fetchPatterns();
        await fetchPatternDetails(patternId);
      } else {
        alert(body.message || 'Failed to update pattern status');
      }
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  // Endpoint 5: DELETE /api/v1/exam-patterns/:id — Delete Pattern
  const handleDeletePattern = async (patternId: string) => {
    if (!window.confirm('Are you sure you want to delete this draft exam pattern?')) return;
    try {
      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.status === 204 || res.ok) {
        setStatusNotice('Exam pattern deleted.');
        setSelectedPattern(null);
        await fetchPatterns();
      } else {
        const body = await res.json();
        alert(body.message || 'Cannot delete pattern');
      }
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  // Endpoint 6: POST /api/v1/exam-patterns/:id/sections — Add Section
  const handleAddSection = async (patternId: string) => {
    try {
      const qCount = parseInt(numQuestions, 10) || 10;
      const marksPerQ = parseFloat(marksPerQuestion) || 1.0;
      const marksCorr = parseFloat(secMarksCorrect) || marksPerQ;
      const marksWr = parseFloat(secMarksWrong) || 0.0;
      const marksUnatt = parseFloat(secMarksUnattempted) || 0.0;

      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}/sections`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: secName,
          subjectId: secSubjectId || undefined,
          numQuestions: qCount,
          marksPerQuestion: marksPerQ,
          marksCorrect: marksCorr,
          marksWrong: marksWr,
          marksUnattempted: marksUnatt,
        }),
      });
      if (res.ok) {
        setStatusNotice(`Added section "${secName}".`);
        await fetchPatternDetails(patternId);
        await fetchPatterns();
        setSecName(`Section ${String.fromCharCode(65 + (selectedPattern?.sections?.length || 0) + 1)}`);
      } else {
        const body = await res.json();
        alert(body.message || 'Failed to add section');
      }
    } catch (e) {
      console.error('Failed to add section', e);
    }
  };

  // Endpoint 8: PATCH /api/v1/exam-patterns/:id/sections/reorder — Reorder Sections
  const handleMoveSection = async (patternId: string, fromIndex: number, direction: 'UP' | 'DOWN') => {
    if (!selectedPattern?.sections) return;
    const toIndex = direction === 'UP' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= selectedPattern.sections.length) return;

    const sectionsCopy = [...selectedPattern.sections];
    const [moved] = sectionsCopy.splice(fromIndex, 1);
    sectionsCopy.splice(toIndex, 0, moved);

    const sectionIds = sectionsCopy.map((s) => s.id);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}/sections/reorder`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sectionIds }),
      });
      if (res.ok) {
        await fetchPatternDetails(patternId);
      }
    } catch (e) {
      console.error('Failed to reorder sections', e);
    }
  };

  // Endpoint 10: DELETE /api/v1/exam-patterns/:id/sections/:sectionId — Delete Section
  const handleDeleteSection = async (patternId: string, sectionId: string) => {
    if (!window.confirm('Delete this section?')) return;
    try {
      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}/sections/${sectionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.status === 204 || res.ok) {
        setStatusNotice('Section removed.');
        if (expandedSectionId === sectionId) setExpandedSectionId(null);
        await fetchPatternDetails(patternId);
        await fetchPatterns();
      }
    } catch (e) {
      console.error('Failed to delete section', e);
    }
  };

  // Open Section Config Sub-panel & load existing rules
  const handleOpenSectionConfig = async (sec: Section) => {
    setExpandedSectionId(sec.id);
    setEditMarksCorrect(String(sec.marksCorrect));
    setEditMarksWrong(String(sec.marksWrong));
    setEditMarksUnattempted(String(sec.marksUnattempted));

    // Endpoint 12: GET /api/v1/exam-patterns/:id/sections/:sectionId/rules
    if (selectedPattern) {
      try {
        const rRes = await fetch(
          `http://localhost:4000/api/v1/exam-patterns/${selectedPattern.id}/sections/${sec.id}/rules`,
          { headers: getAuthHeaders() }
        );
        if (rRes.ok) {
          const rBody = await rRes.json();
          if (rBody.data) {
            setAllowedTypes(rBody.data.allowedQuestionTypes || ['MCQ_SINGLE']);
            setSelectionMode(rBody.data.selectionMode || 'RANDOM');
            setTagFilterString((rBody.data.tags || []).join(', '));
          }
        }
      } catch (e) {
        console.error('Failed to fetch rules', e);
      }

      // Endpoint 14: GET /api/v1/exam-patterns/:id/sections/:sectionId/topics
      try {
        const tRes = await fetch(
          `http://localhost:4000/api/v1/exam-patterns/${selectedPattern.id}/sections/${sec.id}/topics`,
          { headers: getAuthHeaders() }
        );
        if (tRes.ok) {
          const tBody = await tRes.json();
          if (tBody.data && tBody.data.length > 0) {
            setTopicDistType(tBody.data[0].distributionType || 'COUNT');
            setTopicRows(tBody.data.map((t: any) => ({ topicId: t.topicId, value: t.value })));
          } else {
            setTopicRows([{ topicId: 'top_mech', value: sec.numQuestions }]);
          }
        }
      } catch (e) {
        console.warn('Could not fetch section topics');
      }

      // Populate difficulties from section object
      if (sec.difficulties && sec.difficulties.length > 0) {
        setDiffDistType(sec.difficulties[0].distributionType || 'PERCENT');
        setIsDiffAutomatic(sec.difficulties[0].isAutomatic || false);
        const easy = sec.difficulties.find((d) => d.difficultyLevel === 'EASY')?.value ?? 0;
        const med = sec.difficulties.find((d) => d.difficultyLevel === 'MEDIUM')?.value ?? 0;
        const hard = sec.difficulties.find((d) => d.difficultyLevel === 'HARD')?.value ?? 0;
        setEasyVal(String(easy));
        setMedVal(String(med));
        setHardVal(String(hard));
      }
    }
  };

  // Endpoint 11: PUT /api/v1/exam-patterns/:id/sections/:sectionId/rules — Save Rules (Feature 4.3)
  const handleSaveQuestionRules = async (patternId: string, sectionId: string) => {
    try {
      const tags = tagFilterString
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}/sections/${sectionId}/rules`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          allowedQuestionTypes: allowedTypes,
          selectionMode,
          tags: tags.length > 0 ? tags : undefined,
        }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        setStatusNotice('Question type rules saved.');
        await fetchPatternDetails(patternId);
      } else {
        alert(body.message || 'Failed to save rules');
      }
    } catch (e) {
      console.error('Failed to save rules', e);
    }
  };

  // Endpoint 13: PUT /api/v1/exam-patterns/:id/sections/:sectionId/topics — Save Topics (Feature 4.4)
  const handleSaveTopicDistribution = async (patternId: string, sectionId: string) => {
    try {
      const validTopics = topicRows
        .filter((r) => r.topicId && parseFloat(String(r.value)) > 0)
        .map((r) => ({ topicId: r.topicId, value: parseFloat(String(r.value)) || 0 }));

      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}/sections/${sectionId}/topics`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          distributionType: topicDistType,
          topics: validTopics,
        }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        setStatusNotice('Topic distribution saved successfully.');
        await fetchPatternDetails(patternId);
      } else {
        alert(body.message || 'Validation error saving topic distribution');
      }
    } catch (e) {
      console.error('Failed to save topics', e);
    }
  };

  // Endpoint 15: PUT /api/v1/exam-patterns/:id/sections/:sectionId/difficulty — Save Difficulty (Feature 4.5)
  const handleSaveDifficultyDistribution = async (patternId: string, sectionId: string) => {
    try {
      const payload: any = {
        distributionType: diffDistType,
        isAutomatic: isDiffAutomatic,
      };

      if (!isDiffAutomatic) {
        payload.difficulties = [
          { difficultyLevel: 'EASY', value: parseFloat(easyVal) || 0 },
          { difficultyLevel: 'MEDIUM', value: parseFloat(medVal) || 0 },
          { difficultyLevel: 'HARD', value: parseFloat(hardVal) || 0 },
        ];
      }

      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}/sections/${sectionId}/difficulty`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        setStatusNotice('Difficulty distribution saved.');
        await fetchPatternDetails(patternId);
      } else {
        alert(body.message || 'Validation error saving difficulty distribution');
      }
    } catch (e) {
      console.error('Failed to save difficulty', e);
    }
  };

  // Endpoint 16: PUT /api/v1/exam-patterns/:id/sections/:sectionId/marking — Save Marking Scheme (Feature 4.6)
  const handleSaveMarkingScheme = async (patternId: string, sectionId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}/sections/${sectionId}/marking`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          marksCorrect: parseFloat(editMarksCorrect) || 0,
          marksWrong: parseFloat(editMarksWrong) || 0,
          marksUnattempted: parseFloat(editMarksUnattempted) || 0,
        }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        setStatusNotice('Negative marking scheme configured.');
        await fetchPatternDetails(patternId);
      } else {
        alert(body.message || 'Error saving marking scheme');
      }
    } catch (e) {
      console.error('Failed to save marking scheme', e);
    }
  };

  // Endpoint 17: PUT /api/v1/exam-patterns/:id/subjects-allocation — Save Multi-Subject Allocation (Feature 4.7)
  const handleSaveSubjectAllocation = async (patternId: string) => {
    try {
      const subjectAllocations = Object.entries(subjectTargetMarks).map(([subId, target]) => ({
        subjectId: subId,
        targetMarks: parseFloat(String(target)) || 0,
      }));

      const sectionSubjectMappings = Object.entries(sectionSubjectMap).map(([secId, subId]) => ({
        sectionId: secId,
        subjectId: subId,
      }));

      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}/subjects-allocation`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          subjectAllocations,
          sectionSubjectMappings: sectionSubjectMappings.length > 0 ? sectionSubjectMappings : undefined,
        }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        setStatusNotice('Multi-subject allocations saved.');
        await fetchPatternDetails(patternId);
      } else {
        alert(body.message || 'Error saving subject allocation');
      }
    } catch (e) {
      console.error('Failed to save subject allocation', e);
    }
  };

  // Endpoint 18: POST /api/v1/exam-patterns/:id/validate — Validation Engine (Feature 4.8)
  const handleRunValidation = async (patternId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}/validate`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const body = await res.json();
        setValidationResult(body.data);
        setShowValidationModal(true);
      }
    } catch (e) {
      console.error('Validation failed', e);
    }
  };

  // Endpoint 19: GET /api/v1/exam-patterns/:id/versions — Version History (Feature 4.9)
  const handleFetchVersions = async (patternId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}/versions`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const body = await res.json();
        setVersionHistory(body.data || []);
        setShowVersionsModal(true);
      }
    } catch (e) {
      console.error('Failed to fetch versions', e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notice */}
      {statusNotice && (
        <div style={{
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid #06b6d4',
          color: '#06b6d4',
          padding: '10px 16px',
          borderRadius: '6px',
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>✓ {statusNotice}</span>
          <button onClick={() => setStatusNotice(null)} style={{ background: 'transparent', border: 'none', color: '#06b6d4', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'JetBrains Mono', fontSize: '20px' }}>
            {t('exam_patterns')} Management
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Exam Blueprints, Question Rules, Topic/Difficulty Distribution, Subject Allocation & Validation Engine
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 18px',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          + Create Exam Pattern
        </button>
      </div>

      {/* Pattern List Table */}
      <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>Pattern Name</th>
              <th style={{ padding: '12px 16px' }}>Type</th>
              <th style={{ padding: '12px 16px' }}>Duration</th>
              <th style={{ padding: '12px 16px' }}>Total Marks</th>
              <th style={{ padding: '12px 16px' }}>Version</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading exam patterns...
                </td>
              </tr>
            ) : patterns.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No exam patterns created yet. Click "+ Create Exam Pattern" to start.
                </td>
              </tr>
            ) : (
              patterns.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', background: selectedPattern?.id === p.id ? 'rgba(6, 182, 212, 0.05)' : 'transparent' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{p.name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: p.type === 'SINGLE' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                      color: p.type === 'SINGLE' ? '#06b6d4' : '#8b5cf6',
                    }}>
                      {p.type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{p.durationMinutes} mins</td>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--accent-color)' }}>{p.totalMarks} pts</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>v{p.version}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: p.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.15)' : p.status === 'DRAFT' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                      color: p.status === 'PUBLISHED' ? '#10b981' : p.status === 'DRAFT' ? '#f59e0b' : '#9ca3af',
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => fetchPatternDetails(p.id)}
                      style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      🛠️ Builder
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#3b82f6', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                      title="Edit pattern properties"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleRunValidation(p.id)}
                      style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      🧪 Validate
                    </button>
                    <button
                      onClick={() => handleFetchVersions(p.id)}
                      style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid #8b5cf6', color: '#8b5cf6', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                      title="Version History"
                    >
                      📜 v{p.version}
                    </button>
                    {p.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(p.id, 'PUBLISHED')}
                          style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#10b981', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                        >
                          Publish
                        </button>
                        <button
                          onClick={() => handleDeletePattern(p.id)}
                          style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {p.status === 'PUBLISHED' && (
                      <button
                        onClick={() => handleUpdateStatus(p.id, 'ARCHIVED')}
                        style={{ background: 'rgba(107, 114, 128, 0.2)', border: '1px solid #6b7280', color: '#9ca3af', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Pattern Section Builder & Multi-Subject Engine */}
      {selectedPattern && (
        <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontFamily: 'JetBrains Mono', fontSize: '18px' }}>
                Pattern Builder: {selectedPattern.name}
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Type: <strong>{selectedPattern.type}</strong> | Duration: {selectedPattern.durationMinutes} mins | Total Blueprint Marks: <strong style={{ color: 'var(--accent-color)' }}>{selectedPattern.totalMarks}</strong> | Status: <strong>{selectedPattern.status}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleOpenEditModal(selectedPattern)}
                style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#3b82f6', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                ✏️ Edit Blueprint Details
              </button>
              <button
                onClick={() => handleRunValidation(selectedPattern.id)}
                style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#10b981', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                🧪 Run Validation Engine
              </button>
              <button onClick={() => setSelectedPattern(null)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>✕ Close</button>
            </div>
          </div>

          {/* Feature 4.7: Multi-Subject Allocation Sub-Panel (if MULTI or has subjects) */}
          {selectedPattern.type === 'MULTI' && (
            <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontFamily: 'JetBrains Mono', fontSize: '14px', color: '#c084fc' }}>
                🌐 Multi-Subject Allocation Engine (Feature 4.7)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                {availableSubjects.map((sub) => (
                  <div key={sub.id} style={{ background: 'var(--bg-color)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{sub.name} ({sub.code})</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target Marks:</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="Marks"
                        value={subjectTargetMarks[sub.id] || ''}
                        onChange={(e) => setSubjectTargetMarks({ ...subjectTargetMarks, [sub.id]: e.target.value })}
                        style={{ width: '80px', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 6px', borderRadius: '4px', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleSaveSubjectAllocation(selectedPattern.id)}
                style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                Save Subject Allocation
              </button>
            </div>
          )}

          {/* Add Section Form (Feature 4.2 & Feature 4.6 initial) */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '6px', marginBottom: '20px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '10px' }}>+ Add Blueprint Section</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Section Name</label>
                <input
                  placeholder="Section Name (e.g. Physics Section A)"
                  value={secName}
                  onChange={(e) => setSecName(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                />
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Required</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Subject</label>
                <select
                  value={secSubjectId}
                  onChange={(e) => setSecSubjectId(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                >
                  <option value="">All Subjects</option>
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Optional link</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Questions</label>
                <input
                  type="number"
                  min={1}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                />
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Min: 1</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Marks/Q</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={marksPerQuestion}
                  onChange={(e) => {
                    setMarksPerQuestion(e.target.value);
                    setSecMarksCorrect(e.target.value);
                  }}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                />
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Min: 0.1</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Wrong Mark</label>
                <input
                  type="number"
                  max={0}
                  step="any"
                  value={secMarksWrong}
                  onChange={(e) => setSecMarksWrong(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                />
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Max: 0</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Unattempted</label>
                <input
                  type="number"
                  step="any"
                  value={secMarksUnattempted}
                  onChange={(e) => setSecMarksUnattempted(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                />
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Default: 0</span>
              </div>
              <button
                onClick={() => handleAddSection(selectedPattern.id)}
                style={{ background: 'var(--accent-color)', color: '#000', border: 'none', padding: '7px 16px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Render Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedPattern.sections && selectedPattern.sections.length > 0 ? (
              selectedPattern.sections.map((sec, idx) => {
                const isExpanded = expandedSectionId === sec.id;
                return (
                  <div
                    key={sec.id}
                    style={{
                      border: isExpanded ? '1px solid #06b6d4' : '1px solid var(--border-color)',
                      borderRadius: '6px',
                      background: isExpanded ? 'rgba(6, 182, 212, 0.02)' : 'transparent',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Section Summary Row */}
                    <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                            {idx + 1}. {sec.name}
                          </span>
                          <span style={{ fontSize: '11px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', padding: '2px 6px', borderRadius: '4px' }}>
                            Seq #{sec.sequenceOrder}
                          </span>
                          {sec.subjectId && (
                            <span style={{ fontSize: '11px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '2px 6px', borderRadius: '4px' }}>
                              {availableSubjects.find((s) => s.id === sec.subjectId)?.name || sec.subjectId}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {sec.numQuestions} Questions × {sec.marksPerQuestion} Marks = <strong>{sec.totalMarks} Marks</strong> | Correct: +{sec.marksCorrect}, Wrong: {sec.marksWrong}, Unattempted: {sec.marksUnattempted}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {/* Reorder Buttons */}
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveSection(selectedPattern.id, idx, 'UP')}
                          style={{ background: 'transparent', border: '1px solid var(--border-color)', color: idx === 0 ? 'var(--text-muted)' : 'var(--text-main)', padding: '3px 8px', borderRadius: '4px', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          disabled={idx === (selectedPattern.sections?.length || 1) - 1}
                          onClick={() => handleMoveSection(selectedPattern.id, idx, 'DOWN')}
                          style={{ background: 'transparent', border: '1px solid var(--border-color)', color: idx === (selectedPattern.sections?.length || 1) - 1 ? 'var(--text-muted)' : 'var(--text-main)', padding: '3px 8px', borderRadius: '4px', cursor: idx === (selectedPattern.sections?.length || 1) - 1 ? 'not-allowed' : 'pointer' }}
                          title="Move Down"
                        >
                          ▼
                        </button>

                        {/* Expand Configuration */}
                        <button
                          onClick={() => (isExpanded ? setExpandedSectionId(null) : handleOpenSectionConfig(sec))}
                          style={{
                            background: isExpanded ? '#06b6d4' : 'rgba(6, 182, 212, 0.1)',
                            color: isExpanded ? '#000' : '#06b6d4',
                            border: '1px solid #06b6d4',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          {isExpanded ? '▲ Hide Rules' : '⚙️ Configure Rules'}
                        </button>

                        {/* Delete Section */}
                        <button
                          onClick={() => handleDeleteSection(selectedPattern.id, sec.id)}
                          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          title="Delete Section"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Section Configuration Sub-Panel (Features 4.3, 4.4, 4.5, 4.6, 4.7) */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border-color)', background: 'rgba(0, 0, 0, 0.2)', padding: '16px' }}>
                        {/* Sub-Panel Tabs */}
                        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>
                          <button
                            onClick={() => setActiveSectionTab('rules')}
                            style={{
                              background: activeSectionTab === 'rules' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                              border: activeSectionTab === 'rules' ? '1px solid #06b6d4' : '1px solid transparent',
                              color: activeSectionTab === 'rules' ? '#06b6d4' : 'var(--text-muted)',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            1. Question Types & Tags (4.3)
                          </button>
                          <button
                            onClick={() => setActiveSectionTab('topics')}
                            style={{
                              background: activeSectionTab === 'topics' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                              border: activeSectionTab === 'topics' ? '1px solid #06b6d4' : '1px solid transparent',
                              color: activeSectionTab === 'topics' ? '#06b6d4' : 'var(--text-muted)',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            2. Topic Distribution (4.4)
                          </button>
                          <button
                            onClick={() => setActiveSectionTab('difficulty')}
                            style={{
                              background: activeSectionTab === 'difficulty' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                              border: activeSectionTab === 'difficulty' ? '1px solid #06b6d4' : '1px solid transparent',
                              color: activeSectionTab === 'difficulty' ? '#06b6d4' : 'var(--text-muted)',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            3. Difficulty Ratios (4.5)
                          </button>
                          <button
                            onClick={() => setActiveSectionTab('marking')}
                            style={{
                              background: activeSectionTab === 'marking' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                              border: activeSectionTab === 'marking' ? '1px solid #06b6d4' : '1px solid transparent',
                              color: activeSectionTab === 'marking' ? '#06b6d4' : 'var(--text-muted)',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            4. Negative Marking (4.6)
                          </button>
                        </div>

                        {/* Tab Content 1: Question Type Rules (Feature 4.3) */}
                        {activeSectionTab === 'rules' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                                Allowed Question Types:
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                                {QUESTION_TYPES.map((qt) => {
                                  const checked = allowedTypes.includes(qt.id);
                                  return (
                                    <label key={qt.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setAllowedTypes([...allowedTypes, qt.id]);
                                          } else {
                                            setAllowedTypes(allowedTypes.filter((t) => t !== qt.id));
                                          }
                                        }}
                                      />
                                      {qt.label}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                                  Selection Mode:
                                </label>
                                <select
                                  value={selectionMode}
                                  onChange={(e) => setSelectionMode(e.target.value as 'RANDOM' | 'BALANCED')}
                                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                                >
                                  <option value="RANDOM">RANDOM (Pure Random from Bank)</option>
                                  <option value="BALANCED">BALANCED (Even distribution across topics)</option>
                                </select>
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                                  Tag Filters (Optional, comma separated):
                                </label>
                                <input
                                  placeholder="e.g. pyq, 2024, jee-adv"
                                  value={tagFilterString}
                                  onChange={(e) => setTagFilterString(e.target.value)}
                                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                                />
                              </div>
                            </div>

                            <div>
                              <button
                                onClick={() => handleSaveQuestionRules(selectedPattern.id, sec.id)}
                                style={{ background: '#06b6d4', color: '#000', border: 'none', padding: '6px 16px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                              >
                                Save Question Rules
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Tab Content 2: Topic Distribution (Feature 4.4) */}
                        {activeSectionTab === 'topics' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Distribution Type:</label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name={`distType_${sec.id}`}
                                  value="COUNT"
                                  checked={topicDistType === 'COUNT'}
                                  onChange={() => setTopicDistType('COUNT')}
                                />
                                Exact Question Count (Sum = {sec.numQuestions})
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name={`distType_${sec.id}`}
                                  value="PERCENT"
                                  checked={topicDistType === 'PERCENT'}
                                  onChange={() => setTopicDistType('PERCENT')}
                                />
                                Percentage Split (Sum = 100%)
                              </label>
                            </div>

                            {/* Topic Rows */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {topicRows.map((row, rIdx) => (
                                <div key={rIdx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <select
                                    value={row.topicId}
                                    onChange={(e) => {
                                      const updated = [...topicRows];
                                      updated[rIdx].topicId = e.target.value;
                                      setTopicRows(updated);
                                    }}
                                    style={{ flex: 2, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                                  >
                                    <option value="top_mech">Mechanics (Physics)</option>
                                    <option value="top_optics">Optics (Physics)</option>
                                    {availableTopics.map((top) => (
                                      <option key={top.id} value={top.id}>{top.title}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    min={0}
                                    step={topicDistType === 'PERCENT' ? 0.01 : 1}
                                    placeholder={topicDistType === 'PERCENT' ? '%' : 'Count'}
                                    value={row.value}
                                    onChange={(e) => {
                                      const updated = [...topicRows];
                                      updated[rIdx].value = e.target.value;
                                      setTopicRows(updated);
                                    }}
                                    style={{ width: '100px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                                  />
                                  <button
                                    onClick={() => setTopicRows(topicRows.filter((_, i) => i !== rIdx))}
                                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <button
                                onClick={() => setTopicRows([...topicRows, { topicId: 'top_optics', value: '0' }])}
                                style={{ background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                              >
                                + Add Topic Rule
                              </button>

                              <button
                                onClick={() => handleSaveTopicDistribution(selectedPattern.id, sec.id)}
                                style={{ background: '#06b6d4', color: '#000', border: 'none', padding: '6px 16px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                              >
                                Save Topic Distribution
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Tab Content 3: Difficulty Distribution (Feature 4.5) */}
                        {activeSectionTab === 'difficulty' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name={`diff-mode-${sec.id}`}
                                  checked={isDiffAutomatic}
                                  onChange={() => setIsDiffAutomatic(true)}
                                />
                                Automatic (Question Bank Native)
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name={`diff-mode-${sec.id}`}
                                  checked={!isDiffAutomatic}
                                  onChange={() => setIsDiffAutomatic(false)}
                                />
                                Stratified Target
                              </label>
                            </div>

                            {!isDiffAutomatic && (
                              <>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                    <input
                                      type="radio"
                                      name={`diff-type-${sec.id}`}
                                      checked={diffDistType === 'PERCENT'}
                                      onChange={() => setDiffDistType('PERCENT')}
                                    />
                                    Percentage (% Total = 100%)
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                    <input
                                      type="radio"
                                      name={`diff-type-${sec.id}`}
                                      checked={diffDistType === 'COUNT'}
                                      onChange={() => setDiffDistType('COUNT')}
                                    />
                                    Question Count (Sum = {sec.numQuestions})
                                  </label>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>EASY</label>
                                    <input
                                      type="number"
                                      min={0}
                                      step={diffDistType === 'PERCENT' ? 0.01 : 1}
                                      value={easyVal}
                                      onChange={(e) => setEasyVal(e.target.value)}
                                      style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                                    />
                                  </div>

                                  <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '4px' }}>MEDIUM</label>
                                    <input
                                      type="number"
                                      min={0}
                                      step={diffDistType === 'PERCENT' ? 0.01 : 1}
                                      value={medVal}
                                      onChange={(e) => setMedVal(e.target.value)}
                                      style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                                    />
                                  </div>

                                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#ef4444', fontWeight: 'bold', marginBottom: '4px' }}>HARD</label>
                                    <input
                                      type="number"
                                      min={0}
                                      step={diffDistType === 'PERCENT' ? 0.01 : 1}
                                      value={hardVal}
                                      onChange={(e) => setHardVal(e.target.value)}
                                      style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                                    />
                                  </div>
                                </div>
                              </>
                            )}

                            <div>
                              <button
                                onClick={() => handleSaveDifficultyDistribution(selectedPattern.id, sec.id)}
                                style={{ background: '#06b6d4', color: '#000', border: 'none', padding: '6px 16px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                              >
                                Save Difficulty Distribution
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Tab Content 4: Negative Marking Configuration (Feature 4.6) */}
                        {activeSectionTab === 'marking' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '12px', color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>
                                  Marks for Correct Answer (+)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={editMarksCorrect}
                                  onChange={(e) => setEditMarksCorrect(e.target.value)}
                                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                                />
                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  Must match section marks/Q ({sec.marksPerQuestion}) — min 0.1
                                </span>
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '12px', color: '#ef4444', fontWeight: 'bold', marginBottom: '4px' }}>
                                  Penalty for Wrong Answer (-)
                                </label>
                                <input
                                  type="number"
                                  max={0}
                                  step="any"
                                  value={editMarksWrong}
                                  onChange={(e) => setEditMarksWrong(e.target.value)}
                                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                                />
                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  e.g. -0.25 for -1/4, -0.33 for -1/3, or 0 for no penalty (max 0)
                                </span>
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '4px' }}>
                                  Unattempted Score
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={editMarksUnattempted}
                                  onChange={(e) => setEditMarksUnattempted(e.target.value)}
                                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 8px', borderRadius: '4px', fontSize: '12px' }}
                                />
                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  Score for unattempted questions (default: 0)
                                </span>
                              </div>
                            </div>

                            <div>
                              <button
                                onClick={() => handleSaveMarkingScheme(selectedPattern.id, sec.id)}
                                style={{ background: '#06b6d4', color: '#000', border: 'none', padding: '6px 16px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                              >
                                Save Marking Scheme
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No sections added yet. Use form above to add sections.</div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Create Exam Pattern Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontFamily: 'JetBrains Mono' }}>Create New Exam Pattern</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            {formError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
                {formError}
              </div>
            )}
            <form onSubmit={handleCreatePattern} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Pattern Name</label>
                <input
                  required
                  placeholder="e.g. JEE Main Physics Blueprint"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Required — must be at least 2 characters
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Pattern Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'SINGLE' | 'MULTI')}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                  >
                    <option value="SINGLE">Single Subject</option>
                    <option value="MULTI">Multi Subject</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                  />
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Required — must be at least 1 minute
                  </span>
                </div>
              </div>

              {/* Linked Subjects if Multi-Subject */}
              {type === 'MULTI' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Select Subjects in Pattern:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-color)', padding: '8px', borderRadius: '4px' }}>
                    {availableSubjects.map((sub) => {
                      const selected = selectedSubjectIds.includes(sub.id);
                      return (
                        <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedSubjectIds([...selectedSubjectIds, sub.id]);
                              else setSelectedSubjectIds(selectedSubjectIds.filter((s) => s !== sub.id));
                            }}
                          />
                          {sub.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows={3}
                  placeholder="Blueprint notes or instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: 'var(--accent-color)', color: '#000', border: 'none', padding: '8px 16px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Create Pattern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1.5: Edit Exam Pattern Modal (PATCH /api/v1/exam-patterns/:id) */}
      {showEditModal && editingPattern && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'JetBrains Mono' }}>Edit Exam Pattern</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  ID: {editingPattern.id} | Status: {editingPattern.status} | Version: v{editingPattern.version}
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            {editFormError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
                {editFormError}
              </div>
            )}
            <form onSubmit={handleSavePatternEdits} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Pattern Name</label>
                <input
                  required
                  placeholder="e.g. JEE Main Physics Blueprint"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Required — must be at least 2 characters
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Pattern Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as 'SINGLE' | 'MULTI')}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                  >
                    <option value="SINGLE">Single Subject</option>
                    <option value="MULTI">Multi Subject</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editDurationMinutes}
                    onChange={(e) => setEditDurationMinutes(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                  />
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Required — must be at least 1 minute
                  </span>
                </div>
              </div>

              {/* Linked Subjects if Multi-Subject */}
              {editType === 'MULTI' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Select Subjects in Pattern:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-color)', padding: '8px', borderRadius: '4px' }}>
                    {availableSubjects.map((sub) => {
                      const selected = editSelectedSubjectIds.includes(sub.id);
                      return (
                        <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              if (e.target.checked) setEditSelectedSubjectIds([...editSelectedSubjectIds, sub.id]);
                              else setEditSelectedSubjectIds(editSelectedSubjectIds.filter((s) => s !== sub.id));
                            }}
                          />
                          {sub.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows={3}
                  placeholder="Blueprint notes or instructions..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Validation Result Modal (Feature 4.8) */}
      {showValidationModal && validationResult && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '540px' }}>
            <h3 style={{ marginTop: 0, fontFamily: 'JetBrains Mono', color: validationResult.isValid ? '#10b981' : '#ef4444' }}>
              {validationResult.isValid ? '✓ Exam Pattern Validation Passed' : '⚠️ Exam Pattern Validation Deficit'}
            </h3>
            <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
              {validationResult.isValid
                ? 'Sufficient questions exist in the Question Bank to fulfill all section rules.'
                : 'Question Bank deficit detected. See details below:'}
            </div>

            {validationResult.details && validationResult.details.map((d: any, i: number) => (
              <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '8px', fontSize: '12px', borderLeft: d.status === 'OK' ? '3px solid #10b981' : '3px solid #ef4444' }}>
                <div style={{ fontWeight: 'bold' }}>{d.sectionName}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {d.availableCount} available / {d.requiredCount} required ({d.status})
                </div>
              </div>
            ))}

            <button onClick={() => setShowValidationModal(false)} style={{ width: '100%', padding: '10px', background: 'var(--accent-color)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px' }}>
              Close Report
            </button>
          </div>
        </div>
      )}

      {/* Modal 3: Version History Modal (Feature 4.9) */}
      {showVersionsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '560px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontFamily: 'JetBrains Mono' }}>Exam Pattern Version History</h3>
              <button onClick={() => setShowVersionsModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {versionHistory.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '16px', textAlign: 'center' }}>
                No previous version snapshots found. When a published pattern is modified, new versions are automatically archived here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {versionHistory.map((v) => (
                  <div key={v.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#8b5cf6' }}>Version {v.version}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-main)' }}>{v.changeSummary}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Committed by: {v.createdBy}</div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setShowVersionsModal(false)} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
