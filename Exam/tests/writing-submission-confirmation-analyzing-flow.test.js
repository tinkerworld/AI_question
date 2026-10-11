const assert = require('assert');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:4043/api/v1';

async function fetchJson(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-isolated-test': 'true',
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
    throw new Error(`Login failed for ${email}`);
  }
  return { token, user: res.data.data.user };
}

async function main() {
  console.log('========================================================================');
  console.log('🧪 RUNNING WRITING TEST SUBMISSION, CONFIRMATION & ANALYZING FLOW TESTS');
  console.log('========================================================================');

  // 1. Authenticate Student persona
  console.log('\n1. Authenticating student...');
  const student = await login('student@examos.com', 'Student@123');
  assert.ok(student.token, 'Student token obtained');
  console.log('   ✓ Student authenticated successfully');

  // 2. Start a writing session
  console.log('\n2. Starting writing practice session...');
  const startRes = await fetchJson('/writing/sessions/start', {
    method: 'POST',
    headers: { Authorization: `Bearer ${student.token}` },
    body: JSON.stringify({
      questionId: 'q_ielts_wrt_01',
      mode: 'PRACTICE',
    }),
  });
  assert.strictEqual(startRes.status, 201);
  assert.strictEqual(startRes.data.success, true);
  const session = startRes.data.data.session;
  const question = startRes.data.data.question;
  assert.ok(session.id, 'Session ID created');
  assert.strictEqual(session.status, 'IN_PROGRESS');
  assert.ok(question.content, 'Question content present');
  console.log(`   ✓ Started session: ${session.id} for question: ${question.content.slice(0, 45)}...`);

  // 3. Submit essay
  console.log('\n3. Submitting essay attempt with isolated test flag...');
  const sampleEssay = `The bar chart illustrates the proportions of electricity generated using solar, wind, and hydroelectric sources across five European countries from 2010 to 2024. Overall, renewable power generation increased significantly across all five nations. Wind and solar registered the most dramatic percentage expansions, whereas hydroelectricity remained stable and predominant in Norway throughout the period. In 2010, Norway generated almost 90% of its power from hydro, which stayed at approximately 88% in 2024. Denmark exhibited massive expansion in wind electricity, climbing from 21% to over 55%. Germany and Spain both experienced substantial growth in wind and solar output, and the United Kingdom expanded offshore wind generation to 28%.`;

  const submitRes = await fetchJson(`/writing/sessions/${session.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${student.token}` },
    body: JSON.stringify({
      essayText: sampleEssay,
      timeSpentSeconds: 650,
      allowTestMock: true,
    }),
  });
  assert.strictEqual(submitRes.status, 200);
  assert.strictEqual(submitRes.data.success, true);
  assert.strictEqual(submitRes.data.data.sessionId, session.id);
  assert.ok(submitRes.data.data.evaluation, 'Evaluation object returned');
  assert.ok(submitRes.data.data.overallScore !== undefined || submitRes.data.data.score !== undefined);
  console.log(`   ✓ Submitted successfully! Status: ${submitRes.data.data.status}, Score: ${submitRes.data.data.score}`);

  // 4. Retrieve complete session details (for Past Attempt Review)
  console.log('\n4. Verifying past attempt inspection endpoint (GET /writing/sessions/:id)...');
  const pastSessionRes = await fetchJson(`/writing/sessions/${session.id}`, {
    headers: { Authorization: `Bearer ${student.token}` },
  });
  assert.strictEqual(pastSessionRes.status, 200);
  assert.strictEqual(pastSessionRes.data.success, true);
  const fetchedSession = pastSessionRes.data.data;
  assert.strictEqual(fetchedSession.id, session.id);
  assert.strictEqual(fetchedSession.essayText, sampleEssay);
  assert.ok(fetchedSession.evaluation, 'Full evaluation JSON retained');
  assert.ok(fetchedSession.question, 'Question details retained');
  assert.strictEqual(fetchedSession.question.id, 'q_ielts_wrt_01');
  console.log(`   ✓ Retrieved session details successfully. Retained essay words: ${fetchedSession.wordCount}, Score: ${fetchedSession.score}`);

  // 5. Verify Student History list (GET /writing/sessions)
  console.log('\n5. Verifying user history roster (GET /writing/sessions)...');
  const historyRes = await fetchJson('/writing/sessions', {
    headers: { Authorization: `Bearer ${student.token}` },
  });
  assert.strictEqual(historyRes.status, 200);
  assert.strictEqual(historyRes.data.success, true);
  assert.ok(Array.isArray(historyRes.data.data));
  const foundInHistory = historyRes.data.data.find((s) => s.id === session.id);
  assert.ok(foundInHistory, 'Submitted session found in student past sessions list');
  console.log(`   ✓ Session ${session.id} found in student attempt history`);

  // 6. Verify WritingPracticePage frontend implementation
  console.log('\n6. Verifying WritingPracticePage.tsx code compliance...');
  const pageContent = fs.readFileSync(
    path.join(__dirname, '../apps/web/src/pages/WritingPracticePage.tsx'),
    'utf-8'
  );

  // Check activeView type includes ANALYZING
  assert.ok(pageContent.includes("'ANALYZING'"), "WritingPracticePage must support 'ANALYZING' activeView state");

  // Check Submit Confirmation Modal
  assert.ok(pageContent.includes('modal-submit-writing-confirm'), 'Must contain modal-submit-writing-confirm');
  assert.ok(pageContent.includes('btn-cancel-submit-essay'), 'Must contain btn-cancel-submit-essay (No button)');
  assert.ok(pageContent.includes('btn-confirm-submit-essay'), 'Must contain btn-confirm-submit-essay (Yes button)');
  assert.ok(pageContent.includes('under_length_warning'), 'Must contain under-length warning check');

  // Check Dedicated Analyzing Screen
  assert.ok(pageContent.includes('writing-analyzing-screen'), 'Must contain writing-analyzing-screen container');
  assert.ok(pageContent.includes('analyzingElapsedSeconds'), 'Must show elapsed timer during analyzing');
  assert.ok(pageContent.includes('pipelineStages'), 'Must show pipeline stages during analyzing');
  assert.ok(pageContent.includes('exam_prompt_reference'), 'Must show prompt reference on analyzing screen');
  assert.ok(pageContent.includes('your_submitted_answer'), 'Must show submitted answer on analyzing screen');
  assert.ok(pageContent.includes('btn-retry-analysis'), 'Must provide retry analysis option on failure');
  assert.ok(pageContent.includes('btn-return-editor'), 'Must provide return to editor option on failure');

  // Check History View Review & Back Button
  assert.ok(pageContent.includes('btn-view-analysis-'), 'Must contain btn-view-analysis button for past sessions');
  assert.ok(pageContent.includes('handleViewPastSession'), 'Must implement handleViewPastSession');
  assert.ok(pageContent.includes('btn-back-to-history'), 'Must contain btn-back-to-history in results view');

  console.log('   ✓ All frontend state and UI requirements verified in WritingPracticePage.tsx');

  console.log('\n========================================================================');
  console.log('🎉 ALL WRITING SUBMISSION, CONFIRMATION & ANALYZING FLOW TESTS PASSED!');
  console.log('========================================================================');
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
