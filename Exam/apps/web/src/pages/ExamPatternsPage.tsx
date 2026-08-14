import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/I18nContext';

interface ExamPattern {
  id: string;
  name: string;
  courseId: string;
  courseName?: string;
  durationMinutes: number;
  description?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  type: 'SINGLE' | 'MULTI';
  totalMarks: number;
  version: number;
  sections?: Section[];
}

interface Section {
  id: string;
  name: string;
  sequenceOrder: number;
  numQuestions: number;
  marksPerQuestion: number;
  totalMarks: number;
  marksCorrect: number;
  marksWrong: number;
  marksUnattempted: number;
}

export const ExamPatternsPage: React.FC = () => {
  const { t } = useTranslation();
  const [patterns, setPatterns] = useState<ExamPattern[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPattern, setSelectedPattern] = useState<ExamPattern | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  // New Pattern Form State
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState('c1');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [type, setType] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [description, setDescription] = useState('');

  // New Section Form State
  const [secName, setSecName] = useState('Section A');
  const [numQuestions, setNumQuestions] = useState(10);
  const [marksPerQuestion, setMarksPerQuestion] = useState(2);

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/exam-patterns', {
        headers: { Authorization: 'Bearer mock_token' },
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

  const handleCreatePattern = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:4000/api/v1/exam-patterns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock_token',
        },
        body: JSON.stringify({
          name,
          courseId,
          durationMinutes,
          type,
          description,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setName('');
        fetchPatterns();
      }
    } catch (e) {
      console.error('Failed to create pattern', e);
    }
  };

  const handleAddSection = async (patternId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock_token',
        },
        body: JSON.stringify({
          name: secName,
          numQuestions,
          marksPerQuestion,
          marksCorrect: marksPerQuestion,
          marksWrong: -0.25 * marksPerQuestion,
        }),
      });
      if (res.ok) {
        const detailRes = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}`, {
          headers: { Authorization: 'Bearer mock_token' },
        });
        if (detailRes.ok) {
          const body = await detailRes.json();
          setSelectedPattern(body.data);
        }
      }
    } catch (e) {
      console.error('Failed to add section', e);
    }
  };

  const handleRunValidation = async (patternId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${patternId}/validate`, {
        method: 'POST',
        headers: { Authorization: 'Bearer mock_token' },
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'JetBrains Mono', fontSize: '20px' }}>
            {t('exam_patterns')} Management
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Define exam blueprints, sections, topic distributions, and negative marking schemes
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
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {patterns.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No exam patterns created yet. Click "+ Create Exam Pattern" to start.
                </td>
              </tr>
            ) : (
              patterns.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
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
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: p.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: p.status === 'PUBLISHED' ? '#10b981' : '#f59e0b',
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={async () => {
                        const res = await fetch(`http://localhost:4000/api/v1/exam-patterns/${p.id}`);
                        if (res.ok) {
                          const body = await res.json();
                          setSelectedPattern(body.data);
                        }
                      }}
                      style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Configure Sections
                    </button>
                    <button
                      onClick={() => handleRunValidation(p.id)}
                      style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      🧪 Validate Engine
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Pattern Section Builder */}
      {selectedPattern && (
        <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontFamily: 'JetBrains Mono' }}>
              Pattern Builder: {selectedPattern.name} ({selectedPattern.totalMarks} Total Marks)
            </h3>
            <button onClick={() => setSelectedPattern(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕ Close</button>
          </div>

          {/* Add Section Controls */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '6px' }}>
            <input
              placeholder="Section Name (e.g. Section A)"
              value={secName}
              onChange={(e) => setSecName(e.target.value)}
              style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
            />
            <input
              type="number"
              placeholder="Num Questions"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
              style={{ width: '120px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
            />
            <input
              type="number"
              placeholder="Marks Per Q"
              value={marksPerQuestion}
              onChange={(e) => setMarksPerQuestion(parseFloat(e.target.value))}
              style={{ width: '120px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '8px', borderRadius: '4px' }}
            />
            <button
              onClick={() => handleAddSection(selectedPattern.id)}
              style={{ background: 'var(--accent-color)', color: '#000', border: 'none', padding: '8px 16px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Add Section
            </button>
          </div>

          {/* Render Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedPattern.sections && selectedPattern.sections.length > 0 ? (
              selectedPattern.sections.map((sec, idx) => (
                <div key={sec.id} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                      {idx + 1}. {sec.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {sec.numQuestions} Questions × {sec.marksPerQuestion} Marks = <strong>{sec.totalMarks} Marks</strong> | Correct: +{sec.marksCorrect}, Wrong: {sec.marksWrong}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '12px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', padding: '4px 8px', borderRadius: '4px' }}>
                      Seq #{sec.sequenceOrder}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No sections added yet. Use form above to add sections.</div>
            )}
          </div>
        </div>
      )}

      {/* Validation Result Modal */}
      {showValidationModal && validationResult && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '500px' }}>
            <h3 style={{ marginTop: 0, fontFamily: 'JetBrains Mono', color: validationResult.isValid ? '#10b981' : '#ef4444' }}>
              {validationResult.isValid ? '✓ Exam Pattern Validation Passed' : '⚠️ Exam Pattern Validation Deficit'}
            </h3>
            <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
              {validationResult.isValid
                ? 'Sufficient questions exist in the Question Bank to fulfill all section rules.'
                : 'Question Bank deficit detected. See details below:'}
            </div>

            {validationResult.details && validationResult.details.map((d: any, i: number) => (
              <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '8px', fontSize: '12px' }}>
                <strong>{d.sectionName}</strong>: {d.availableCount} available / {d.requiredCount} required ({d.status})
              </div>
            ))}

            <button onClick={() => setShowValidationModal(false)} style={{ width: '100%', padding: '10px', background: 'var(--accent-color)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px' }}>
              Close Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
