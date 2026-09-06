// Runner: node tests/phase-15-v2-master.test.js
/**
 * Phase 15 Master Integration Test Suite (V2 Features)
 * Covers:
 *   - 15.14 (MAINTENANCE-01): Global & Feature-Level Maintenance Engine & Bypass
 *   - 15.15 (ENTITLEMENT-PATCH-01): Feature Registry, Plan Matrix & Promotional Windows
 *   - 15.1 (LISTENING-01): Audio Config, Voice Profiles & Listening Question Type
 *   - 15.2 (WRITING-01): Writing Evaluation, Multi-Criteria Rubrics & Word Count Compliance
 *   - 15.5 (VOCABULARY-01): SuperMemo SM-2 Retention Engine & Practice Drills
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const BASE_URL = process.env.API_BASE || 'http://localhost:4043/api/v1';

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
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

async function runPhase15MasterTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING PHASE 15 (V2 FEATURES) MASTER INTEGRATION SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  // 1. Authenticate Personas
  console.log('\n1. Authenticating test personas (Admin, Student)...');
  const admin = await login('admin@examos.com', 'Admin@123');
  const student = await login('student@examos.com', 'Student@123');
  console.log('   ✓ Admin and Student personas authenticated successfully');

  // ============================================================================
  // TEST 15.14: Centralized Maintenance Engine (MAINTENANCE-01)
  // ============================================================================
  console.log('\n2. Testing Feature 15.14: Maintenance Engine...');
  try {
    // 2.1 Public status query
    const statusRes = await fetchJson('/maintenance/status');
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.data.success, true);
    assert.strictEqual(typeof statusRes.data.data.isGlobalMaintenance, 'boolean');
    console.log('   ✓ Public /maintenance/status query succeeded without authentication');

    // 2.2 List configs (Admin only)
    const configsRes = await fetchJson('/maintenance/configs', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.strictEqual(configsRes.status, 200);
    assert.strictEqual(configsRes.data.success, true);
    assert.ok(Array.isArray(configsRes.data.data));
    console.log('   ✓ Admin successfully listed maintenance configurations');

    // 2.3 Set Feature-Level Maintenance for vocabulary_practice
    const setFeatRes = await fetchJson('/maintenance/features/vocabulary_practice', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        isActive: true,
        message: 'Vocabulary drill engine undergoing dictionary upgrades.',
      }),
    });
    assert.strictEqual(setFeatRes.status, 200);
    assert.strictEqual(setFeatRes.data.success, true);
    assert.strictEqual(setFeatRes.data.data.isActive, true);
    console.log('   ✓ Set vocabulary_practice feature maintenance to ACTIVE');

    // 2.4 Verify student is blocked by feature maintenance middleware with 503
    const studentVocabRes = await fetchJson('/vocabulary/words', {
      headers: { Authorization: `Bearer ${student.token}` },
    });
    assert.strictEqual(studentVocabRes.status, 503);
    assert.strictEqual(studentVocabRes.data.success, false);
    assert.strictEqual(studentVocabRes.data.errorCode, 'FEATURE_MAINTENANCE');
    console.log('   ✓ Student blocked with HTTP 503 and FEATURE_MAINTENANCE error');

    // 2.5 Verify Admin bypasses feature maintenance
    const adminVocabRes = await fetchJson('/vocabulary/words', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.strictEqual(adminVocabRes.status, 200);
    assert.strictEqual(adminVocabRes.data.success, true);
    console.log('   ✓ Admin staff successfully bypassed feature maintenance');

    // 2.6 Restore feature online
    await fetchJson('/maintenance/features/vocabulary_practice', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        isActive: false,
      }),
    });
    console.log('   ✓ Restored vocabulary_practice back ONLINE');

    passed++;
  } catch (err) {
    console.error('   ❌ Feature 15.14 failed:', err.message);
    failed++;
  }

  // ============================================================================
  // TEST 15.15: Dynamic Feature Registry & Promotions (ENTITLEMENT-PATCH-01)
  // ============================================================================
  console.log('\n3. Testing Feature 15.15: Feature Registry & Promotional Windows...');
  try {
    // 3.1 Fetch dynamic plan matrix
    const matrixRes = await fetchJson('/entitlements/matrix', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.strictEqual(matrixRes.status, 200);
    assert.strictEqual(matrixRes.data.success, true);
    assert.ok(matrixRes.data.data.features.length >= 5);
    const hasWriting = matrixRes.data.data.features.some((f) => f.key === 'writing_evaluator');
    assert.strictEqual(hasWriting, true);
    console.log('   ✓ Dynamic Plan Matrix retrieved with registered Phase 15 features');

    // 3.2 List feature registry
    const registryRes = await fetchJson('/entitlements/features', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.strictEqual(registryRes.status, 200);
    assert.ok(registryRes.data.data.length >= 5);
    console.log('   ✓ Feature registry items verified');

    // 3.3 Create a promotional entitlement window for a feature
    const promoRes = await fetchJson('/entitlements/promotions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        featureKey: 'writing_evaluator',
        startsAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        isActive: true,
        description: 'Free Writing AI Trial Week',
      }),
    });
    assert.strictEqual(promoRes.status, 200);
    assert.strictEqual(promoRes.data.success, true);
    const promoId = promoRes.data.data.id;
    console.log('   ✓ Promotional entitlement window created for writing_evaluator');

    // 3.4 Check that student evaluates as allowed under the promotional window
    const promoCheckRes = await fetchJson('/entitlements/check', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({ key: 'writing_evaluator' }),
    });
    assert.strictEqual(promoCheckRes.status, 200);
    assert.strictEqual(promoCheckRes.data.data.allowed, true);
    assert.ok(promoCheckRes.data.data.reason.includes('promotional') || promoCheckRes.data.data.reason.includes('Trial'));
    console.log('   ✓ Student access granted via active promotional entitlement window');

    // 3.5 Cleanup promotional rule
    await fetchJson(`/entitlements/promotions/${promoId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    console.log('   ✓ Promotional window cleaned up');

    passed++;
  } catch (err) {
    console.error('   ❌ Feature 15.15 failed:', err.message);
    failed++;
  }

  // ============================================================================
  // TEST 15.1: Listening Question Type & Audio Engine (LISTENING-01)
  // ============================================================================
  console.log('\n4. Testing Feature 15.1: Audio Engine & Listening Questions...');
  try {
    // 4.1 Fetch voice profiles
    const voicesRes = await fetchJson('/audio/voices', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.strictEqual(voicesRes.status, 200);
    assert.strictEqual(voicesRes.data.success, true);
    assert.ok(voicesRes.data.data.length >= 3);
    const british = voicesRes.data.data.find((v) => v.accent === 'British');
    assert.ok(british, 'British accent voice profile exists');
    console.log(`   ✓ Retrieved ${voicesRes.data.data.length} audio voice profiles (British, American, Australian)`);

    // 4.2 Create voice profile
    const newVoiceRes = await fetchJson('/audio/voices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        name: 'Canadian Maple Female',
        provider: 'MOCK',
        voiceId: 'en-CA-Neural2-B',
        accent: 'Canadian',
        gender: 'FEMALE',
      }),
    });
    assert.strictEqual(newVoiceRes.status, 200);
    assert.strictEqual(newVoiceRes.data.data.accent, 'Canadian');
    console.log('   ✓ Faculty/Admin created custom voice profile: Canadian Maple');

    // 4.3 Synthesize transient preview
    const previewRes = await fetchJson('/audio/synthesize-preview', {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        script: 'Welcome to section one of the listening comprehension assessment.',
        voiceId: 'en-GB-Neural2-A',
        speed: 1.0,
      }),
    });
    assert.strictEqual(previewRes.status, 200);
    assert.strictEqual(previewRes.data.success, true);
    assert.ok(previewRes.data.data.audioUrl.endsWith('.mp3'));
    assert.strictEqual(previewRes.data.data.format, 'audio/mpeg');
    console.log('   ✓ Synthesized transient listening passage audio preview (.mp3)');

    passed++;
  } catch (err) {
    console.error('   ❌ Feature 15.1 failed:', err.message);
    failed++;
  }

  // ============================================================================
  // TEST 15.2: Writing Question Type & AI Rubric Evaluator (WRITING-01)
  // ============================================================================
  console.log('\n5. Testing Feature 15.2: Writing Evaluator & Multi-Criteria Rubrics...');
  try {
    // 5.1 Fetch writing rubrics
    const rubricsRes = await fetchJson('/writing/rubrics', {
      headers: { Authorization: `Bearer ${student.token}` },
    });
    assert.strictEqual(rubricsRes.status, 200);
    assert.strictEqual(rubricsRes.data.success, true);
    assert.ok(rubricsRes.data.data.length >= 3);
    const ielts = rubricsRes.data.data.find((r) => r.id === 'IELTS_TASK_2' || r.presetKey === 'IELTS_TASK_2');
    assert.ok(ielts);
    assert.strictEqual(ielts.criteria.length, 4);
    console.log('   ✓ Retrieved standard writing rubrics (IELTS Task 2, TOEFL, Academic)');

    // 5.2 Evaluate non-compliant short essay (length failure penalty)
    const shortEssay = 'Living alone has both good and bad things for young adults.';
    const evalShortRes = await fetchJson('/writing/evaluate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({
        submissionText: shortEssay,
        promptStem: 'Discuss advantages and disadvantages of living alone.',
        rubricId: 'IELTS_TASK_2',
        minWords: 150,
        maxWords: 400,
      }),
    });
    assert.strictEqual(evalShortRes.status, 200);
    assert.strictEqual(evalShortRes.data.success, true);
    assert.strictEqual(evalShortRes.data.data.wordCountCompliant, false);
    assert.ok(evalShortRes.data.data.overallScore < 5, 'Score penalized for under-length essay');
    console.log('   ✓ Short essay properly flagged as wordCountCompliant: false with penalty');

    // 5.3 Evaluate comprehensive standard essay
    const sampleEssay = `In modern society, an increasing proportion of individuals opt to reside independently rather than within traditional family households. While this demographic transition presents several distinct advantages regarding autonomy and personal growth, it also introduces notable drawbacks such as financial burdens and social isolation.

One of the primary benefits of solitary living is the unparalleled autonomy it affords. Individuals have total freedom over their daily schedules, dietary choices, and living environment, which fosters resilience, financial discipline, and self-reliance. For instance, young professionals learning to manage domestic chores and utility budgets develop crucial adulthood proficiencies rapidly.

Conversely, living alone frequently entails significant financial strain. Rental expenditures, utility bills, and maintenance costs cannot be apportioned among multiple occupants, requiring substantial disposable income. Furthermore, extended periods of isolation may contribute to psychological vulnerabilities, including depression and diminished emotional well-being.

In conclusion, living independently offers invaluable personal independence and self-development, yet it demands rigorous financial preparedness and conscious efforts to sustain interpersonal relationships to mitigate loneliness.`;

    const evalRes = await fetchJson('/writing/evaluate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({
        submissionText: sampleEssay,
        promptStem: 'Discuss advantages and disadvantages of living alone.',
        rubricId: 'IELTS_TASK_2',
        minWords: 150,
        maxWords: 400,
      }),
    });

    assert.strictEqual(evalRes.status, 200);
    assert.strictEqual(evalRes.data.success, true);
    assert.strictEqual(evalRes.data.data.wordCountCompliant, true);
    assert.ok(evalRes.data.data.wordCount >= 150);
    assert.strictEqual(evalRes.data.data.criteriaScores.length, 4);
    assert.ok(evalRes.data.data.overallScore >= 6.0);
    console.log(`   ✓ High-quality essay evaluated: Band ${evalRes.data.data.band}, Score: ${evalRes.data.data.overallScore}/9`);
    console.log(`   ✓ Criteria scores: ${evalRes.data.data.criteriaScores.map((c) => `${c.name}: ${c.score}`).join(', ')}`);

    passed++;
  } catch (err) {
    console.error('   ❌ Feature 15.2 failed:', err.message);
    failed++;
  }

  // ============================================================================
  // TEST 15.5: Vocabulary Spaced Repetition Engine (VOCABULARY-01)
  // ============================================================================
  console.log('\n6. Testing Feature 15.5: SuperMemo SM-2 Vocabulary Drills...');
  try {
    // 6.1 Query word catalog
    const wordsRes = await fetchJson('/vocabulary/words', {
      headers: { Authorization: `Bearer ${student.token}` },
    });
    assert.strictEqual(wordsRes.status, 200);
    assert.strictEqual(wordsRes.data.success, true);
    assert.ok(wordsRes.data.data.total >= 5);
    const word1 = wordsRes.data.data.words[0];
    console.log(`   ✓ Retrieved ${wordsRes.data.data.total} vocabulary catalog entries (Sample: ${word1.word})`);

    // 6.2 Fetch due practice deck for student
    const dueRes = await fetchJson('/vocabulary/due', {
      headers: { Authorization: `Bearer ${student.token}` },
    });
    assert.strictEqual(dueRes.status, 200);
    assert.strictEqual(dueRes.data.success, true);
    assert.ok(Array.isArray(dueRes.data.data));
    console.log(`   ✓ Practice queue fetched: ${dueRes.data.data.length} cards available`);

    // 6.3 Submit review: Quality 4 (Easy / Perfect Recall)
    const reviewRes = await fetchJson('/vocabulary/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({
        wordId: word1.id,
        quality: 4,
      }),
    });
    assert.strictEqual(reviewRes.status, 200);
    assert.strictEqual(reviewRes.data.success, true);
    assert.strictEqual(reviewRes.data.data.repetitionCount, 1);
    assert.strictEqual(reviewRes.data.data.intervalDays, 1);
    console.log('   ✓ SM-2 review (Quality 4): repetitionCount set to 1, next review scheduled in 1 day');

    // 6.4 Submit second review: Quality 4 -> Advances to interval 6
    const review2Res = await fetchJson('/vocabulary/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({
        wordId: word1.id,
        quality: 4,
      }),
    });
    assert.strictEqual(review2Res.status, 200);
    assert.strictEqual(review2Res.data.data.repetitionCount, 2);
    assert.strictEqual(review2Res.data.data.intervalDays, 6);
    assert.strictEqual(review2Res.data.data.masteryLevel, 'FAMILIAR');
    console.log('   ✓ SM-2 second review (Quality 4): repetitionCount=2, interval=6 days, mastery=FAMILIAR');

    // 6.5 Submit failed recall (Quality 1) -> Resets schedule
    const failReviewRes = await fetchJson('/vocabulary/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({
        wordId: word1.id,
        quality: 1,
      }),
    });
    assert.strictEqual(failReviewRes.status, 200);
    assert.strictEqual(failReviewRes.data.data.repetitionCount, 0);
    assert.strictEqual(failReviewRes.data.data.intervalDays, 1);
    assert.strictEqual(failReviewRes.data.data.masteryLevel, 'WEAK');
    console.log('   ✓ SM-2 failed review (Quality 1): reset repetitions=0, interval=1 day, mastery=WEAK');

    // 6.6 Query student vocabulary overview stats
    const statsRes = await fetchJson('/vocabulary/stats', {
      headers: { Authorization: `Bearer ${student.token}` },
    });
    assert.strictEqual(statsRes.status, 200);
    assert.strictEqual(statsRes.data.success, true);
    assert.ok(statsRes.data.data.totalPracticed >= 1);
    console.log(`   ✓ Student retention stats: totalPracticed=${statsRes.data.data.totalPracticed}, weak=${statsRes.data.data.weak}`);

    passed++;
  } catch (err) {
    console.error('   ❌ Feature 15.5 failed:', err.message);
    failed++;
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  console.log(`🏁 MASTER TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase15MasterTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
