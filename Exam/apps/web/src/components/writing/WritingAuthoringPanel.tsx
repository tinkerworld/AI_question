import React, { useState, useEffect } from 'react';
import { WritingRubricCriterionDTO } from '@repo/types';

export interface WritingQuestionConfig {
  promptStem: string;
  stimulusText?: string;
  minWords: number;
  maxWords: number;
  recommendedTimeMinutes: number;
  rubricCriteria: WritingRubricCriterionDTO[];
}

interface WritingAuthoringPanelProps {
  initialConfig?: Partial<WritingQuestionConfig>;
  onChange: (config: WritingQuestionConfig) => void;
}

const DEFAULT_RUBRICS: Record<string, WritingRubricCriterionDTO[]> = {
  IELTS_TASK_2: [
    { id: 'crit_1', name: 'Task Achievement', weight: 0.25, maxScore: 9, description: 'Addressing all parts of the task with relevant ideas' },
    { id: 'crit_2', name: 'Coherence and Cohesion', weight: 0.25, maxScore: 9, description: 'Logical flow, paragraphing, and linking devices' },
    { id: 'crit_3', name: 'Lexical Resource', weight: 0.25, maxScore: 9, description: 'Range, accuracy, and sophistication of vocabulary' },
    { id: 'crit_4', name: 'Grammatical Accuracy', weight: 0.25, maxScore: 9, description: 'Range of complex structures and frequency of errors' },
  ],
  TOEFL_INDEPENDENT: [
    { id: 'crit_1', name: 'Topic Development', weight: 0.35, maxScore: 5, description: 'Substantive explanation and concrete examples' },
    { id: 'crit_2', name: 'Organization & Structure', weight: 0.35, maxScore: 5, description: 'Well-formed introduction, body paragraphs, and conclusion' },
    { id: 'crit_3', name: 'Language Use', weight: 0.30, maxScore: 5, description: 'Syntactic variety and idiomatic word choice' },
  ],
};

export const WritingAuthoringPanel: React.FC<WritingAuthoringPanelProps> = ({
  initialConfig,
  onChange,
}) => {
  const [promptStem, setPromptStem] = useState(initialConfig?.promptStem || '');
  const [stimulusText, setStimulusText] = useState(initialConfig?.stimulusText || '');
  const [minWords, setMinWords] = useState(initialConfig?.minWords || 250);
  const [maxWords, setMaxWords] = useState(initialConfig?.maxWords || 400);
  const [timeLimit, setTimeLimit] = useState(initialConfig?.recommendedTimeMinutes || 40);
  const [rubrics, setRubrics] = useState<WritingRubricCriterionDTO[]>(
    initialConfig?.rubricCriteria || DEFAULT_RUBRICS.IELTS_TASK_2
  );

  useEffect(() => {
    onChange({
      promptStem,
      stimulusText: stimulusText || undefined,
      minWords,
      maxWords,
      recommendedTimeMinutes: timeLimit,
      rubricCriteria: rubrics,
    });
  }, [promptStem, stimulusText, minWords, maxWords, timeLimit, rubrics]);

  const loadPreset = (presetKey: string) => {
    if (DEFAULT_RUBRICS[presetKey]) {
      setRubrics(DEFAULT_RUBRICS[presetKey]);
    }
  };

  return (
    <div
      data-testid="writing-authoring-panel"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Writing Task Specification</h4>

      {/* Prompt Stem */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Essay Topic / Prompt Stem *
        </label>
        <textarea
          rows={3}
          value={promptStem}
          onChange={(e) => setPromptStem(e.target.value)}
          placeholder="e.g. In some countries, an increasing number of people are choosing to live alone. What are the advantages and disadvantages?"
          style={{
            width: '100%',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'var(--text-main)',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Optional Stimulus */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Background Context / Stimulus (Optional)
        </label>
        <textarea
          rows={2}
          value={stimulusText}
          onChange={(e) => setStimulusText(e.target.value)}
          placeholder="Provide optional background articles, graphs, or instructions..."
          style={{
            width: '100%',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'var(--text-main)',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Limits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Min Words</label>
          <input
            type="number"
            value={minWords}
            onChange={(e) => setMinWords(Number(e.target.value))}
            style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-main)', fontSize: '12px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Max Words</label>
          <input
            type="number"
            value={maxWords}
            onChange={(e) => setMaxWords(Number(e.target.value))}
            style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-main)', fontSize: '12px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Recommended Minutes</label>
          <input
            type="number"
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-main)', fontSize: '12px' }}
          />
        </div>
      </div>

      {/* Rubric Criteria Selector */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Evaluation Rubric Presets</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => loadPreset('IELTS_TASK_2')}
              style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer' }}
            >
              IELTS Task 2
            </button>
            <button
              type="button"
              onClick={() => loadPreset('TOEFL_INDEPENDENT')}
              style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer' }}
            >
              TOEFL Independent
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rubrics.map((r, idx) => (
            <div
              key={r.id || idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              <div>
                <strong>{r.name}</strong> (Weight: {Math.round(r.weight * 100)}%)
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.description}</div>
              </div>
              <div style={{ fontWeight: 700, color: '#3b82f6' }}>Max {r.maxScore} pts</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
