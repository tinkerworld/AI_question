import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/I18nContext';

interface Course {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  subjects?: Subject[];
}

interface Subject {
  id: string;
  courseId: string;
  name: string;
  code: string;
  description?: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

interface SyllabusNode {
  id: string;
  subjectId: string;
  parentId?: string | null;
  title: string;
  type: 'UNIT' | 'TOPIC' | 'SUBTOPIC' | 'CONCEPT';
  depth: number;
  orderIndex: number;
  description?: string | null;
  learningObjectives?: string[] | string | null;
  estimatedMinutes: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  tags?: string[];
  children?: SyllabusNode[];
}

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

export const CoursesPage: React.FC = () => {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [syllabusTree, setSyllabusTree] = useState<SyllabusNode[]>([]);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [treeLoading, setTreeLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [showCourseModal, setShowCourseModal] = useState<boolean>(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseCode, setCourseCode] = useState<string>('');
  const [courseName, setCourseName] = useState<string>('');
  const [courseDesc, setCourseDesc] = useState<string>('');
  const [courseStatus, setCourseStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('PUBLISHED');

  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectCode, setSubjectCode] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [subjectDesc, setSubjectDesc] = useState<string>('');
  const [subjectOrder, setSubjectOrder] = useState<number>(0);

  const [showNodeModal, setShowNodeModal] = useState<boolean>(false);
  const [editingNode, setEditingNode] = useState<SyllabusNode | null>(null);
  const [nodeParentId, setNodeParentId] = useState<string>('');
  const [nodeTitle, setNodeTitle] = useState<string>('');
  const [nodeType, setNodeType] = useState<'UNIT' | 'TOPIC' | 'SUBTOPIC' | 'CONCEPT'>('TOPIC');
  const [nodeDesc, setNodeDesc] = useState<string>('');
  const [nodeMinutes, setNodeMinutes] = useState<number>(60);
  const [nodeObjectives, setNodeObjectives] = useState<string>('');
  const [nodeStatus, setNodeStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('PUBLISHED');

  const token = localStorage.getItem('token') || '';

  // 1. Fetch Courses
  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('http://localhost:4000/api/v1/courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCourses(data.data || []);
      } else {
        setError(extractApiErrorMessage(data, 'Failed to fetch courses'));
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching courses');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Subjects for Selected Course
  const fetchSubjects = async (courseId: string) => {
    try {
      setError(null);
      const res = await fetch(`http://localhost:4000/api/v1/courses/${courseId}/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSubjects(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedSubject(data.data[0]);
          fetchSyllabusTree(data.data[0].id);
        } else {
          setSelectedSubject(null);
          setSyllabusTree([]);
        }
      } else {
        setError(extractApiErrorMessage(data, 'Failed to fetch subjects'));
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching subjects');
    }
  };

  // 3. Fetch Syllabus Tree for Subject
  const fetchSyllabusTree = async (subjectId: string) => {
    try {
      setTreeLoading(true);
      setError(null);
      const res = await fetch(`http://localhost:4000/api/v1/syllabus/tree?subjectId=${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSyllabusTree(data.data || []);
      } else {
        setError(extractApiErrorMessage(data, 'Failed to load syllabus tree'));
      }
    } catch (err: any) {
      setError(err.message || 'Error loading syllabus tree');
    } finally {
      setTreeLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    fetchSubjects(course.id);
  };

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    fetchSyllabusTree(subject.id);
  };

  // 4. Course CRUD Operations
  const openCreateCourseModal = () => {
    setEditingCourse(null);
    setCourseCode('');
    setCourseName('');
    setCourseDesc('');
    setCourseStatus('PUBLISHED');
    setShowCourseModal(true);
  };

  const openEditCourseModal = (c: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCourse(c);
    setCourseCode(c.code);
    setCourseName(c.name);
    setCourseDesc(c.description || '');
    setCourseStatus(c.status);
    setShowCourseModal(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccessMsg(null);
      const payload = {
        code: courseCode,
        name: courseName,
        description: courseDesc || undefined,
        status: courseStatus,
      };

      if (editingCourse) {
        const res = await fetch(`http://localhost:4000/api/v1/courses/${editingCourse.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Course ${courseName} updated successfully`);
          setShowCourseModal(false);
          fetchCourses();
        } else {
          setError(extractApiErrorMessage(data, 'Failed to update course'));
        }
      } else {
        const res = await fetch('http://localhost:4000/api/v1/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Course ${courseName} created successfully`);
          setShowCourseModal(false);
          fetchCourses();
        } else {
          setError(extractApiErrorMessage(data, 'Failed to create course'));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error saving course');
    }
  };

  const handleDeleteCourse = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this course and all associated subjects?')) return;
    try {
      setError(null);
      const res = await fetch(`http://localhost:4000/api/v1/courses/${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Course deleted successfully');
        if (selectedCourse?.id === courseId) {
          setSelectedCourse(null);
          setSubjects([]);
          setSelectedSubject(null);
        }
        fetchCourses();
      } else {
        setError(extractApiErrorMessage(data, 'Failed to delete course'));
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting course');
    }
  };

  // 5. Subject CRUD Operations
  const openCreateSubjectModal = () => {
    if (!selectedCourse) return;
    setEditingSubject(null);
    setSubjectCode('');
    setSubjectName('');
    setSubjectDesc('');
    setSubjectOrder(subjects.length);
    setShowSubjectModal(true);
  };

  const openEditSubjectModal = (s: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubject(s);
    setSubjectCode(s.code);
    setSubjectName(s.name);
    setSubjectDesc(s.description || '');
    setSubjectOrder(s.orderIndex);
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    try {
      setError(null);
      setSuccessMsg(null);
      const payload = {
        code: subjectCode,
        name: subjectName,
        description: subjectDesc || undefined,
        orderIndex: Number(subjectOrder),
      };

      if (editingSubject) {
        const res = await fetch(`http://localhost:4000/api/v1/courses/subject/${editingSubject.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Subject ${subjectName} updated`);
          setShowSubjectModal(false);
          fetchSubjects(selectedCourse.id);
        } else {
          setError(extractApiErrorMessage(data, 'Failed to update subject'));
        }
      } else {
        const res = await fetch(`http://localhost:4000/api/v1/courses/${selectedCourse.id}/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Subject ${subjectName} added`);
          setShowSubjectModal(false);
          fetchSubjects(selectedCourse.id);
        } else {
          setError(extractApiErrorMessage(data, 'Failed to add subject'));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error saving subject');
    }
  };

  const handleDeleteSubject = async (subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this subject and all its syllabus tree nodes?')) return;
    try {
      setError(null);
      const res = await fetch(`http://localhost:4000/api/v1/courses/subject/${subjectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Subject deleted');
        if (selectedCourse) fetchSubjects(selectedCourse.id);
      } else {
        setError(extractApiErrorMessage(data, 'Failed to delete subject'));
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting subject');
    }
  };

  // 6. Syllabus Node CRUD & Reorder Operations
  const openCreateNodeModal = (parentId?: string) => {
    if (!selectedSubject) return;
    setEditingNode(null);
    setNodeParentId(parentId || '');
    setNodeTitle('');
    setNodeType(parentId ? 'TOPIC' : 'UNIT');
    setNodeDesc('');
    setNodeMinutes(60);
    setNodeObjectives('');
    setNodeStatus('PUBLISHED');
    setShowNodeModal(true);
  };

  const openEditNodeModal = (node: SyllabusNode) => {
    setEditingNode(node);
    setNodeParentId(node.parentId || '');
    setNodeTitle(node.title);
    setNodeType(node.type);
    setNodeDesc(node.description || '');
    setNodeMinutes(node.estimatedMinutes || 60);

    let loStr = '';
    if (Array.isArray(node.learningObjectives)) {
      loStr = node.learningObjectives.join('\n');
    } else if (typeof node.learningObjectives === 'string') {
      try {
        const parsed = JSON.parse(node.learningObjectives);
        loStr = Array.isArray(parsed) ? parsed.join('\n') : node.learningObjectives;
      } catch {
        loStr = node.learningObjectives;
      }
    }
    setNodeObjectives(loStr);
    setNodeStatus(node.status);
    setShowNodeModal(true);
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;
    try {
      setError(null);
      setSuccessMsg(null);
      const objectives = nodeObjectives
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: any = {
        title: nodeTitle,
        type: nodeType,
        description: nodeDesc || undefined,
        estimatedMinutes: Number(nodeMinutes),
        learningObjectives: objectives.length > 0 ? objectives : undefined,
        status: nodeStatus,
      };

      if (editingNode) {
        const res = await fetch(`http://localhost:4000/api/v1/syllabus/node/${editingNode.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Node "${nodeTitle}" updated`);
          setShowNodeModal(false);
          fetchSyllabusTree(selectedSubject.id);
        } else {
          setError(extractApiErrorMessage(data, 'Failed to update syllabus node'));
        }
      } else {
        payload.parentId = nodeParentId || undefined;
        const res = await fetch(`http://localhost:4000/api/v1/subjects/${selectedSubject.id}/syllabus`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Syllabus node "${nodeTitle}" created`);
          setShowNodeModal(false);
          fetchSyllabusTree(selectedSubject.id);
        } else {
          setError(extractApiErrorMessage(data, 'Failed to create syllabus node'));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error saving syllabus node');
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!window.confirm('Delete this syllabus node and any child topics?')) return;
    if (!selectedSubject) return;
    try {
      setError(null);
      const res = await fetch(`http://localhost:4000/api/v1/syllabus/node/${nodeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Syllabus node deleted');
        fetchSyllabusTree(selectedSubject.id);
      } else {
        setError(extractApiErrorMessage(data, 'Failed to delete syllabus node'));
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting node');
    }
  };

  const handleReorderNode = async (node: SyllabusNode, direction: 'UP' | 'DOWN') => {
    if (!selectedSubject) return;
    try {
      setError(null);
      const newOrder = direction === 'UP' ? Math.max(0, node.orderIndex - 1) : node.orderIndex + 1;
      const res = await fetch(`http://localhost:4000/api/v1/syllabus/node/${node.id}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          parentId: node.parentId || null,
          orderIndex: newOrder,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchSyllabusTree(selectedSubject.id);
      } else {
        setError(extractApiErrorMessage(data, 'Failed to reorder node'));
      }
    } catch (err: any) {
      setError(err.message || 'Error reordering node');
    }
  };

  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Helper recursive renderer for Syllabus Tree
  const renderTreeNode = (node: SyllabusNode) => {
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = Boolean(collapsedNodes[node.id]);

    return (
      <div
        key={node.id}
        style={{
          marginLeft: `${node.depth * 20}px`,
          marginTop: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Left: Expand toggle, Type badge, Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            {hasChildren ? (
              <button
                onClick={() => toggleCollapse(node.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-color)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  width: '16px',
                }}
              >
                {isCollapsed ? '▶' : '▼'}
              </button>
            ) : (
              <span style={{ width: '16px', display: 'inline-block' }} />
            )}

            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: 'JetBrains Mono',
                background:
                  node.type === 'UNIT'
                    ? 'rgba(139, 92, 246, 0.15)'
                    : node.type === 'TOPIC'
                    ? 'rgba(6, 182, 212, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)',
                color:
                  node.type === 'UNIT'
                    ? '#8b5cf6'
                    : node.type === 'TOPIC'
                    ? '#06b6d4'
                    : '#10b981',
              }}
            >
              {node.type} (L{node.depth})
            </span>

            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>
              {node.title}
            </span>

            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              ~{node.estimatedMinutes} mins
            </span>
          </div>

          {/* Right Actions: Reorder, Add Sub-node, Edit, Delete */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => handleReorderNode(node, 'UP')}
              title="Move Up"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              ↑
            </button>
            <button
              onClick={() => handleReorderNode(node, 'DOWN')}
              title="Move Down"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              ↓
            </button>
            {node.depth < 3 && (
              <button
                onClick={() => openCreateNodeModal(node.id)}
                style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid #06b6d4',
                  color: '#06b6d4',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                + Sub-node
              </button>
            )}
            <button
              onClick={() => openEditNodeModal(node)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteNode(node.id)}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Children Render */}
        {hasChildren && !isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {node.children!.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Breadcrumb Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span
              onClick={() => {
                setSelectedCourse(null);
                setSelectedSubject(null);
              }}
              style={{ cursor: 'pointer', color: selectedCourse ? 'var(--accent-color)' : 'var(--text-main)', fontWeight: 'bold' }}
            >
              Courses
            </span>
            {selectedCourse && (
              <>
                <span>/</span>
                <span
                  onClick={() => setSelectedSubject(null)}
                  style={{ cursor: 'pointer', color: selectedSubject ? 'var(--accent-color)' : 'var(--text-main)', fontWeight: 'bold' }}
                >
                  {selectedCourse.name}
                </span>
              </>
            )}
            {selectedSubject && (
              <>
                <span>/</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>
                  {selectedSubject.name} (Syllabus)
                </span>
              </>
            )}
          </div>
          <h1 style={{ margin: '6px 0 0 0', fontSize: '22px', fontFamily: 'JetBrains Mono' }}>
            {selectedSubject
              ? `${selectedSubject.name} Syllabus Hierarchy`
              : selectedCourse
              ? `${selectedCourse.name} Curriculum Structure`
              : 'Academic Structure & Curriculum'}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!selectedCourse ? (
            <button
              onClick={openCreateCourseModal}
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                border: 'none',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              + Create Course
            </button>
          ) : selectedSubject ? (
            <button
              onClick={() => openCreateNodeModal()}
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                border: 'none',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              + Add Root Unit
            </button>
          ) : (
            <button
              onClick={openCreateSubjectModal}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                border: 'none',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              + Add Subject
            </button>
          )}
        </div>
      </div>

      {/* Error & Success Messages */}
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

      {successMsg && (
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
          {successMsg}
        </div>
      )}

      {/* VIEW 1: CENTRAL COURSE LISTING */}
      {!selectedCourse && (
        <div>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading courses...
            </div>
          ) : courses.length === 0 ? (
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
              No courses configured yet. Click "+ Create Course" to add Engineering Entrance or Medical Foundation.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => handleSelectCourse(course)}
                  style={{
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: '11px',
                          color: '#06b6d4',
                          fontWeight: 'bold',
                        }}
                      >
                        {course.code}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontFamily: 'JetBrains Mono',
                          background:
                            course.status === 'PUBLISHED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(100, 116, 139, 0.15)',
                          color: course.status === 'PUBLISHED' ? '#10b981' : '#94a3b8',
                        }}
                      >
                        {course.status}
                      </span>
                    </div>

                    <h3 style={{ margin: '8px 0 4px 0', fontSize: '16px' }}>{course.name}</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {course.description || 'No description provided'}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--border-color)',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>Click to view Subjects & Syllabus →</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={(e) => openEditCourseModal(course, e)}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => handleDeleteCourse(course.id, e)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid #ef4444',
                          color: '#ef4444',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: COURSE DETAIL VIEW (Subjects & Syllabus Tree) */}
      {selectedCourse && (
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Left Panel: Subject Navigator */}
          <div
            style={{
              width: '280px',
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>
                SUBJECTS ({subjects.length})
              </span>
              <button
                onClick={openCreateSubjectModal}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-color)',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                + Add
              </button>
            </div>

            {subjects.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                No subjects configured. Add Physics, Chemistry, etc.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {subjects.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => handleSelectSubject(sub)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: selectedSubject?.id === sub.id ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.02)',
                      border: selectedSubject?.id === sub.id ? '1px solid #06b6d4' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{sub.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                        {sub.code}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={(e) => openEditSubjectModal(sub, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => handleDeleteSubject(sub.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel: Hierarchical Syllabus Tree */}
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {selectedSubject ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '16px', fontFamily: 'JetBrains Mono' }}>
                      {selectedSubject.name} — Syllabus Outline
                    </h2>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      4-Level Hierarchy (Unit &rarr; Topic &rarr; Subtopic &rarr; Concept). Use &uarr;&darr; to reorder nodes.
                    </div>
                  </div>
                  <button
                    onClick={() => openCreateNodeModal()}
                    style={{
                      background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                      border: 'none',
                      color: '#fff',
                      padding: '6px 14px',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Root Unit
                  </button>
                </div>

                {treeLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading syllabus tree...
                  </div>
                ) : syllabusTree.length === 0 ? (
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
                    No syllabus nodes created for {selectedSubject.name}. Click "+ Add Root Unit" to begin structuring the curriculum.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {syllabusTree.map((rootNode) => renderTreeNode(rootNode))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Select a subject from the left panel to view and edit its syllabus tree.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT COURSE MODAL */}
      {showCourseModal && (
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
              maxWidth: '500px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontFamily: 'JetBrains Mono' }}>
                {editingCourse ? 'Edit Course' : 'Create New Course'}
              </h2>
              <button
                onClick={() => setShowCourseModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Course Code (e.g. JEE_2025)
                </label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="Unique course identifier..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Course Name
                </label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="Full course title..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  placeholder="Overview of academic course objectives..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Status
                </label>
                <select
                  value={courseStatus}
                  onChange={(e) => setCourseStatus(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    padding: '8px 14px',
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
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT SUBJECT MODAL */}
      {showSubjectModal && (
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
              maxWidth: '480px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontFamily: 'JetBrains Mono' }}>
                {editingSubject ? 'Edit Subject' : `Add Subject to ${selectedCourse?.name}`}
              </h2>
              <button
                onClick={() => setShowSubjectModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubject} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Subject Code (e.g. PHY_01)
                </label>
                <input
                  type="text"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="Code..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Subject Name (e.g. Physics)
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Subject Name..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Sequence Order
                </label>
                <input
                  type="number"
                  value={subjectOrder}
                  onChange={(e) => setSubjectOrder(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    padding: '8px 14px',
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
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {editingSubject ? 'Save Changes' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT SYLLABUS NODE MODAL */}
      {showNodeModal && (
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
              maxWidth: '520px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontFamily: 'JetBrains Mono' }}>
                {editingNode ? 'Edit Syllabus Node' : 'Add Syllabus Node'}
              </h2>
              <button
                onClick={() => setShowNodeModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Node Title (e.g. Laws of Motion & Friction)
                </label>
                <input
                  type="text"
                  value={nodeTitle}
                  onChange={(e) => setNodeTitle(e.target.value)}
                  placeholder="Title..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Node Type
                  </label>
                  <select
                    value={nodeType}
                    onChange={(e) => setNodeType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                    }}
                  >
                    <option value="UNIT">Unit (Level 0)</option>
                    <option value="TOPIC">Topic (Level 1)</option>
                    <option value="SUBTOPIC">Subtopic (Level 2)</option>
                    <option value="CONCEPT">Concept (Level 3)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Estimated Minutes
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={nodeMinutes}
                    onChange={(e) => setNodeMinutes(parseInt(e.target.value, 10))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Learning Objectives (One per line)
                </label>
                <textarea
                  rows={3}
                  value={nodeObjectives}
                  onChange={(e) => setNodeObjectives(e.target.value)}
                  placeholder="Understand Newton's 1st Law&#10;Calculate friction coefficients"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Status
                </label>
                <select
                  value={nodeStatus}
                  onChange={(e) => setNodeStatus(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNodeModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    padding: '8px 14px',
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
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {editingNode ? 'Save Node' : 'Add Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
