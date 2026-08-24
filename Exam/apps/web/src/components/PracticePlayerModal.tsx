import React, { useState } from 'react';
import { getAuthHeaders } from '../utils/api';
import {
  PracticePaperDTO,
  PracticeQuestionDTO,
  EvaluatePracticeResultDTO,
} from '@repo/types';

const API_BASE = 'http://localhost:4000/api/v1';

interface PracticePlayerModalProps {
  paper: PracticePaperDTO;
  questions: PracticeQuestionDTO[];
  activeAttemptId: string;
  token?: string;
  onClose: () => void;
  onSessionComplete: () => void;
}

export const PracticePlayerModal: React.FC<PracticePlayerModalProps> = ({
  paper,
  questions,
  activeAttemptId,
  token,
  onClose,
  onSessionComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [numericalAnswers, setNumericalAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, EvaluatePracticeResultDTO>>({});
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<any | null>(null);

  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  const currentEval = evaluations[currentQ.questionId];
  const isAnswered = Boolean(selectedAnswers[currentQ.questionId] || numericalAnswers[currentQ.questionId]);

  const handleSelectOption = (optionId: string) => {
    if (currentEval) return; // Prevent changing after check
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.questionId]: optionId }));
  };

  const handleNumericalChange = (val: string) => {
    if (currentEval) return;
    setNumericalAnswers((prev) => ({ ...prev, [currentQ.questionId]: val }));
  };

  const handleCheckAnswer = async () => {
    if (isChecking || currentEval) return;
    setIsChecking(true);
    try {
      const payload: any = {
        questionId: currentQ.questionId,
        selectedOption: selectedAnswers[currentQ.questionId],
        numericalAnswer: numericalAnswers[currentQ.questionId],
        timeSpentSeconds: 15,
      };

      const res = await fetch(`${API_BASE}/practice/${activeAttemptId}/answer`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setEvaluations((prev) => ({ ...prev, [currentQ.questionId]: json.data }));
      }
    } catch (err) {
      console.error('Failed to evaluate answer:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleFinishPractice = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/practice/${activeAttemptId}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(token),
      });
      const json = await res.json();
      if (json.success) {
        setSummaryData(json.data);
        setIsCompleted(true);
        onSessionComplete();
      }
    } catch (err) {
      console.error('Failed to submit practice:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'JetBrains Mono',
      }}
    >
      <div
        style={{
          background: 'var(--panel-bg, #111827)',
          border: '1px solid var(--border-color, #374151)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-color, #374151)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(59, 130, 246, 0.08)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚡</span>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #f9fafb)' }}>
                {paper.title || 'Personalized Practice Session'}
              </h2>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                }}
              >
                PRACTICE MODE
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
              Adaptive Weakness Targeting • 3 Consecutive Correct Answers to Master Concept
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #9ca3af)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {isCompleted ? (
          /* Completion Summary Screen */
          <div style={{ padding: '36px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', overflowY: 'auto' }}>
            <div style={{ fontSize: '48px' }}>🏆</div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main, #f9fafb)', margin: 0 }}>
                Practice Session Completed!
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted, #9ca3af)', marginTop: '6px' }}>
                Great work on targeting your weakness focus areas.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ padding: '16px 24px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#22c55e', textTransform: 'uppercase', fontWeight: 600 }}>Accuracy</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e', marginTop: '4px' }}>
                  {summaryData?.accuracyPercentage || 0}%
                </div>
              </div>
              <div style={{ padding: '16px 24px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#60a5fa', textTransform: 'uppercase', fontWeight: 600 }}>Questions Correct</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#60a5fa', marginTop: '4px' }}>
                  {summaryData?.correctCount || 0} / {summaryData?.totalAttempted || questions.length}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                marginTop: '12px',
                padding: '10px 24px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Return to Analytics Dashboard
            </button>
          </div>
        ) : (
          /* Interactive Practice Player Body */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Question Navigation Bar & Concept Streak */}
            <div
              style={{
                padding: '12px 24px',
                borderBottom: '1px solid var(--border-color, #374151)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.2)',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {questions.map((q, idx) => {
                  const ev = evaluations[q.questionId];
                  let btnBg = 'var(--border-color, #374151)';
                  let btnColor = 'var(--text-main, #f9fafb)';
                  if (ev) {
                    btnBg = ev.isCorrect ? '#22c55e' : '#ef4444';
                    btnColor = '#fff';
                  } else if (idx === currentIndex) {
                    btnBg = '#3b82f6';
                    btnColor = '#fff';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: btnBg,
                        color: btnColor,
                        border: idx === currentIndex ? '2px solid #60a5fa' : 'none',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Concept Adaptive Streak Tracker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                  Topic: <strong style={{ color: 'var(--text-main, #f9fafb)' }}>{currentQ.topicTitle || 'General'}</strong>
                </span>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background:
                      currentQ.difficulty === 'HARD'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : currentQ.difficulty === 'MEDIUM'
                        ? 'rgba(234, 179, 8, 0.2)'
                        : 'rgba(34, 197, 94, 0.2)',
                    color:
                      currentQ.difficulty === 'HARD'
                        ? '#ef4444'
                        : currentQ.difficulty === 'MEDIUM'
                        ? '#eab308'
                        : '#22c55e',
                  }}
                >
                  {currentQ.difficulty}
                </span>

                {currentEval && (
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: currentEval.isMastered ? 'rgba(34, 197, 94, 0.25)' : 'rgba(59, 130, 246, 0.2)',
                      color: currentEval.isMastered ? '#22c55e' : '#60a5fa',
                    }}
                  >
                    {currentEval.isMastered
                      ? '🌟 Concept Mastered!'
                      : `🔥 Streak: ${currentEval.consecutiveCorrect} / ${currentEval.masteryThreshold}`}
                  </span>
                )}
              </div>
            </div>

            {/* Question Card Container */}
            <div
              id="exam-question-card"
              style={{
                flex: 1,
                padding: '24px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#60a5fa' }}>
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                  Marks: +{currentQ.marks || 1} • Practice Mode
                </span>
              </div>

              {/* Question Statement */}
              <div
                style={{
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: 'var(--text-main, #f9fafb)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color, #374151)',
                }}
              >
                {currentQ.content}
              </div>

              {/* Options or Numerical Input */}
              {currentQ.options && currentQ.options.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentQ.options.map((opt) => {
                    const isSelected = selectedAnswers[currentQ.questionId] === opt.id;
                    let borderStyle = '1px solid var(--border-color, #374151)';
                    let bgStyle = 'var(--panel-bg, #111827)';

                    if (currentEval) {
                      if (String(currentEval.correctAnswer) === String(opt.id)) {
                        bgStyle = 'rgba(34, 197, 94, 0.15)';
                        borderStyle = '1px solid #22c55e';
                      } else if (isSelected && !currentEval.isCorrect) {
                        bgStyle = 'rgba(239, 68, 68, 0.15)';
                        borderStyle = '1px solid #ef4444';
                      }
                    } else if (isSelected) {
                      bgStyle = 'rgba(59, 130, 246, 0.15)';
                      borderStyle = '1px solid #3b82f6';
                    }

                    return (
                      <div
                        key={opt.id}
                        id={`practice-option-${opt.id}`}
                        data-testid="practice-option"
                        onClick={() => handleSelectOption(opt.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          background: bgStyle,
                          border: borderStyle,
                          cursor: currentEval ? 'default' : 'pointer',
                          transition: 'all 0.15s ease',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: isSelected ? '5px solid #3b82f6' : '2px solid var(--border-color, #4b5563)',
                            background: '#fff',
                          }}
                        />
                        <span style={{ fontSize: '14px', color: 'var(--text-main, #f9fafb)', flex: 1 }}>
                          {opt.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted, #9ca3af)', marginBottom: '8px' }}>
                    Enter Numerical Value:
                  </label>
                  <input
                    type="number"
                    value={numericalAnswers[currentQ.questionId] || ''}
                    onChange={(e) => handleNumericalChange(e.target.value)}
                    disabled={Boolean(currentEval)}
                    placeholder="Enter answer..."
                    style={{
                      width: '200px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #374151)',
                      background: 'var(--bg-color, #0f172a)',
                      color: 'var(--text-main, #f9fafb)',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '14px',
                    }}
                  />
                </div>
              )}

              {/* Immediate Feedback Alert */}
              {currentEval && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    background: currentEval.isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${currentEval.isCorrect ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: currentEval.isCorrect ? '#22c55e' : '#ef4444' }}>
                      {currentEval.isCorrect ? '✅ Correct Answer!' : '❌ Incorrect Answer'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                      Concept Streak: <strong>{currentEval.consecutiveCorrect}</strong> / {currentEval.masteryThreshold}
                      {currentEval.isMastered && ' 🎓 (Mastered!)'}
                    </span>
                  </div>
                  {currentEval.explanation && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted, #d1d5db)', marginTop: '4px', lineHeight: 1.5 }}>
                      <strong>Explanation:</strong> {currentEval.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-color, #374151)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.2)',
              }}
            >
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #374151)',
                    background: 'none',
                    color: 'var(--text-main, #f9fafb)',
                    cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentIndex === 0 ? 0.5 : 1,
                    fontSize: '13px',
                  }}
                >
                  ← Previous
                </button>

                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentIndex === questions.length - 1}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #374151)',
                    background: 'none',
                    color: 'var(--text-main, #f9fafb)',
                    cursor: currentIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: currentIndex === questions.length - 1 ? 0.5 : 1,
                    fontSize: '13px',
                  }}
                >
                  Next →
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {!currentEval && isAnswered && (
                  <button
                    id="practice-check-answer-btn"
                    onClick={handleCheckAnswer}
                    disabled={isChecking}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {isChecking ? 'Checking...' : 'Check Answer (Feedback)'}
                  </button>
                )}

                <button
                  onClick={handleFinishPractice}
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Finish Practice'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
