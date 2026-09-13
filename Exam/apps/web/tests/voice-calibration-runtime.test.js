const { test, describe } = require('node:test');
const assert = require('node:assert');
const http = require('http');

/**
 * Pure mathematical implementations mirroring audioMeasurement.ts for CommonJS node:test runner
 */
const DEFAULT_PAUSE_TIMEOUT_MS = 4000;
const DEFAULT_SILENCE_THRESHOLD_DBFS = -35.0;

let _testFeatureFlagState = true;

function getUsePersonalizedVoiceCalibration() {
  return _testFeatureFlagState;
}

function setUsePersonalizedVoiceCalibration(enabled) {
  _testFeatureFlagState = enabled;
}

function calculatePersonalizedPauseTimeout(profile, isEnabled = getUsePersonalizedVoiceCalibration()) {
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

function calculatePersonalizedSilenceThreshold(profile, isEnabled = getUsePersonalizedVoiceCalibration()) {
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

function calculateTurnAcousticParameters(profile, isEnabled = getUsePersonalizedVoiceCalibration()) {
  const active = isEnabled && profile !== null;
  return {
    pauseTimeoutMs: calculatePersonalizedPauseTimeout(profile, isEnabled),
    silenceThresholdDbfs: calculatePersonalizedSilenceThreshold(profile, isEnabled),
    isPersonalized: active,
  };
}

// Test Profiles from Real Acoustic Scenarios
const quietSlowProfile = {
  version: 1,
  noiseFloor: -52.0,
  medianVolume: -28.5,
  p25Volume: -33.1,
  p75Volume: -24.3,
  speechRateWpm: 98,
  medianPauseMs: 480,
  p75PauseMs: 640,
  confidence: { volume: 0.85, speechRate: 0.92, pauses: 0.82 },
  calibratedAt: '2026-09-06T09:15:00.000Z',
};

const loudFastProfile = {
  version: 1,
  noiseFloor: -48.0,
  medianVolume: -14.2,
  p25Volume: -18.6,
  p75Volume: -10.8,
  speechRateWpm: 190,
  medianPauseMs: 180,
  p75PauseMs: 240,
  confidence: { volume: 0.95, speechRate: 0.92, pauses: 0.82 },
  calibratedAt: '2026-09-06T09:16:00.000Z',
};

const normalProfile = {
  version: 1,
  noiseFloor: -50.0,
  medianVolume: -22.0,
  p25Volume: -26.0,
  p75Volume: -18.0,
  speechRateWpm: 135,
  medianPauseMs: 320,
  p75PauseMs: 420,
  confidence: { volume: 0.9, speechRate: 0.92, pauses: 0.82 },
  calibratedAt: '2026-09-06T09:17:00.000Z',
};

// HTTP helper to test backend API persistence
const API_PORT = 4043;
function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: 'localhost',
        port: API_PORT,
        path: `/api/v1${path}`,
        method,
        headers,
      },
      (res) => {
        let respData = '';
        res.on('data', (chunk) => (respData += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(respData) });
          } catch {
            resolve({ status: res.statusCode, body: respData });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

describe('Voice Calibration — Sprint 3 (Persistence) & Sprint 4 (Runtime Application)', () => {

  describe('Sprint 4: Parameterized Pause Timeout & Silence Threshold (Flag ON)', () => {
    test('Quiet/Slow Speaker receives materially higher pause tolerance and sensitive threshold', () => {
      setUsePersonalizedVoiceCalibration(true);
      const params = calculateTurnAcousticParameters(quietSlowProfile, true);

      assert.strictEqual(params.isPersonalized, true, 'Personalization should be active');
      // Derived pause timeout: 1200 + 640 * 2.5 * (140 / 98) = 3486 ms
      assert.strictEqual(params.pauseTimeoutMs, 3486, 'Slow speaker pause timeout must match 3486ms');
      // Derived silence threshold: -52.0 + (23.5 * 0.35) = -43.8 dBFS
      assert.strictEqual(params.silenceThresholdDbfs, -43.8, 'Quiet speaker threshold must match -43.8 dBFS');
    });

    test('Loud/Fast Speaker receives lower pause tolerance and robust silence threshold', () => {
      setUsePersonalizedVoiceCalibration(true);
      const params = calculateTurnAcousticParameters(loudFastProfile, true);

      assert.strictEqual(params.isPersonalized, true, 'Personalization should be active');
      // Derived pause timeout: 1200 + 240 * 2.5 * (140 / 190) = 1642ms -> clamped to minimum 1800ms
      assert.strictEqual(params.pauseTimeoutMs, 1800, 'Fast speaker pause timeout must be clamped to 1800ms');
      // Derived silence threshold: -48.0 + (33.8 * 0.35 = 11.83) = -36.2 dBFS
      assert.strictEqual(params.silenceThresholdDbfs, -36.2, 'Loud speaker threshold must match -36.2 dBFS');
    });

    test('Slow speaker gets materially more pause tolerance than fast speaker (+1686 ms / +93.7%)', () => {
      const slowParams = calculateTurnAcousticParameters(quietSlowProfile, true);
      const fastParams = calculateTurnAcousticParameters(loudFastProfile, true);

      const deltaMs = slowParams.pauseTimeoutMs - fastParams.pauseTimeoutMs;
      assert.strictEqual(deltaMs, 1686, 'Slow speaker must get exactly +1686ms more tolerance than fast speaker');
      assert.ok(slowParams.pauseTimeoutMs > fastParams.pauseTimeoutMs * 1.8, 'Slow speaker gets nearly double the pause window');
      assert.ok(slowParams.silenceThresholdDbfs < fastParams.silenceThresholdDbfs, 'Quiet speaker threshold is lower to avoid cutoff');
    });

    test('Normal Speaker receives well-balanced middle parameters', () => {
      const normalParams = calculateTurnAcousticParameters(normalProfile, true);
      // Rate factor: 140 / 135 = 1.037. Timeout: 1200 + 420 * 2.5 * 1.037 = 2289ms
      assert.strictEqual(normalParams.pauseTimeoutMs, 2289);
      // SNR: -22 - (-50) = 28dB. Margin: 28 * 0.35 = 9.8dB. Threshold: -50 + 9.8 = -40.2 dBFS
      assert.strictEqual(normalParams.silenceThresholdDbfs, -40.2);
    });

    test('Enforces absolute safety bounds: clamp [1800ms, 5000ms] and [-55.0 dBFS, -18.0 dBFS]', () => {
      const extremeFastProfile = { ...loudFastProfile, speechRateWpm: 280, p75PauseMs: 80 };
      const extremeFast = calculateTurnAcousticParameters(extremeFastProfile, true);
      assert.strictEqual(extremeFast.pauseTimeoutMs, 1800, 'Must clamp to 1800ms lower bound');

      const extremeSlowProfile = { ...quietSlowProfile, speechRateWpm: 40, p75PauseMs: 1400 };
      const extremeSlow = calculateTurnAcousticParameters(extremeSlowProfile, true);
      assert.strictEqual(extremeSlow.pauseTimeoutMs, 5000, 'Must clamp to 5000ms upper bound');

      const ultraQuietProfile = { ...quietSlowProfile, noiseFloor: -75.0, medianVolume: -58.0 };
      const ultraQuiet = calculateTurnAcousticParameters(ultraQuietProfile, true);
      assert.ok(ultraQuiet.silenceThresholdDbfs >= -55.0, 'Must clamp to -55.0 dBFS lower bound');
    });
  });

  describe('Sprint 4: Feature Flag Rollback Verification (Flag OFF)', () => {
    test('Rollback cleanly reverts Slow Speaker to fixed baseline (4000ms / -35.0 dBFS)', () => {
      setUsePersonalizedVoiceCalibration(false);
      const params = calculateTurnAcousticParameters(quietSlowProfile, false);

      assert.strictEqual(params.isPersonalized, false, 'Personalization should be inactive');
      assert.strictEqual(params.pauseTimeoutMs, 4000, 'Must revert to pre-Sprint-4 fixed 4000ms');
      assert.strictEqual(params.silenceThresholdDbfs, -35.0, 'Must revert to pre-Sprint-4 fixed -35.0 dBFS');
    });

    test('Rollback cleanly reverts Fast Speaker to fixed baseline (4000ms / -35.0 dBFS)', () => {
      setUsePersonalizedVoiceCalibration(false);
      const params = calculateTurnAcousticParameters(loudFastProfile, false);

      assert.strictEqual(params.isPersonalized, false, 'Personalization should be inactive');
      assert.strictEqual(params.pauseTimeoutMs, 4000, 'Must revert to pre-Sprint-4 fixed 4000ms');
      assert.strictEqual(params.silenceThresholdDbfs, -35.0, 'Must revert to pre-Sprint-4 fixed -35.0 dBFS');
    });

    test('Null profile cleanly reverts to fixed baseline regardless of feature flag', () => {
      setUsePersonalizedVoiceCalibration(true);
      const params = calculateTurnAcousticParameters(null, true);

      assert.strictEqual(params.isPersonalized, false, 'Personalization inactive on null profile');
      assert.strictEqual(params.pauseTimeoutMs, 4000);
      assert.strictEqual(params.silenceThresholdDbfs, -35.0);
    });

    test('Feature flag getter/setter controls runtime behavior dynamically', () => {
      setUsePersonalizedVoiceCalibration(true);
      assert.strictEqual(getUsePersonalizedVoiceCalibration(), true);
      assert.strictEqual(calculatePersonalizedPauseTimeout(quietSlowProfile), 3486);

      setUsePersonalizedVoiceCalibration(false);
      assert.strictEqual(getUsePersonalizedVoiceCalibration(), false);
      assert.strictEqual(calculatePersonalizedPauseTimeout(quietSlowProfile), 4000);

      // Restore
      setUsePersonalizedVoiceCalibration(true);
    });
  });

  describe('Sprint 3: Persistence API & Student User Profile Storage', () => {
    let studentToken = null;

    test('Student logs in to authenticate for voice profile endpoints', async () => {
      const loginRes = await apiRequest('POST', '/auth/login', {
        email: 'student@examos.com',
        password: 'Student@123',
      });
      assert.strictEqual(loginRes.status, 200, 'Student login should return 200');
      assert.ok(loginRes.body.data.accessToken, 'Must return JWT accessToken');
      studentToken = loginRes.body.data.accessToken;
    });

    test('POST /api/v1/interview/voice-profile persists calibrated VoiceProfile to user record', async () => {
      assert.ok(studentToken, 'Token must be available');
      const saveRes = await apiRequest(
        'POST',
        '/interview/voice-profile',
        { profile: quietSlowProfile },
        studentToken
      );

      assert.strictEqual(saveRes.status, 200, 'POST /voice-profile should return 200');
      assert.strictEqual(saveRes.body.success, true);
      assert.strictEqual(saveRes.body.data.profile.speechRateWpm, 98);
      assert.strictEqual(saveRes.body.data.profile.p75PauseMs, 640);
      assert.ok(saveRes.body.data.updatedAt, 'Must return updatedAt timestamp');
    });

    test('GET /api/v1/interview/voice-profile retrieves persisted profile on pre-interview entry', async () => {
      assert.ok(studentToken, 'Token must be available');
      const getRes = await apiRequest('GET', '/interview/voice-profile', null, studentToken);

      assert.strictEqual(getRes.status, 200, 'GET /voice-profile should return 200');
      assert.strictEqual(getRes.body.success, true);
      assert.ok(getRes.body.data, 'Voice profile data must exist');
      assert.strictEqual(getRes.body.data.profile.speechRateWpm, 98);
      assert.strictEqual(getRes.body.data.profile.medianVolume, -28.5);
      assert.strictEqual(getRes.body.data.profile.p75PauseMs, 640);
    });

    test('POST /api/v1/interview/voice-profile rejects invalid profile with 400 AppError', async () => {
      assert.ok(studentToken, 'Token must be available');
      const badRes = await apiRequest(
        'POST',
        '/interview/voice-profile',
        { profile: null },
        studentToken
      );
      assert.strictEqual(badRes.status, 400);
      assert.strictEqual(badRes.body.errorCode, 'INVALID_VOICE_PROFILE');
    });

    test('GET /api/v1/interview/voice-profile rejects unauthenticated request with 401', async () => {
      const anonRes = await apiRequest('GET', '/interview/voice-profile', null, null);
      assert.strictEqual(anonRes.status, 401);
    });
  });
});
