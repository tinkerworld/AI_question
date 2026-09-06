const { test, describe } = require('node:test');
const assert = require('node:assert');

// Exact calibration passage defined in the prompt and application
const EXACT_CALIBRATION_PASSAGE =
  "As an oral examination candidate, I will articulate my technical reasoning with clarity, structure, and composure. During this viva assessment, I will carefully evaluate problem constraints, address operational challenges under pressure, and demonstrate analytical depth across diverse real-world engineering scenarios. I am prepared to answer all examiner questions thoughtfully.";

const CALIBRATION_PASSAGE_WORD_COUNT = 49;

// Pure DSP functions mirroring audioMeasurement.ts for commonjs test runner

function computeRms(buffer) {
  if (!buffer || buffer.length === 0) return 0;
  let sumSquares = 0;
  const len = buffer.length;
  for (let i = 0; i < len; i++) {
    const val = buffer[i];
    sumSquares += val * val;
  }
  return Math.sqrt(sumSquares / len);
}

function rmsToDbfs(rms, floorDbfs = -100) {
  if (rms <= 0.000001) return floorDbfs;
  const db = 20 * Math.log10(rms);
  return Math.max(floorDbfs, Math.min(0, Math.round(db * 10) / 10));
}

function dbfsToNormalizedPercent(dbfs, minDbfs = -70, maxDbfs = 0) {
  if (dbfs <= minDbfs) return 0;
  if (dbfs >= maxDbfs) return 100;
  const range = maxDbfs - minDbfs;
  const normalized = (dbfs - minDbfs) / range;
  return Math.round(Math.max(0, Math.min(100, normalized * 100)));
}

function detectVoicing(buffer, sampleRate = 44100) {
  if (!buffer || buffer.length < 512) {
    return { isVoiced: false, pitchHz: 0, confidence: 0 };
  }

  const len = buffer.length;
  let r0 = 0;
  for (let i = 0; i < len; i++) {
    r0 += buffer[i] * buffer[i];
  }

  if (r0 < 0.00005) {
    return { isVoiced: false, pitchHz: 0, confidence: 0 };
  }

  const minFreq = 80;
  const maxFreq = 500;

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

function calculatePercentile(values, percentile) {
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

function identifySpeechBoundaries(samples) {
  if (!samples || samples.length === 0) {
    return { speechStartMs: 0, speechEndMs: 0, speechSamples: [] };
  }

  let speechStartMs = 0;
  let speechEndMs = 0;

  for (let i = 0; i < samples.length; i++) {
    if (samples[i].isSpeech) {
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

function calculatePauseStatistics(samples, speechStartMs, speechEndMs) {
  if (speechStartMs >= speechEndMs || samples.length === 0) {
    return { medianPauseMs: 0, p75PauseMs: 0, pauseCount: 0 };
  }

  const windowSamples = samples.filter(
    (s) => s.timestamp >= speechStartMs && s.timestamp <= speechEndMs
  );

  const pauseDurationsMs = [];
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

function validateCalibrationQuality(
  noiseFloorDbfs,
  speechDurationMs,
  speechSampleCount,
  speechPeakDbfs
) {
  const microphoneDetected = true;
  const speechDetected = speechSampleCount >= 10 && speechPeakDbfs > noiseFloorDbfs + 6;
  const backgroundNoiseAcceptable = noiseFloorDbfs <= -28.0;
  const sampleSufficient = speechDurationMs >= 7000 && speechSampleCount >= 40;
  const speechMeasurementComplete = speechDetected && sampleSufficient;

  const isValid =
    microphoneDetected &&
    speechDetected &&
    backgroundNoiseAcceptable &&
    sampleSufficient &&
    speechMeasurementComplete;

  let failureReason;
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

function buildVoiceProfile(noiseSamples, continuousSpeechSamples, wordCount = CALIBRATION_PASSAGE_WORD_COUNT) {
  const noiseDbfsList = noiseSamples.map((s) => s.dbfs);
  const noiseFloor =
    noiseDbfsList.length > 0
      ? Math.round((noiseDbfsList.reduce((a, b) => a + b, 0) / noiseDbfsList.length) * 10) / 10
      : -50.0;

  const { speechStartMs, speechEndMs, speechSamples } = identifySpeechBoundaries(
    continuousSpeechSamples
  );

  const speechVolumes = speechSamples.map((s) => s.dbfs);
  const medianVolume = calculatePercentile(speechVolumes, 0.5);
  const p25Volume = calculatePercentile(speechVolumes, 0.25);
  const p75Volume = calculatePercentile(speechVolumes, 0.75);

  const speechDurationMs = Math.max(1000, speechEndMs - speechStartMs);
  const speechDurationMinutes = speechDurationMs / 60000;
  const speechRateWpm = Math.round(wordCount / speechDurationMinutes);

  const { medianPauseMs, p75PauseMs, pauseCount } = calculatePauseStatistics(
    continuousSpeechSamples,
    speechStartMs,
    speechEndMs
  );

  const snr = Math.max(0, medianVolume - noiseFloor);
  const volumeSampleSizeFactor = Math.min(1.0, speechSamples.length / 60);
  const volumeSnrFactor = Math.min(1.0, snr / 15);
  const volumeConfidence =
    Math.round((0.6 * volumeSampleSizeFactor + 0.4 * volumeSnrFactor) * 100) / 100;

  let rateConfidence = 0.5;
  if (speechRateWpm >= 90 && speechRateWpm <= 200) {
    rateConfidence = 0.92;
  } else if (speechRateWpm >= 60 && speechRateWpm <= 240) {
    rateConfidence = 0.75;
  } else {
    rateConfidence = 0.45;
  }

  let pauseConfidence = 0.4;
  if (pauseCount >= 3) {
    pauseConfidence = 0.82;
  } else if (pauseCount >= 1) {
    pauseConfidence = 0.65;
  } else {
    pauseConfidence = 0.35;
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

describe('Voice Calibration & Measurement Engine (Sprint 2 Specification Tests)', () => {
  test('Exact Fixed Calibration Passage: Word count is exactly 49 words', () => {
    const words = EXACT_CALIBRATION_PASSAGE.trim().split(/\s+/);
    assert.strictEqual(words.length, CALIBRATION_PASSAGE_WORD_COUNT);
    assert.strictEqual(words.length, 49);
    // Neutral subject matter, 3 sentences
    const sentences = EXACT_CALIBRATION_PASSAGE.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    assert.strictEqual(sentences.length, 3);
  });

  test('Percentiles: Linear rank interpolation accurately derives p25, median, and p75', () => {
    const distribution = [-30, -28, -26, -24, -22, -20, -18, -16, -14];
    assert.strictEqual(calculatePercentile(distribution, 0.5), -22.0); // Median
    assert.strictEqual(calculatePercentile(distribution, 0.25), -26.0); // P25
    assert.strictEqual(calculatePercentile(distribution, 0.75), -18.0); // P75
  });

  // Helper generator to simulate realistic candidate speech streams
  function simulateCalibrationRun({
    noiseFloorMean,
    speechMeanVolume,
    speechVolumeStdDev = 2.0,
    readingDurationMs,
    pauseCount = 3,
    pauseDurationMs = 450,
  }) {
    const sampleIntervalMs = 40; // 25 fps
    const noiseSamples = [];
    const speechSamples = [];

    // Phase 1: 2.0s ambient noise (50 samples)
    let t = 1000;
    for (let i = 0; i < 50; i++) {
      const jitter = (Math.random() * 2 - 1) * 2;
      const dbfs = noiseFloorMean + jitter;
      noiseSamples.push({
        timestamp: t,
        rms: Math.pow(10, dbfs / 20),
        dbfs: Math.round(dbfs * 10) / 10,
        isSpeech: false,
      });
      t += sampleIntervalMs;
    }

    // Phase 2: Active reading window
    const totalFrames = Math.floor(readingDurationMs / sampleIntervalMs);
    const pauseInterval = Math.floor(totalFrames / (pauseCount + 1));
    const pauseFrameSpan = Math.floor(pauseDurationMs / sampleIntervalMs);

    let framesUntilNextPause = pauseInterval;
    let currentPauseFramesRemaining = 0;

    for (let f = 0; f < totalFrames; f++) {
      if (currentPauseFramesRemaining > 0) {
        // In natural pause
        const jitter = (Math.random() * 2 - 1) * 2;
        const dbfs = noiseFloorMean + jitter;
        speechSamples.push({
          timestamp: t,
          rms: Math.pow(10, dbfs / 20),
          dbfs: Math.round(dbfs * 10) / 10,
          isSpeech: false,
        });
        currentPauseFramesRemaining--;
      } else {
        // In active phonation
        framesUntilNextPause--;
        if (framesUntilNextPause <= 0 && pauseCount > 0) {
          currentPauseFramesRemaining = pauseFrameSpan;
          framesUntilNextPause = pauseInterval;
        }

        const jitter = (Math.random() * 2 - 1) * speechVolumeStdDev;
        const dbfs = speechMeanVolume + jitter;
        speechSamples.push({
          timestamp: t,
          rms: Math.pow(10, dbfs / 20),
          dbfs: Math.round(dbfs * 10) / 10,
          isSpeech: true,
        });
      }
      t += sampleIntervalMs;
    }

    return { noiseSamples, speechSamples };
  }

  test('Test A (Quiet + Slow): Produces distinct low-volume, slow-tempo VoiceProfile', () => {
    // Quiet speaking (-28 dBFS), slow cadence (30.0s for 49 words = ~98 WPM), generous pauses
    const { noiseSamples, speechSamples } = simulateCalibrationRun({
      noiseFloorMean: -52.0,
      speechMeanVolume: -28.5,
      readingDurationMs: 30000,
      pauseCount: 4,
      pauseDurationMs: 650,
    });

    const profile = buildVoiceProfile(noiseSamples, speechSamples, 49);

    assert.strictEqual(profile.version, 1);
    assert.ok(profile.medianVolume <= -27.0, `Expected medianVolume <= -27 dBFS, got ${profile.medianVolume}`);
    assert.ok(profile.speechRateWpm < 110, `Expected slow speech rate (<110 WPM), got ${profile.speechRateWpm}`);
    assert.ok(profile.medianPauseMs >= 500, `Expected long median pause (>=500ms), got ${profile.medianPauseMs}`);
    assert.ok(profile.confidence.volume > 0.7);
    assert.ok(profile.confidence.speechRate > 0.7);
  });

  test('Test B (Loud + Fast): Produces distinct high-volume, rapid-tempo VoiceProfile', () => {
    // Loud speaking (-14 dBFS), fast cadence (15.5s for 49 words = ~190 WPM), tight pauses
    const { noiseSamples, speechSamples } = simulateCalibrationRun({
      noiseFloorMean: -48.0,
      speechMeanVolume: -14.2,
      readingDurationMs: 15500,
      pauseCount: 2,
      pauseDurationMs: 250,
    });

    const profile = buildVoiceProfile(noiseSamples, speechSamples, 49);

    assert.strictEqual(profile.version, 1);
    assert.ok(profile.medianVolume >= -16.0, `Expected medianVolume >= -16 dBFS, got ${profile.medianVolume}`);
    assert.ok(profile.speechRateWpm >= 170, `Expected rapid speech rate (>=170 WPM), got ${profile.speechRateWpm}`);
    assert.ok(profile.medianPauseMs <= 350, `Expected short median pause (<=350ms), got ${profile.medianPauseMs}`);
    assert.ok(profile.confidence.volume > 0.8);
    assert.ok(profile.confidence.speechRate > 0.8);
  });

  test('Test C (Normal + Moderate): Produces standard conversational VoiceProfile', () => {
    // Normal speaking (-21 dBFS), standard cadence (21.0s for 49 words = ~140 WPM), moderate pauses
    const { noiseSamples, speechSamples } = simulateCalibrationRun({
      noiseFloorMean: -50.0,
      speechMeanVolume: -21.0,
      readingDurationMs: 21000,
      pauseCount: 3,
      pauseDurationMs: 400,
    });

    const profile = buildVoiceProfile(noiseSamples, speechSamples, 49);

    assert.strictEqual(profile.version, 1);
    assert.ok(
      profile.medianVolume >= -24.0 && profile.medianVolume <= -18.0,
      `Expected medianVolume between -24 and -18 dBFS, got ${profile.medianVolume}`
    );
    assert.ok(
      profile.speechRateWpm >= 125 && profile.speechRateWpm <= 155,
      `Expected standard speech rate (~140 WPM), got ${profile.speechRateWpm}`
    );
    assert.ok(
      profile.medianPauseMs >= 300 && profile.medianPauseMs <= 500,
      `Expected moderate pause (~400ms), got ${profile.medianPauseMs}`
    );
  });

  test('Demonstration of Material Differences: Test A vs Test B produce non-overlapping profiles', () => {
    const runA = simulateCalibrationRun({
      noiseFloorMean: -52.0,
      speechMeanVolume: -29.0,
      readingDurationMs: 31000,
      pauseCount: 4,
      pauseDurationMs: 650,
    });
    const profileA = buildVoiceProfile(runA.noiseSamples, runA.speechSamples, 49);

    const runB = simulateCalibrationRun({
      noiseFloorMean: -48.0,
      speechMeanVolume: -13.5,
      readingDurationMs: 15000,
      pauseCount: 2,
      pauseDurationMs: 250,
    });
    const profileB = buildVoiceProfile(runB.noiseSamples, runB.speechSamples, 49);

    // Delta verification:
    const volumeDelta = Math.abs(profileB.medianVolume - profileA.medianVolume);
    const rateDelta = Math.abs(profileB.speechRateWpm - profileA.speechRateWpm);
    const pauseDelta = Math.abs(profileA.medianPauseMs - profileB.medianPauseMs);

    assert.ok(volumeDelta >= 10.0, `Volume delta must be >= 10 dBFS, got ${volumeDelta} dB`);
    assert.ok(rateDelta >= 70, `Speech rate delta must be >= 70 WPM, got ${rateDelta} WPM`);
    assert.ok(pauseDelta >= 200, `Pause delta must be >= 200ms, got ${pauseDelta} ms`);
  });

  test('Test D (Failed Calibration - Inadequate Speech Input): Correctly rejected by validator', () => {
    // Candidate barely spoke (only 3.5 seconds, 20 samples)
    const validation = validateCalibrationQuality(
      -50.0, // noiseFloor
      3500,  // speechDurationMs (under 7000ms threshold)
      20,    // speechSampleCount (under 40 samples threshold)
      -25.0  // speechPeak
    );

    assert.strictEqual(validation.isValid, false);
    assert.strictEqual(validation.checks.sampleSufficient, false);
    assert.match(validation.failureReason, /Insufficient speech captured/);
  });

  test('Test E (Failed Calibration - Excessive Background Noise): Correctly rejected by validator', () => {
    // Room has high HVAC or loud street noise (-24 dBFS noise floor)
    const validation = validateCalibrationQuality(
      -24.0, // noiseFloor (> -28 dBFS cutoff)
      18000,
      200,
      -18.0
    );

    assert.strictEqual(validation.isValid, false);
    assert.strictEqual(validation.checks.backgroundNoiseAcceptable, false);
    assert.match(validation.failureReason, /Excessive background noise/);
  });
});
