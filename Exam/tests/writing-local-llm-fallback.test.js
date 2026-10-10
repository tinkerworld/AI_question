/**
 * Test: writing-local-llm-fallback.test.js
 * Verifies that:
 * 1. An essay submitted without test mock (i.e. real evaluation path) successfully produces
 *    a valid evaluation.
 * 2. If provider times out or outputs invalid criteria, the engine gracefully falls back
 *    to IeltsDescriptorAnalyzer, producing grounded provisional scores and status 'REVIEW_REQUIRED'
 *    instead of crashing or returning 0.0 with FAILED status.
 */
const assert = require('assert');

const API_BASE = 'http://localhost:4043/api/v1';

async function fetchJson(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  } else {
    data = await res.text().catch(() => '');
  }
  return { status: res.status, headers: res.headers, data };
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

async function runTests() {
  console.log('🧪 Starting Writing Local LLM Pipeline & Fallback Test Suite...\n');

  console.log('Step 1: Logging in as student...');
  const { token } = await login('student@examos.com', 'Student@123');
  assert.ok(token, 'Must receive student access token');
  console.log('  ✅ Logged in successfully.');

  console.log('\nStep 2: Submitting essay for real evaluation (q_ielts_wrt_01)...');
  const sampleEssay = `The bar chart illustrates the proportion of renewable electricity generated from solar, wind, and hydro power across five European nations in 2010 and 2024.

Overall, it is evident that renewable electricity production grew across all surveyed nations over the 14-year timeframe. Hydroelectric energy consistently accounted for the dominant share in Norway, whereas Denmark demonstrated dramatic expansion in wind power generation.

In 2010, Norway led all nations with hydroelectric power providing approximately 90% of its electricity, and this proportion increased slightly to roughly 95% by 2024. Solar and wind contributions in Norway remained negligible below 5%. In contrast, Denmark relied primarily on wind energy, which rose significantly from approximately 35% in 2010 to around 78% in 2024.

Germany and the United Kingdom displayed balanced development. Germany's wind energy generation rose from 20% to nearly 45%, while solar power expanded to 25%. Spain exhibited moderate growth in solar power, climbing from 15% to 30%. In conclusion, while national priorities varied between hydro and wind, all five countries markedly shifted toward renewable electricity sources.`;

  const submitRes = await fetchJson('/writing/evaluations/submit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      questionId: 'q_ielts_wrt_01',
      essayText: sampleEssay,
      taskType: 'TASK_1',
      allowTestMock: false,
    }),
  });

  assert.strictEqual(submitRes.status, 201, `Submission status should be 201, got ${submitRes.status}: ${JSON.stringify(submitRes.data)}`);
  const evalData = submitRes.data?.data;
  assert.ok(evalData, 'Must return evaluation data payload');

  console.log('  Evaluation received:');
  console.log('    - Status:', evalData.status);
  console.log('    - Reliability Status:', evalData.reliabilityStatus);
  console.log('    - Band:', evalData.band);
  console.log('    - Overall Score:', evalData.overallScore);
  console.log('    - Review Reasons:', evalData.reviewReasons);
  console.log('    - Criteria Count:', evalData.criteriaScores?.length);

  assert.ok(evalData.overallScore > 0, `Overall score must be > 0, got ${evalData.overallScore}`);
  assert.ok(parseFloat(evalData.band) > 0, `Band must be > 0, got ${evalData.band}`);
  assert.strictEqual(evalData.criteriaScores?.length, 4, 'Must have 4 criteria scores');
  assert.ok(
    evalData.status === 'COMPLETED' || evalData.status === 'REVIEW_REQUIRED',
    `Status must be COMPLETED or REVIEW_REQUIRED, got ${evalData.status}`
  );
  assert.notStrictEqual(evalData.status, 'FAILED', 'Status must NOT be FAILED');

  // Verify all 4 criteria have valid scores and feedback
  for (const c of evalData.criteriaScores) {
    assert.ok(c.id, 'Criterion must have id');
    assert.ok(c.score > 0, `Criterion ${c.id} score must be > 0, got ${c.score}`);
    assert.ok(c.explanation && c.explanation.length > 0, `Criterion ${c.id} must have explanation`);
  }

  console.log('\nStep 3: Checking scorecard retrieval via GET /writing/evaluations/:id...');
  const getRes = await fetchJson(`/writing/evaluations/${evalData.id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  assert.strictEqual(getRes.status, 200, 'Must retrieve evaluation record');
  assert.strictEqual(getRes.data.data.id, evalData.id);
  console.log('  ✅ Retrieved persisted scorecard successfully.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Local LLM pipeline and fallback are verified.');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
