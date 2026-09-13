import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  computeRms,
  rmsToDbfs,
  dbfsToNormalizedPercent,
  detectVoicing,
  buildVoiceProfile,
  validateCalibrationQuality,
  EXACT_CALIBRATION_PASSAGE,
  CALIBRATION_PASSAGE_WORD_COUNT,
  CalibrationStep,
  VoiceProfile,
  AudioSample,
  RealtimeAudioMetrics,
  CalibrationValidationResult,
} from '../utils/audioMeasurement';

interface VoiceCalibrationPanelProps {
  onCalibrationComplete: (profile: VoiceProfile) => void;
  onCalibrationReset?: () => void;
  initialProfile?: VoiceProfile | null;
}

export const VoiceCalibrationPanel: React.FC<VoiceCalibrationPanelProps> = ({
  onCalibrationComplete,
  onCalibrationReset,
  initialProfile = null,
}) => {
  const [step, setStep] = useState<CalibrationStep>(
    initialProfile ? 'COMPLETED' : 'IDLE'
  );
  const [profile, setProfile] = useState<VoiceProfile | null>(initialProfile);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [validationResult, setValidationResult] =
    useState<CalibrationValidationResult | null>(null);

  // Live real-time audio metrics
  const [metrics, setMetrics] = useState<RealtimeAudioMetrics>({
    currentRms: 0,
    currentDbfs: -100,
    meterPercent: 0,
    isVoiced: false,
    pitchHz: 0,
    voicingConfidence: 0,
  });

  // Countdown & progress states
  const [phaseProgress, setPhaseProgress] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [phaseInstruction, setPhaseInstruction] = useState<string>('');

  // References to Web Audio API instances
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const phaseTimerRef = useRef<any>(null);

  // Continuous sample buffers for entire calibration period
  const noiseSamplesRef = useRef<AudioSample[]>([]);
  const continuousSpeechSamplesRef = useRef<AudioSample[]>([]);
  const noiseFloorPeakRef = useRef<number>(-50);

  // Cleanup Web Audio graph and running timers
  const teardownAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (phaseTimerRef.current) {
      clearInterval(phaseTimerRef.current);
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        if (audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close();
        }
      } catch {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      streamRef.current = null;
    }

    setMetrics({
      currentRms: 0,
      currentDbfs: -100,
      meterPercent: 0,
      isVoiced: false,
      pitchHz: 0,
      voicingConfidence: 0,
    });
  }, []);

  useEffect(() => {
    return () => {
      teardownAudio();
    };
  }, [teardownAudio]);

  useEffect(() => {
    if (initialProfile && (!profile || step === 'IDLE')) {
      setProfile(initialProfile);
      setStep('COMPLETED');
    }
  }, [initialProfile]);

  // Request microphone access and setup Web Audio API AnalyserNode
  const initAudioStream = async (): Promise<MediaStream | null> => {
    teardownAudio();
    setErrorMessage('');
    setValidationResult(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setStep('FAILED_NO_DEVICE');
      setErrorMessage(
        'Your browser does not support audio recording or media devices. Please use Google Chrome, Microsoft Edge, or Mozilla Firefox.'
      );
      return null;
    }

    // Hardware existence check
    try {
      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        if (devices.length > 0 && audioInputs.length === 0) {
          setStep('FAILED_NO_DEVICE');
          setErrorMessage(
            'No microphone device detected on your system. Connect a microphone or headset and verify it is enabled in your OS sound settings.'
          );
          return null;
        }
      }
    } catch {}

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // Keep raw dynamics during calibration
        },
      });
      streamRef.current = stream;
    } catch (err: any) {
      const errorName = err?.name || '';
      if (
        errorName === 'NotFoundError' ||
        errorName === 'DevicesNotFoundError' ||
        errorName === 'OverconstrainedError'
      ) {
        setStep('FAILED_NO_DEVICE');
        setErrorMessage(
          'No microphone device found. Please connect a working microphone or headset.'
        );
        return null;
      }

      if (
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError' ||
        errorName === 'SecurityError'
      ) {
        setStep('FAILED_PERMISSION');
        setErrorMessage(
          'Microphone access was blocked by your browser. Click the lock icon in your address bar, set Microphone permissions to "Allow", and click Retry.'
        );
        return null;
      }

      setStep('FAILED_PERMISSION');
      setErrorMessage(
        `Unable to access microphone: ${err?.message || 'Permission denied or device unavailable'}.`
      );
      return null;
    }

    // Web Audio setup
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        throw new Error('Web Audio API is not supported in this browser');
      }

      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048; // High resolution for low-frequency vocal pitch
      analyser.smoothingTimeConstant = 0.2;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      return stream;
    } catch (err: any) {
      setStep('FAILED_PERMISSION');
      setErrorMessage(`Failed to initialize Web Audio engine: ${err.message}`);
      return null;
    }
  };

  // Main real-time sampling loop: runs at requestAnimationFrame cadence
  const startContinuousSampling = (
    currentStepRef: { current: CalibrationStep },
    thresholdRef: { current: number }
  ) => {
    if (!analyserRef.current || !audioCtxRef.current) return;

    const analyser = analyserRef.current;
    const sampleRate = audioCtxRef.current.sampleRate || 44100;
    const buffer = new Float32Array(analyser.fftSize);

    let lastSampleTime = 0;
    const sampleIntervalMs = 40; // Capture discrete time-series distribution every 40ms

    const sample = () => {
      if (!analyserRef.current) return;

      analyser.getFloatTimeDomainData(buffer);

      const rms = computeRms(buffer);
      const dbfs = rmsToDbfs(rms, -80);
      const meterPercent = dbfsToNormalizedPercent(dbfs, -70, 0);

      const voicing = detectVoicing(buffer, sampleRate);
      const now = Date.now();

      // Speech discrimination: Energy above noise floor margin + periodic voicing
      const isSpeech =
        dbfs > thresholdRef.current && (voicing.isVoiced || dbfs > thresholdRef.current + 8);

      setMetrics({
        currentRms: rms,
        currentDbfs: dbfs,
        meterPercent,
        isVoiced: voicing.isVoiced,
        pitchHz: voicing.pitchHz,
        voicingConfidence: voicing.confidence,
      });

      // Sample preservation: record continuous AudioSample distribution
      if (now - lastSampleTime >= sampleIntervalMs) {
        lastSampleTime = now;
        const sampleObj: AudioSample = {
          timestamp: now,
          rms,
          dbfs,
          isSpeech,
        };

        if (currentStepRef.current === 'SAMPLING_NOISE') {
          noiseSamplesRef.current.push(sampleObj);
        } else if (currentStepRef.current === 'SAMPLING_SPEECH') {
          continuousSpeechSamplesRef.current.push(sampleObj);
        }
      }

      animFrameRef.current = requestAnimationFrame(sample);
    };

    animFrameRef.current = requestAnimationFrame(sample);
  };

  // Run the complete guided calibration procedure
  const startCalibrationFlow = async () => {
    setStep('REQUESTING');
    setProfile(null);
    setValidationResult(null);
    noiseSamplesRef.current = [];
    continuousSpeechSamplesRef.current = [];
    noiseFloorPeakRef.current = -50;
    setPhaseProgress(0);
    setElapsedSeconds(0);

    const stream = await initAudioStream();
    if (!stream) return;

    const currentStepRef = { current: 'SAMPLING_NOISE' as CalibrationStep };
    const thresholdRef = { current: -40 }; // Initial conservative threshold
    startContinuousSampling(currentStepRef, thresholdRef);

    // =========================================================================
    // PHASE 1: Quiescent Ambient Noise Floor Baseline (2.0 seconds)
    // =========================================================================
    setStep('SAMPLING_NOISE');
    setPhaseInstruction(
      'Phase 1 of 2: Measuring room acoustic baseline. Please remain silent for 2 seconds...'
    );

    const noiseDurationMs = 2000;
    const tickMs = 100;
    let noiseElapsed = 0;

    phaseTimerRef.current = setInterval(() => {
      noiseElapsed += tickMs;
      const progress = Math.min(100, Math.round((noiseElapsed / noiseDurationMs) * 100));
      setPhaseProgress(progress);
      setElapsedSeconds(Math.round((noiseElapsed / 1000) * 10) / 10);

      if (noiseElapsed >= noiseDurationMs) {
        clearInterval(phaseTimerRef.current);
        phaseTimerRef.current = null;

        // Calculate ambient noise statistics
        const noiseDbfs = noiseSamplesRef.current.map((s) => s.dbfs);
        const avgNoise =
          noiseDbfs.length > 0
            ? noiseDbfs.reduce((a, b) => a + b, 0) / noiseDbfs.length
            : -50;
        const peakNoise = noiseDbfs.length > 0 ? Math.max(...noiseDbfs) : -45;
        noiseFloorPeakRef.current = peakNoise;

        // Threshold sits 6 dB above ambient peak
        thresholdRef.current = Math.min(-20, peakNoise + 6);

        // Quality check: Reject if ambient environment is excessively loud
        if (avgNoise > -28) {
          teardownAudio();
          setStep('FAILED_NOISY');
          setErrorMessage(
            `Excessive background noise detected (${Math.round(avgNoise)} dBFS). Please move to a quieter room and retry.`
          );
          return;
        }

        // =====================================================================
        // PHASE 2: Active Voice Reading of Fixed Calibration Passage (15.0 seconds)
        // =====================================================================
        currentStepRef.current = 'SAMPLING_SPEECH';
        setStep('SAMPLING_SPEECH');
        setPhaseProgress(0);
        setElapsedSeconds(0);
        setPhaseInstruction(
          'Phase 2 of 2: Please read the entire fixed passage below aloud at your natural speaking pace:'
        );

        const speechMaxDurationMs = 18000; // Allows up to 18 seconds for ~49 words (160 WPM = ~18s)
        let speechElapsed = 0;

        phaseTimerRef.current = setInterval(() => {
          speechElapsed += tickMs;
          const speechProgress = Math.min(
            100,
            Math.round((speechElapsed / speechMaxDurationMs) * 100)
          );
          setPhaseProgress(speechProgress);
          setElapsedSeconds(Math.round((speechElapsed / 1000) * 10) / 10);

          // Check if candidate has completed reading (or time expired)
          if (speechElapsed >= speechMaxDurationMs) {
            finishSpeechPhase();
          }
        }, tickMs);
      }
    }, tickMs);
  };

  // Complete Phase 2 reading early if user finishes or automatically on timer
  const finishSpeechPhase = () => {
    if (phaseTimerRef.current) {
      clearInterval(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }

    const speechSamples = continuousSpeechSamplesRef.current;
    const activeSpeechSamples = speechSamples.filter((s) => s.isSpeech);

    const speechDbfsValues = activeSpeechSamples.map((s) => s.dbfs);
    const speechPeak = speechDbfsValues.length > 0 ? Math.max(...speechDbfsValues) : -80;

    const firstSpeech = activeSpeechSamples[0]?.timestamp || 0;
    const lastSpeech = activeSpeechSamples[activeSpeechSamples.length - 1]?.timestamp || 0;
    const measuredSpeechDurationMs = Math.max(0, lastSpeech - firstSpeech);

    const noiseFloor =
      noiseSamplesRef.current.length > 0
        ? noiseSamplesRef.current.reduce((sum, s) => sum + s.dbfs, 0) /
          noiseSamplesRef.current.length
        : -50;

    // Quality Validation
    const validation = validateCalibrationQuality(
      noiseFloor,
      measuredSpeechDurationMs,
      activeSpeechSamples.length,
      speechPeak
    );
    setValidationResult(validation);

    if (!validation.isValid) {
      teardownAudio();
      setStep('FAILED_INSUFFICIENT_SPEECH');
      setErrorMessage(
        validation.failureReason ||
          'Calibration sample was insufficient. Please read the entire passage aloud clearly and click Retry.'
      );
      return;
    }

    // Build statistically derived VoiceProfile
    const calibratedVoiceProfile = buildVoiceProfile(
      noiseSamplesRef.current,
      continuousSpeechSamplesRef.current,
      CALIBRATION_PASSAGE_WORD_COUNT
    );

    teardownAudio();
    setProfile(calibratedVoiceProfile);
    setStep('COMPLETED');
    onCalibrationComplete(calibratedVoiceProfile);
  };

  const handleReset = () => {
    teardownAudio();
    setStep('IDLE');
    setProfile(null);
    setValidationResult(null);
    setErrorMessage('');
    if (onCalibrationReset) onCalibrationReset();
  };

  return (
    <div
      id="mic-calibration-panel"
      style={{
        padding: '16px',
        borderRadius: '10px',
        background:
          step === 'COMPLETED'
            ? 'rgba(16, 185, 129, 0.06)'
            : step.startsWith('FAILED')
            ? 'rgba(239, 68, 68, 0.06)'
            : 'rgba(56, 139, 253, 0.06)',
        border: `1px solid ${
          step === 'COMPLETED'
            ? 'rgba(16, 185, 129, 0.3)'
            : step.startsWith('FAILED')
            ? 'rgba(239, 68, 68, 0.3)'
            : 'rgba(56, 139, 253, 0.3)'
        }`,
        marginBottom: '18px',
      }}
    >
      {/* Header & Status Badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>
            {step === 'COMPLETED'
              ? '✅'
              : step.startsWith('FAILED')
              ? '⚠️'
              : '🎙️'}
          </span>
          <strong
            style={{ fontSize: '13px', color: 'var(--text-main, #e6edf3)' }}
          >
            Acoustic Voice Calibration
          </strong>
        </div>

        <span
          id="calibration-status-badge"
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '12px',
            background:
              step === 'COMPLETED'
                ? 'rgba(16, 185, 129, 0.2)'
                : step.startsWith('FAILED')
                ? 'rgba(239, 68, 68, 0.2)'
                : 'rgba(6, 182, 212, 0.2)',
            color:
              step === 'COMPLETED'
                ? '#10b981'
                : step.startsWith('FAILED')
                ? '#ef4444'
                : '#06b6d4',
            border: `1px solid ${
              step === 'COMPLETED'
                ? 'rgba(16, 185, 129, 0.4)'
                : step.startsWith('FAILED')
                ? 'rgba(239, 68, 68, 0.4)'
                : 'rgba(6, 182, 212, 0.4)'
            }`,
          }}
        >
          {step === 'IDLE' && 'Ready to Calibrate'}
          {step === 'REQUESTING' && '⏳ Accessing Mic...'}
          {step === 'SAMPLING_NOISE' && '🤫 Step 1: Measuring Room Acoustics'}
          {step === 'SAMPLING_SPEECH' && '🗣️ Step 2: Reading Fixed Passage'}
          {step === 'COMPLETED' && '✓ Calibrated & Verified'}
          {step === 'FAILED_NO_DEVICE' && '✕ No Microphone'}
          {step === 'FAILED_PERMISSION' && '✕ Permission Denied'}
          {step === 'FAILED_SILENCE' && '✕ No Speech Detected'}
          {step === 'FAILED_NOISY' && '✕ High Background Noise'}
          {step === 'FAILED_INSUFFICIENT_SPEECH' && '✕ Sample Insufficient'}
        </span>
      </div>

      {/* Real-time Dual-Metric Audio Meter (Active during sampling) */}
      {(step === 'SAMPLING_NOISE' || step === 'SAMPLING_SPEECH') && (
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--text-muted, #8b949e)',
              marginBottom: '4px',
            }}
          >
            <span>Real-time Audio Energy:</span>
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                color: metrics.isVoiced ? '#10b981' : 'var(--text-main, #e6edf3)',
              }}
            >
              {metrics.currentDbfs > -80 ? `${metrics.currentDbfs} dBFS` : 'Silence'}{' '}
              {metrics.isVoiced && (
                <span style={{ color: '#10b981' }}>
                  (Periodic Voicing • ~{metrics.pitchHz} Hz)
                </span>
              )}
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '14px',
              background: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '7px',
              overflow: 'hidden',
              border: '1px solid var(--border-color, #2d333b)',
              position: 'relative',
            }}
          >
            <div
              id="mic-volume-level-meter"
              style={{
                width: `${metrics.meterPercent}%`,
                height: '100%',
                background:
                  metrics.currentDbfs >= -3
                    ? 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)'
                    : metrics.isVoiced
                    ? 'linear-gradient(90deg, #06b6d4, #10b981)'
                    : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                transition: 'width 50ms ease-out',
                borderRadius: '7px',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '9px',
              color: 'var(--text-muted, #8b949e)',
              marginTop: '3px',
              fontFamily: 'monospace',
            }}
          >
            <span>-70 dBFS (Floor)</span>
            <span>-45 dBFS (Room)</span>
            <span>-25 dBFS (Speech)</span>
            <span>-6 dBFS (Loud)</span>
            <span>0 dBFS (Peak)</span>
          </div>
        </div>
      )}

      {/* Guided Calibration Workflow */}

      {/* 1. IDLE State: Start Action & Instructions */}
      {step === 'IDLE' && (
        <div>
          <p
            style={{
              margin: '0 0 10px 0',
              fontSize: '12px',
              color: 'var(--text-muted, #8b949e)',
              lineHeight: '1.5',
            }}
          >
            Before your oral examination begins, complete this acoustic calibration.
            You will stay quiet for 2 seconds to measure room background noise, then
            read a fixed 49-word passage aloud at your natural speaking volume.
          </p>
          <button
            type="button"
            id="btn-start-calibration"
            onClick={startCalibrationFlow}
            style={{
              padding: '7px 16px',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🎙️ Start Acoustic Calibration
          </button>
        </div>
      )}

      {/* 2. Step 1: Sampling Noise Floor */}
      {step === 'SAMPLING_NOISE' && (
        <div style={{ marginTop: '8px' }}>
          <p
            style={{
              margin: '0 0 8px 0',
              fontSize: '12px',
              color: '#06b6d4',
              lineHeight: '1.4',
              fontWeight: 500,
            }}
          >
            🤫 {phaseInstruction}
          </p>
          <div
            style={{
              width: '100%',
              height: '6px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${phaseProgress}%`,
                height: '100%',
                background: '#06b6d4',
                transition: 'width 60ms linear',
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Step 2: Sampling Speech with Fixed Passage */}
      {step === 'SAMPLING_SPEECH' && (
        <div style={{ marginTop: '8px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: '#10b981',
                fontWeight: 600,
              }}
            >
              🗣️ {phaseInstruction}
            </p>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted, #8b949e)',
                fontFamily: 'monospace',
              }}
            >
              Elapsed: {elapsedSeconds}s / 18s
            </span>
          </div>

          {/* EXACT CALIBRATION PASSAGE DISPLAY */}
          <div
            id="calibration-fixed-passage"
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              marginBottom: '10px',
              lineHeight: '1.6',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                color: '#e6edf3',
                fontWeight: 500,
              }}
            >
              "{EXACT_CALIBRATION_PASSAGE}"
            </span>
            <div
              style={{
                marginTop: '6px',
                fontSize: '10px',
                color: '#10b981',
                fontWeight: 600,
              }}
            >
              Passage length: {CALIBRATION_PASSAGE_WORD_COUNT} words
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                flex: 1,
                height: '6px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${phaseProgress}%`,
                  height: '100%',
                  background: '#10b981',
                  transition: 'width 80ms linear',
                }}
              />
            </div>
            <button
              type="button"
              onClick={finishSpeechPhase}
              style={{
                padding: '4px 10px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                borderRadius: '4px',
                color: '#10b981',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done Reading ✓
            </button>
          </div>
        </div>
      )}

      {/* 4. COMPLETED State: Measured VoiceProfile Output & Quality Checklist */}
      {step === 'COMPLETED' && profile && (
        <div>
          {/* Quality Checklist */}
          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#10b981',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Calibration Quality Checklist
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '4px 12px',
                fontSize: '11px',
                color: 'var(--text-main, #e6edf3)',
              }}
            >
              <div>✓ Microphone detected</div>
              <div>✓ Speech detected</div>
              <div>✓ Sample sufficient ({CALIBRATION_PASSAGE_WORD_COUNT} words)</div>
              <div>✓ Background noise acceptable</div>
              <div>✓ Speech rate calculated ({profile.speechRateWpm} WPM)</div>
              <div>✓ Distribution percentiles derived</div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <div>
              <strong
                style={{ fontSize: '12px', color: 'var(--text-main, #e6edf3)' }}
              >
                ✓ Active Acoustic VoiceProfile:
              </strong>
              {profile.calibratedAt && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #8b949e)', marginTop: '2px' }}>
                  Calibrated: {new Date(profile.calibratedAt).toLocaleString()}
                </div>
              )}
            </div>
            <button
              type="button"
              id="btn-recalibrate"
              onClick={handleReset}
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '6px',
                padding: '4px 10px',
                color: '#60a5fa',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Environment or microphone changed? Click to re-run acoustic calibration."
            >
              🔄 Recalibrate
            </button>
          </div>

          {/* Volume Distribution & Rate Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                background: 'rgba(0,0,0,0.25)',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #2d333b)',
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--text-muted, #8b949e)' }}>
                Noise Floor
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: profile.noiseFloor <= -38 ? '#10b981' : '#f59e0b',
                }}
              >
                {profile.noiseFloor} dBFS
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0,0,0,0.25)',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #2d333b)',
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--text-muted, #8b949e)' }}>
                Median Volume (P50)
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#06b6d4',
                }}
              >
                {profile.medianVolume} dBFS
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0,0,0,0.25)',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #2d333b)',
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--text-muted, #8b949e)' }}>
                Volume IQR (P25 - P75)
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--text-main, #e6edf3)',
                  marginTop: '2px',
                }}
              >
                {profile.p25Volume} to {profile.p75Volume} dBFS
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0,0,0,0.25)',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #2d333b)',
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--text-muted, #8b949e)' }}>
                Speech Rate
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#10b981',
                }}
              >
                {profile.speechRateWpm} WPM
              </div>
            </div>
          </div>

          {/* Pause & Confidence Metrics */}
          <div
            style={{
              padding: '8px 10px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #2d333b)',
              fontSize: '11px',
              color: 'var(--text-muted, #8b949e)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              Pauses:{' '}
              <strong style={{ color: 'var(--text-main, #e6edf3)' }}>
                {profile.medianPauseMs > 0
                  ? `Median ${profile.medianPauseMs}ms • P75 ${profile.p75PauseMs}ms`
                  : 'Continuous flow (<200ms pauses)'}
              </strong>
            </span>
            <span>
              Confidence:{' '}
              <strong style={{ color: '#10b981' }}>
                Vol {Math.round(profile.confidence.volume * 100)}% • Rate{' '}
                {Math.round(profile.confidence.speechRate * 100)}% • Pause{' '}
                {Math.round(profile.confidence.pauses * 100)}%
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* 5. Failure States with Specific Guidance & Retry */}
      {step.startsWith('FAILED') && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            padding: '10px 12px',
            marginTop: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <strong
                style={{
                  fontSize: '12px',
                  color: '#ef4444',
                  display: 'block',
                  marginBottom: '3px',
                }}
              >
                {step === 'FAILED_NO_DEVICE' && 'No Microphone Detected'}
                {step === 'FAILED_PERMISSION' && 'Microphone Access Blocked'}
                {step === 'FAILED_SILENCE' && 'No Voice Detected'}
                {step === 'FAILED_NOISY' && 'High Ambient Background Noise'}
                {step === 'FAILED_INSUFFICIENT_SPEECH' &&
                  'Calibration Sample Insufficient'}
              </strong>
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '11px',
                  color: 'var(--text-main, #e6edf3)',
                  lineHeight: '1.5',
                }}
              >
                {errorMessage}
              </p>
              <button
                type="button"
                id="btn-retry-calibration"
                onClick={startCalibrationFlow}
                style={{
                  padding: '5px 12px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                🔄 Retry Calibration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
