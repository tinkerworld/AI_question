import React, { useState, useEffect } from 'react';
import { WritingRubricCriterionDTO } from '@repo/types';

export interface WritingQuestionConfig {
  promptStem: string;
  promptImageUrl?: string;
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
  IELTS_TASK_1: [
    { id: 'crit_1', name: 'Task Achievement', weight: 0.25, maxScore: 9, description: 'Accurate overview, key features selected and illustrated with data/stages' },
    { id: 'crit_2', name: 'Coherence and Cohesion', weight: 0.25, maxScore: 9, description: 'Logical paragraph progression, cohesive devices, and data sequencing' },
    { id: 'crit_3', name: 'Lexical Resource', weight: 0.25, maxScore: 9, description: 'Accurate data vocabulary, proportions, change verbs, and technical terms' },
    { id: 'crit_4', name: 'Grammatical Accuracy', weight: 0.25, maxScore: 9, description: 'Variety of complex structures, passive voice for processes, and error-free sentences' },
  ],
  IELTS_TASK_2: [
    { id: 'crit_1', name: 'Task Response', weight: 0.25, maxScore: 9, description: 'Addressing all parts of the task with clear position and extended ideas' },
    { id: 'crit_2', name: 'Coherence and Cohesion', weight: 0.25, maxScore: 9, description: 'Logical flow, clear paragraph progression, and linking devices' },
    { id: 'crit_3', name: 'Lexical Resource', weight: 0.25, maxScore: 9, description: 'Range, accuracy, natural academic collocations, and sophistication of vocabulary' },
    { id: 'crit_4', name: 'Grammatical Accuracy', weight: 0.25, maxScore: 9, description: 'Range of complex structures, punctuation, and frequency of error-free sentences' },
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
  const [promptImageUrl, setPromptImageUrl] = useState(initialConfig?.promptImageUrl || '');
  const [stimulusText, setStimulusText] = useState(initialConfig?.stimulusText || '');
  const [minWords, setMinWords] = useState(initialConfig?.minWords || 150);
  const [maxWords, setMaxWords] = useState(initialConfig?.maxWords || 400);
  const [timeLimit, setTimeLimit] = useState(initialConfig?.recommendedTimeMinutes || 40);
  const [rubrics, setRubrics] = useState<WritingRubricCriterionDTO[]>(
    initialConfig?.rubricCriteria || DEFAULT_RUBRICS.IELTS_TASK_2
  );

  useEffect(() => {
    onChange({
      promptStem,
      promptImageUrl: promptImageUrl.trim() || undefined,
      stimulusText: stimulusText.trim() || undefined,
      minWords,
      maxWords,
      recommendedTimeMinutes: timeLimit,
      rubricCriteria: rubrics,
    });
  }, [promptStem, promptImageUrl, stimulusText, minWords, maxWords, timeLimit, rubrics]);

  const loadPreset = (presetKey: string) => {
    if (DEFAULT_RUBRICS[presetKey]) {
      setRubrics(DEFAULT_RUBRICS[presetKey]);
      if (presetKey === 'IELTS_TASK_1') {
        setMinWords(150);
        setMaxWords(250);
        setTimeLimit(20);
      } else if (presetKey === 'IELTS_TASK_2') {
        setMinWords(250);
        setMaxWords(400);
        setTimeLimit(40);
      } else if (presetKey === 'TOEFL_INDEPENDENT') {
        setMinWords(300);
        setMaxWords(450);
        setTimeLimit(30);
      }
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

      {/* IELTS Task 1 Stimulus / Chart Image Attachment */}
      <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
            📊 Stimulus Image / Chart URL (IELTS Task 1 &amp; Visual Prompts)
          </label>
          {promptImageUrl && (
            <button
              type="button"
              onClick={() => setPromptImageUrl('')}
              style={{
                fontSize: '11px',
                color: '#ef4444',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              ✕ Remove Image
            </button>
          )}
        </div>

        <input
          type="text"
          value={promptImageUrl}
          onChange={(e) => setPromptImageUrl(e.target.value)}
          placeholder="e.g. /assets/charts/ielts_task1_renewable_energy.svg or https://..."
          style={{
            width: '100%',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '7px 10px',
            color: 'var(--text-main)',
            fontSize: '12px',
            marginBottom: '8px',
          }}
        />

        {/* Quick Presets for IELTS Task 1 Charts */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Presets:</span>
          <button
            type="button"
            onClick={() => {
              setPromptImageUrl('/assets/charts/ielts_task1_renewable_energy.svg');
              loadPreset('IELTS_TASK_1');
              if (!promptStem) {
                setPromptStem('IELTS Academic Writing Task 1: The bar chart illustrates the proportions of renewable electricity generation (solar, wind, and hydroelectric) across five European nations between 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words).');
              }
            }}
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid #06b6d4',
              color: '#06b6d4',
              cursor: 'pointer',
            }}
          >
            📊 Renewable Energy Bar Chart
          </button>
          <button
            type="button"
            onClick={() => {
              setPromptImageUrl('/assets/charts/ielts_task1_desalination_process.svg');
              loadPreset('IELTS_TASK_1');
              if (!promptStem) {
                setPromptStem('IELTS Academic Writing Task 1: The flow diagram illustrates the multi-stage technical process of seawater reverse osmosis desalination and municipal potable water distribution. Summarise the process by describing the main chronological stages. (Write at least 150 words).');
              }
            }}
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10b981',
              color: '#10b981',
              cursor: 'pointer',
            }}
          >
            🔄 Desalination Flow Diagram
          </button>
        </div>

        {/* Image Preview */}
        {promptImageUrl && (
          <div style={{ marginTop: '10px', textAlign: 'center', background: '#0a0f1d', padding: '10px', borderRadius: '6px', border: '1px solid #1f2937' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', textAlign: 'left' }}>
              Stimulus Preview:
            </div>
            <img
              src={promptImageUrl}
              alt="Stimulus Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '180px',
                objectFit: 'contain',
                borderRadius: '4px',
                border: '1px solid #374151',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
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
              onClick={() => loadPreset('IELTS_TASK_1')}
              style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #06b6d4', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', cursor: 'pointer', fontWeight: 600 }}
            >
              IELTS Task 1
            </button>
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
