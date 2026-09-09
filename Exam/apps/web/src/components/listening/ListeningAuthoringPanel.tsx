import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';
import { getAuthHeaders } from '../../utils/api';
import { AudioVoiceProfileDTO } from '@repo/types';

export interface ListeningSubQuestionConfig {
  id: string;
  type: 'MCQ' | 'FILL_IN_BLANK';
  prompt: string;
  marks: number;
  options?: { id: string; text: string }[];
  correctOptionId?: string;
  blankKey?: string;
}

export interface ListeningQuestionConfig {
  audioUrl?: string;
  transcript?: string;
  speechText?: string;
  voiceProfileId?: string;
  maxPlays: number;
  playbackSpeed: number;
  allowTranscriptInReview: boolean;
  subQuestions?: ListeningSubQuestionConfig[];
}

interface ListeningAuthoringPanelProps {
  initialConfig?: Partial<ListeningQuestionConfig>;
  onChange: (config: ListeningQuestionConfig) => void;
}

export const ListeningAuthoringPanel: React.FC<ListeningAuthoringPanelProps> = ({
  initialConfig,
  onChange,
}) => {
  const [mode, setMode] = useState<'SYNTHETIC' | 'URL'>(initialConfig?.audioUrl ? 'URL' : 'SYNTHETIC');
  const [audioUrl, setAudioUrl] = useState(initialConfig?.audioUrl || '');
  const [speechText, setSpeechText] = useState(initialConfig?.speechText || '');
  const [transcript, setTranscript] = useState(initialConfig?.transcript || '');
  const [voiceProfileId, setVoiceProfileId] = useState(initialConfig?.voiceProfileId || '');
  const [maxPlays, setMaxPlays] = useState(initialConfig?.maxPlays || 3);
  const [playbackSpeed, setPlaybackSpeed] = useState(initialConfig?.playbackSpeed || 1.0);
  const [allowTranscriptInReview, setAllowTranscriptInReview] = useState(
    initialConfig?.allowTranscriptInReview ?? true
  );
  const [subQuestions, setSubQuestions] = useState<ListeningSubQuestionConfig[]>(
    initialConfig?.subQuestions && initialConfig.subQuestions.length > 0
      ? initialConfig.subQuestions
      : [
          {
            id: 'sq_1',
            type: 'MCQ',
            prompt: 'What is the main topic of the spoken passage?',
            marks: 1,
            options: [
              { id: 'opt_1', text: 'Effective learning and preparation strategies' },
              { id: 'opt_2', text: 'The history of automobile manufacturing' },
              { id: 'opt_3', text: 'Weather forecasting instruments' },
              { id: 'opt_4', text: 'Marine biology conservation' },
            ],
            correctOptionId: 'opt_1',
          },
        ]
  );

  const [profiles, setProfiles] = useState<AudioVoiceProfileDTO[]>([]);
  const [testingAudio, setTestingAudio] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/audio/voices`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setProfiles(data.data);
          if (!voiceProfileId && data.data.length > 0) {
            setVoiceProfileId(data.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    onChange({
      audioUrl: mode === 'URL' ? audioUrl : undefined,
      speechText: mode === 'SYNTHETIC' ? speechText : undefined,
      transcript: transcript || speechText,
      voiceProfileId,
      maxPlays,
      playbackSpeed,
      allowTranscriptInReview,
      subQuestions,
    });
  }, [mode, audioUrl, speechText, transcript, voiceProfileId, maxPlays, playbackSpeed, allowTranscriptInReview, subQuestions]);

  const testSyntheticSpeech = async () => {
    // If currently playing, stop it
    if (testingAudio && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setTestingAudio(false);
      return;
    }

    const rawText = speechText.trim();
    const previewText = rawText
      ? (rawText.match(/[^.!?]+[.!?]+/)?.[0] || rawText.slice(0, 120))
      : 'Hello, this is a sample preview of the selected voice and accent.';

    try {
      setLoadingPreview(true);
      setFallbackWarning(null);
      const res = await fetch(`${API_BASE}/audio/synthesize-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          script: previewText,
          voiceId: voiceProfileId || undefined,
          speed: playbackSpeed,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.audioUrl) {
        if (data.data.isFallback || data.data.warning) {
          setFallbackWarning(data.data.warning || 'Operating in fallback audio mode.');
        } else {
          setFallbackWarning(null);
        }

        const fullAudioUrl = data.data.audioUrl.startsWith('http')
          ? data.data.audioUrl
          : `${API_BASE.replace('/api/v1', '')}${data.data.audioUrl}`;

        if (previewAudioRef.current) {
          previewAudioRef.current.pause();
        }

        const audio = new Audio(fullAudioUrl);
        previewAudioRef.current = audio;

        audio.onended = () => {
          setTestingAudio(false);
        };
        audio.onerror = () => {
          setTestingAudio(false);
          console.error('Audio playback error for preview URL:', fullAudioUrl);
        };

        setTestingAudio(true);
        await audio.play();
      } else {
        console.error('Failed to generate audio preview:', data.message);
      }
    } catch (err) {
      console.error('Error generating audio preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div
      data-testid="listening-authoring-panel"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Audio Passage Configuration</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setMode('SYNTHETIC')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              border: '1px solid var(--border-color)',
              background: mode === 'SYNTHETIC' ? '#3b82f6' : 'transparent',
              color: mode === 'SYNTHETIC' ? '#fff' : 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            🗣️ Speech Synthesizer
          </button>
          <button
            type="button"
            onClick={() => setMode('URL')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              border: '1px solid var(--border-color)',
              background: mode === 'URL' ? '#3b82f6' : 'transparent',
              color: mode === 'URL' ? '#fff' : 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            🔗 Audio File / URL
          </button>
        </div>
      </div>

      {mode === 'SYNTHETIC' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Spoken Passage Text (Script for TTS generation)
            </label>
            <textarea
              rows={4}
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              placeholder="Enter the passage script that will be spoken aloud to the student during the exam..."
              style={{
                width: '100%',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: 'var(--text-main)',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Voice Profile (Accent & Gender)
              </label>
              <select
                value={voiceProfileId}
                onChange={(e) => setVoiceProfileId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.accent} - {p.gender})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                onClick={testSyntheticSpeech}
                disabled={loadingPreview}
                style={{
                  width: '100%',
                  background: testingAudio ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  border: testingAudio ? '1px solid #ef4444' : '1px solid #3b82f6',
                  color: testingAudio ? '#ef4444' : '#3b82f6',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: loadingPreview ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {loadingPreview ? '⏳ Generating...' : testingAudio ? '⏹ Stop Preview' : '▶ Preview Accent'}
              </button>
            </div>
          </div>
          {fallbackWarning && (
            <div
              data-testid="preview-fallback-warning"
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                color: '#d97706',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{fallbackWarning}</span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Direct Audio Stream URL (.mp3 / .wav)
          </label>
          <input
            type="text"
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            placeholder="https://cdn.example.com/audio/listening_passage_01.mp3"
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
      )}

      {/* Constraints & Security Config */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Max Play Limit
          </label>
          <select
            value={maxPlays}
            onChange={(e) => setMaxPlays(Number(e.target.value))}
            style={{
              width: '100%',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '6px 8px',
              color: 'var(--text-main)',
              fontSize: '12px',
            }}
          >
            <option value={1}>1 Time (Strict Exam)</option>
            <option value={2}>2 Times (Standard)</option>
            <option value={3}>3 Times (Practice)</option>
            <option value={999}>Unlimited</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Playback Speed
          </label>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            style={{
              width: '100%',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '6px 8px',
              color: 'var(--text-main)',
              fontSize: '12px',
            }}
          >
            <option value={0.75}>0.75x (Slow)</option>
            <option value={1.0}>1.0x (Normal)</option>
            <option value={1.25}>1.25x (Fast)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', paddingTop: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={allowTranscriptInReview}
              onChange={(e) => setAllowTranscriptInReview(e.target.checked)}
            />
            <span>Show Transcript in Review</span>
          </label>
        </div>
      </div>

      {/* Listening Comprehension Sub-Questions */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Comprehension Questions ({subQuestions.length})</h4>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Questions student must answer while/after listening to the passage</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const newId = `sq_${Date.now()}`;
              setSubQuestions([
                ...subQuestions,
                {
                  id: newId,
                  type: 'MCQ',
                  prompt: 'New listening question...',
                  marks: 1,
                  options: [
                    { id: `${newId}_opt1`, text: 'Option A' },
                    { id: `${newId}_opt2`, text: 'Option B' },
                  ],
                  correctOptionId: `${newId}_opt1`,
                },
              ]);
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              border: '1px solid #3b82f6',
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            + Add Sub-Question
          </button>
        </div>

        {subQuestions.map((sq, idx) => (
          <div
            key={sq.id}
            style={{
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-color, #06b6d4)' }}>
                Q{idx + 1}
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={sq.type}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setSubQuestions(subQuestions.map((item, i) => i === idx ? { ...item, type: newType } : item));
                  }}
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                >
                  <option value="MCQ">Single Choice (MCQ)</option>
                  <option value="FILL_IN_BLANK">Fill in Blank</option>
                </select>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={sq.marks}
                  onChange={(e) => {
                    const m = parseFloat(e.target.value) || 1;
                    setSubQuestions(subQuestions.map((item, i) => i === idx ? { ...item, marks: m } : item));
                  }}
                  title="Marks"
                  style={{
                    width: '50px',
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>marks</span>
                {subQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSubQuestions(subQuestions.filter((_, i) => i !== idx))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: '2px 6px',
                    }}
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
            </div>

            <input
              type="text"
              value={sq.prompt}
              onChange={(e) => {
                const text = e.target.value;
                setSubQuestions(subQuestions.map((item, i) => i === idx ? { ...item, prompt: text } : item));
              }}
              placeholder="Enter sub-question statement..."
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: '4px',
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
              }}
            />

            {sq.type === 'MCQ' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                {(sq.options || []).map((opt, optIdx) => (
                  <div key={opt.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="radio"
                      name={`sq_correct_${sq.id}`}
                      checked={sq.correctOptionId === opt.id}
                      onChange={() => {
                        setSubQuestions(subQuestions.map((item, i) => i === idx ? { ...item, correctOptionId: opt.id } : item));
                      }}
                      title="Mark as correct answer"
                    />
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newOpts = (sq.options || []).map((o, oi) => oi === optIdx ? { ...o, text: val } : o);
                        setSubQuestions(subQuestions.map((item, i) => i === idx ? { ...item, options: newOpts } : item));
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        background: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {sq.type === 'FILL_IN_BLANK' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Expected Answer Key:</span>
                <input
                  type="text"
                  value={sq.blankKey || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSubQuestions(subQuestions.map((item, i) => i === idx ? { ...item, blankKey: val } : item));
                  }}
                  placeholder="e.g. 250 / London / renewable energy"
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
