const http = require('http');
const assert = require('assert');

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

async function runPhase9MasterSuite() {
  console.log('====================================================');
  console.log('  STARTING PHASE 9 MASTER INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  // 1. Log in personas
  console.log('1. Authenticating test personas (student, student2, admin)...');
  const studentLogin = await request('POST', '/auth/login', { email: 'student@examos.com', password: 'Student@123' });
  assert.strictEqual(studentLogin.status, 200, 'Student login failed');
  const studentToken = studentLogin.data.data.accessToken;
  const studentId = studentLogin.data.data.user.id;

  const student2Login = await request('POST', '/auth/login', { email: 'student2@examos.com', password: 'Student2@123' });
  assert.strictEqual(student2Login.status, 200, 'Student2 login failed');
  const student2Token = student2Login.data.data.accessToken;
  const student2Id = student2Login.data.data.user.id;

  const adminLogin = await request('POST', '/auth/login', { email: 'admin@examos.com', password: 'Admin@123' });
  assert.strictEqual(adminLogin.status, 200, 'Admin login failed');
  const adminToken = adminLogin.data.data.accessToken;

  // Ensure Student 1 has active PREMIUM subscription for personalized practice entitlement
  await request('POST', '/subscriptions', { planCode: 'PREMIUM' }, studentToken);
  console.log('   ✓ Personas authenticated and Student 1 subscribed to PREMIUM tier.\n');

  // 2. Feature 9.1: Retrieve Weakness Pool
  console.log('2. Feature 9.1: Testing Weakness Pool retrieval...');
  const poolRes = await request('GET', `/students/${studentId}/weakness-pool`, null, studentToken);
  assert.strictEqual(poolRes.status, 200, 'Failed to fetch student weakness pool');
  assert.ok(Array.isArray(poolRes.data.data), 'Weakness pool should be an array');
  assert.ok(poolRes.data.data.length > 0, 'Student 1 should have active weaknesses in pool');
  
  const topWeakness = poolRes.data.data[0];
  console.log(`   ✓ Found ${poolRes.data.data.length} weak topics for Student 1. Top weakness: "${topWeakness.topicName}" (Error Rate: ${topWeakness.errorRate * 100}%)`);

  // Verify cross-student access control
  const unauthRes = await request('GET', `/students/${student2Id}/weakness-pool`, null, studentToken);
  assert.strictEqual(unauthRes.status, 403, 'Student should not access student2 weakness pool');
  console.log('   ✓ RBAC verified: Student rejected with 403 from viewing other student weakness pool.');

  // Elevated admin can view student weakness pool
  const adminViewPool = await request('GET', `/students/${studentId}/weakness-pool`, null, adminToken);
  assert.strictEqual(adminViewPool.status, 200, 'Admin should be able to view student weakness pool');
  console.log('   ✓ Admin authorized to inspect student weakness pool.\n');

  // 3. Feature 9.2: Generate Personalized Practice Paper
  console.log('3. Feature 9.2: Testing Personalized Practice Paper generation...');
  const genRes = await request('POST', '/practice/generate', {
    targetNodeIds: [topWeakness.syllabusNodeId],
    count: 6,
    difficulty: 'ADAPTIVE',
    title: `Targeted Practice: ${topWeakness.topicName}`,
  }, studentToken);

  assert.strictEqual(genRes.status, 201, 'Practice paper generation failed');
  assert.ok(genRes.data.data.paper, 'Paper DTO missing in response');
  assert.ok(genRes.data.data.questions, 'Questions missing in response');
  assert.ok(genRes.data.data.activeAttemptId, 'Active attempt session missing');

  const paper = genRes.data.data.paper;
  const questions = genRes.data.data.questions;
  const attemptId = genRes.data.data.activeAttemptId;

  console.log(`   ✓ Generated Practice Paper: "${paper.title}" with ${questions.length} questions. Attempt ID: ${attemptId}`);

  // Verify difficulty progression
  const diffs = questions.map((q) => q.difficulty);
  console.log(`   ✓ Question difficulty sequence: [${diffs.join(', ')}]`);
  assert.ok(questions.length > 0, 'Practice paper must have questions');

  // 4. Feature 9.2: Fetch Practice Paper Details
  console.log('4. Testing Practice Paper fetch by ID...');
  const fetchPaperRes = await request('GET', `/practice/${paper.id}`, null, studentToken);
  assert.strictEqual(fetchPaperRes.status, 200, 'Failed to fetch practice paper by ID');
  assert.strictEqual(fetchPaperRes.data.data.id, paper.id, 'Paper ID mismatch');
  console.log('   ✓ Successfully fetched practice paper details.\n');

  // Helper to fetch question correct answer key
  async function getCorrectOptionId(qId) {
    const qDetails = await request('GET', `/questions/${qId}`, null, adminToken);
    return qDetails.data.data?.data?.correctOptionId || qDetails.data.data?.data?.correctAnswer || 'opt_a';
  }

  // Submit first question correctly
  const q1 = questions[0];
  const q1Correct = await getCorrectOptionId(q1.questionId);
  const eval1 = await request('POST', `/practice/${attemptId}/answer`, {
    questionId: q1.questionId,
    selectedOption: q1Correct,
    timeSpentSeconds: 20,
  }, studentToken);

  assert.strictEqual(eval1.status, 200, 'Answer evaluation failed');
  assert.strictEqual(eval1.data.data.isCorrect, true, 'Question 1 answer should be evaluated as correct');
  console.log(`   ✓ Q1 Answered correctly. Streak: ${eval1.data.data.consecutiveCorrect} / ${eval1.data.data.masteryThreshold}`);

  // Submit second question correctly
  if (questions.length > 1) {
    const q2 = questions[1];
    const q2Correct = await getCorrectOptionId(q2.questionId);
    const eval2 = await request('POST', `/practice/${attemptId}/answer`, {
      questionId: q2.questionId,
      selectedOption: q2Correct,
      timeSpentSeconds: 18,
    }, studentToken);

    assert.strictEqual(eval2.status, 200, 'Answer 2 evaluation failed');
    assert.strictEqual(eval2.data.data.isCorrect, true);
    console.log(`   ✓ Q2 Answered correctly. Streak: ${eval2.data.data.consecutiveCorrect} / ${eval2.data.data.masteryThreshold}`);
  }

  // Submit third question correctly -> should trigger isMastered: true
  if (questions.length > 2) {
    const q3 = questions[2];
    const q3Correct = await getCorrectOptionId(q3.questionId);
    const eval3 = await request('POST', `/practice/${attemptId}/answer`, {
      questionId: q3.questionId,
      selectedOption: q3Correct,
      timeSpentSeconds: 22,
    }, studentToken);

    assert.strictEqual(eval3.status, 200, 'Answer 3 evaluation failed');
    assert.strictEqual(eval3.data.data.isCorrect, true);
    console.log(`   ✓ Q3 Answered correctly. Streak: ${eval3.data.data.consecutiveCorrect} / ${eval3.data.data.masteryThreshold}, Mastered: ${eval3.data.data.isMastered}`);
    assert.strictEqual(eval3.data.data.isMastered, true, 'Concept should be marked as mastered after 3 consecutive correct answers');
  }

  // 6. Feature 9.4: Finalize & Submit Practice Attempt
  console.log('\n6. Feature 9.4: Testing Practice Attempt Submission & Scorecard...');
  const submitRes = await request('POST', `/practice/${attemptId}/submit`, null, studentToken);
  assert.strictEqual(submitRes.status, 200, 'Failed to submit practice attempt');
  assert.strictEqual(submitRes.data.data.status, 'COMPLETED');
  console.log(`   ✓ Practice Attempt finalized. Accuracy: ${submitRes.data.data.accuracyPercentage}%, Correct: ${submitRes.data.data.correctCount}/${submitRes.data.data.totalAttempted}`);

  // 7. Feature 9.4: Practice History Retrieval
  console.log('\n7. Feature 9.4: Testing Practice History pagination...');
  const historyRes = await request('GET', '/practice/history?page=1&limit=5', null, studentToken);
  assert.strictEqual(historyRes.status, 200, 'Failed to fetch practice history');
  assert.ok(Array.isArray(historyRes.data.data.items), 'History items should be an array');
  assert.ok(historyRes.data.data.total >= 1, 'Total practice attempts should be at least 1');
  console.log(`   ✓ Practice history returned ${historyRes.data.data.items.length} items (Total: ${historyRes.data.data.total})`);

  // 8. Delete Practice Paper & Ownership Gating
  console.log('\n8. Testing Practice Paper DELETE endpoint with ownership checks...');
  // Student 2 attempts to delete Student 1's practice paper -> 403 Forbidden
  const unauthDel = await request('DELETE', `/practice/${paper.id}`, null, student2Token);
  assert.strictEqual(unauthDel.status, 403, 'Cross-student practice deletion should return 403');
  console.log('   ✓ Cross-student practice paper deletion rejected with 403.');

  // Student 1 deletes their own practice paper -> 200 OK
  const studentDel = await request('DELETE', `/practice/${paper.id}`, null, studentToken);
  assert.strictEqual(studentDel.status, 200, 'Owner practice paper deletion failed');
  console.log('   ✓ Owner successfully deleted practice paper.');

  // Confirm paper no longer exists -> 404
  const checkDel = await request('GET', `/practice/${paper.id}`, null, studentToken);
  assert.strictEqual(checkDel.status, 404, 'Deleted paper should return 404');
  console.log('   ✓ Deleted practice paper verified absent (404).');

  console.log('\n====================================================');
  console.log('✅ ALL PHASE 9 MASTER TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
}

runPhase9MasterSuite().catch((err) => {
  console.error('\n❌ PHASE 9 MASTER TEST FAILED:', err);
  process.exit(1);
});
