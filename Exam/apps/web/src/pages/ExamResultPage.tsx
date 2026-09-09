import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/I18nContext';
import { WritingScorecard } from '../components/writing/WritingScorecard';
import { ExamAudioPlayer } from '../components/listening/ExamAudioPlayer';
import { API_BASE } from '../config/api';

interface QuestionReviewItem {
  id: string;
  questionId: string;
  examSectionId: string;
  sectionName: string;
  sequenceOrder: number;
  type: string;
  content: string;
  difficulty: string;
  marks: number;
  marksCorrect: number;
  marksWrong: number;
  options?: { id: string; text: string }[];
  studentAnswer: any;
  isMarkedForReview: boolean;
  timeSpentSeconds: number;
  isCorrect: boolean | null;
  marksAwarded: number;
  correctAnswer: any;
  explanation: string;
  evaluatorComments?: string;
  audioUrl?: string;
  speechText?: string;
  subQuestions?: any[];
  writingEvaluation?: any;
}

interface SectionScore {
  sectionId: string;
  sectionName: string;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  maxScore: number;
}

interface AttemptResultData {
  attemptId: string;
  examId: string;
  examName: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  timeSpentSeconds: number;
  status: string;
  totalScore: number;
  maxMarks: number;
  percentage: number;
  accuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  isFlagged: boolean;
  flagReason: string | null;
  sectionScores: SectionScore[];
  questions: QuestionReviewItem[];
}

interface ExamResultPageProps {
  attemptId: string;
  onBack: () => void;
}

export const ExamResultPage: React.FC<ExamResultPageProps> = ({ attemptId, onBack }) => {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [result, setResult] = useState<AttemptResultData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Review Filter
  const [filter, setFilter] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'UNATTEMPTED'>('ALL');

  // Flag Modal State
  const [showFlagModal, setShowFlagModal] = useState<boolean>(false);
  const [flagReason, setFlagReason] = useState<string>('');
  const [flagging, setFlagging] = useState<boolean>(false);
  const [flagSuccessMessage, setFlagSuccessMessage] = useState<string | null>(null);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/attempts/${attemptId}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(data.message || 'Failed to retrieve examination results');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching scorecard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [attemptId, token]);

  const handleFlagResult = async () => {
    if (!flagReason.trim()) return;
    setFlagging(true);
    try {
      const res = await fetch(`${API_BASE}/attempts/${attemptId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: flagReason }),
      });
      const data = await res.json();
      if (data.success) {
        setShowFlagModal(false);
        setFlagSuccessMessage('Your response has been flagged and submitted to faculty for review.');
        fetchResults();
      } else {
        alert(data.message || 'Failed to flag result');
      }
    } catch (err: any) {
      alert(err.message || 'Network error submitting flag');
    } finally {
      setFlagging(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '3px solid rgba(6, 182, 212, 0.2)',
            borderTopColor: '#06b6d4',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 14px',
          }}
        />
        {t('computing_scorecard')}
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <h3 style={{ color: '#ef4444' }}>{t('result_not_available')}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{error || 'Unable to load attempt results'}</p>
        <button
          onClick={onBack}
          style={{
            marginTop: '16px',
            padding: '8px 18px',
            background: 'var(--accent-color)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {t('return_to_assessments')}
        </button>
      </div>
    );
  }

  const isUnanswered = (ans: any) => {
    if (ans === null || ans === undefined || ans === '' || ans === 'null') return true;
    if (Array.isArray(ans) && ans.length === 0) return true;
    return false;
  };

  const filteredQuestions = result.questions.filter((q) => {
    if (filter === 'CORRECT') return q.isCorrect === true;
    if (filter === 'WRONG') return q.isCorrect === false;
    if (filter === 'UNATTEMPTED') return isUnanswered(q.studentAnswer);
    return true;
  });

  return (
    <div style={{ padding: '28px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div>
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-color)',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
              marginBottom: '8px',
            }}
          >
            ◀ {t('back_to_my_exams')}
          </button>
          <h1 style={{ margin: 0, fontSize: '22px', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
            {result.examName} — {t('scorecard_solution_analysis')}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            {t('completed_on')} {new Date(result.endTime).toLocaleString()} • {t('duration_label')}: {formatDuration(result.timeSpentSeconds)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {result.isFlagged ? (
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid #f59e0b',
                color: '#f59e0b',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🚩 {t('flagged_for_review')}
            </span>
          ) : (
            <button
              onClick={() => setShowFlagModal(true)}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🚩 {t('flag_dispute_result')}
            </button>
          )}
        </div>
      </div>

      {flagSuccessMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#10b981',
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          ✓ {flagSuccessMessage}
        </div>
      )}

      {/* Hero Scorecard Overview Card */}
      <div
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', textAlign: 'center' }}>
          <div style={{ borderRight: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '4px' }}>
              {t('total_score')}
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-color)', fontFamily: 'JetBrains Mono' }}>
              {result.totalScore}
              <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}> / {result.maxMarks}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
              {result.percentage}% Marks
            </div>
          </div>

          <div style={{ borderRight: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '4px' }}>
              {t('accuracy')}
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', fontFamily: 'JetBrains Mono' }}>
              {result.accuracy}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {result.correctAnswers} of {result.correctAnswers + result.wrongAnswers} attempted
            </div>
          </div>

          <div style={{ borderRight: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '4px' }}>
              {t('correct_answers')}
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', fontFamily: 'JetBrains Mono' }}>
              {result.correctAnswers}
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
              +{result.correctAnswers * 4} {t('marks_gained')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '4px' }}>
              {t('incorrect_negative')}
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444', fontFamily: 'JetBrains Mono' }}>
              {result.wrongAnswers}
            </div>
            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
              -{result.wrongAnswers * 1} {t('penalty_marks')}
            </div>
          </div>
        </div>
      </div>

      {/* Section-Wise Breakdown Table */}
      <div
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '28px',
        }}
      >
        <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
          {t('section_performance')}
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.02)' }}>
              <th style={{ padding: '10px' }}>{t('section_name')}</th>
              <th style={{ padding: '10px' }}>{t('total_questions')}</th>
              <th style={{ padding: '10px' }}>{t('attempted')}</th>
              <th style={{ padding: '10px' }}>{t('correct')}</th>
              <th style={{ padding: '10px' }}>{t('wrong')}</th>
              <th style={{ padding: '10px' }}>{t('score_obtained')}</th>
            </tr>
          </thead>
          <tbody>
            {result.sectionScores.map((sec) => (
              <tr key={sec.sectionId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px', color: 'var(--text-main)', fontWeight: 'bold' }}>{sec.sectionName}</td>
                <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{sec.totalQuestions}</td>
                <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{sec.attemptedCount}</td>
                <td style={{ padding: '10px', color: '#10b981' }}>{sec.correctCount}</td>
                <td style={{ padding: '10px', color: '#ef4444' }}>{sec.wrongCount}</td>
                <td style={{ padding: '10px', color: 'var(--accent-color)', fontWeight: 'bold', fontFamily: 'JetBrains Mono' }}>
                  {sec.score} / {sec.maxScore}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Solutions & Explanations Review Section */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
            {t('solution_review')}
          </h3>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['ALL', 'CORRECT', 'WRONG', 'UNATTEMPTED'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: filter === mode ? 'var(--accent-color)' : 'var(--panel-bg)',
                  border: filter === mode ? 'none' : '1px solid var(--border-color)',
                  color: filter === mode ? '#fff' : 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: filter === mode ? 'bold' : 'normal',
                }}
              >
                {mode === 'ALL' ? `${t('all')} (${result.questions.length})` : mode === 'CORRECT' ? `${t('correct')} (${result.correctAnswers})` : mode === 'WRONG' ? `${t('wrong')} (${result.wrongAnswers})` : `${t('unattempted')} (${result.unattempted})`}
              </button>
            ))}
          </div>
        </div>

        {/* Questions Review List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredQuestions.map((q, idx) => {
            const isUnanswered = q.studentAnswer === null || q.studentAnswer === undefined || q.studentAnswer === '';

            return (
              <div
                key={q.id}
                style={{
                  background: 'var(--panel-bg)',
                  border: `1px solid ${q.isCorrect === true ? 'rgba(16, 185, 129, 0.3)' : q.isCorrect === false ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}`,
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                {/* Question Review Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
                      {t('question_num')} #{q.sequenceOrder}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                      {q.sectionName}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                      {q.type}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono',
                      fontWeight: 'bold',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: q.marksAwarded > 0 ? 'rgba(16, 185, 129, 0.15)' : q.marksAwarded < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: q.marksAwarded > 0 ? '#10b981' : q.marksAwarded < 0 ? '#ef4444' : 'var(--text-muted)',
                    }}
                  >
                    {t('marks_awarded')}: {q.marksAwarded > 0 ? `+${q.marksAwarded}` : q.marksAwarded}
                  </span>
                </div>

                {/* Statement */}
                <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-main)', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
                  {q.content}
                </div>

                {/* Options Review (for MCQ / Multi-select) */}
                {q.options && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    {q.options.map((opt) => {
                      const isStudentChoice =
                        q.studentAnswer === opt.id || (Array.isArray(q.studentAnswer) && q.studentAnswer.includes(opt.id));
                      const isCorrectChoice =
                        q.correctAnswer === opt.id || (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.id));

                      let border = '1px solid var(--border-color)';
                      let bg = 'transparent';
                      let icon = '';

                      if (isCorrectChoice) {
                        border = '1px solid #10b981';
                        bg = 'rgba(16, 185, 129, 0.1)';
                        icon = ` ✓ (${t('correct_choice_label')})`;
                      }
                      if (isStudentChoice && !isCorrectChoice) {
                        border = '1px solid #ef4444';
                        bg = 'rgba(239, 68, 68, 0.1)';
                        icon = ` ✗ (${t('your_choice_label')})`;
                      } else if (isStudentChoice && isCorrectChoice) {
                        icon = ` ✓ (${t('your_choice_label')} - ${t('correct')})`;
                      }

                      return (
                        <div
                          key={opt.id}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border,
                            background: bg,
                            fontSize: '13px',
                            color: isCorrectChoice ? '#10b981' : isStudentChoice ? '#ef4444' : 'var(--text-muted)',
                          }}
                        >
                          <strong>{opt.text}</strong>
                          <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{icon}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Non-MCQ Answer Summary */}
                {!q.options && q.type !== 'WRITING' && q.type !== 'LISTENING' && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', marginBottom: '14px', fontSize: '13px' }}>
                    <div>{t('your_choice_label')}: <strong style={{ color: isUnanswered ? 'var(--text-muted)' : q.isCorrect ? '#10b981' : '#ef4444' }}>{isUnanswered ? t('unattempted') : JSON.stringify(q.studentAnswer)}</strong></div>
                    <div style={{ marginTop: '4px' }}>{t('correct_choice_label')}: <strong style={{ color: '#10b981' }}>{JSON.stringify(q.correctAnswer)}</strong></div>
                  </div>
                )}

                {/* LISTENING Passage & Sub-Questions Review */}
                {q.type === 'LISTENING' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                    <ExamAudioPlayer
                      audioUrl={q.audioUrl || (q as any).data?.audioUrl}
                      speechText={q.speechText || (q as any).data?.speechText || (q as any).data?.audioScript}
                      allowTranscript={true}
                    />
                    {Array.isArray(q.subQuestions) && q.subQuestions.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{t('comprehension_questions')}:</strong>
                        {q.subQuestions.map((sq: any, sIdx: number) => {
                          const stuAns = q.studentAnswer ? q.studentAnswer[sq.id] : undefined;
                          let correctKey = sq.correctOptionId || sq.blankKey;
                          if (sq.type === 'MCQ' && sq.options) {
                            const correctOpt = sq.options.find((o: any) => o.id === sq.correctOptionId);
                            if (correctOpt) correctKey = `${correctOpt.text} (${correctOpt.id})`;
                          }
                          const isSqCorrect = stuAns !== undefined && String(stuAns).trim().toLowerCase() === String(sq.correctOptionId || sq.blankKey || '').trim().toLowerCase();

                          return (
                            <div key={sq.id || sIdx} style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                                {sIdx + 1}. {sq.prompt} ({sq.marks} marks)
                              </div>
                              <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                                <span>{t('your_choice_label')}: <strong style={{ color: isSqCorrect ? '#10b981' : '#ef4444' }}>{stuAns ? String(stuAns) : t('unattempted')}</strong></span>
                                <span>{t('correct_choice_label')}: <strong style={{ color: '#10b981' }}>{correctKey}</strong></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* WRITING Scorecard Review */}
                {q.type === 'WRITING' && q.writingEvaluation && (
                  <div style={{ marginBottom: '16px' }}>
                    <WritingScorecard result={q.writingEvaluation} isLocked={false} />
                  </div>
                )}

                {/* Step-by-Step Explanation Box */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'rgba(6, 182, 212, 0.05)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    fontSize: '13px',
                    lineHeight: '1.5',
                  }}
                >
                  <strong style={{ color: '#06b6d4' }}>{t('explanation')}:</strong>
                  <div style={{ color: 'var(--text-main)', marginTop: '4px' }}>
                    {q.explanation}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flag / Dispute Modal */}
      {showFlagModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', color: 'var(--text-main)', fontFamily: 'JetBrains Mono' }}>
              {t('flag_dispute_result')}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5', margin: '0 0 16px' }}>
              {t('flag_dispute_desc')}
            </p>

            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder={t('flag_dispute_placeholder')}
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                fontSize: '13px',
                boxSizing: 'border-box',
                marginBottom: '20px',
                fontFamily: 'inherit',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                disabled={flagging}
                onClick={() => setShowFlagModal(false)}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {t('cancel')}
              </button>
              <button
                disabled={flagging || !flagReason.trim()}
                onClick={handleFlagResult}
                style={{
                  padding: '8px 18px',
                  background: '#f59e0b',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: flagging || !flagReason.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >
                {flagging ? t('submitting_flag') : t('submit_flag')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
