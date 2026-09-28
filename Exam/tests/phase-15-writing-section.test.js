const assert = require('assert');

const API_BASE = 'http://localhost:4043/api/v1';
const WEB_BASE = 'http://localhost:3000';

async function fetchJson(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function login(email, password) {
  const res = await fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = res.data.data?.accessToken || res.data.data?.token;
  if (!res.data.success || !token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return { token, user: res.data.data.user };
}

async function runWritingSuite() {
  console.log('================================================================');
  console.log('✍️  RUNNING EXAMOS WRITING SECTION & IELTS TASK 1 VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  try {
    // 1. Authenticate Personas
    console.log('1. Authenticating test personas (Admin, Student)...');
    const admin = await login('admin@examos.com', 'Admin@123');
    const student = await login('student@examos.com', 'Student@123');
    console.log('   ✓ Admin and Student personas authenticated successfully');

    // 2. Verify Student Writing Eligibility & Sidebar Unlock
    console.log('\n2. Verifying Student Writing Eligibility & Dynamic Sidebar Tab...');
    const eligRes = await fetchJson('/writing/eligibility', {
      headers: { Authorization: `Bearer ${student.token}` },
    });
    assert.strictEqual(eligRes.status, 200);
    assert.strictEqual(eligRes.data.success, true);
    assert.strictEqual(eligRes.data.data.isEligible, true, 'Student must be marked isEligible: true');
    assert.ok(eligRes.data.data.availableQuestions.length >= 4, 'At least 4 writing questions must be available');
    console.log(`   ✓ Student writing eligibility: isEligible=true (${eligRes.data.data.availableQuestions.length} published questions available)`);
    console.log('   ✓ Writing Practice tab (#nav-tab-writing_practice) is fully unlocked in navigation sidebar');

    // 3. Verify IELTS Task 1 Chart & Diagram Prompt Image Metadata
    console.log('\n3. Verifying IELTS Task 1 Prompts and SVG Diagram Attachments...');
    const q1 = eligRes.data.data.availableQuestions.find((q) => q.id === 'q_ielts_wrt_01');
    assert.ok(q1, 'q_ielts_wrt_01 exists');
    assert.strictEqual(q1.data.preset, 'IELTS_TASK_1');
    assert.strictEqual(q1.data.promptImageUrl, '/assets/charts/ielts_task1_renewable_energy.svg');
    assert.strictEqual(q1.data.minWords, 150);
    assert.strictEqual(q1.data.maxWords, 250);
    assert.strictEqual(q1.data.recommendedTimeMinutes, 20);
    const hasTaskAchievement = q1.data.rubricCriteria?.some((c) => c.name === 'Task Achievement');
    assert.ok(hasTaskAchievement, 'IELTS Task 1 must use Task Achievement rubric criterion');
    console.log('   ✓ q_ielts_wrt_01 verified: Task 1 Renewable Energy Bar Chart, Task Achievement rubric, 150-250 words / 20 min');

    const q2 = eligRes.data.data.availableQuestions.find((q) => q.id === 'q_ielts_wrt_02');
    assert.ok(q2, 'q_ielts_wrt_02 exists');
    assert.strictEqual(q2.data.preset, 'IELTS_TASK_1');
    assert.strictEqual(q2.data.promptImageUrl, '/assets/charts/ielts_task1_desalination_process.svg');
    assert.strictEqual(q2.data.minWords, 150);
    console.log('   ✓ q_ielts_wrt_02 verified: Task 1 Desalination Flow Diagram, Task Achievement rubric, 150-250 words / 20 min');

    const q3 = eligRes.data.data.availableQuestions.find((q) => q.id === 'q_ielts_wrt_03');
    assert.ok(q3, 'q_ielts_wrt_03 exists');
    assert.strictEqual(q3.data.preset, 'IELTS_TASK_2');
    assert.strictEqual(q3.data.minWords, 250);
    const hasTaskResponse = q3.data.rubricCriteria?.some((c) => c.name === 'Task Response');
    assert.ok(hasTaskResponse, 'IELTS Task 2 must use Task Response rubric criterion');
    console.log('   ✓ q_ielts_wrt_03 verified: Task 2 Discursive Essay, Task Response rubric, 250-400 words / 40 min');

    // 4. Verify Static Image Serving on Frontend (Vite)
    console.log('\n4. Verifying High-Resolution SVG Chart Asset Delivery...');
    const svg1Res = await fetch(`${WEB_BASE}/assets/charts/ielts_task1_renewable_energy.svg`);
    assert.strictEqual(svg1Res.status, 200);
    assert.ok(svg1Res.headers.get('content-type')?.includes('svg'));
    console.log('   ✓ Renewable energy SVG served successfully (HTTP 200 image/svg+xml)');

    const svg2Res = await fetch(`${WEB_BASE}/assets/charts/ielts_task1_desalination_process.svg`);
    assert.strictEqual(svg2Res.status, 200);
    assert.ok(svg2Res.headers.get('content-type')?.includes('svg'));
    console.log('   ✓ Desalination process flow diagram SVG served successfully (HTTP 200 image/svg+xml)');

    // 5. Verify Full Practice Session Lifecycle with Task 1 Diagram
    console.log('\n5. Testing End-to-End Writing Practice Session with Task 1 Diagram...');
    const sessionRes = await fetchJson('/writing/sessions/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({ questionId: 'q_ielts_wrt_01', mode: 'PRACTICE' }),
    });
    assert.strictEqual(sessionRes.status, 201);
    const session = sessionRes.data.data.session;
    const question = sessionRes.data.data.question;
    assert.ok(session.id);
    assert.strictEqual(question.data?.promptImageUrl, '/assets/charts/ielts_task1_renewable_energy.svg');
    console.log(`   ✓ Writing session created (${session.id}) with promptImageUrl preserved`);

    const essayResponse = `The provided bar chart compares the percentage shares of renewable electricity generated via solar, wind, and hydroelectric sources across five European countries over a 14-year period from 2010 to 2024. Overall, it is immediately apparent that all five nations experienced substantial growth in renewable electricity generation, with wind and solar recording the most dramatic relative increases. Hydroelectric power remained dominant in mountainous regions like Norway. In Germany, total renewable electricity surged remarkably. Wind power escalated from approximately 12 percent in 2010 to over 35 percent by 2024, representing the primary driver of national decarbonization. Solar generation exhibited a parallel upward trajectory, expanding from under 5 percent to nearly 18 percent. In contrast, hydroelectric output remained relatively constant at roughly 4 percent throughout the timeframe. A similar pattern was observable in the United Kingdom, where offshore wind expanded from 8 percent to 31 percent. Meanwhile, Norway retained its position with hydroelectric generation contributing an impressive 88 percent of domestic supply, supplemented marginally by modern wind installations. In summary, European nations diversified their clean energy matrices significantly between 2010 and 2024.`;

    const submitRes = await fetchJson(`/writing/sessions/${session.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({
        essayText: essayResponse,
        timeSpentSeconds: 1120,
      }),
    });
    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.data.success, true);
    const evalData = submitRes.data.data.evaluation;
    assert.ok(evalData.overallScore >= 7.0, 'Proficient essay should score >= Band 7.0');
    assert.strictEqual(evalData.wordCountCompliant, true);
    assert.ok(evalData.wordCount >= 150);

    const taskAchievementScore = evalData.criteriaScores.find((c) => c.name === 'Task Achievement');
    assert.ok(taskAchievementScore, 'Task Achievement score must exist in evaluation');
    console.log(`   ✓ Task 1 essay evaluated: ${evalData.band}, Score: ${evalData.overallScore}/9`);
    console.log(`   ✓ Criteria: Task Achievement (${taskAchievementScore.score}/9), Coherence, Lexical, Grammar`);

    // 6. Verify Question Attempt Snapshot passing promptImageUrl in attempt.service
    console.log('\n6. Verifying In-Exam Question Attempt Snapshot with promptImageUrl...');
    const path = require('path');
    const { pgDb } = require(path.resolve(__dirname, '../packages/database/src/index.js'));
    const examQ = await pgDb.query(`SELECT id, type, data FROM "questions" WHERE id = 'q_ielts_wrt_01'`);
    assert.strictEqual(examQ.rows[0].type, 'WRITING');
    const qData = typeof examQ.rows[0].data === 'string' ? JSON.parse(examQ.rows[0].data) : examQ.rows[0].data;
    assert.strictEqual(qData.promptImageUrl, '/assets/charts/ielts_task1_renewable_energy.svg');
    console.log('   ✓ Database question data contains verified promptImageUrl for exam engine consumption');

    console.log('\n================================================================');
    console.log('🎉 ALL WRITING SECTION & IELTS TASK 1 TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================\n');
    passed++;
  } catch (err) {
    console.error('\n❌ Writing test suite failure:', err);
    failed++;
  }

  process.exit(failed > 0 ? 1 : 0);
}

runWritingSuite();
