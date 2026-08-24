const http = require('http');
const assert = require('assert');
const path = require('path');
const { questionTypeRegistry } = require(path.resolve(__dirname, '../packages/question-types/src/index.ts'));

const API_BASE = 'http://localhost:4000/api/v1';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + (url.search || ''),
        method,
        headers,
      },
      (res) => {
        let respBody = '';
        res.on('data', (chunk) => (respBody += chunk));
        res.on('end', () => {
          try {
            const parsed = respBody ? JSON.parse(respBody) : {};
            resolve({ status: res.statusCode, headers: res.headers, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, data: respBody });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING PHASE 12: AI INTERVIEW SYSTEM MASTER TEST SUITE');
  console.log('================================================================\n');

  // Authenticate Personas
  const adminLogin = await request('POST', '/auth/login', { email: 'admin@examos.com', password: 'Admin@123' });
  assert.strictEqual(adminLogin.status, 200, 'Admin login failed');
  const adminToken = adminLogin.data.data.accessToken;

  const studentLogin = await request('POST', '/auth/login', { email: 'student@examos.com', password: 'Student@123' });
  assert.strictEqual(studentLogin.status, 200, 'Student login failed');
  const studentToken = studentLogin.data.data.accessToken;

  const student2Login = await request('POST', '/auth/login', { email: 'student2@examos.com', password: 'Student2@123' });
  assert.strictEqual(student2Login.status, 200, 'Student2 login failed');
  const student2Token = student2Login.data.data.accessToken;

  // 12.1 Interview Question Type Handler & Validation
  await test('12.1-U1: Pluggable Question Type Registry supports INTERVIEW', async () => {
    const handler = questionTypeRegistry.getType('INTERVIEW');
    assert.ok(handler, 'INTERVIEW handler must be registered');
    assert.strictEqual(handler.type, 'INTERVIEW');

    const validData = {
      scenario: 'UPSC Civil Services board interview',
      rubric: [
        { id: 'crit_1', name: 'Integrity', maxScore: 25 },
        { id: 'crit_2', name: 'Problem Solving', maxScore: 25 },
      ],
      maxTurns: 4,
    };
    assert.strictEqual(handler.validate(validData), true);

    const invalidData = {
      scenario: '', // empty
      rubric: [], // empty
    };
    assert.strictEqual(handler.validate(invalidData), false);

    const evalRes = handler.evaluate(validData, [{ turn: 1, message: 'Response' }]);
    assert.strictEqual(evalRes.isCorrect, true);
    assert.strictEqual(evalRes.score, 1.0);
  });

  // 12.2 Derived Course Eligibility
  await test('12.2-U1: Derived Course Eligibility separates Interview vs JEE/NEET students', async () => {
    // Student 1 is enrolled in c1 (JEE) and c2 (NEET) - 0 interview questions
    const s1Res = await request('GET', '/interviews/eligibility', null, studentToken);
    assert.strictEqual(s1Res.status, 200);
    assert.strictEqual(s1Res.data.data.isEligible, false, 'JEE/NEET student must not be interview-eligible');
    assert.strictEqual(s1Res.data.data.eligibleCourseIds.length, 0);

    // Student 2 is enrolled in c3 (UPSC) and c4 (IELTS) - has interview questions
    const s2Res = await request('GET', '/interviews/eligibility', null, student2Token);
    assert.strictEqual(s2Res.status, 200);
    assert.strictEqual(s2Res.data.data.isEligible, true, 'UPSC/IELTS student must be interview-eligible');
    assert.ok(s2Res.data.data.eligibleCourseIds.length >= 1);
    assert.ok(s2Res.data.data.availableQuestions.length >= 1);

    // Staff (Admin) is always eligible
    const adminRes = await request('GET', '/interviews/eligibility', null, adminToken);
    assert.strictEqual(adminRes.status, 200);
    assert.strictEqual(adminRes.data.data.isEligible, true, 'Admin is always interview-eligible');
    assert.ok(adminRes.data.data.availableQuestions.length >= 2);
  });

  // 12.3 Full Multi-Turn Interview Session Flow (Lifecycle: Start -> Turns -> Complete & Evaluate)
  await test('12.5-U1: Full Multi-Turn Interview Session Lifecycle (Start -> Turns -> Finish)', async () => {
    // Ensure student 2 has active PREMIUM_PLUS plan for daily interview quota
    await request('POST', '/subscriptions', { planCode: 'PREMIUM_PLUS' }, student2Token);

    // 1. Start Session
    const startRes = await request(
      'POST',
      '/interview/sessions/start',
      {
        questionId: 'q_interview_upsc_01',
        mode: 'PRACTICE',
      },
      student2Token
    );

    assert.strictEqual(startRes.status, 201, 'Starting interview session must return 201');
    assert.ok(startRes.data.data.session.id);
    assert.strictEqual(startRes.data.data.session.status, 'IN_PROGRESS');
    assert.strictEqual(startRes.data.data.session.currentTurn, 1);
    assert.ok(startRes.data.data.initialTurn.message.length > 0);

    const sessionId = startRes.data.data.session.id;

    // 2. Submit Turn 1 Response
    const turn1Res = await request(
      'POST',
      `/interview/sessions/${sessionId}/turns`,
      { message: 'My initial approach focuses on tripartite dialogue between indigenous elders, district administration, and developers.' },
      student2Token
    );

    assert.strictEqual(turn1Res.status, 200, 'Turn 1 must succeed');
    assert.strictEqual(turn1Res.data.data.candidateTurn.turnNumber, 1);
    assert.ok(turn1Res.data.data.aiTurn, 'Should generate AI follow-up turn');
    assert.strictEqual(turn1Res.data.data.aiTurn.turnNumber, 2);
    assert.strictEqual(turn1Res.data.data.isCompleted, false);

    // 3. Submit Turn 2 Response
    const turn2Res = await request(
      'POST',
      `/interview/sessions/${sessionId}/turns`,
      { message: 'We will enforce statutory environmental clearances and provide immediate transitional livelihoods.' },
      student2Token
    );
    assert.strictEqual(turn2Res.status, 200, 'Turn 2 must succeed');
    assert.strictEqual(turn2Res.data.data.candidateTurn.turnNumber, 2);

    // 4. Complete & Evaluate Session
    const completeRes = await request(
      'POST',
      `/interview/sessions/${sessionId}/complete`,
      {},
      student2Token
    );

    assert.strictEqual(completeRes.status, 200, 'Completion must succeed');
    const completedSession = completeRes.data.data;
    assert.strictEqual(completedSession.status, 'COMPLETED');
    assert.ok(completedSession.completedAt);
    assert.ok(completedSession.finalScore > 0);
    assert.ok(Array.isArray(completedSession.rubricScores));
    assert.ok(completedSession.rubricScores.length >= 2);
    assert.ok(completedSession.feedback.length > 0);

    // 5. Retrieve Session & Verify History
    const fetchRes = await request('GET', `/interview/sessions/${sessionId}`, null, student2Token);
    assert.strictEqual(fetchRes.status, 200);
    assert.strictEqual(fetchRes.data.data.id, sessionId);
    assert.strictEqual(fetchRes.data.data.status, 'COMPLETED');
    assert.ok(fetchRes.data.data.turns.length >= 3);

    const historyRes = await request('GET', '/interview/sessions', null, student2Token);
    assert.strictEqual(historyRes.status, 200);
    assert.ok(historyRes.data.data.some((s) => s.id === sessionId));
  });

  // 12.4 AI Gateway Providers and Scope Isolation
  await test('12.6-U1: AI Gateway providers and scope isolation', async () => {
    // 1. Providers list under scope=interview
    const interviewProvidersRes = await request('GET', '/ai/gateway/providers?scope=interview', null, adminToken);
    assert.strictEqual(interviewProvidersRes.status, 200);
    const interviewProviders = interviewProvidersRes.data.data;
    assert.ok(interviewProviders.length >= 6, 'Must list all 6 providers for interview scope');
    assert.ok(interviewProviders.every((p) => p.scope === 'interview'));

    // 2. Verify circuit breaker isolation between scopes
    const qaProvidersRes = await request('GET', '/ai/gateway/providers?scope=question_authoring', null, adminToken);
    assert.strictEqual(qaProvidersRes.status, 200);
    const qaProviders = qaProvidersRes.data.data;
    assert.strictEqual(qaProviders.length, 6);
    assert.ok(qaProviders.every((p) => p.scope === 'question_authoring'));
  });

  console.log('================================================================');
  console.log(`🏁 PHASE 12 TEST SUITE SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
