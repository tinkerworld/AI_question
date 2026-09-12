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
});
