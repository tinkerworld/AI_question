import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../context/I18nContext';

export interface ExamWritingEditorProps {
  value: string;
  onChange: (text: string) => void;
  minWords?: number;
  maxWords?: number;
  disabled?: boolean;
  placeholder?: string;
  autoSaveIntervalMs?: number;
  onAutoSave?: (text: string) => void;
  fontSize?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
  hideHeaderStats?: boolean;
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
  fontSize = 'md',
  fullHeight = false,
  hideHeaderStats = false,
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<any>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  // Cancel any pending autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, []);

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
      return { color: '#f59e0b', text: `${t('under_minimum_words', 'Under minimum')} (${minWords - wordCount} ${t('words_needed', 'words needed')})` };
    }
    if (maxWords && wordCount > maxWords) {
      return { color: '#ef4444', text: `${t('exceeds_maximum_words', 'Exceeds maximum')} (${wordCount - maxWords} ${t('words_over', 'words')})` };
    }
    return { color: '#10b981', text: t('word_count_on_target', 'Word count on target') };
  };

  const status = getWordCountStatus();

  const computedFontSize = fontSize === 'sm' ? '14px' : fontSize === 'lg' ? '18px' : '15px';

  return (
    <div
      data-testid="exam-writing-editor"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: fullHeight ? 'transparent' : 'var(--panel-bg)',
        border: fullHeight ? 'none' : '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: fullHeight ? '0' : '16px',
        ...(fullHeight ? { height: '100%', flex: 1, minHeight: 0 } : {}),
      }}
    >
      {/* Editor toolbar / statistics header */}
      {!hideHeaderStats ? (
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
              <strong>{t('word_count', 'Words')}:</strong>{' '}
              <span data-testid="writing-word-count" style={{ fontWeight: 700, fontSize: '14px', color: status.color }}>
                {wordCount}
              </span>{' '}
              / {minWords}–{maxWords} {t('target_words_range', 'target')}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              <strong>{t('chars', 'Chars')}:</strong> {charCount}
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
              {t('auto_saved', 'Auto-saved')} at {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>
      ) : null}

      {/* Main composition text area */}
      <textarea
        value={text}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        rows={fullHeight ? undefined : 16}
        data-testid="writing-textarea"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: 'var(--bg-main, #0b1120)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px',
          color: 'var(--text-main)',
          fontSize: computedFontSize,
          lineHeight: '1.8',
          fontFamily: 'Inter, -apple-system, sans-serif',
          resize: fullHeight ? 'none' : 'vertical',
          outline: 'none',
          ...(fullHeight ? { height: '100%', flex: 1, minHeight: '260px' } : {}),
        }}
      />
    </div>
  );
};
