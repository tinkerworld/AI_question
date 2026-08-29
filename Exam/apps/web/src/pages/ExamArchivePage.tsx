import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/I18nContext';

interface ExamSnapshotSummary {
  id: string;
  examId: string;
  academicYear: string;
  courseId?: string | null;
  courseName?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  examName: string;
  patternSnapshot?: any;
  instructions?: string | null;
  durationMinutes: number;
  totalMarks: number;
  storagePath?: string | null;
  publishedAt: string;
  publishedByName?: string | null;
  version: number;
  status: string;
  questionsCount?: number;
}

interface ExamSnapshotDetail extends ExamSnapshotSummary {
  sections?: {
    id: string;
    name: string;
    sequenceOrder: number;
    subjectName?: string;
    numQuestions: number;
    marksPerQuestion: number;
    totalMarks: number;
    marksCorrect: number;
    marksWrong: number;
    questions?: {
      id: string;
      originalQuestionId: string;
      questionType: string;
      questionContent: any;
      answerKey?: any;
      marks: number;
      negativeMarks: number;
      displayOrder: number;
    }[];
  }[];
}

interface AnswerKeyDetail {
  snapshotId: string;
  examName: string;
  version: number;
  publishedAt: string;
  sections: {
    sectionId: string;
    sectionName: string;
    questions: {
      id: string;
      originalQuestionId: string;
      displayOrder: number;
      questionType: string;
      marks: number;
      negativeMarks: number;
      answerKey: any;
      explanation?: string;
    }[];
  }[];
}

interface VersionHistory {
  examId: string;
  versions: {
    id: string;
    version: number;
    examName: string;
    totalMarks: number;
    publishedAt: string;
    publishedByName: string;
    status: string;
  }[];
  corrections: {
    id: string;
    originalSnapshotId: string;
    correctedSnapshotId?: string;
    version: number;
    reason: string;
    changesSummary: any;
    initiatedByName: string;
    createdAt: string;
  }[];
}

const API_BASE = 'http://localhost:4043/api/v1';

export const ExamArchivePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [snapshots, setSnapshots] = useState<ExamSnapshotSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [stats, setStats] = useState({ total: 0, totalMarks: 0, totalQuestions: 0 });

  // Modal States
  const [activeSnapshot, setActiveSnapshot] = useState<ExamSnapshotDetail | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState<boolean>(false);

  const [activeAnswerKey, setActiveAnswerKey] = useState<AnswerKeyDetail | null>(null);
  const [answerKeyLoading, setAnswerKeyLoading] = useState<boolean>(false);

  const [activeHistory, setActiveHistory] = useState<VersionHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Post-Publish Correction State
  const [correctingSnapshot, setCorrectingSnapshot] = useState<ExamSnapshotDetail | null>(null);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [selectedCorrectionQId, setSelectedCorrectionQId] = useState<string>('');
  const [correctedAnswerValue, setCorrectedAnswerValue] = useState<string>('');
  const [correctionExplanation, setCorrectionExplanation] = useState<string>('');
  const [correctionSubmitting, setCorrectionSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const userPermissions = user?.permissions || [];
  const canViewAnswerKey = userPermissions.includes('archive.answer_key') || userPermissions.includes('*');
  const canInitiateCorrection = userPermissions.includes('archive.correct') || userPermissions.includes('*');

  const fetchArchive = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/archive/exams?limit=50`;
      if (selectedYear !== 'ALL') {
        url += `&academicYear=${selectedYear}`;
      }
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const items = data.data.items || [];
        setSnapshots(items);
        
        let marksSum = 0;
        let qSum = 0;
        items.forEach((item: ExamSnapshotSummary) => {
          marksSum += Number(item.totalMarks || 0);
          qSum += Number(item.questionsCount || 0);
        });
        setStats({
          total: items.length,
          totalMarks: marksSum,
          totalQuestions: qSum,
        });
      }
    } catch (err) {
      console.error('Error fetching archive:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchive();
  }, [selectedYear]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArchive();
  };

  const openSnapshotModal = async (snapId: string) => {
    setSnapshotLoading(true);
    setActiveSnapshot(null);
    try {
      const res = await fetch(`${API_BASE}/archive/exams/${snapId}/snapshot`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setActiveSnapshot(data.data);
      }
    } catch (err) {
      console.error('Failed to load snapshot details:', err);
    } finally {
      setSnapshotLoading(false);
    }
  };

  const openAnswerKeyModal = async (snapId: string) => {
    if (!canViewAnswerKey) {
      alert('Permission Required: You need "archive.answer_key" permission to view preserved answer keys.');
      return;
    }
    setAnswerKeyLoading(true);
    setActiveAnswerKey(null);
    try {
      const res = await fetch(`${API_BASE}/archive/exams/${snapId}/answer-key`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setActiveAnswerKey(data.data);
      } else {
        alert(data.message || 'Access to answer keys is restricted.');
      }
    } catch (err) {
      console.error('Failed to load answer keys:', err);
    } finally {
      setAnswerKeyLoading(false);
    }
  };

  const openHistoryModal = async (examId: string) => {
    setHistoryLoading(true);
    setActiveHistory(null);
    try {
      const res = await fetch(`${API_BASE}/archive/exams/${examId}/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setActiveHistory(data.data);
      }
    } catch (err) {
      console.error('Failed to load version history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const startCorrection = async (snapId: string) => {
    try {
      const res = await fetch(`${API_BASE}/archive/exams/${snapId}/snapshot`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCorrectingSnapshot(data.data);
        setCorrectionReason('');
        setSelectedCorrectionQId(data.data.sections?.[0]?.questions?.[0]?.id || '');
        setCorrectedAnswerValue('');
        setCorrectionExplanation('');
      }
    } catch (err) {
      console.error('Failed to prepare correction:', err);
    }
  };

  const submitCorrection = async () => {
    if (!correctingSnapshot) return;
    if (!correctionReason.trim() || correctionReason.trim().length < 3) {
      alert('Please specify a detailed reason for this post-publish errata correction.');
      return;
    }
    if (!selectedCorrectionQId || !correctedAnswerValue.trim()) {
      alert('Please select a question and provide the revised correct answer.');
      return;
    }

    setCorrectionSubmitting(true);
    try {
      const payload = {
        reason: correctionReason.trim(),
        changes: [
          {
            questionId: selectedCorrectionQId,
            correctedAnswerKey: { correctAnswer: correctedAnswerValue.trim() },
            explanation: correctionExplanation.trim() || 'Post-publish official errata update',
          },
        ],
      };

      const res = await fetch(`${API_BASE}/exams/${correctingSnapshot.id}/corrections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setFeedbackMsg({ type: 'success', text: `Correction applied! New version v${data.data?.version || 2} created.` });
        setCorrectingSnapshot(null);
        fetchArchive();
      } else {
        alert(data.message || 'Correction failed');
      }
    } catch (err: any) {
      alert(`Error submitting correction: ${err.message}`);
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0b0f19',
        color: '#e2e8f0',
        overflowY: 'auto',
        padding: '24px 32px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Banner & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', fontFamily: 'JetBrains Mono' }}>
              Published Exam Archive & Question Vault
            </h1>
            <span
              style={{
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '0.5px',
              }}
            >
              🔒 IMMUTABILITY ENGINE ACTIVE
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Historical question papers frozen at publication time per ADR-007. Direct mutation blocked at database layer.
          </p>
        </div>

        {/* Global Stats Cards */}
        <div style={{ display: 'flex', gap: '14px' }}>
          <div
            style={{
              background: '#131b2e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '10px 18px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Published Exams
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8', marginTop: '2px' }}>
              {stats.total}
            </div>
          </div>
          <div
            style={{
              background: '#131b2e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '10px 18px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Archived Questions
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#a855f7', marginTop: '2px' }}>
              {stats.totalQuestions}
            </div>
          </div>
          <div
            style={{
              background: '#131b2e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '10px 18px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Answer Keys
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e', marginTop: '2px' }}>
              {stats.total}
            </div>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            background: feedbackMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedbackMsg.type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: feedbackMsg.type === 'success' ? '#86efac' : '#fca5a5',
            padding: '10px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div
        style={{
          background: '#131b2e',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flex: 1 }}>
          <input
            type="text"
            placeholder="Search exam name, course, or subject code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              background: '#0b0f19',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '8px 14px',
              color: '#f8fafc',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Academic Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{
              background: '#0b0f19',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '8px 12px',
              color: '#f8fafc',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            <option value="ALL">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>

        <button
          onClick={fetchArchive}
          style={{
            background: '#1e293b',
            color: '#94a3b8',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '8px 14px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Published Exams Table */}
      <div
        style={{
          flex: 1,
          background: '#131b2e',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #1e293b',
            display: 'grid',
            gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr 1fr 2.8fr',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          <div>Exam Paper & Version</div>
          <div>Course / Subject</div>
          <div>Year</div>
          <div>Marks & Time</div>
          <div>Published On</div>
          <div style={{ textAlign: 'right' }}>Actions & Vault Tools</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              Loading archived exams...
            </div>
          ) : snapshots.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              No published exams found in archive matching criteria.
            </div>
          ) : (
            snapshots.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid #1e293b',
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr 1fr 2.8fr',
                  alignItems: 'center',
                  fontSize: '13px',
                  transition: 'background 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{item.examName}</span>
                    <span
                      style={{
                        background: item.version > 1 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color: item.version > 1 ? '#eab308' : '#38bdf8',
                        border: `1px solid ${item.version > 1 ? 'rgba(234, 179, 8, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                      }}
                    >
                      v{item.version}.0 {item.version > 1 ? '• CORRECTED' : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                    ID: {item.id} • {item.questionsCount || 0} Questions
                  </div>
                </div>

                <div>
                  <div style={{ color: '#cbd5e1' }}>{item.courseName || 'General Engineering'}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{item.subjectName || 'All Subjects'}</div>
                </div>

                <div>
                  <span
                    style={{
                      background: '#1e293b',
                      color: '#94a3b8',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  >
                    {item.academicYear}
                  </span>
                </div>

                <div>
                  <div style={{ color: '#f8fafc', fontWeight: '500' }}>{item.totalMarks} Marks</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{item.durationMinutes} mins</div>
                </div>

                <div>
                  <div style={{ color: '#cbd5e1' }}>{new Date(item.publishedAt).toLocaleDateString()}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{item.publishedByName || 'Admin'}</div>
                </div>

                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => openSnapshotModal(item.id)}
                    style={{
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      borderRadius: '5px',
                      padding: '5px 9px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                    title="View Frozen Paper Snapshot"
                  >
                    👁️ Snapshot
                  </button>

                  <button
                    onClick={() => openAnswerKeyModal(item.id)}
                    style={{
                      background: canViewAnswerKey ? 'rgba(34, 197, 94, 0.12)' : '#1e293b',
                      border: `1px solid ${canViewAnswerKey ? 'rgba(34, 197, 94, 0.3)' : '#334155'}`,
                      color: canViewAnswerKey ? '#22c55e' : '#64748b',
                      borderRadius: '5px',
                      padding: '5px 9px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: canViewAnswerKey ? 'pointer' : 'not-allowed',
                    }}
                    title={canViewAnswerKey ? 'View Preserved Answer Keys' : 'Requires archive.answer_key'}
                  >
                    🔑 Answer Key
                  </button>

                  <button
                    onClick={() => openHistoryModal(item.examId)}
                    style={{
                      background: 'rgba(168, 85, 247, 0.12)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      color: '#a855f7',
                      borderRadius: '5px',
                      padding: '5px 9px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                    title="View Correction History"
                  >
                    📜 History
                  </button>

                  {canInitiateCorrection && (
                    <button
                      onClick={() => startCorrection(item.id)}
                      style={{
                        background: 'rgba(234, 179, 8, 0.12)',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        color: '#eab308',
                        borderRadius: '5px',
                        padding: '5px 9px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                      title="Post-Publish Official Errata Correction"
                    >
                      ✏️ Errata
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal 1: Frozen Question Paper Snapshot Viewer */}
      {activeSnapshot && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              width: '900px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                padding: '16px 22px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>
                    {activeSnapshot.examName}
                  </h2>
                  <span
                    style={{
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#22c55e',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  >
                    v{activeSnapshot.version}.0 Snapshot (Read-Only)
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Total Marks: {activeSnapshot.totalMarks} • Duration: {activeSnapshot.durationMinutes} mins • Published: {new Date(activeSnapshot.publishedAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setActiveSnapshot(null)}
                style={{
                  background: '#1e293b',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {activeSnapshot.instructions && (
                <div
                  style={{
                    background: '#131b2e',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    color: '#94a3b8',
                  }}
                >
                  <strong style={{ color: '#cbd5e1' }}>General Instructions: </strong>
                  {activeSnapshot.instructions}
                </div>
              )}

              {activeSnapshot.sections?.map((sec, sIdx) => (
                <div key={sec.id} style={{ marginBottom: '24px' }}>
                  <div
                    style={{
                      background: '#1e293b',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      color: '#38bdf8',
                      marginBottom: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{sec.name}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {sec.questions?.length || 0} Questions • {sec.marksPerQuestion} Marks (+{sec.marksCorrect} / {sec.marksWrong})
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {sec.questions?.map((q, qIdx) => (
                      <div
                        key={q.id}
                        style={{
                          background: '#131b2e',
                          border: '1px solid #1e293b',
                          borderRadius: '8px',
                          padding: '14px 18px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: '#a855f7', fontSize: '12px' }}>
                            Q{q.displayOrder || qIdx + 1} ({q.questionType})
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Marks: +{q.marks} / -{Math.abs(q.negativeMarks || 0)}
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#f8fafc', marginBottom: '10px' }}>
                          {q.questionContent?.content || 'Question prompt'}
                        </div>

                        {q.questionContent?.options && q.questionContent.options.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {q.questionContent.options.map((opt: any, oIdx: number) => (
                              <div
                                key={opt.id || oIdx}
                                style={{
                                  background: '#0b0f19',
                                  border: '1px solid #1e293b',
                                  borderRadius: '6px',
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  color: '#cbd5e1',
                                }}
                              >
                                <span style={{ fontWeight: 'bold', color: '#38bdf8', marginRight: '6px' }}>
                                  ({String.fromCharCode(65 + oIdx)})
                                </span>
                                {opt.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Preserved Answer Key Viewer */}
      {activeAnswerKey && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #22c55e',
              borderRadius: '12px',
              width: '850px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                padding: '16px 22px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>
                    Preserved Official Answer Key
                  </h2>
                  <span
                    style={{
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#22c55e',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  >
                    🔒 VERIFIED ANSWER KEY (v{activeAnswerKey.version}.0)
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  {activeAnswerKey.examName} • Frozen Snapshot ID: {activeAnswerKey.snapshotId}
                </div>
              </div>
              <button
                onClick={() => setActiveAnswerKey(null)}
                style={{
                  background: '#1e293b',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {activeAnswerKey.sections?.map((sec) => (
                <div key={sec.sectionId} style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                      background: '#1e293b',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      color: '#22c55e',
                      marginBottom: '10px',
                    }}
                  >
                    {sec.sectionName}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sec.questions?.map((q, idx) => (
                      <div
                        key={q.id}
                        style={{
                          background: '#131b2e',
                          border: '1px solid #1e293b',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 'bold', color: '#38bdf8', marginRight: '8px' }}>
                            Q{q.displayOrder || idx + 1}:
                          </span>
                          <span
                            style={{
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: '#4ade80',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                              fontWeight: 'bold',
                              fontSize: '13px',
                            }}
                          >
                            Correct Answer:{' '}
                            {typeof q.answerKey?.correctAnswer === 'object'
                              ? JSON.stringify(q.answerKey.correctAnswer)
                              : String(q.answerKey?.correctAnswer || q.answerKey?.correctValue || 'Verified')}
                          </span>
                          {q.explanation && (
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                              💡 Explanation: {q.explanation}
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
                          Type: {q.questionType} • Marks: +{q.marks}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Version History & Correction Audit Log */}
      {activeHistory && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #a855f7',
              borderRadius: '12px',
              width: '750px',
              maxWidth: '95vw',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                padding: '16px 22px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>
                  Exam Version & Errata History
                </h2>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Exam ID: {activeHistory.examId} • Total Versions: {activeHistory.versions.length}
                </div>
              </div>
              <button
                onClick={() => setActiveHistory(null)}
                style={{
                  background: '#1e293b',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#cbd5e1', marginBottom: '12px' }}>
                Snapshot Versions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {activeHistory.versions.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      background: '#131b2e',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>
                        Version {v.version}.0 — {v.examName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Published by {v.publishedByName} on {new Date(v.publishedAt).toLocaleString()}
                      </div>
                    </div>
                    <span
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}
                    >
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>

              {activeHistory.corrections.length > 0 && (
                <>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#cbd5e1', marginBottom: '12px' }}>
                    Post-Publish Errata Audit Logs
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeHistory.corrections.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          background: '#131b2e',
                          border: '1px solid rgba(234, 179, 8, 0.3)',
                          borderRadius: '8px',
                          padding: '12px 16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold', color: '#eab308' }}>
                            Correction Applied → v{c.version}.0
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
                          <strong>Reason: </strong> {c.reason}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Initiated by: {c.initiatedByName}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Post-Publish Official Errata Correction */}
      {correctingSnapshot && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #eab308',
              borderRadius: '12px',
              width: '650px',
              maxWidth: '95vw',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                padding: '16px 22px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>
                  Post-Publish Official Errata Correction
                </h2>
                <div style={{ fontSize: '12px', color: '#eab308', marginTop: '4px' }}>
                  Creates linked Version v{correctingSnapshot.version + 1}.0 without modifying historical student attempts.
                </div>
              </div>
              <button
                onClick={() => setCorrectingSnapshot(null)}
                style={{
                  background: '#1e293b',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '6px' }}>
                  Errata / Challenge Reason:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Official question challenge window update for Question 3"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0b0f19',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '6px' }}>
                  Select Target Question to Correct:
                </label>
                <select
                  value={selectedCorrectionQId}
                  onChange={(e) => setSelectedCorrectionQId(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0b0f19',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {correctingSnapshot.sections?.flatMap((s) => s.questions || []).map((q, idx) => (
                    <option key={q.id} value={q.id}>
                      Q{q.displayOrder || idx + 1}: {q.questionContent?.content?.substring(0, 60)}... ({q.questionType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '6px' }}>
                  Revised Correct Answer:
                </label>
                <input
                  type="text"
                  placeholder="e.g. opt_b or 42.5"
                  value={correctedAnswerValue}
                  onChange={(e) => setCorrectedAnswerValue(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0b0f19',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '6px' }}>
                  Errata Explanation:
                </label>
                <textarea
                  placeholder="Explanation of the errata and solution update..."
                  value={correctionExplanation}
                  onChange={(e) => setCorrectionExplanation(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    background: '#0b0f19',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={() => setCorrectingSnapshot(null)}
                  style={{
                    background: '#1e293b',
                    border: 'none',
                    color: '#94a3b8',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitCorrection}
                  disabled={correctionSubmitting}
                  style={{
                    background: '#eab308',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 18px',
                    fontWeight: 'bold',
                    cursor: correctionSubmitting ? 'not-allowed' : 'pointer',
                    opacity: correctionSubmitting ? 0.7 : 1,
                  }}
                >
                  {correctionSubmitting ? 'Publishing v' + (correctingSnapshot.version + 1) + '...' : `Publish v${correctingSnapshot.version + 1}.0 Errata`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamArchivePage;
