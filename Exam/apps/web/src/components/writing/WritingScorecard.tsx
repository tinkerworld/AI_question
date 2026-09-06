import React from 'react';
import { WritingEvaluationResultDTO } from '@repo/types';
import { PremiumGuardrail } from '../entitlements/PremiumGuardrail';

interface WritingScorecardProps {
  result: WritingEvaluationResultDTO;
  isLocked?: boolean;
  onUpgrade?: () => void;
}

export const WritingScorecard: React.FC<WritingScorecardProps> = ({
  result,
  isLocked = false,
  onUpgrade,
}) => {
  return (
    <div
      data-testid="writing-scorecard"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* High-level score summary (Always Visible) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '16px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Writing Assessment Report</h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Evaluated against standard rubrics and word count compliance rules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Word Count</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: result.wordCountCompliant ? 'var(--text-main)' : '#ef4444' }}>
              {result.wordCount}
            </div>
            {!result.wordCountCompliant && (
              <span style={{ fontSize: '10px', color: '#ef4444' }}>Non-compliant length</span>
            )}
          </div>

          <div
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.15))',
              border: '1px solid #06b6d4',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 600 }}>OVERALL SCORE (BAND {result.band})</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#06b6d4' }}>
              {result.overallScore} / {result.maxScore}
            </div>
          </div>
        </div>
      </div>

      {/* General Summary */}
      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600 }}>Examiner Feedback</h4>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-main)' }}>
          {result.overallFeedback}
        </p>
      </div>

      {/* DETAILED CRITERIA BREAKDOWN - Protected by PremiumGuardrail */}
      <PremiumGuardrail
        featureKey="ai_writing_evaluation"
        requiredPlan="PREMIUM"
        isLocked={isLocked}
        title="Unlock In-Depth Rubric Breakdown"
        description="View granular criteria band scores (Grammar, Lexical Resource, Cohesion) and sentence-by-sentence improvement recommendations with a Premium subscription."
        onUpgrade={onUpgrade}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Criterion-by-Criterion Performance</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {(result.criteriaScores || []).map((c) => {
              const pct = Math.round((c.score / c.maxScore) * 100);
              return (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{c.name}</span>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#3b82f6' }}>
                      {c.score} / {c.maxScore}
                    </span>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: '3px' }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {c.feedback}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Grammar & Vocabulary Suggestions */}
          {result.vocabularySuggestions && result.vocabularySuggestions.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#10b981' }}>
                Lexical & Vocabulary Suggestions
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.7 }}>
                {result.vocabularySuggestions.map((v, idx) => (
                  <li key={idx}>
                    Replace <strong>"{v.word}"</strong> with <strong>"{v.betterAlternative}"</strong> ({v.context})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.grammarFeedback && result.grammarFeedback.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#3b82f6' }}>
                Grammar & Syntax Feedback
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.7 }}>
                {result.grammarFeedback.map((g, idx) => (
                  <li key={idx}>
                    <em>"{g.quote}"</em>: {g.issue} &rarr; <strong>{g.suggestion}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PremiumGuardrail>
    </div>
  );
};
