import React, { useState, useRef } from 'react';
import {
  WritingEvaluationResultDTO,
  WritingGrammarCorrectionDTO,
  WritingVocabularySuggestionDTO,
  WritingErrorAnnotationDTO,
  WritingCheckItemDTO,
} from '@repo/types';
import { PremiumGuardrail } from '../entitlements/PremiumGuardrail';
import { useTranslation } from '../../context/I18nContext';

interface WritingScorecardProps {
  result: WritingEvaluationResultDTO;
  isLocked?: boolean;
  onUpgrade?: () => void;
  essayText?: string;
}

interface HighlightSpan {
  id: string;
  start: number;
  end: number;
  type: 'CRITERION_QUOTE' | 'GRAMMAR_ERROR' | 'GRAMMAR_STYLE' | 'VOCABULARY';
  label: string;
  criterionName?: string;
  tooltip: string;
}

export const WritingScorecard: React.FC<WritingScorecardProps> = ({
  result,
  isLocked = false,
  onUpgrade,
  essayText,
}) => {
  const { t } = useTranslation();
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'major' | 'moderate' | 'minor'>('all');
  const essayContainerRef = useRef<HTMLDivElement>(null);
  const feedbackContainerRef = useRef<HTMLDivElement>(null);

  const rawText = essayText || result.submittedText || '';
  const taskType = result.taskType || 'TASK_2';
  const minWords = taskType === 'TASK_1' ? 150 : 250;
  const isWordCountCompliant = result.wordCount >= minWords;

  // Build highlights from criteria quotes, grammar corrections, and vocabulary suggestions
  const highlightSpans: HighlightSpan[] = [];

  // 1. Criteria supporting quotes
  if (result.criteriaScores && rawText) {
    result.criteriaScores.forEach((criterion, cIdx) => {
      (criterion.supportingQuotations || []).forEach((quote, qIdx) => {
        if (!quote || quote.trim().length < 3) return;
        let searchIndex = 0;
        const cleanQuote = quote.trim();
        const foundPos = rawText.indexOf(cleanQuote, searchIndex);
        if (foundPos !== -1) {
          highlightSpans.push({
            id: `crit_${cIdx}_${qIdx}`,
            start: foundPos,
            end: foundPos + cleanQuote.length,
            type: 'CRITERION_QUOTE',
            label: criterion.name,
            criterionName: criterion.name,
            tooltip: `Evidence for ${criterion.name}: "${cleanQuote}"`,
          });
        }
      });
    });
  }

  // 2. Grammar feedback
  const grammarItems: WritingGrammarCorrectionDTO[] = result.grammarCorrections || result.grammarFeedback || [];
  if (grammarItems.length > 0 && rawText) {
    grammarItems.forEach((g, gIdx) => {
      if (!g.quote || g.quote.trim().length === 0) return;
      let start = g.startOffset;
      let end = g.endOffset;
      if (start === undefined || end === undefined || start < 0) {
        const foundPos = rawText.indexOf(g.quote.trim());
        if (foundPos !== -1) {
          start = foundPos;
          end = foundPos + g.quote.trim().length;
        }
      }
      if (start !== undefined && end !== undefined && start >= 0 && end <= rawText.length) {
        highlightSpans.push({
          id: `grammar_${gIdx}`,
          start,
          end,
          type: g.isGenuineError ? 'GRAMMAR_ERROR' : 'GRAMMAR_STYLE',
          label: g.isGenuineError ? 'Grammar Error' : 'Stylistic Choice',
          tooltip: `${g.issue} → Suggestion: ${g.suggestion}`,
        });
      }
    });
  }

  // 3. Vocabulary suggestions
  const vocabItems: WritingVocabularySuggestionDTO[] = result.vocabularySuggestions || [];
  if (vocabItems.length > 0 && rawText) {
    vocabItems.forEach((v, vIdx) => {
      const target = v.quote || v.word;
      if (!target || target.trim().length === 0) return;
      let start = v.startOffset;
      let end = v.endOffset;
      if (start === undefined || end === undefined || start < 0) {
        const foundPos = rawText.indexOf(target.trim());
        if (foundPos !== -1) {
          start = foundPos;
          end = foundPos + target.trim().length;
        }
      }
      if (start !== undefined && end !== undefined && start >= 0 && end <= rawText.length) {
        highlightSpans.push({
          id: `vocab_${vIdx}`,
          start,
          end,
          type: 'VOCABULARY',
          label: 'Vocab Upgrade',
          tooltip: `Upgrade "${v.word}" → "${v.betterAlternative}" (${v.context})`,
        });
      }
    });
  }

  // 4. Structured Error Annotations
  const annotations: WritingErrorAnnotationDTO[] = result.annotations || [];
  if (annotations.length > 0 && rawText) {
    annotations.forEach((ann, aIdx) => {
      let start = ann.startOffset;
      let end = ann.endOffset;
      const targetQuote = ann.quote || ann.original;
      const targetSuggestion = ann.suggestedRevision || ann.correction;
      if (start === undefined || end === undefined || start < 0) {
        if (targetQuote) {
          const foundPos = rawText.indexOf(targetQuote.trim());
          if (foundPos !== -1) {
            start = foundPos;
            end = foundPos + targetQuote.trim().length;
          }
        }
      }
      if (start !== undefined && end !== undefined && start >= 0 && end <= rawText.length) {
        highlightSpans.push({
          id: `ann_${aIdx}`,
          start,
          end,
          type: ann.severity === 'critical' || ann.severity === 'major' ? 'GRAMMAR_ERROR' : 'GRAMMAR_STYLE',
          label: `${ann.subcategory} (${ann.severity})`,
          tooltip: `[${ann.severity.toUpperCase()}] ${ann.subcategory}: ${ann.explanation} → Suggestion: ${targetSuggestion}`,
        });
      }
    });
  }

  // Sort and remove overlap for rendering
  highlightSpans.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const nonOverlappingHighlights: HighlightSpan[] = [];
  let lastEnd = 0;
  for (const span of highlightSpans) {
    if (span.start >= lastEnd && span.end <= rawText.length) {
      nonOverlappingHighlights.push(span);
      lastEnd = span.end;
    }
  }

  const handleSelectHighlight = (id: string) => {
    setSelectedHighlightId(id);
    const element = document.getElementById(`highlight_text_${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const card = document.getElementById(`card_${id}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const renderHighlightedEssay = () => {
    if (!rawText) return null;
    if (nonOverlappingHighlights.length === 0) {
      return <span>{rawText}</span>;
    }

    const elements: React.ReactNode[] = [];
    let currentIdx = 0;

    nonOverlappingHighlights.forEach((span) => {
      if (span.start > currentIdx) {
        elements.push(
          <span key={`plain_${currentIdx}`}>
            {rawText.substring(currentIdx, span.start)}
          </span>
        );
      }

      const isSelected = selectedHighlightId === span.id;
      let bgColor = 'rgba(234, 179, 8, 0.2)'; // amber for quotes
      let borderColor = '#eab308';
      let textColor = 'inherit';

      if (span.type === 'GRAMMAR_ERROR') {
        bgColor = isSelected ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.2)';
        borderColor = '#ef4444';
      } else if (span.type === 'GRAMMAR_STYLE') {
        bgColor = isSelected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.2)';
        borderColor = '#3b82f6';
      } else if (span.type === 'VOCABULARY') {
        bgColor = isSelected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.2)';
        borderColor = '#10b981';
      } else if (isSelected) {
        bgColor = 'rgba(234, 179, 8, 0.45)';
      }

      elements.push(
        <mark
          id={`highlight_text_${span.id}`}
          key={span.id}
          onClick={() => handleSelectHighlight(span.id)}
          title={span.tooltip}
          style={{
            background: bgColor,
            borderBottom: `2px solid ${borderColor}`,
            padding: '1px 3px',
            borderRadius: '3px',
            cursor: 'pointer',
            transition: 'background 0.2s',
            boxShadow: isSelected ? `0 0 0 2px ${borderColor}` : 'none',
            color: textColor,
          }}
        >
          {rawText.substring(span.start, span.end)}
        </mark>
      );

      currentIdx = span.end;
    });

    if (currentIdx < rawText.length) {
      elements.push(
        <span key={`plain_end`}>{rawText.substring(currentIdx)}</span>
      );
    }

    return elements;
  };

  const isTeacherReviewed = Boolean(result.teacherReviewed);
  const isFlaggedForReview =
    result.status === 'REVIEW_REQUIRED' ||
    result.reliabilityStatus === 'FLAGGED_FOR_REVIEW' ||
    Boolean(result.reviewReasons && result.reviewReasons.length > 0);

  const missingChartFacts =
    result.reviewReasons?.some((r) => r.toLowerCase().includes('visual') || r.toLowerCase().includes('chart')) || false;

  return (
    <div
      data-testid="writing-scorecard"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* 1. Official Estimation Banner & Notice */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '8px',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🎯</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#3b82f6' }}>
              {result.bandLabel || 'Estimated IELTS band'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Band score estimates are indicative and subject to official human examiner confirmation.
            </div>
          </div>
        </div>

        {/* Task Type badge */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-color)',
            }}
          >
            {taskType === 'TASK_1' ? 'Task 1 (Academic)' : 'Task 2 (Essay)'}
          </span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              background: isWordCountCompliant ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isWordCountCompliant ? '#10b981' : '#ef4444',
              border: `1px solid ${isWordCountCompliant ? '#10b981' : '#ef4444'}`,
            }}
          >
            {isWordCountCompliant ? 'Length Met' : `Under Length (<${minWords})`}
          </span>
        </div>
      </div>

      {/* 2. Review Status Banners */}
      {isTeacherReviewed ? (
        <div
          data-testid="teacher-verified-banner"
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10b981',
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✓</span> Verified by Human Teacher
            </div>
            {result.teacherReviewedAt && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {new Date(result.teacherReviewedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {result.teacherNotes && (
            <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-main)' }}>
              Teacher Note: "{result.teacherNotes}"
            </div>
          )}
        </div>
      ) : result.status === 'FAILED' ? (
        <div
          data-testid="evaluation-failed-banner"
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span> Evaluation Routed to Human Teacher Review
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Automated grading could not be completed with certified confidence. Your submission has been securely preserved and assigned to a certified instructor. No marks have been finalized or deducted.
          </div>
        </div>
      ) : isFlaggedForReview ? (
        <div
          data-testid="review-required-banner"
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span> This evaluation has been flagged for human teacher review. Scores are provisional.
          </div>
          {missingChartFacts ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Task Achievement is provisional because visual stimulus data could not be fully verified.
            </div>
          ) : (
            result.reviewReasons && result.reviewReasons.length > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Reason: {result.reviewReasons.join('; ')}
              </div>
            )
          )}
        </div>
      ) : null}

      {/* 2b. Complete Examiner Criteria Priority & Next Band Target */}
      {(result.mainPriority || result.nextBandTarget) && (
        <div
          data-testid="main-priority-banner"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {result.mainPriority && (
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Key Examiner Priority
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                {result.mainPriority}
              </div>
            </div>
          )}
          {result.nextBandTarget && (
            <div
              style={{
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid #a855f7',
                borderRadius: '6px',
                padding: '6px 14px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase' }}>
                Target Band
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#a855f7' }}>
                {result.nextBandTarget}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. High-level score summary & Statistics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '20px',
        }}
      >
        {/* Band Card */}
        <div
          style={{
            padding: '16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(139, 92, 246, 0.12))',
            border: '1px solid #06b6d4',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 700, letterSpacing: '0.05em' }}>
            {t('overall_band', 'ESTIMATED BAND')}
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#06b6d4', margin: '4px 0' }}>
            {result.band}
          </div>
          {isTeacherReviewed && result.latestTeacherScore !== undefined && (
            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
              Teacher Score: Band {result.latestTeacherScore}
            </div>
          )}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Criterion Average: {result.rawAverageScore !== undefined ? Number(result.rawAverageScore).toFixed(2) : Number(result.overallScore).toFixed(2)} / {result.maxScore || 9}
          </div>
        </div>

        {/* Word Count & Length stats */}
        <div
          style={{
            padding: '16px',
            borderRadius: '10px',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              {t('word_count', 'Word Count')}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: isWordCountCompliant ? '#10b981' : '#ef4444',
              }}
            >
              {result.wordCount} / {minWords} min
            </span>
          </div>
          <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.round((result.wordCount / minWords) * 100))}%`,
                background: isWordCountCompliant ? '#10b981' : '#ef4444',
                borderRadius: '3px',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Sentences: {result.textStats?.sentenceCount ?? result.sentenceCount ?? 0}</span>
            <span>Paragraphs: {result.textStats?.paragraphCount ?? result.paragraphCount ?? 0}</span>
          </div>
        </div>

        {/* Error-Free Sentence Metrics */}
        {result.errorFreeSentenceMetrics && (
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Error-Free Sentences
              </div>
              {result.errorFreeSentenceMetrics.isConfident === false && (
                <span
                  title={result.errorFreeSentenceMetrics.uncertaintyReason || 'Provisional metric; heuristic checks cannot guarantee 100% error-free language.'}
                  style={{
                    fontSize: '10px',
                    color: '#f59e0b',
                    background: 'rgba(245, 158, 11, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    cursor: 'help',
                    fontWeight: 600,
                  }}
                >
                  Provisional*
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color:
                  result.errorFreeSentenceMetrics.isConfident === false
                    ? '#f59e0b'
                    : result.errorFreeSentenceMetrics.percentage >= 65
                    ? '#10b981'
                    : result.errorFreeSentenceMetrics.percentage >= 45
                    ? '#f59e0b'
                    : '#ef4444',
              }}
            >
              {result.errorFreeSentenceMetrics.isConfident === false
                ? `${result.errorFreeSentenceMetrics.percentage}%*`
                : `${result.errorFreeSentenceMetrics.percentage}%`}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {result.errorFreeSentenceMetrics.errorFreeCount} of {result.errorFreeSentenceMetrics.totalSentences} sentences error-free
            </div>
            {result.errorFreeSentenceMetrics.isConfident === false && (
              <div style={{ fontSize: '10px', color: '#f59e0b', fontStyle: 'italic', marginTop: '2px' }}>
                *Provisional: Certified examiner review required to confirm.
              </div>
            )}
          </div>
        )}

        {/* Text Quality Metrics */}
        {result.textStats && (
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-around',
              gap: '4px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Text Statistics
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span>Avg Sentence Length:</span>
              <strong>{result.textStats.avgSentenceLength} words</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span>Vocab Diversity (TTR):</span>
              <strong>{(result.textStats.vocabularyDiversity * 100).toFixed(0)}%</strong>
            </div>
          </div>
        )}
      </div>

      {/* 4. Interactive Student Essay with Quotation & Error Highlighting */}
      {rawText && (
        <div
          ref={essayContainerRef}
          style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Interactive Evidence & Essay View
            </h4>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: 'rgba(234, 179, 8, 0.4)', border: '1px solid #eab308', borderRadius: '2px' }} />
                Criterion Evidence
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: 'rgba(239, 68, 68, 0.4)', border: '1px solid #ef4444', borderRadius: '2px' }} />
                Grammar Error
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: 'rgba(59, 130, 246, 0.4)', border: '1px solid #3b82f6', borderRadius: '2px' }} />
                Style Recommendation
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: 'rgba(16, 185, 129, 0.4)', border: '1px solid #10b981', borderRadius: '2px' }} />
                Vocabulary Suggestion
              </span>
            </div>
          </div>

          <div
            style={{
              fontSize: '13px',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
              padding: '14px',
              borderRadius: '8px',
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              maxHeight: '320px',
              overflowY: 'auto',
              fontFamily: 'inherit',
            }}
          >
            {renderHighlightedEssay()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            💡 Tip: Click on any highlighted phrase above or a card below to focus and cross-reference evidence.
          </div>
        </div>
      )}

      {/* 5. General Examiner Summary */}
      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600 }}>{t('examiner_feedback', 'Examiner Feedback')}</h4>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-main)' }}>
          {result.overallFeedback}
        </p>
      </div>

      {/* 6. DETAILED 4 IELTS CRITERIA BREAKDOWN */}
      <PremiumGuardrail
        featureKey="ai_writing_evaluation"
        requiredPlan="PREMIUM"
        isLocked={isLocked}
        title="Unlock In-Depth Rubric Breakdown"
        description="View granular criteria band scores (Grammar, Lexical Resource, Cohesion) and sentence-by-sentence improvement recommendations with a Premium subscription."
        onUpgrade={onUpgrade}
      >
        <div ref={feedbackContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
              {t('evaluation_criteria', 'Official 4-Criteria Performance')}
            </h4>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Official IELTS Rubric (0.0 - 9.0)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {(result.criteriaScores || []).map((c, cIdx) => {
              const pct = Math.round((c.score / c.maxScore) * 100);
              const isTaskCriterion = c.id === 'task_achievement' || c.id === 'task_response';
              const isProvisional = isTaskCriterion && missingChartFacts;

              return (
                <div
                  key={c.id || cIdx}
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>{c.name}</span>
                      {isProvisional && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: '10px',
                            color: '#f59e0b',
                            fontWeight: 600,
                          }}
                        >
                          ⚠️ Provisional score
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '14px',
                        color: '#3b82f6',
                        background: 'rgba(59, 130, 246, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      Band {c.score}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: '3px' }} />
                  </div>

                  {/* Explanation */}
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                    {c.explanation || c.feedback}
                  </p>

                  {/* Supporting Quotations */}
                  {c.supportingQuotations && c.supportingQuotations.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Quotation Evidence:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {c.supportingQuotations.map((quote, qIdx) => {
                          const highlightId = `crit_${cIdx}_${qIdx}`;
                          const isSelected = selectedHighlightId === highlightId;
                          return (
                            <button
                              key={qIdx}
                              onClick={() => handleSelectHighlight(highlightId)}
                              style={{
                                background: isSelected ? 'rgba(234, 179, 8, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${isSelected ? '#eab308' : 'var(--border-color)'}`,
                                borderRadius: '4px',
                                padding: '3px 6px',
                                fontSize: '11px',
                                color: 'var(--text-main)',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              "{quote.length > 40 ? quote.substring(0, 37) + '...' : quote}"
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* What would improve */}
                  {c.whatWouldImprove && (
                    <div
                      style={{
                        background: 'rgba(59, 130, 246, 0.06)',
                        borderLeft: '3px solid #3b82f6',
                        padding: '6px 8px',
                        borderRadius: '0 4px 4px 0',
                        fontSize: '11px',
                        color: 'var(--text-main)',
                      }}
                    >
                      <strong>How to reach higher band:</strong> {c.whatWouldImprove}
                    </div>
                  )}

                  {/* Detailed Descriptor Checklist */}
                  {result.detailedChecks && result.detailedChecks[c.id] && result.detailedChecks[c.id].length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Descriptor Checklist:
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {result.detailedChecks[c.id].map((chk, chkIdx) => {
                          const statusIcon = chk.status === 'met' ? '✓' : chk.status === 'partially_met' ? '⚠️' : chk.status === 'not_met' ? '✗' : '—';
                          const statusColor = chk.status === 'met' ? '#10b981' : chk.status === 'partially_met' ? '#f59e0b' : chk.status === 'not_met' ? '#ef4444' : 'var(--text-muted)';
                          return (
                            <div key={chkIdx} style={{ fontSize: '11px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                              <span style={{ color: statusColor, fontWeight: 700, minWidth: '14px' }}>{statusIcon}</span>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{chk.name}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{chk.explanation}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detailed Error Annotations & Diagnostics with Severity Filter */}
          {annotations.length > 0 && (
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>
                  Detailed Error Annotations & Diagnostics ({annotations.length})
                </h4>
                {/* Severity Filter Buttons */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(['all', 'critical', 'major', 'moderate', 'minor'] as const).map((sev) => {
                    const count = sev === 'all' ? annotations.length : annotations.filter((a) => a.severity === sev).length;
                    const isSelected = severityFilter === sev;
                    return (
                      <button
                        key={sev}
                        onClick={() => setSeverityFilter(sev)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${isSelected ? '#ef4444' : 'var(--border-color)'}`,
                          color: isSelected ? '#ef4444' : 'var(--text-main)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {sev} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtered Annotations List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {annotations
                  .filter((a) => severityFilter === 'all' || a.severity === severityFilter)
                  .map((ann, idx) => {
                    const cardId = `card_ann_${idx}`;
                    const isSelected = selectedHighlightId === `ann_${idx}`;
                    const sevColor =
                      ann.severity === 'critical'
                        ? '#ef4444'
                        : ann.severity === 'major'
                        ? '#f97316'
                        : ann.severity === 'moderate'
                        ? '#eab308'
                        : '#3b82f6';

                    return (
                      <div
                        id={cardId}
                        key={idx}
                        onClick={() => handleSelectHighlight(`ann_${idx}`)}
                        style={{
                          background: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-main)',
                          border: `1px solid ${isSelected ? sevColor : 'var(--border-color)'}`,
                          borderRadius: '8px',
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: `${sevColor}22`,
                                color: sevColor,
                                border: `1px solid ${sevColor}`,
                              }}
                            >
                              {ann.severity}
                            </span>
                            <span style={{ fontWeight: 600 }}>{ann.category} &rsaquo; {ann.subcategory}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>"{ann.quote || ann.original}"</span>
                            &nbsp;&mdash;&nbsp;
                            <span>{ann.explanation}</span>
                          </div>
                          {ann.meaningImpact && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Meaning impact: {ann.meaningImpact}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          &rarr; {ann.suggestedRevision || ann.correction}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 7. Grammar Feedback (Differentiating Genuine Errors vs Style) */}
          {grammarItems.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#3b82f6' }}>
                {t('grammar_feedback', 'Grammar & Syntax Feedback')}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {grammarItems.map((g, idx) => {
                  const cardId = `card_grammar_${idx}`;
                  const isSelected = selectedHighlightId === `grammar_${idx}`;
                  return (
                    <div
                      id={cardId}
                      key={idx}
                      onClick={() => handleSelectHighlight(`grammar_${idx}`)}
                      style={{
                        background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-main)',
                        border: `1px solid ${isSelected ? '#3b82f6' : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                        <div>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              marginRight: '6px',
                              background: g.isGenuineError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: g.isGenuineError ? '#ef4444' : '#3b82f6',
                            }}
                          >
                            {g.isGenuineError ? 'Error' : 'Style Recommendation'}
                          </span>
                          <em>"{g.quote}"</em>
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>{g.issue}</span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', textAlign: 'right' }}>
                        &rarr; {g.suggestion}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 8. Vocabulary & Lexical Upgrade Suggestions */}
          {vocabItems.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                {t('lexical_suggestions', 'Lexical & Vocabulary Suggestions')}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
                {vocabItems.map((v, idx) => {
                  const cardId = `card_vocab_${idx}`;
                  const isSelected = selectedHighlightId === `vocab_${idx}`;
                  return (
                    <div
                      id={cardId}
                      key={idx}
                      onClick={() => handleSelectHighlight(`vocab_${idx}`)}
                      style={{
                        background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-main)',
                        border: `1px solid ${isSelected ? '#10b981' : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{v.word}</span>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>&rarr; {v.betterAlternative}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Context: {v.context}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 9. Retrieved Reference Documents from Knowledge Base */}
          {result.retrievedDocumentIds && result.retrievedDocumentIds.length > 0 && (
            <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span>📚 Grounded against reference records:</span>
                {result.retrievedDocumentIds.map((doc, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {doc.id} (v{doc.version})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </PremiumGuardrail>
    </div>
  );
};
