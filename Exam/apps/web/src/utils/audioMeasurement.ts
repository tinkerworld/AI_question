/**
 * Audio Measurement Pipeline for Voice Calibration (Sprint 2)
 * 
 * Provides acoustically sound DSP functions for:
 * - True RMS (Root Mean Square) energy calculation from Float32Array PCM samples
 * - Standard decibels relative to full-scale (dBFS) conversion
 * - Continuous sample collection (AudioSample distribution)
 * - Quiescent noise floor, median volume, p25 volume, and p75 volume percentiles
 * - Autocorrelation-based pitch & periodic voicing estimation
 * - Physical speech start/end boundary detection & speech rate (WPM) calculation
 * - Natural pause distribution (medianPauseMs, p75PauseMs)
 * - Measurement-derived confidence scoring (volume, speechRate, pauses)
 * - Sample quality validation & rejection rules
 */

export const EXACT_CALIBRATION_PASSAGE =
  "As an oral examination candidate, I will articulate my technical reasoning with clarity, structure, and composure. During this viva assessment, I will carefully evaluate problem constraints, address operational challenges under pressure, and demonstrate analytical depth across diverse real-world engineering scenarios. I am prepared to answer all examiner questions thoughtfully.";

export const CALIBRATION_PASSAGE_WORD_COUNT = 49;

export type CalibrationStep =
  | 'IDLE'
  | 'REQUESTING'
  | 'SAMPLING_NOISE'
  | 'SAMPLING_SPEECH'
  | 'COMPLETED'
  | 'FAILED_NO_DEVICE'
  | 'FAILED_PERMISSION'
  | 'FAILED_SILENCE'
  | 'FAILED_NOISY'
  | 'FAILED_INSUFFICIENT_SPEECH'
  | 'FAILED_UNREALISTIC_SPEED';

export interface AudioSample {
  timestamp: number; // Monotonic or Date.now() timestamp (ms)
  rms: number;       // Linear RMS amplitude [0.0 ... 1.0]
  dbfs: number;      // Decibels full-scale [-100 ... 0]
  isSpeech: boolean; // True when sample energy & voicing exceed noise floor
}

export interface VoiceProfile {
  version: number;
  noiseFloor: number;
  medianVolume: number;
  p25Volume: number;
  p75Volume: number;
  speechRateWpm: number;
  medianPauseMs: number;
  p75PauseMs: number;
  confidence: {
    volume: number;
    speechRate: number;
    pauses: number;
  };
  calibratedAt: string;
}

export interface CalibrationValidationResult {
  isValid: boolean;
  failureReason?: string;
  checks: {
    microphoneDetected: boolean;
    speechDetected: boolean;
    sampleSufficient: boolean;
    backgroundNoiseAcceptable: boolean;
    speechMeasurementComplete: boolean;
  };
}

export interface RealtimeAudioMetrics {
  currentRms: number;
  currentDbfs: number;
  meterPercent: number;
  isVoiced: boolean;
  pitchHz: number;
  voicingConfidence: number;
}

/**
 * Computes true Root Mean Square (RMS) energy of a PCM sample buffer:
 * RMS = sqrt( (1 / N) * sum( x[i]^2 ) )
 */
export function computeRms(buffer: Float32Array | number[]): number {
  if (!buffer || buffer.length === 0) return 0;
  let sumSquares = 0;
  const len = buffer.length;
  for (let i = 0; i < len; i++) {
    const val = buffer[i];
    sumSquares += val * val;
  }
  return Math.sqrt(sumSquares / len);
}

/**
 * Converts linear RMS amplitude [0.0 ... 1.0] to decibels relative to full-scale (dBFS):
 * dBFS = 20 * log10(RMS)
 * Clamped to floorDbfs (default -100 dBFS) to prevent -Infinity on pure silence.
 */
export function rmsToDbfs(rms: number, floorDbfs = -100): number {
  if (rms <= 0.000001) return floorDbfs;
  const db = 20 * Math.log10(rms);
  return Math.max(floorDbfs, Math.min(0, Math.round(db * 10) / 10));
}

/**
 * Maps a dBFS value to a 0..100 percentage scale for UI progress meters.
 * Defaults: -70 dBFS is 0%, 0 dBFS is 100%.
 */
export function dbfsToNormalizedPercent(
  dbfs: number,
  minDbfs = -70,
  maxDbfs = 0
): number {
  if (dbfs <= minDbfs) return 0;
  if (dbfs >= maxDbfs) return 100;
  const range = maxDbfs - minDbfs;
  const normalized = (dbfs - minDbfs) / range;
  return Math.round(Math.max(0, Math.min(100, normalized * 100)));
}

/**
 * Autocorrelation-based pitch and voicing detection.
 * Searches for fundamental frequency F0 within human vocal range (80 Hz - 500 Hz).
 * Normalized peak correlation > 0.32 confirms periodic human vocal fold vibration.
 */
export function detectVoicing(
  buffer: Float32Array | number[],
  sampleRate = 44100
): { isVoiced: boolean; pitchHz: number; confidence: number } {
  if (!buffer || buffer.length < 512) {
    return { isVoiced: false, pitchHz: 0, confidence: 0 };
  }

  const len = buffer.length;
  let r0 = 0;
  for (let i = 0; i < len; i++) {
    r0 += buffer[i] * buffer[i];
  }

  // Pure digital silence or extremely quiet (< -65 dBFS RMS)
  if (r0 < 0.00005) {
    return { isVoiced: false, pitchHz: 0, confidence: 0 };
  }

  const minFreq = 80;  // Lowest typical human voice fundamental (Hz)
  const maxFreq = 500; // Highest typical human voice fundamental (Hz)

  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.min(len - 1, Math.floor(sampleRate / minFreq));

  let maxR = -1;
  let bestLag = -1;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let r = 0;
    for (let i = 0; i < len - lag; i++) {
      r += buffer[i] * buffer[i + lag];
    }
    if (r > maxR) {
      maxR = r;
      bestLag = lag;
    }
  }

  const normR = r0 > 0 ? maxR / r0 : 0;
  const confidence = Math.min(1, Math.max(0, (normR - 0.25) / 0.65));
  const isVoiced = normR >= 0.32 && confidence >= 0.15;
  const pitchHz = isVoiced && bestLag > 0 ? Math.round(sampleRate / bestLag) : 0;

  return {
    isVoiced,
    pitchHz,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Computes a percentile (0.0 ... 1.0) of a numerical array using linear rank interpolation.
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (!values || values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * Math.max(0, Math.min(1, percentile));
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  const result = sorted[lower] * (1 - weight) + sorted[upper] * weight;
  return Math.round(result * 10) / 10;
}

/**
 * Identifies speech boundaries (actualSpeechStart, actualSpeechEnd) from continuous samples.
 * Filters out isolated spurious clicks (< 100ms) by requiring speech persistence.
 */
export function identifySpeechBoundaries(
  samples: AudioSample[]
): { speechStartMs: number; speechEndMs: number; speechSamples: AudioSample[] } {
  if (!samples || samples.length === 0) {
    return { speechStartMs: 0, speechEndMs: 0, speechSamples: [] };
  }

  let speechStartMs = 0;
  let speechEndMs = 0;

  for (let i = 0; i < samples.length; i++) {
    if (samples[i].isSpeech) {
      // Lookahead: ensure at least 2 consecutive speech frames
      if (i + 1 < samples.length && samples[i + 1].isSpeech) {
        speechStartMs = samples[i].timestamp;
        break;
      }
    }
  }

  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].isSpeech) {
      if (i - 1 >= 0 && samples[i - 1].isSpeech) {
        speechEndMs = samples[i].timestamp;
        break;
      }
    }
  }

  const speechSamples = samples.filter(
    (s) => s.timestamp >= speechStartMs && s.timestamp <= speechEndMs && s.isSpeech
  );

  return { speechStartMs, speechEndMs, speechSamples };
}

/**
 * Calculates natural pause statistics within the candidate's speech window.
 * Only pauses >= 200ms between words/sentences are counted to avoid consonant closures.
 */
export function calculatePauseStatistics(
  samples: AudioSample[],
  speechStartMs: number,
  speechEndMs: number
): { medianPauseMs: number; p75PauseMs: number; pauseCount: number } {
  if (speechStartMs >= speechEndMs || samples.length === 0) {
    return { medianPauseMs: 0, p75PauseMs: 0, pauseCount: 0 };
  }

  const windowSamples = samples.filter(
    (s) => s.timestamp >= speechStartMs && s.timestamp <= speechEndMs
  );

  const pauseDurationsMs: number[] = [];
  let inPause = false;
  let pauseStart = 0;

  for (let i = 0; i < windowSamples.length; i++) {
    const s = windowSamples[i];
    if (!s.isSpeech) {
      if (!inPause) {
        inPause = true;
        pauseStart = s.timestamp;
      }
    } else {
      if (inPause) {
        inPause = false;
        const duration = s.timestamp - pauseStart;
        if (duration >= 200) {
          pauseDurationsMs.push(duration);
        }
      }
    }
  }

  if (pauseDurationsMs.length === 0) {
    return { medianPauseMs: 0, p75PauseMs: 0, pauseCount: 0 };
  }

  return {
    medianPauseMs: Math.round(calculatePercentile(pauseDurationsMs, 0.5)),
    p75PauseMs: Math.round(calculatePercentile(pauseDurationsMs, 0.75)),
    pauseCount: pauseDurationsMs.length,
  };
}

/**
 * Validates the collected calibration dataset against strict quality criteria.
 */
export function validateCalibrationQuality(
  noiseFloorDbfs: number,
  speechDurationMs: number,
  speechSampleCount: number,
  speechPeakDbfs: number
): CalibrationValidationResult {
  const microphoneDetected = true;
  const speechDetected = speechSampleCount >= 10 && speechPeakDbfs > noiseFloorDbfs + 6;
  const backgroundNoiseAcceptable = noiseFloorDbfs <= -28.0;

  // For 49 words, expected duration is 12s - 45s (65 - 245 WPM).
  // A duration under 7.0 seconds indicates candidate skipped or did not finish the passage.
  const sampleSufficient = speechDurationMs >= 7000 && speechSampleCount >= 40;
  const speechMeasurementComplete = speechDetected && sampleSufficient;

  const isValid =
    microphoneDetected &&
    speechDetected &&
    backgroundNoiseAcceptable &&
    sampleSufficient &&
    speechMeasurementComplete;

  let failureReason: string | undefined;
  if (!backgroundNoiseAcceptable) {
    failureReason = `Excessive background noise detected (${noiseFloorDbfs} dBFS). Please move to a quieter room and retry.`;
  } else if (!speechDetected) {
    failureReason = 'No clear voice signal detected. Please verify your microphone is not muted and speak clearly.';
  } else if (!sampleSufficient) {
    failureReason = 'Insufficient speech captured. Please read the entire passage aloud without skipping.';
  }

  return {
    isValid,
    failureReason,
    checks: {
      microphoneDetected,
      speechDetected,
      sampleSufficient,
      backgroundNoiseAcceptable,
      speechMeasurementComplete,
    },
  };
}

/**
 * Generates the complete, statistically derived VoiceProfile from continuous audio samples.
 */
export function buildVoiceProfile(
  noiseSamples: AudioSample[],
  continuousSpeechSamples: AudioSample[],
  wordCount = CALIBRATION_PASSAGE_WORD_COUNT
): VoiceProfile {
  // 1. Noise Floor: Arithmetic mean of quiescent ambient samples
  const noiseDbfsList = noiseSamples.map((s) => s.dbfs);
  const noiseFloor =
    noiseDbfsList.length > 0
      ? Math.round(
          (noiseDbfsList.reduce((a, b) => a + b, 0) / noiseDbfsList.length) * 10
        ) / 10
      : -50.0;

  // 2. Speech Boundaries
  const { speechStartMs, speechEndMs, speechSamples } = identifySpeechBoundaries(
    continuousSpeechSamples
  );

  const speechVolumes = speechSamples.map((s) => s.dbfs);

  // 3. Percentiles from speech sample distribution
  const medianVolume = calculatePercentile(speechVolumes, 0.5);
  const p25Volume = calculatePercentile(speechVolumes, 0.25);
  const p75Volume = calculatePercentile(speechVolumes, 0.75);

  // 4. Speech Rate from actual physical speech timestamps (NOT Web Speech callback)
  const speechDurationMs = Math.max(1000, speechEndMs - speechStartMs);
  const speechDurationMinutes = speechDurationMs / 60000;
  const speechRateWpm = Math.round(wordCount / speechDurationMinutes);

  // 5. Pause statistics
  const { medianPauseMs, p75PauseMs, pauseCount } = calculatePauseStatistics(
    continuousSpeechSamples,
    speechStartMs,
    speechEndMs
  );

  // 6. Confidence Scoring
  // Volume confidence: based on number of samples and SNR stability
  const snr = Math.max(0, medianVolume - noiseFloor);
  const volumeSampleSizeFactor = Math.min(1.0, speechSamples.length / 60);
  const volumeSnrFactor = Math.min(1.0, snr / 15);
  const volumeConfidence =
    Math.round((0.6 * volumeSampleSizeFactor + 0.4 * volumeSnrFactor) * 100) / 100;

  // Speech rate confidence: based on whether reading speed falls in human bounds (80 - 220 WPM)
  let rateConfidence = 0.5;
  if (speechRateWpm >= 90 && speechRateWpm <= 200) {
    rateConfidence = 0.92;
  } else if (speechRateWpm >= 60 && speechRateWpm <= 240) {
    rateConfidence = 0.75;
  } else {
    rateConfidence = 0.45;
  }

  // Pause confidence: 50-word passage contains 2-5 pauses.
  // Documented limitation: single short passage gives moderate pause confidence.
  let pauseConfidence = 0.4;
  if (pauseCount >= 3) {
    pauseConfidence = 0.82;
  } else if (pauseCount >= 1) {
    pauseConfidence = 0.65;
  } else {
    pauseConfidence = 0.35; // Continuous speech without distinct pause
  }

  return {
    version: 1,
    noiseFloor,
    medianVolume,
    p25Volume,
    p75Volume,
    speechRateWpm,
    medianPauseMs,
    p75PauseMs,
    confidence: {
      volume: Math.min(1.0, Math.max(0.1, volumeConfidence)),
      speechRate: Math.min(1.0, Math.max(0.1, rateConfidence)),
      pauses: Math.min(1.0, Math.max(0.1, pauseConfidence)),
    },
    calibratedAt: new Date().toISOString(),
  };
}

/**
 * Default fallback acoustic parameters (Pre-Sprint-4 fixed behavior)
 */
export const DEFAULT_PAUSE_TIMEOUT_MS = 4000;
export const DEFAULT_SILENCE_THRESHOLD_DBFS = -35.0;

// Internal runtime state for feature flag
let _usePersonalizedVoiceCalibration = true;

/**
 * Check if the feature flag USE_PERSONALIZED_VOICE_CALIBRATION is enabled.
 * Defaults to true. Supports localStorage override in browser environments.
 */
export function getUsePersonalizedVoiceCalibration(): boolean {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem('USE_PERSONALIZED_VOICE_CALIBRATION');
    if (stored !== null) {
      return stored === 'true';
    }
  }
  return _usePersonalizedVoiceCalibration;
}

/**
 * Sets the feature flag USE_PERSONALIZED_VOICE_CALIBRATION runtime state and local storage.
 */
export function setUsePersonalizedVoiceCalibration(enabled: boolean): void {
  _usePersonalizedVoiceCalibration = enabled;
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('USE_PERSONALIZED_VOICE_CALIBRATION', String(enabled));
  }
}

/**
 * Calculates personalized pause timeout duration in milliseconds.
 * 
 * When enabled and a valid profile is supplied:
 * Derives pause tolerance from speechRateWpm and p75PauseMs.
 * Bounded safely to [1800ms, 5000ms].
 * 
 * When disabled (or profile missing):
 * Cleanly reverts to pre-Sprint-4 fixed behavior (4000ms).
 */
export function calculatePersonalizedPauseTimeout(
  profile: VoiceProfile | null,
  isEnabled = getUsePersonalizedVoiceCalibration()
): number {
  if (!isEnabled || !profile) {
    return DEFAULT_PAUSE_TIMEOUT_MS;
  }

  const baseWpm = 140;
  const safeWpm = Math.max(50, Math.min(260, profile.speechRateWpm || baseWpm));
  const rateFactor = Math.max(0.6, Math.min(1.8, baseWpm / safeWpm));
  const safeP75Pause = Math.max(100, Math.min(1500, profile.p75PauseMs || 350));

  const rawTimeout = 1200 + safeP75Pause * 2.5 * rateFactor;
  return Math.round(Math.max(1800, Math.min(5000, rawTimeout)));
}

/**
 * Calculates personalized silence detection threshold in dBFS.
 * 
 * When enabled and a valid profile is supplied:
 * Derives silence threshold from noiseFloor and medianVolume.
 * Bounded safely to [-55.0 dBFS, -18.0 dBFS].
 * 
 * When disabled (or profile missing):
 * Cleanly reverts to pre-Sprint-4 fixed behavior (-35.0 dBFS).
 */
export function calculatePersonalizedSilenceThreshold(
  profile: VoiceProfile | null,
  isEnabled = getUsePersonalizedVoiceCalibration()
): number {
  if (!isEnabled || !profile) {
    return DEFAULT_SILENCE_THRESHOLD_DBFS;
  }

  const noiseFloor = Math.max(-80, Math.min(-20, profile.noiseFloor));
  const medianVol = Math.max(-60, Math.min(0, profile.medianVolume));
  const snr = Math.max(6, medianVol - noiseFloor);
  const margin = Math.max(5.0, Math.min(15.0, snr * 0.35));

  const rawThreshold = noiseFloor + margin;
  return Math.round(Math.max(-55.0, Math.min(-18.0, rawThreshold)) * 10) / 10;
}

/**
 * Combined parameters helper for live turn recording
 */
export function calculateTurnAcousticParameters(
  profile: VoiceProfile | null,
  isEnabled = getUsePersonalizedVoiceCalibration()
): {
  pauseTimeoutMs: number;
  silenceThresholdDbfs: number;
  isPersonalized: boolean;
} {
  const active = isEnabled && profile !== null;
  return {
    pauseTimeoutMs: calculatePersonalizedPauseTimeout(profile, isEnabled),
    silenceThresholdDbfs: calculatePersonalizedSilenceThreshold(profile, isEnabled),
    isPersonalized: active,
  };
}

/**
 * Common continuation words, transition markers, and connective prepositions
 * indicating the candidate is mid-thought or formulating their next clause.
 */
export const CONTINUATION_WORDS = new Set([
  'and', 'because', 'but', 'so', 'or', 'also', 'which', 'that',
  'although', 'though', 'since', 'while', 'whereas',
  'if', 'when', 'unless', 'until',
  'firstly', 'secondly', 'thirdly', 'finally', 'next',
  'furthermore', 'moreover', 'however', 'therefore', 'additionally',
  'specifically', 'like', 'including', 'such',
  'to', 'with', 'for', 'in', 'on', 'at', 'by', 'about', 'into', 'through', 'during'
]);

export const NON_MEANINGFUL_SINGLE_WORDS = new Set([
  'you', 'thank', 'thanks', 'bye', 'goodbye', 'um', 'uh', 'ah', 'oh', 
  'er', 'hmm', 'yeah', 'yes', 'no', 'ok', 'okay', 'right', 'alright', 
  'so', 'well', 'like', 'music', 'silence', 'blank_audio'
]);

export function isIncompleteCandidateThought(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.replace(/\[.*?\]|\(.*?\)/g, '').trim();
  if (!clean) return false;

  // 1. Trailing punctuation that explicitly indicates continuation or mid-clause pause
  if (/[,\-–—…;:]\s*$/.test(clean)) {
    return true;
  }

  // 2. Trailing multi-word connector phrases
  if (/(such as|for example|for instance|as well as|in order to|due to|which means|in terms of|that is|on the other hand|in addition to)\s*$/i.test(clean)) {
    return true;
  }

  // 3. Last spoken word is a coordinating conjunction, subordinating conjunction, or transition marker
  const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const lastWord = words[words.length - 1];
    if (CONTINUATION_WORDS.has(lastWord)) {
      return true;
    }
  }

  return false;
}

export function isMeaningfulCandidateResponse(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.replace(/\[.*?\]|\(.*?\)/g, '').trim();
  if (!clean) return false;

  const words = clean.toLowerCase().match(/[a-z0-9]+/g) || [];
  if (words.length === 0) return false;
  if (words.length === 1 && NON_MEANINGFUL_SINGLE_WORDS.has(words[0])) {
    return false;
  }
  const lettersOnly = clean.replace(/[^a-zA-Z0-9]/g, '');
  if (lettersOnly.length < 2) return false;

  return true;
}

/**
 * Calculates adaptive silence wait time for candidate responses.
 * Prevents premature submission when candidate is giving a long answer or pausing between clauses.
 * 
 * - Base wait: From user-selected pacing (fast: 1.8s, natural: 3.0s, thoughtful: 4.0s, relaxed: 5.0s)
 * - Long answer scaling:
 *     >= 35 words or >= 20s elapsed: +1800ms
 *     >= 15 words or >= 10s elapsed: +1000ms
 *     >= 6 words or >= 5s elapsed: +400ms
 * - Incomplete thought guard: +2200ms when ending on conjunction/transition word
 * - Capped at 7000ms to preserve conversational responsiveness.
 */
export function getEffectiveSilenceWaitMs(
  text = '',
  recordingDurationMs = 0,
  baseWaitMs = 3000
): number {
  let bonusMs = 0;
  const words = (text || '').replace(/\[.*?\]|\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Adaptive scaling: longer, structured answers receive generous breathing room between sentences
  if (wordCount >= 35 || recordingDurationMs >= 20000) {
    bonusMs += 1800;
  } else if (wordCount >= 15 || recordingDurationMs >= 10000) {
    bonusMs += 1000;
  } else if (wordCount >= 6 || recordingDurationMs >= 5000) {
    bonusMs += 400;
  }

  // Incomplete sentence guard: grant additional grace period if candidate ended on a connector
  if (isIncompleteCandidateThought(text)) {
    bonusMs += 2200;
  }

  return Math.min(7000, baseWaitMs + bonusMs);
}

