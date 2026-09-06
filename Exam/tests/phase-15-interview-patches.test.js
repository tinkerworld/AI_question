const http = require('http');
const assert = require('assert');
const path = require('path');
const { questionTypeRegistry, InterviewHandler } = require(path.resolve(__dirname, '../packages/question-types/src/index.ts'));

const API_BASE = process.env.API_BASE || 'http://localhost:4043/api/v1';

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
  console.log('🚀 RUNNING PHASE 15.3 & 15.4: INTERVIEW PATCHES TEST SUITE');
  console.log('================================================================\n');

  // Authenticate Personas
  const adminLogin = await request('POST', '/auth/login', { email: 'admin@examos.com', password: 'Admin@123' });
  assert.strictEqual(adminLogin.status, 200, 'Admin login failed');
  const adminToken = adminLogin.data.data.accessToken;

  const teacherLogin = await request('POST', '/auth/login', { email: 'teacher@examos.com', password: 'Teacher@123' });
  assert.strictEqual(teacherLogin.status, 200, 'Teacher login failed');
  const teacherToken = teacherLogin.data.data.accessToken;

  const studentLogin = await request('POST', '/auth/login', { email: 'student@examos.com', password: 'Student@123' });
  assert.strictEqual(studentLogin.status, 200, 'Student login failed');
  const studentToken = studentLogin.data.data.accessToken;
  const studentUser = studentLogin.data.data.user;

  const student2Login = await request('POST', '/auth/login', { email: 'student2@examos.com', password: 'Student2@123' });
  assert.strictEqual(student2Login.status, 200, 'Student2 login failed');
  const student2Token = student2Login.data.data.accessToken;
  const student2User = student2Login.data.data.user;

  // =========================================================================
  // TASK 15.3: INTERVIEW-PATCH-01 (Decoupled Knowledge & Behavioral Prompt)
  // =========================================================================
  console.log('\n--- Task 15.3: Knowledge Dataset & Behavioral Prompt Separation ---');

  await test('INT-U001: InterviewHandler.validate() enforces knowledgeDataset & behavioralPrompt structure', async () => {
    const handler = new InterviewHandler();

    // Valid decoupled interview payload
    const validData = {
      scenario: 'Incident Review: 504 gateway timeout on payment cluster',
      preset: 'TECH_SYSTEM_DESIGN',
      maxTurns: 4,
      rubric: [
        { id: 'crit_arch', name: 'Architecture', maxScore: 10, evidenceQuotes: [], improvementTip: 'Use diagrams' },
      ],
      knowledgeDataset: {
        summary: 'Microservices architecture with 10k RPS throughput',
        facts: ['PostgreSQL single primary with 3 read replicas', 'Redis volatile-lru eviction policy'],
        sourceDocuments: [
          { title: 'Arch Spec', content: 'Database read replicas lag by 120ms' },
        ],
      },
      behavioralPrompt: {
        persona: 'Senior Principal Infrastructure Architect',
        tone: 'CHALLENGING',
        difficultyLevel: 'ADVANCED',
        focusAreas: ['Replica Lag', 'Circuit Breaking'],
        avoidList: ['Frontend styling', 'Billing plans'],
        followUpAggressiveness: 'HIGH',
      },
    };
    assert.strictEqual(handler.validate(validData), true, 'Valid decoupled payload should pass validation');

    // Invalid: missing required scenario
    assert.strictEqual(handler.validate({ ...validData, scenario: '' }), false, 'Empty scenario should fail');

    // Invalid: malformed knowledgeDataset (facts not an array)
    assert.strictEqual(
      handler.validate({ ...validData, knowledgeDataset: { summary: 'Text', facts: 'not-an-array' } }),
      false,
      'Malformed knowledgeDataset should fail'
    );

    // Serialization & Deserialization preserves both blocks
    const serialized = handler.serialize(validData);
    const deserialized = handler.deserialize(serialized);
    assert.strictEqual(deserialized.knowledgeDataset.summary, validData.knowledgeDataset.summary);
    assert.strictEqual(deserialized.behavioralPrompt.persona, validData.behavioralPrompt.persona);
    assert.deepStrictEqual(deserialized.behavioralPrompt.focusAreas, ['Replica Lag', 'Circuit Breaking']);
  });

  await test('INT-U002: Prompt builder generates isolated [KNOWLEDGE_BOUNDARY] and [EXAMINER_BEHAVIOR] blocks', async () => {
    const { interviewService } = require(path.resolve(__dirname, '../apps/api/src/services/interview.service.ts'));
    assert.ok(interviewService, 'interviewService must be exported');

    const prompt = (interviewService).buildDecoupledInterviewPrompt(
      {
        summary: 'Database replication topology with Redis caching',
        facts: ['PostgreSQL primary is in us-east-1', 'Replica is in eu-west-1'],
        sourceDocuments: [{ title: 'Topology', content: 'Cross-region replication delay is 150ms' }],
      },
      {
        persona: 'Senior Principal Infrastructure Architect',
        tone: 'CHALLENGING',
        difficultyLevel: 'ADVANCED',
        focusAreas: ['Replication Latency', 'Failover Strategy'],
        avoidList: ['React components', 'Marketing campaigns'],
        followUpAggressiveness: 'HIGH',
      },
      'Candidate is designing a distributed payment system.'
    );

    assert.ok(prompt.includes('[KNOWLEDGE_BOUNDARY]'), 'Prompt must contain explicit [KNOWLEDGE_BOUNDARY] token');
    assert.ok(prompt.includes('[EXAMINER_BEHAVIOR]'), 'Prompt must contain explicit [EXAMINER_BEHAVIOR] token');
    assert.ok(prompt.includes('PostgreSQL primary is in us-east-1'), 'Knowledge facts must be embedded in boundary');
    assert.ok(prompt.includes('Senior Principal Infrastructure Architect'), 'Persona must be embedded in behavior');
    assert.ok(prompt.includes('AVOID-LIST / PROHIBITED TOPICS'), 'Avoid-list section must be present');
    assert.ok(prompt.includes('React components'), 'Forbidden topics must be in avoid-list');
  });

  await test('INT-A001: POST /api/v1/interview/simulate-turn executes simulation workbench', async () => {
    const simRes = await request(
      'POST',
      '/interview/simulate-turn',
      {
        knowledgeDataset: {
          summary: 'Cloud caching architecture using Redis volatile-lru eviction',
          facts: ['Cache hit ratio is 92%', 'Eviction threshold is 85%'],
          sourceDocuments: [{ title: 'Cache Config', content: 'Max memory 16GB' }],
        },
        behavioralPrompt: {
          persona: 'Senior Systems Architect',
          tone: 'SOCRATIC',
          difficultyLevel: 'ADVANCED',
          focusAreas: ['Cache Eviction', 'Memory Sizing'],
          avoidList: ['Frontend CSS', 'Sales quotas'],
          followUpAggressiveness: 'HIGH',
        },
        candidateMessage: 'I suggest optimizing the Redis cache memory to avoid 85% eviction threshold and keep hit ratio above 92%.',
        conversationHistory: [],
      },
      adminToken
    );

    assert.strictEqual(simRes.status, 200, `Simulation should succeed, got ${simRes.status}: ${JSON.stringify(simRes.data)}`);
    assert.ok(simRes.data.success, 'Response must be success');
    assert.ok(simRes.data.data.aiMessage, 'Must return AI simulated message');
    assert.ok(typeof simRes.data.data.aiMessage === 'string', 'aiMessage must be string');
    assert.ok(simRes.data.data.boundaryCheck, 'Must return boundary check object');
    assert.strictEqual(simRes.data.data.boundaryCheck.passed, true, 'Boundary check should pass for aligned message');
    assert.ok(Array.isArray(simRes.data.data.coveredFocusAreas), 'coveredFocusAreas must be an array');
  });

  await test('INT-I001: simulate-turn flags boundary violation when avoidList topic is mentioned', async () => {
    const simRes = await request(
      'POST',
      '/interview/simulate-turn',
      {
        knowledgeDataset: {
          summary: 'Core database indexing strategies',
          facts: ['B-tree indexes are suitable for equality and range queries'],
        },
        behavioralPrompt: {
          persona: 'Database Administrator',
          tone: 'FORMAL',
          focusAreas: ['B-tree Indexing'],
          avoidList: ['cryptocurrency', 'bitcoin mining'],
        },
        candidateMessage: 'I want to discuss cryptocurrency and bitcoin mining setups.',
        conversationHistory: [],
      },
      adminToken
    );

    assert.strictEqual(simRes.status, 200);
    assert.ok(simRes.data.success);
    assert.strictEqual(simRes.data.data.boundaryCheck.passed, false, 'Boundary check must flag forbidden avoid-list topic');
    assert.ok(simRes.data.data.boundaryCheck.violations.length > 0, 'Must record at least one violation');
  });

  await test('INT-A002: GET /api/v1/interview/questions/:id/dataset retrieves decoupled dataset', async () => {
    const res = await request('GET', '/interview/questions/q_interview_ielts_01/dataset', null, teacherToken);
    assert.strictEqual(res.status, 200, 'Dataset retrieval should succeed');
    assert.ok(res.data.success, 'Response must be success');
    assert.strictEqual(res.data.data.questionId, 'q_interview_ielts_01');
    assert.ok(res.data.data.scenario, 'Must return scenario');
  });

  // =========================================================================
  // TASK 15.4: INTERVIEW-PATCH-02 (Evidence-Grounded Grading & Longitudinal Growth)
  // =========================================================================
  console.log('\n--- Task 15.4: Evidence-Grounded Grading & Longitudinal Growth ---');

  await test('IGRADE-U001: normalizeRubricScores() preserves evidenceQuotes across all presets', async () => {
    const { interviewService } = require(path.resolve(__dirname, '../apps/api/src/services/interview.service.ts'));

    const rawRubric = [
      {
        id: 'lexical',
        name: 'Lexical Resource',
        score: 7.5,
        maxScore: 9.0,
        feedback: 'Demonstrated academic vocabulary in depth.',
        evidenceQuotes: [
          {
            turnNumber: 2,
            quote: 'We observed an eventual consistency divergence across distributed nodes.',
            assessment: 'High precision technical lexicon.',
          },
        ],
        improvementTip: 'Incorporate natural idiomatic phrases during transitions.',
      },
    ];

    const normalized = (interviewService).normalizeRubricScores(rawRubric, 'IELTS_SPEAKING', 4);
    assert.strictEqual(normalized.length, 4, 'IELTS Speaking must produce 4 normalized band criteria');

    const lexicalCrit = normalized.find((c) => c.id === 'lexical_resource');
    assert.ok(lexicalCrit, 'Lexical resource criterion must be present');
    assert.strictEqual(lexicalCrit.score, 7.5, 'Score must be preserved');
    assert.ok(Array.isArray(lexicalCrit.evidenceQuotes), 'evidenceQuotes must be array');
    assert.strictEqual(lexicalCrit.evidenceQuotes.length, 1, 'evidenceQuotes must contain 1 quote');
    assert.strictEqual(lexicalCrit.evidenceQuotes[0].turnNumber, 2);
    assert.strictEqual(lexicalCrit.improvementTip, 'Incorporate natural idiomatic phrases during transitions.');
  });

  await test('IGRADE-U002: detectScoreTrend() accurately calculates trajectory and trendDelta', async () => {
    const { interviewService } = require(path.resolve(__dirname, '../apps/api/src/services/interview.service.ts'));

    // Improving trajectory: [5.5, 6.0, 7.0]
    const improving = (interviewService).detectScoreTrend([5.5, 6.0, 7.0]);
    assert.strictEqual(improving.trend, 'IMPROVING');
    assert.ok(improving.trendDelta > 0, 'improving delta must be positive');

    // Degrading trajectory: [7.5, 7.0, 6.0]
    const degrading = (interviewService).detectScoreTrend([7.5, 7.0, 6.0]);
    assert.strictEqual(degrading.trend, 'DEGRADING');
    assert.ok(degrading.trendDelta < 0, 'degrading delta must be negative');

    // Plateau trajectory: [6.5, 6.5, 6.5]
    const plateau = (interviewService).detectScoreTrend([6.5, 6.5, 6.5]);
    assert.strictEqual(plateau.trend, 'PLATEAU');
    assert.strictEqual(plateau.trendDelta, 0, 'plateau delta must be 0');

    // Single score: plateau
    const single = (interviewService).detectScoreTrend([7.0]);
    assert.strictEqual(single.trend, 'PLATEAU');
  });

  await test('IGRADE-A001: GET /api/v1/interview/analytics/student/:userId enforces Section 7 IDOR check', async () => {
    // 1. Student querying own analytics: 200 OK
    const ownRes = await request('GET', `/interview/analytics/student/${studentUser.id}`, null, studentToken);
    assert.strictEqual(ownRes.status, 200, 'Student should be allowed to view own analytics');
    assert.ok(ownRes.data.success, 'Response must be success');
    assert.strictEqual(ownRes.data.data.userId, studentUser.id);
    assert.ok(Array.isArray(ownRes.data.data.timeseries), 'timeseries must be an array');
    assert.ok('trend' in ownRes.data.data, 'trend must be present');

    // 2. Student querying another student: 403 Forbidden (IDOR Violation)
    const idorRes = await request('GET', `/interview/analytics/student/${student2User.id}`, null, studentToken);
    assert.strictEqual(idorRes.status, 403, 'Cross-student analytics access must be blocked with 403');
    assert.strictEqual(idorRes.data.errorCode, 'FORBIDDEN', 'Error code must be FORBIDDEN');

    // 3. Admin querying student analytics: 200 OK
    const adminRes = await request('GET', `/interview/analytics/student/${studentUser.id}`, null, adminToken);
    assert.strictEqual(adminRes.status, 200, 'Admin should be allowed to view student analytics');
    assert.ok(adminRes.data.success);
  });

  // End-to-end Session, Scorecard & Teacher Override Verification
  await test('IGRADE-A002 & A003: Session creation, completion, scorecard, and teacher score override', async () => {
    // Purge previous test sessions for studentUser to guarantee idempotent repeatable test runs
    await request('DELETE', `/interview/admin/user-sessions/${studentUser.id}`, null, adminToken);

    // 1. Student creates an interview session
    const createRes = await request(
      'POST',
      '/interview/sessions',
      {
        questionId: 'q_interview_ielts_01',
        mode: 'PRACTICE',
      },
      studentToken
    );
    assert.strictEqual(createRes.status, 201, `Failed to create session: ${JSON.stringify(createRes.data)}`);
    const session = createRes.data.data;
    assert.ok(session.id, 'Session must have an ID');

    // 2. Student submits a turn
    const turnRes = await request(
      'POST',
      `/interview/sessions/${session.id}/turn`,
      {
        message: 'In my view, educational technologies such as interactive tablets have significantly enhanced student engagement.',
      },
      studentToken
    );
    assert.strictEqual(turnRes.status, 200, `Turn submission failed: ${JSON.stringify(turnRes.data)}`);
    assert.ok(turnRes.data.data.aiResponse, 'Must receive AI examiner response');

    // 3. Student completes the interview session
    const completeRes = await request(
      'POST',
      `/interview/sessions/${session.id}/complete`,
      {},
      studentToken
    );
    assert.strictEqual(completeRes.status, 200, `Interview completion failed: ${JSON.stringify(completeRes.data)}`);
    assert.ok(completeRes.data.data.finalScore !== null, 'Session must have final score');

    // 4. Retrieve Scorecard (IGRADE-A003)
    const scorecardRes = await request('GET', `/interview/sessions/${session.id}/scorecard`, null, studentToken);
    assert.strictEqual(scorecardRes.status, 200, `Scorecard retrieval failed: ${JSON.stringify(scorecardRes.data)}`);
    const scorecard = scorecardRes.data.data;
    assert.strictEqual(scorecard.sessionId, session.id);
    assert.ok(scorecard.finalScore !== null);
    assert.ok(Array.isArray(scorecard.rubricScores), 'Scorecard must have rubricScores array');

    // Verify evidenceQuotes presence in scorecard criteria
    const hasEvidenceQuoteField = scorecard.rubricScores.every((r) => Array.isArray(r.evidenceQuotes));
    assert.ok(hasEvidenceQuoteField, 'Every rubric criterion in scorecard must possess an evidenceQuotes array');

    // 5. Student attempts unauthorized score override (should fail 403)
    const unauthorizedOverride = await request(
      'POST',
      `/interview/sessions/${session.id}/override-score`,
      {
        finalScore: 9.0,
        teacherNotes: 'Self-awarded maximum score',
      },
      studentToken
    );
    assert.strictEqual(unauthorizedOverride.status, 403, 'Student must not be allowed to override score');

    // 6. Teacher executes authorized score override (IGRADE-A002)
    const authorizedOverride = await request(
      'POST',
      `/interview/sessions/${session.id}/override-score`,
      {
        finalScore: 8.5,
        teacherNotes: 'Exceptional oral articulation and concise synthesis verified by teacher.',
      },
      teacherToken
    );
    assert.strictEqual(authorizedOverride.status, 200, `Teacher override failed: ${JSON.stringify(authorizedOverride.data)}`);
    assert.strictEqual(authorizedOverride.data.data.finalScore, 8.5, 'Final score must be updated to 8.5');
    assert.ok(authorizedOverride.data.data.feedback.includes('[Teacher Note:'), 'Feedback must include teacher note');
  });

  // Print Summary
  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
