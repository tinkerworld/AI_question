const { describe, test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const API_PORT = process.env.PORT || 4043;
const API_BASE = `http://localhost:${API_PORT}/api/v1`;

function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('AI Interview & Viva Microservice Integration Tests', () => {
  let adminToken = null;

  test('Admin authenticates successfully', async () => {
    const loginRes = await apiRequest('POST', '/auth/login', {
      email: 'admin@examos.com',
      password: 'Admin@123',
    });
    assert.strictEqual(loginRes.status, 200, 'Admin login should return 200');
    assert.ok(loginRes.body.data.accessToken, 'Must return JWT accessToken');
    adminToken = loginRes.body.data.accessToken;
  });

  test('GET /api/v1/interview/workspaces lists microservice workspaces', async () => {
    assert.ok(adminToken, 'Token required');
    const res = await apiRequest('GET', '/interview/workspaces', null, adminToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Workspaces must be an array');
    assert.ok(res.body.data.length >= 1, 'At least 1 workspace available');
    const ws = res.body.data.find((w) => w.id === 'ws_ielts');
    assert.ok(ws, 'ws_ielts workspace must be present');
    assert.strictEqual(ws.subject, 'IELTS');
  });

  test('GET /api/v1/interview/voice-personas returns 9 high-fidelity examiner personas', async () => {
    assert.ok(adminToken, 'Token required');
    const res = await apiRequest('GET', '/interview/voice-personas', null, adminToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Voice personas must be an array');
    assert.strictEqual(res.body.data.length, 9, 'Must return exactly 9 voice personas');
    const emma = res.body.data.find((p) => p.id === 'emma');
    assert.ok(emma, 'emma persona must exist');
    assert.strictEqual(emma.name, 'Emma');
    assert.strictEqual(emma.gender, 'Female');
    assert.strictEqual(emma.locale, 'en-GB');
  });

  test('POST /api/v1/interview/sessions/start initiates session with voicePersona and microservice', async () => {
    assert.ok(adminToken, 'Token required');
    const res = await apiRequest(
      'POST',
      '/interview/sessions/start',
      {
        questionId: 'q_interview_ielts_07',
        mode: 'PRACTICE',
        voicePersona: 'en-US-Journey-F',
      },
      adminToken
    );

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    const session = res.body.data;
    assert.ok(session.id, 'Session must have an ID');
    assert.strictEqual(session.voicePersona, 'en-US-Journey-F');
    assert.ok(session.turns && session.turns.length >= 1, 'Session should have initial AI turn');
    const initialTurn = session.turns[0];
    assert.strictEqual(initialTurn.speaker, 'AI');
    if (session.remoteSessionId) {
      assert.strictEqual(session.remoteWorkspaceId, 'ws_ielts');
      assert.ok(initialTurn.audioUrl.includes('https://voice.tinkerlab.online/v1/interview/sessions/'));
    }
  });

  test('Microservice Voice Client correctly detects low-confidence vs normal audio responses', async () => {
    const normalResponse = {
      text: 'My primary specialization is building Linux BSPs using Yocto Project recipes.',
      duration_s: 4.5,
      asr_s: 0.35,
      confidence_metadata: {
        is_low_confidence: false,
        avg_logprob: -0.35,
        max_no_speech_prob: 0.02,
        reason: null,
      },
    };

    const lowConfidenceResponse = {
      text: 'uh thank you',
      duration_s: 1.2,
      asr_s: 0.20,
      confidence_metadata: {
        is_low_confidence: true,
        avg_logprob: -1.85,
        max_no_speech_prob: 0.82,
        reason: 'mean_logprob_too_low(-1.85 < -1.0); no_speech_prob_too_high(0.82 > 0.6)',
      },
    };

    // Assert normal confidence response structure and values
    assert.strictEqual(normalResponse.confidence_metadata.is_low_confidence, false);
    assert.ok(normalResponse.confidence_metadata.avg_logprob > -1.0);
    assert.ok(normalResponse.confidence_metadata.max_no_speech_prob < 0.6);
    assert.strictEqual(normalResponse.confidence_metadata.reason, null);

    // Assert low confidence response triggers rejection flag and specifies reason
    assert.strictEqual(lowConfidenceResponse.confidence_metadata.is_low_confidence, true);
    assert.ok(lowConfidenceResponse.confidence_metadata.avg_logprob < -1.0);
    assert.ok(lowConfidenceResponse.confidence_metadata.max_no_speech_prob > 0.6);
    assert.ok(lowConfidenceResponse.confidence_metadata.reason.includes('mean_logprob_too_low'));
  });

  test('VoiceMicroserviceClient configuration reads custom host, port, and auth token from environment', () => {
    const originalEnv = { ...process.env };
    try {
      process.env.AUDIO_SERVICE_HOST = 'custom-audio.internal';
      process.env.AUDIO_SERVICE_PORT = '9000';
      process.env.AUDIO_SERVICE_SECRET = 'secret_token_123';
      process.env.AUDIO_SERVICE_TIMEOUT_MS = '5000';

      const envHost = process.env.AUDIO_SERVICE_HOST || process.env.VOICE_MICROSERVICE_HOST;
      const envPort = process.env.AUDIO_SERVICE_PORT || process.env.VOICE_MICROSERVICE_PORT;
      const computedBaseUrl = envHost ? `http://${envHost}${envPort ? `:${envPort}` : ''}` : undefined;
      const baseUrl = (computedBaseUrl || process.env.VOICE_MICROSERVICE_URL || 'https://voice.tinkerlab.online').replace(/\/$/, '');
      const authToken = process.env.AUDIO_SERVICE_SECRET || process.env.AUDIO_SERVICE_AUTH_TOKEN;

      assert.strictEqual(baseUrl, 'http://custom-audio.internal:9000');
      assert.strictEqual(authToken, 'secret_token_123');
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        headers['X-Audio-Secret'] = authToken;
      }
      assert.strictEqual(headers['Authorization'], 'Bearer secret_token_123');
      assert.strictEqual(headers['X-Audio-Secret'], 'secret_token_123');
    } finally {
      process.env = originalEnv;
    }
  });

  test('GET /api/v1/interview/audio/health returns audio microservice status', async () => {
    assert.ok(adminToken, 'Token required');
    const res = await apiRequest('GET', '/interview/audio/health', null, adminToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data);
    assert.strictEqual(res.body.data.status, 'healthy');
    assert.strictEqual(res.body.data.whisper_model, 'small');
    assert.strictEqual(res.body.data.tts_provider, 'piper');
  });

  test('POST /api/v1/interview/workspaces/:id/search performs vector search', async () => {
    assert.ok(adminToken, 'Token required');
    const res = await apiRequest(
      'POST',
      '/interview/workspaces/ws_yocto/search',
      { query: 'BitBake', k: 2 },
      adminToken
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.workspace_id, 'ws_yocto');
    assert.ok(Array.isArray(res.body.data.results));
    assert.ok(res.body.data.results.length >= 1);
    assert.ok(res.body.data.results[0].text);
    assert.ok(res.body.data.results[0].similarity > 0);
  });

  test('POST /api/v1/interview/audio/transcribe transcribes audio and produces acoustic confidence', async () => {
    assert.ok(adminToken, 'Token required');
    // First synthesize audio sample via microservice
    const synthRes = await fetch(`${API_BASE}/interview/audio/synthesize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'ExamOS automated interview testing pipeline',
        voice: 'emma',
      }),
    });
    assert.strictEqual(synthRes.status, 200);
    const audioBuffer = await synthRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    // Transcribe synthesized sample through Whisper ASR proxy
    const transcribeRes = await apiRequest(
      'POST',
      '/interview/audio/transcribe',
      {
        audio_base64: base64Audio,
        audio_format: 'mp3',
        language: 'en',
      },
      adminToken
    );

    assert.strictEqual(transcribeRes.status, 200);
    assert.strictEqual(transcribeRes.body.success, true);
    assert.ok(transcribeRes.body.data.text, 'Must produce transcribed text');
    assert.ok(transcribeRes.body.data.confidence_metadata, 'Must contain confidence metadata');
    assert.strictEqual(transcribeRes.body.data.confidence_metadata.is_low_confidence, false);
    assert.ok(typeof transcribeRes.body.data.confidence_metadata.avg_logprob === 'number');
  });
});
