import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { ClassAnalyticsDTO, CourseDTO, MasteryColor } from '@repo/types';
import { StudentAnalyticsPage } from './StudentAnalyticsPage';
import { API_BASE } from '../config/api';

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

export const TeacherAnalyticsPage: React.FC = () => {
  const { token } = useAuth();
  const [courses, setCourses] = useState<CourseDTO[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [classData, setClassData] = useState<ClassAnalyticsDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [drilldownStudentId, setDrilldownStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, [token]);

  useEffect(() => {
    if (selectedCourseId) {
      loadClassAnalytics(selectedCourseId);
    }
  }, [selectedCourseId, token]);

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
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      setIsLoading(false);
    }
  };

  const loadClassAnalytics = async (courseId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/analytics/class/${courseId}`, {
        headers: getAuthHeaders(token),
      });
      const json = await res.json();
      if (json.success) {
        setClassData(json.data);
      }
    } catch (err) {
      console.error('Failed to load class analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = (classData?.students || []).filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '24px', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'JetBrains Mono' }}>
            Faculty & Institutional Analytics
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Cohort mastery overview, common syllabus pain points, student performance roster & individual drilldown.
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
            onClick={() => selectedCourseId && loadClassAnalytics(selectedCourseId)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'var(--panel-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ↻ Refresh Data
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--text-muted)' }}>
          Loading class performance analytics...
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
          {/* Top Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Class Average Mastery */}
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Class Average Mastery
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {classData?.averageMastery !== undefined ? `${classData.averageMastery}%` : '0%'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Across all enrolled students
              </div>
            </div>

            {/* Total Students */}
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Enrolled Students
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {classData?.totalStudents || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Active learners in course
              </div>
            </div>

            {/* Pass Rate */}
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Course Pass Rate
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e', marginTop: '4px' }}>
                {classData?.passRate !== undefined ? `${classData.passRate}%` : '0%'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Proficiency &ge; 50%
              </div>
            </div>

            {/* Mastery Distribution Summary */}
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mastery Breakdown
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>
                  Mastered: {classData?.masteryDistribution.mastered || 0}
                </span>
                <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>
                  Strong: {classData?.masteryDistribution.strong || 0}
                </span>
                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>
                  Weak: {classData?.masteryDistribution.weak || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Cohort Common Weaknesses Matrix */}
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
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ef4444' }}>
                  Cohort Common Weaknesses & Problem Topics
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Syllabus topics where the highest proportion of students struggle or score below passing threshold.
                </div>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {classData?.topWeakTopics.length || 0} problem topics flagged
              </span>
            </div>

            {(!classData?.topWeakTopics || classData.topWeakTopics.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No widespread cohort weaknesses identified for this course.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {classData.topWeakTopics.map((topic) => (
                  <div
                    key={topic.syllabusNodeId}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{topic.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Class Avg Score:</span>
                      <span style={{ fontWeight: 700, color: '#ef4444' }}>{topic.averageScore}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Struggling Students:</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {topic.affectedStudentsCount} ({topic.failureRate}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Student Performance Roster Table */}
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
                  Student Performance Roster
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Individual proficiency, assessment completion counts, and drilldown inspection.
                </div>
              </div>

              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-color)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  minWidth: '260px',
                }}
              />
            </div>

            {filteredStudents.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No student records found matching the filter.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 14px' }}>Student</th>
                      <th style={{ padding: '10px 14px' }}>Email</th>
                      <th style={{ padding: '10px 14px' }}>Mastery Score</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Exams Taken</th>
                      <th style={{ padding: '10px 14px' }}>Weaknesses</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => {
                      const badgeStyle = getStatusBadgeStyle(s.color);
                      return (
                        <tr
                          key={s.userId}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'background 0.2s',
                          }}
                        >
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>{s.name}</td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{s.email}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {s.overallProficiency}%
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: 600,
                                ...badgeStyle,
                              }}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-main)' }}>{s.examsTaken}</td>
                          <td style={{ padding: '12px 14px', color: s.weaknessesCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                            {s.weaknessesCount}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <button
                              onClick={() => setDrilldownStudentId(s.userId)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: '#06b6d4',
                                color: '#fff',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              View Drilldown
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Individual Student Drilldown Modal */}
      {drilldownStudentId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '1100px',
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--panel-bg)',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Individual Student Analytics Drilldown
                </h2>
                {classData?.students.find((s) => s.userId === drilldownStudentId) && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Student: <strong style={{ color: 'var(--text-main)' }}>{classData.students.find((s) => s.userId === drilldownStudentId)?.name}</strong> ({classData.students.find((s) => s.userId === drilldownStudentId)?.email})
                  </div>
                )}
              </div>
              <button
                onClick={() => setDrilldownStudentId(null)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                ✕ Close Drilldown
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <StudentAnalyticsPage targetStudentId={drilldownStudentId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
