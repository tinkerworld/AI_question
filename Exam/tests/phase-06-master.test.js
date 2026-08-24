const http = require('http');
const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = 'http://localhost:4000/api/v1';

function request(method, urlPath, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath.startsWith('http') ? urlPath : `${API_BASE}${urlPath}`);
    const payload = data ? JSON.stringify(data) : null;

    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runPhase6Tests() {
  console.log('====================================================');
  console.log(' EXAMOS PHASE 6 (EXAM SYSTEM) — MASTER TEST SUITE');
  console.log(' Testing Features 6.1 to 6.8 & Section 7 Security');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      if (err.actual !== undefined && err.expected !== undefined) {
        console.error(`     Expected: ${JSON.stringify(err.expected)}`);
        console.error(`     Actual:   ${JSON.stringify(err.actual)}`);
      }
      failed++;
    }
  }

  // 1. Authenticate Personas
  const adminLogin = await request('POST', '/auth/login', { email: 'admin@examos.com', password: 'Admin@123' });
  assert.strictEqual(adminLogin.status, 200, 'Admin login must succeed');
  const adminToken = adminLogin.body.data.accessToken;

  // Create a dedicated fresh student account for Phase 6 test
  const firstStudentEmail = `student1_p6_${Date.now()}@examos.com`;
  const createStudent1Res = await request('POST', '/users', {
    email: firstStudentEmail,
    password: 'Student1@123',
    firstName: 'Student1',
    lastName: 'Tester',
    roleIds: ['r4'], // STUDENT role
  }, adminToken);
  assert.strictEqual(createStudent1Res.status, 201, 'Creating Student 1 account must succeed');

  const studentLogin = await request('POST', '/auth/login', { email: firstStudentEmail, password: 'Student1@123' });
  assert.strictEqual(studentLogin.status, 200, 'Student login must succeed');
  const studentToken = studentLogin.body.data.accessToken;
  const studentUser = studentLogin.body.data.user;

  // Create a second student account for mandatory Section 7 IDOR cross-account tests
  const secondStudentEmail = `student2_${Date.now()}@examos.com`;
  const createStudent2Res = await request('POST', '/users', {
    email: secondStudentEmail,
    password: 'Student2@123',
    firstName: 'Student2',
    lastName: 'Learner',
    roleIds: ['r4'], // STUDENT role
  }, adminToken);
  assert.strictEqual(createStudent2Res.status, 201, 'Creating Student 2 account must succeed');

  const student2Login = await request('POST', '/auth/login', { email: secondStudentEmail, password: 'Student2@123' });
  assert.strictEqual(student2Login.status, 200, 'Student 2 login must succeed');
  const student2Token = student2Login.body.data.accessToken;
  const student2User = student2Login.body.data.user;

  // Setup: Generate a published exam from standard JEE Main pattern
  const genExamRes = await request('POST', '/exams/generate', {
    patternId: 'pat_jee_main_standard',
    name: 'JEE Main Phase 6 Master Assessment',
    instructions: 'Standard Examination: Answer all questions in Physics, Chemistry, and Mathematics.',
  }, adminToken);
  assert.strictEqual(genExamRes.status, 201, 'Exam generation must succeed');
  const testExamId = genExamRes.body.data.exam ? genExamRes.body.data.exam.id : genExamRes.body.data.id;

  // Publish the generated exam
  const pubExamRes = await request('POST', `/exams/${testExamId}/publish`, {}, adminToken);
  assert.strictEqual(pubExamRes.status, 200, 'Publishing exam must succeed');

  let testAttemptId = null;
  let testQuestions = [];

  // --------------------------------------------------------------------------
  // FEATURE 6.1: Student Exam Access & Instructions
  // --------------------------------------------------------------------------
  await test('6.1-U1: Student lists available active/published exams', async () => {
    const res = await request('GET', '/student/exams', null, studentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Exams list should be an array');
    const targetExam = res.body.data.find((e) => e.id === testExamId);
    assert.ok(targetExam, 'Generated published exam must appear in student available exams');
    assert.strictEqual(targetExam.status, 'PUBLISHED');
    assert.strictEqual(targetExam.totalQuestions, 30);
  });

  await test('6.1-U2: Student reads exam instructions and section metadata', async () => {
    const res = await request('GET', `/student/exams/${testExamId}/instructions`, null, studentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.id, testExamId);
    assert.ok(res.body.data.instructions.includes('Standard Examination'));
    assert.strictEqual(res.body.data.sections.length, 3);
    assert.strictEqual(res.body.data.totalQuestions, 30);
  });

  // --------------------------------------------------------------------------
  // FEATURE 6.2: Exam Attempt Session & Deterministic Shuffling
  // --------------------------------------------------------------------------
  await test('6.2-U1: Student starts an exam attempt session', async () => {
    const res = await request('POST', '/attempts/start', { examId: testExamId }, studentToken);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.id, 'Attempt ID must be returned');
    assert.strictEqual(res.body.data.examId, testExamId);
    assert.strictEqual(res.body.data.status, 'IN_PROGRESS');
    assert.ok(res.body.data.shuffleSeed, 'Deterministic shuffleSeed must be present');
    assert.strictEqual(res.body.data.questions.length, 30);
    assert.ok(res.body.data.timeRemainingSeconds > 0, 'timeRemainingSeconds must be positive');

    testAttemptId = res.body.data.id;
    testQuestions = res.body.data.questions;
  });

  await test('6.2-U2: Verify answer keys and explanations are masked in attempt session', async () => {
    const q = testQuestions[0];
    assert.ok(q.content, 'Question content must be present');
    assert.strictEqual(q.correctAnswer, undefined, 'Correct answer must NOT leak in student attempt payload');
    assert.strictEqual(q.explanation, undefined, 'Explanation must NOT leak in student attempt payload');
  });

  await test('6.2-U3: Session resume: starting again for in-progress attempt resumes same session', async () => {
    const res = await request('POST', '/attempts/start', { examId: testExamId }, studentToken);
    assert.strictEqual(res.status, 200); // 200 OK resume
    assert.strictEqual(res.body.data.id, testAttemptId, 'Must return the existing active attempt ID');
    assert.strictEqual(res.body.data.status, 'IN_PROGRESS');
  });

  await test('6.2-U4: Student retrieves current attempt state', async () => {
    const res = await request('GET', `/attempts/${testAttemptId}/state`, null, studentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.id, testAttemptId);
    assert.strictEqual(res.body.data.status, 'IN_PROGRESS');
    assert.strictEqual(res.body.data.questions.length, 30);
  });

  // --------------------------------------------------------------------------
  // FEATURE 6.3: Real-Time Answer Synchronization
  // --------------------------------------------------------------------------
  await test('6.3-U1: Student auto-syncs single MCQ answer and mark-for-review', async () => {
    const q1 = testQuestions[0];
    const res = await request('PUT', `/attempts/${testAttemptId}/sync`, {
      questionId: q1.questionId,
      studentAnswer: 'opt_a',
      isMarkedForReview: true,
      timeSpentSeconds: 45,
    }, studentToken);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.savedCount, 1);

    // Verify state reflects synced answer
    const stateRes = await request('GET', `/attempts/${testAttemptId}/state`, null, studentToken);
    const updatedQ = stateRes.body.data.questions.find((q) => q.questionId === q1.questionId);
    assert.strictEqual(updatedQ.studentAnswer, 'opt_a');
    assert.strictEqual(updatedQ.isMarkedForReview, true);
    assert.strictEqual(updatedQ.timeSpentSeconds, 45);
  });

  await test('6.3-U2: Student bulk syncs multiple answers across sections', async () => {
    const q2 = testQuestions[1];
    const q3 = testQuestions[2];
    const res = await request('PUT', `/attempts/${testAttemptId}/sync`, {
      answers: [
        { questionId: q2.questionId, studentAnswer: 'opt_a', isMarkedForReview: false, timeSpentSeconds: 60 },
        { questionId: q3.questionId, studentAnswer: 'opt_b', isMarkedForReview: false, timeSpentSeconds: 30 },
      ],
    }, studentToken);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.savedCount, 2);
  });

  // --------------------------------------------------------------------------
  // FEATURE 6.4, 6.5 & 6.6: Exam Completion, Auto-Evaluation & Result Generation
  // --------------------------------------------------------------------------
  await test('6.4-U1: Student submits exam attempt and triggers auto-evaluation', async () => {
    const res = await request('POST', `/attempts/${testAttemptId}/submit`, {}, studentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.attemptId, testAttemptId);
    assert.strictEqual(res.body.data.status, 'EVALUATED');
    assert.strictEqual(res.body.data.totalQuestions, 30);
    assert.ok(typeof res.body.data.totalScore === 'number');
    assert.ok(typeof res.body.data.percentage === 'number');
    assert.strictEqual(res.body.data.sectionScores.length, 3);
  });

  await test('6.4-U2: Double submission prevention', async () => {
    const res = await request('POST', `/attempts/${testAttemptId}/submit`, {}, studentToken);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.errorCode, 'ATTEMPT_652');
  });

  await test('6.4-U3: Immutability check: answers cannot be synced to submitted attempt', async () => {
    const q1 = testQuestions[0];
    const res = await request('PUT', `/attempts/${testAttemptId}/sync`, {
      questionId: q1.questionId,
      studentAnswer: 'opt_c',
    }, studentToken);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.errorCode, 'ATTEMPT_652');
  });

  // --------------------------------------------------------------------------
  // FEATURE 6.7: Result Display, Solution Review & Student Flagging
  // --------------------------------------------------------------------------
  await test('6.7-U1: Student retrieves comprehensive results scorecard and review', async () => {
    const res = await request('GET', `/attempts/${testAttemptId}/results`, null, studentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.attemptId, testAttemptId);
    assert.ok(res.body.data.questions[0].correctAnswer !== undefined, 'Review mode MUST include correct answers');
    assert.ok(res.body.data.questions[0].explanation !== undefined, 'Review mode MUST include explanations');
    assert.ok(res.body.data.questions[0].marksAwarded !== undefined, 'Review mode MUST include marks awarded');
  });

  await test('6.7-U2: Student flags attempt result for teacher review', async () => {
    const res = await request('POST', `/attempts/${testAttemptId}/flag`, {
      reason: 'Question 1 ambiguous phrasing regarding frictional force',
    }, studentToken);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.auditLogId, 'Audit log ID must be returned');

    // Verify attempt is marked as flagged
    const checkRes = await request('GET', `/attempts/${testAttemptId}/results`, null, studentToken);
    assert.strictEqual(checkRes.body.data.isFlagged, true);
    assert.strictEqual(checkRes.body.data.flagReason, 'Question 1 ambiguous phrasing regarding frictional force');
  });

  await test('6.7-U3: Re-flagging an already flagged attempt returns 409 Conflict', async () => {
    const res = await request('POST', `/attempts/${testAttemptId}/flag`, {
      reason: 'Duplicate flag attempt',
    }, studentToken);

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.errorCode, 'ATTEMPT_656');
  });

  // --------------------------------------------------------------------------
  // SECTION 7 MANDATORY SECURITY / IDOR CROSS-ACCOUNT CHECKS
  // --------------------------------------------------------------------------
  console.log('\n--- Running Mandatory Section 7 IDOR Security Checks (Student 2 accessing Student 1 attempt) ---');

  await test('Sec-7.1: Student 2 GET /attempts/:id/state of Student 1 attempt is REJECTED with 403', async () => {
    const res = await request('GET', `/attempts/${testAttemptId}/state`, null, student2Token);
    assert.strictEqual(res.status, 403, 'Cross-user attempt state access must return 403 Forbidden');
    assert.strictEqual(res.body.errorCode, 'FORBIDDEN_ATTEMPT_ACCESS');
  });

  await test('Sec-7.2: Student 2 PUT /attempts/:id/sync of Student 1 attempt is REJECTED with 403', async () => {
    const res = await request('PUT', `/attempts/${testAttemptId}/sync`, {
      questionId: testQuestions[0].questionId,
      studentAnswer: 'opt_d',
    }, student2Token);
    assert.strictEqual(res.status, 403, 'Cross-user answer syncing must return 403 Forbidden');
    assert.strictEqual(res.body.errorCode, 'FORBIDDEN_ATTEMPT_ACCESS');
  });

  await test('Sec-7.3: Student 2 POST /attempts/:id/submit of Student 1 attempt is REJECTED with 403', async () => {
    const res = await request('POST', `/attempts/${testAttemptId}/submit`, {}, student2Token);
    assert.strictEqual(res.status, 403, 'Cross-user attempt submission must return 403 Forbidden');
    assert.strictEqual(res.body.errorCode, 'FORBIDDEN_ATTEMPT_ACCESS');
  });

  await test('Sec-7.4: Student 2 GET /attempts/:id/results of Student 1 attempt is REJECTED with 403', async () => {
    const res = await request('GET', `/attempts/${testAttemptId}/results`, null, student2Token);
    assert.strictEqual(res.status, 403, 'Cross-user result viewing must return 403 Forbidden');
    assert.strictEqual(res.body.errorCode, 'FORBIDDEN_ATTEMPT_ACCESS');
  });

  await test('Sec-7.5: Student 2 POST /attempts/:id/flag of Student 1 attempt is REJECTED with 403', async () => {
    const res = await request('POST', `/attempts/${testAttemptId}/flag`, {
      reason: 'Malicious cross-user flag attempt',
    }, student2Token);
    assert.strictEqual(res.status, 403, 'Cross-user result flagging must return 403 Forbidden');
    assert.strictEqual(res.body.errorCode, 'FORBIDDEN_ATTEMPT_ACCESS');
  });

  console.log('\n====================================================');
  console.log(` PHASE 6 MASTER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase6Tests().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
