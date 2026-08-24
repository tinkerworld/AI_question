import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import {
  StudentMasteryDTO,
  StudentStrengthDTO,
  StudentWeaknessDTO,
  SyllabusProficiencyNodeDTO,
  StudentProgressDTO,
  CourseDTO,
  MasteryColor,
  PracticePaperDTO,
  PracticeQuestionDTO,
} from '@repo/types';
import { PracticePlayerModal } from '../components/PracticePlayerModal';

const API_BASE = 'http://localhost:4000/api/v1';

function getStatusBadgeStyle(color?: MasteryColor) {
  switch (color) {
    case 'GREEN':
      return { background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' };
    case 'BLUE':
      return { background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' };
    case 'YELLOW':
      return { background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)' };
    case 'ORANGE':
      return { background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)' };
    case 'RED':
      return { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' };
    default:
      return { background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' };
  }
}

// Recursive Syllabus Tree Node Component
const SyllabusTreeNode: React.FC<{
  node: SyllabusProficiencyNodeDTO;
  expandedMap: Record<string, boolean>;
  onToggle: (id: string) => void;
}> = ({ node, expandedMap, onToggle }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedMap[node.id] ?? true;
  const badgeStyle = getStatusBadgeStyle(node.color);

  return (
    <div style={{ marginLeft: node.depth * 20, marginBottom: '8px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          {hasChildren ? (
            <button
              onClick={() => onToggle(node.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px 6px',
              }}
            >
              {isExpanded ? '▼' : '►'}
            </button>
          ) : (
            <span style={{ width: '22px', display: 'inline-block', textAlign: 'center', color: 'var(--text-muted)' }}>•</span>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{node.title}</span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {node.type}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {hasChildren ? `Completion: ${node.completionPercentage}% • Subtopics: ${node.children.length}` : `Attempts: ${node.attemptsCount}`}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '100px', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${node.proficiencyScore}%`,
                height: '100%',
                background:
                  node.color === 'GREEN'
                    ? '#22c55e'
                    : node.color === 'BLUE'
                    ? '#3b82f6'
                    : node.color === 'YELLOW'
                    ? '#eab308'
                    : node.color === 'ORANGE'
                    ? '#f97316'
                    : node.color === 'RED'
                    ? '#ef4444'
                    : '#94a3b8',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '40px', textAlign: 'right', color: 'var(--text-main)' }}>
            {node.proficiencyScore}%
          </span>

          <span
            style={{
              padding: '3px 8px',
              borderRadius: '10px',
              fontSize: '10px',
              fontWeight: 600,
              ...badgeStyle,
            }}
          >
            {node.status}
          </span>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div style={{ marginTop: '6px' }}>
          {node.children.map((child) => (
            <SyllabusTreeNode
              key={child.id}
              node={child}
              expandedMap={expandedMap}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const StudentAnalyticsPage: React.FC<{ targetStudentId?: string }> = ({ targetStudentId }) => {
  const { user, token } = useAuth();
  const effectiveUserId = targetStudentId || user?.id;

  const [courses, setCourses] = useState<CourseDTO[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [mastery, setMastery] = useState<StudentMasteryDTO | null>(null);
  const [strengths, setStrengths] = useState<StudentStrengthDTO[]>([]);
  const [weaknesses, setWeaknesses] = useState<StudentWeaknessDTO[]>([]);
  const [syllabusTree, setSyllabusTree] = useState<SyllabusProficiencyNodeDTO[]>([]);
  const [progress, setProgress] = useState<StudentProgressDTO | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [practiceSession, setPracticeSession] = useState<{
    paper: PracticePaperDTO;
    questions: PracticeQuestionDTO[];
    activeAttemptId: string;
  } | null>(null);
  const [isGeneratingPractice, setIsGeneratingPractice] = useState<boolean>(false);

  useEffect(() => {
    fetchCourses();
  }, [token]);

  useEffect(() => {
    if (effectiveUserId) {
      loadStudentData(effectiveUserId, selectedCourseId, timeRange);
    }
  }, [effectiveUserId, selectedCourseId, timeRange, token]);

  const handleGeneratePractice = async (nodeId?: string, nodeTitle?: string) => {
    setIsGeneratingPractice(true);
    try {
      const payload: any = {
        targetNodeIds: nodeId ? [nodeId] : undefined,
        count: 10,
        difficulty: 'ADAPTIVE',
        title: nodeTitle ? `Personalized Practice: ${nodeTitle}` : 'Targeted Weakness Practice',
      };
      const res = await fetch(`${API_BASE}/practice/generate`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPracticeSession(json.data);
      }
    } catch (err) {
      console.error('Failed to generate practice test:', err);
    } finally {
      setIsGeneratingPractice(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API_BASE}/courses`, {
        headers: getAuthHeaders(token),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setCourses(json.data);
        if (!selectedCourseId) {
          const preferredCourse = json.data.find((c: any) => c.code === 'ENG-101' || c.id === 'c1') || json.data[0];
          setSelectedCourseId(preferredCourse.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  };

  const loadStudentData = async (studentId: string, courseId: string, range: string) => {
    setIsLoading(true);
    try {
      const headers = getAuthHeaders(token);

      // 1. Mastery Profile
      const mRes = await fetch(`${API_BASE}/students/${studentId}/mastery`, { headers });
      const mJson = await mRes.json();
      if (mJson.success) setMastery(mJson.data);

      // 2. Strengths
      const sRes = await fetch(`${API_BASE}/students/${studentId}/strengths`, { headers });
      const sJson = await sRes.json();
      if (sJson.success && Array.isArray(sJson.data)) setStrengths(sJson.data);

      // 3. Weaknesses
      const wRes = await fetch(`${API_BASE}/students/${studentId}/weaknesses`, { headers });
      const wJson = await wRes.json();
      if (wJson.success && Array.isArray(wJson.data)) setWeaknesses(wJson.data);

      // 4. Progress
      const pRes = await fetch(`${API_BASE}/students/${studentId}/progress?range=${range}`, { headers });
      const pJson = await pRes.json();
      if (pJson.success) setProgress(pJson.data);

      // 5. Syllabus Tree (if course selected)
      if (courseId) {
        const treeRes = await fetch(`${API_BASE}/students/${studentId}/syllabus-proficiency/${courseId}`, { headers });
        const treeJson = await treeRes.json();
        if (treeJson.success && Array.isArray(treeJson.data)) setSyllabusTree(treeJson.data);
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!effectiveUserId) return;
    setIsRecalculating(true);
    try {
      await fetch(`${API_BASE}/students/${effectiveUserId}/recalculate`, {
        method: 'POST',
        headers: getAuthHeaders(token),
      });
      await loadStudentData(effectiveUserId, selectedCourseId, timeRange);
    } catch (err) {
      console.error('Failed to recalculate mastery:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const overallStyle = getStatusBadgeStyle(mastery?.color);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '24px', gap: '20px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'JetBrains Mono' }}>
            Student Mastery & Learning Analytics
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Real-time proficiency scoring, syllabus mastery mapping, strengths & priority improvement areas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {courses.length > 0 && (
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'var(--panel-bg)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  Course: {c.name} ({c.code})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#06b6d4',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: isRecalculating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isRecalculating ? 'Updating...' : '↻ Recalculate Mastery'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--text-muted)' }}>
          Loading mastery engine data...
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
          {/* Top Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* Overall Mastery Score Card */}
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 800,
                  ...overallStyle,
                }}
              >
                {mastery?.overallProficiency !== undefined ? `${Math.round(mastery.overallProficiency)}%` : '0%'}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Overall Mastery
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {mastery?.status || 'NOT_ATTEMPTED'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Weighted historical score
                </div>
              </div>
            </div>

            {/* Total Exams Card */}
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Exams Completed
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {mastery?.totalExamsTaken || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Evaluated test attempts
              </div>
            </div>

            {/* Total Questions Card */}
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Questions Attempted
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {mastery?.totalQuestionsAttempted || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Across all test papers
              </div>
            </div>

            {/* Strengths & Weaknesses Count Card */}
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-around',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#22c55e', textTransform: 'uppercase', fontWeight: 600 }}>
                  Strengths
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e', marginTop: '4px' }}>
                  {strengths.length}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Mastered / Strong</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border-color)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#ef4444', textTransform: 'uppercase', fontWeight: 600 }}>
                  Focus Areas
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>
                  {weaknesses.length}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Needs Practice</div>
              </div>
            </div>
          </div>

          {/* Dual Panel: Strengths & Weaknesses */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            {/* Top Strengths Panel */}
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>★</span> Top Strengths (Mastered & Strong)
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{strengths.length} topics</span>
              </div>

              {strengths.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Complete 2+ attempts in topics with &gt;70% scores to establish proven strengths.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {strengths.map((str) => (
                    <div
                      key={str.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(34, 197, 94, 0.05)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{str.nodeTitle}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {str.subjectName ? `${str.subjectName} • ` : ''}{str.attemptsCount} attempts
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#22c55e' }}>{str.masteryScore}%</span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 600,
                            ...getStatusBadgeStyle(str.color),
                          }}
                        >
                          {str.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Priority Focus Areas (Weaknesses) Panel */}
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠</span> Priority Focus Areas (Weaknesses)
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => handleGeneratePractice()}
                    disabled={isGeneratingPractice}
                    style={{
                      padding: '5px 12px',
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: isGeneratingPractice ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>⚡</span> {isGeneratingPractice ? 'Generating...' : 'Generate Practice Test'}
                  </button>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{weaknesses.length} topics</span>
                </div>
              </div>

              {weaknesses.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No critical weakness areas detected. Keep practicing to maintain high mastery!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {weaknesses.map((w) => (
                    <div
                      key={w.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{w.nodeTitle}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {w.subjectName ? `${w.subjectName} • ` : ''}Error Rate: {Math.round(w.errorRate * 100)}% • Persistence: {w.daysInWeakness}d
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            background: w.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                            color: w.severity === 'CRITICAL' ? '#ef4444' : '#f97316',
                          }}
                        >
                          {w.severity}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#ef4444' }}>{w.proficiencyScore}%</span>
                        
                        <button
                          onClick={() => handleGeneratePractice(w.syllabusNodeId, w.nodeTitle)}
                          disabled={isGeneratingPractice}
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: isGeneratingPractice ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>⚡</span> Practice This Topic
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Progress Tracking & Historical Trends Section */}
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Performance Trend & Progress History
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Trend Indicator:{' '}
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        progress?.trend === 'IMPROVING'
                          ? '#22c55e'
                          : progress?.trend === 'DEGRADING'
                          ? '#ef4444'
                          : '#eab308',
                    }}
                  >
                    {progress?.trend || 'PLATEAU'}{' '}
                    {progress?.trendDelta !== undefined && progress.trendDelta !== 0
                      ? `(${progress.trendDelta > 0 ? '+' : ''}${progress.trendDelta}%)`
                      : ''}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {(['7d', '30d', 'all'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: '1px solid var(--border-color)',
                      background: timeRange === r ? '#06b6d4' : 'transparent',
                      color: timeRange === r ? '#fff' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'All Time'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sparkline / Bar Graph representation */}
            {progress?.timeseries && progress.timeseries.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '140px', gap: '12px', paddingTop: '20px', borderBottom: '1px solid var(--border-color)' }}>
                {progress.timeseries.map((pt, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)' }}>{pt.score}%</span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '48px',
                        height: `${Math.max(10, pt.score)}%`,
                        background:
                          pt.score >= 85
                            ? '#22c55e'
                            : pt.score >= 70
                            ? '#3b82f6'
                            : pt.score >= 50
                            ? '#eab308'
                            : pt.score >= 30
                            ? '#f97316'
                            : '#ef4444',
                        borderRadius: '6px 6px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{pt.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No score history available for the selected timeframe.
              </div>
            )}
          </div>

          {/* Full Syllabus Proficiency Map */}
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Syllabus Proficiency Map
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Interactive hierarchical tree showing completion & proficiency badges across subjects & topics.
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Mastered (>85%)', color: 'GREEN' as MasteryColor },
                  { label: 'Strong (70-85%)', color: 'BLUE' as MasteryColor },
                  { label: 'Developing (50-70%)', color: 'YELLOW' as MasteryColor },
                  { label: 'Needs Practice (30-50%)', color: 'ORANGE' as MasteryColor },
                  { label: 'Weak (<30%)', color: 'RED' as MasteryColor },
                  { label: 'Unattempted', color: 'GREY' as MasteryColor },
                ].map((item) => (
                  <span
                    key={item.label}
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      ...getStatusBadgeStyle(item.color),
                    }}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            {syllabusTree.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No syllabus hierarchy defined for this course.
              </div>
            ) : (
              <div>
                {syllabusTree.map((node) => (
                  <SyllabusTreeNode
                    key={node.id}
                    node={node}
                    expandedMap={expandedNodes}
                    onToggle={toggleNodeExpand}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {practiceSession && (
        <PracticePlayerModal
          paper={practiceSession.paper}
          questions={practiceSession.questions}
          activeAttemptId={practiceSession.activeAttemptId}
          token={token || undefined}
          onClose={() => setPracticeSession(null)}
          onSessionComplete={() => {
            if (effectiveUserId) {
              loadStudentData(effectiveUserId, selectedCourseId, timeRange);
            }
          }}
        />
      )}
    </div>
  );
};
