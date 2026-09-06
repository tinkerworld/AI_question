import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';
import { getAuthHeaders } from '../../utils/api';
import { AudioVoiceProfileDTO } from '@repo/types';

export interface ListeningQuestionConfig {
  audioUrl?: string;
  transcript?: string;
  speechText?: string;
  voiceProfileId?: string;
  maxPlays: number;
  playbackSpeed: number;
  allowTranscriptInReview: boolean;
}

interface ListeningAuthoringPanelProps {
  initialConfig?: Partial<ListeningQuestionConfig>;
  onChange: (config: ListeningQuestionConfig) => void;
}

export const ListeningAuthoringPanel: React.FC<ListeningAuthoringPanelProps> = ({
  initialConfig,
  onChange,
}) => {
  const [mode, setMode] = useState<'SYNTHETIC' | 'URL'>('SYNTHETIC');
  const [audioUrl, setAudioUrl] = useState(initialConfig?.audioUrl || '');
  const [speechText, setSpeechText] = useState(initialConfig?.speechText || '');
  const [transcript, setTranscript] = useState(initialConfig?.transcript || '');
  const [voiceProfileId, setVoiceProfileId] = useState(initialConfig?.voiceProfileId || '');
  const [maxPlays, setMaxPlays] = useState(initialConfig?.maxPlays || 3);
  const [playbackSpeed, setPlaybackSpeed] = useState(initialConfig?.playbackSpeed || 1.0);
  const [allowTranscriptInReview, setAllowTranscriptInReview] = useState(
    initialConfig?.allowTranscriptInReview ?? true
  );

  const [profiles, setProfiles] = useState<AudioVoiceProfileDTO[]>([]);
  const [testingAudio, setTestingAudio] = useState(false);

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
    });
  }, [mode, audioUrl, speechText, transcript, voiceProfileId, maxPlays, playbackSpeed, allowTranscriptInReview]);

  const testSyntheticSpeech = () => {
    if (!speechText) return;
    setTestingAudio(true);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(speechText);
      u.rate = playbackSpeed;
      u.onend = () => setTestingAudio(false);
      u.onerror = () => setTestingAudio(false);
      window.speechSynthesis.speak(u);
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
                disabled={!speechText || testingAudio}
                style={{
                  width: '100%',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid #3b82f6',
                  color: '#3b82f6',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: !speechText ? 'not-allowed' : 'pointer',
                }}
              >
                {testingAudio ? '🔊 Playing Sample...' : '▶ Preview Accent'}
              </button>
            </div>
          </div>
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
    </div>
  );
};
