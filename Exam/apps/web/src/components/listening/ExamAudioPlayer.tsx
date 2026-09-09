import React, { useState, useRef, useEffect } from 'react';

export interface ExamAudioPlayerProps {
  audioUrl?: string;
  transcript?: string;
  allowTranscript?: boolean;
  maxPlays?: number;
  speechText?: string;
  voiceGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  accent?: string;
  playbackSpeed?: number;
  onPlayLimitReached?: () => void;
}

export const ExamAudioPlayer: React.FC<ExamAudioPlayerProps> = ({
  audioUrl,
  transcript,
  allowTranscript = false,
  maxPlays = 3,
  speechText,
  accent = 'en-GB',
  playbackSpeed = 1.0,
  onPlayLimitReached,
}) => {
  const [playCount, setPlayCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(playbackSpeed);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Compute effective duration (estimated from speechText words if audio metadata not available)
  const estimatedDuration = React.useMemo(() => {
    if (!speechText) return 0;
    const words = speechText.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(5, Math.round((words / (140 * speed)) * 60));
  }, [speechText, speed]);

  const effectiveDuration = duration > 0 ? duration : estimatedDuration;

  const clearSpeechTicker = () => {
    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }
  };

  // Security requirement: Auto-pause when user navigates away or tabs switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        pauseAudio();
      }
    };
    const handleBlur = () => {
      if (isPlaying) {
        pauseAudio();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      clearSpeechTicker();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying]);

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
    clearSpeechTicker();
    setIsPlaying(false);
  };

  const handlePlay = () => {
    if (playCount >= maxPlays) {
      return;
    }

    if (audioUrl) {
      if (audioRef.current) {
        audioRef.current.playbackRate = speed;
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else if (speechText && window.speechSynthesis) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
        startSpeechTicker();
      } else {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.rate = speed;

        // Map accent if provided
        if (accent) {
          const voices = window.speechSynthesis.getVoices();
          const target = accent.toLowerCase().replace(/_/g, '-');
          const matchedVoice = voices.find(v => v.lang.toLowerCase().includes(target));
          if (matchedVoice) utterance.voice = matchedVoice;
        }

        utterance.onend = () => {
          clearSpeechTicker();
          setIsPlaying(false);
          setCurrentTime(0);
          handlePlaybackEnded();
        };

        utterance.onerror = () => {
          clearSpeechTicker();
          setIsPlaying(false);
        };

        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
        startSpeechTicker();
      }
    }
  };

  const startSpeechTicker = () => {
    clearSpeechTicker();
    speechIntervalRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 1;
        if (effectiveDuration > 0 && next >= effectiveDuration) {
          clearSpeechTicker();
          return effectiveDuration;
        }
        return next;
      });
    }, 1000);
  };

  const handlePlaybackEnded = () => {
    clearSpeechTicker();
    setIsPlaying(false);
    const newCount = playCount + 1;
    setPlayCount(newCount);
    if (newCount >= maxPlays && onPlayLimitReached) {
      onPlayLimitReached();
    }
  };

  const changeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const remainingPlays = Math.max(0, maxPlays - playCount);
  const isLimitReached = playCount >= maxPlays;
  const hasAudioSource = Boolean(audioUrl || speechText);

  return (
    <div
      data-testid="exam-audio-player"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handlePlaybackEnded}
          onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
          onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
          style={{ display: 'none' }}
        />
      )}

      {/* Header bar: Title & Play limit badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px' }}>
          <span>🎧</span>
          <span>Audio Passage</span>
        </div>
        <div
          data-testid="audio-play-counter"
          style={{
            fontSize: '12px',
            padding: '3px 10px',
            borderRadius: '20px',
            background: isLimitReached ? 'rgba(239, 68, 68, 0.15)' : 'rgba(6, 182, 212, 0.15)',
            color: isLimitReached ? '#ef4444' : '#06b6d4',
            fontWeight: 700,
          }}
        >
          {isLimitReached ? 'Replay Limit Reached' : `Plays Remaining: ${remainingPlays} / ${maxPlays}`}
        </div>
      </div>

      {/* Audio controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={isPlaying ? pauseAudio : handlePlay}
          disabled={(isLimitReached && !isPlaying) || !hasAudioSource}
          data-testid="audio-play-btn"
          title={!hasAudioSource ? 'No audio passage available' : isLimitReached && !isPlaying ? 'Playback limit reached' : isPlaying ? 'Pause audio' : 'Play audio'}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: (isLimitReached && !isPlaying) || !hasAudioSource ? '#64748b' : '#3b82f6',
            color: '#fff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: (isLimitReached && !isPlaying) || !hasAudioSource ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Progress scrub bar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input
            type="range"
            min={0}
            max={effectiveDuration || 100}
            value={currentTime}
            onChange={(e) => {
              const time = Number(e.target.value);
              setCurrentTime(time);
              if (audioRef.current) audioRef.current.currentTime = time;
            }}
            disabled={!hasAudioSource}
            style={{ width: '100%', cursor: hasAudioSource ? 'pointer' : 'default' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>{formatTime(currentTime)}</span>
            <span>
              {effectiveDuration > 0
                ? formatTime(effectiveDuration)
                : audioUrl
                ? formatTime(duration)
                : 'Synthesized Passage'}
            </span>
          </div>
        </div>

        {/* Speed Selector */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[0.75, 1.0, 1.25].map((s) => (
            <button
              key={s}
              onClick={() => changeSpeed(s)}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: speed === s ? '#3b82f6' : 'transparent',
                color: speed === s ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Optional Transcript Accordion */}
      {allowTranscript && transcript && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#3b82f6',
              fontSize: '12px',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{showTranscript ? '▼ Hide Transcript' : '▶ View Transcript (Review Mode)'}</span>
          </button>
          {showTranscript && (
            <div
              data-testid="audio-transcript-box"
              style={{
                marginTop: '8px',
                padding: '12px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '12px',
                lineHeight: 1.6,
                color: 'var(--text-muted)',
              }}
            >
              {transcript}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
