import React, { useState, useEffect, useRef } from 'react';

export interface ExamWritingEditorProps {
  value: string;
  onChange: (text: string) => void;
  minWords?: number;
  maxWords?: number;
  disabled?: boolean;
  placeholder?: string;
  autoSaveIntervalMs?: number;
  onAutoSave?: (text: string) => void;
}

export const ExamWritingEditor: React.FC<ExamWritingEditorProps> = ({
  value,
  onChange,
  minWords = 150,
  maxWords = 400,
  disabled = false,
  placeholder = 'Begin composing your response here...',
  autoSaveIntervalMs = 5000,
  onAutoSave,
}) => {
  const [text, setText] = useState(value);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<any>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  const countWords = (str: string): number => {
    const trimmed = str.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  };

  const wordCount = countWords(text);
  const charCount = text.length;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    onChange(newText);

    // Debounced autosave
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (onAutoSave) {
        onAutoSave(newText);
        setLastSaved(new Date());
      }
    }, autoSaveIntervalMs);
  };

  const getWordCountStatus = () => {
    if (wordCount < minWords) {
      return { color: '#f59e0b', text: `Under minimum (${minWords - wordCount} words needed)` };
    }
    if (maxWords && wordCount > maxWords) {
      return { color: '#ef4444', text: `Exceeds maximum by ${wordCount - maxWords} words` };
    }
    return { color: '#10b981', text: 'Word count on target' };
  };

  const status = getWordCountStatus();

  return (
    <div
      data-testid="exam-writing-editor"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '16px',
      }}
    >
      {/* Editor toolbar / statistics header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <strong>Words:</strong>{' '}
            <span data-testid="writing-word-count" style={{ fontWeight: 700, fontSize: '14px', color: status.color }}>
              {wordCount}
            </span>{' '}
            / {minWords}–{maxWords} target
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            <strong>Chars:</strong> {charCount}
          </div>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              background: `${status.color}22`,
              color: status.color,
            }}
          >
            {status.text}
          </span>
        </div>

        {lastSaved && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Auto-saved at {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Main composition text area */}
      <textarea
        value={text}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        rows={16}
        data-testid="writing-textarea"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: 'var(--bg-main)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '14px',
          color: 'var(--text-main)',
          fontSize: '14px',
          lineHeight: '1.7',
          fontFamily: 'Inter, -apple-system, sans-serif',
          resize: 'vertical',
          outline: 'none',
        }}
      />
    </div>
  );
};
