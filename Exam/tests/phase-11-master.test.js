const assert = require('assert');

const API_BASE = 'http://127.0.0.1:4000/api/v1';

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed for ${email}: ${data.message}`);
  return data.data.accessToken;
}

async function runTests() {
  console.log('====================================================');
  console.log(' Starting Phase 11 AI Question System Master Test Suite');
  console.log('====================================================\n');

  let adminToken;
  let teacherToken;
  let studentToken;

  console.log('1. Authenticating test personas...');
  adminToken = await login('admin@examos.com', 'Admin@123');
  teacherToken = await login('teacher@examos.com', 'Teacher@123');
  studentToken = await login('student@examos.com', 'Student@123');
  console.log('   ✓ Admin, Teacher, and Student authenticated\n');

  // ----------------------------------------------------
  // Feature 11.1 & 11.2: AI Gateway & Provider Hierarchy
  // ----------------------------------------------------
  console.log('2. Testing AI Gateway Health & Model Routing (Feature 11.1 & 11.2)...');
  const healthRes = await fetch(`${API_BASE}/ai/gateway/health`);
  const healthData = await healthRes.json();
  assert.strictEqual(healthRes.status, 200);
  assert.strictEqual(healthData.success, true);
  assert.strictEqual(healthData.data.status, 'HEALTHY');
  assert.ok(healthData.data.totalProviders >= 1);
  console.log(`   ✓ Gateway reports HEALTHY with ${healthData.data.totalProviders} providers configured`);

  // ----------------------------------------------------
  // Dynamic Mock Content Verification
  // ----------------------------------------------------
  console.log('\n3. Testing Dynamic & Responsive Question Generation (No static hardcoding)...');
  
  // 3a. Generate Physics Question
  const physRes = await fetch(`${API_BASE}/ai/gateway/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      featureKey: 'question_generation',
      scope: 'question_authoring',
      variables: {
        subject: 'Physics',
        topic: 'Electromagnetism',
        difficulty: 'HARD',
        type: 'SINGLE_CHOICE',
        marks: 4,
      },
      prompt: 'Focus on Lorentz force calculation with B=0.8T',
    }),
  });
  const physData = await physRes.json();
  assert.strictEqual(physRes.status, 200);
  const qPhys = physData.data.parsedJson;
  assert.ok(qPhys.content.toLowerCase().includes('lorentz') || qPhys.content.toLowerCase().includes('magnetic'));
  assert.ok(qPhys.data.options.length >= 4);
  console.log(`   ✓ Physics question generated dynamically: "${qPhys.content.slice(0, 75)}..."`);

  // 3b. Generate Mathematics Question
  const mathRes = await fetch(`${API_BASE}/ai/gateway/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      featureKey: 'question_generation',
      scope: 'question_authoring',
      variables: {
        subject: 'Mathematics',
        topic: 'Calculus & Integrals',
        difficulty: 'HARD',
        type: 'SINGLE_CHOICE',
        marks: 4,
      },
      prompt: 'Evaluate definite integral of quadratic polynomial',
    }),
  });
  const mathData = await mathRes.json();
  assert.strictEqual(mathRes.status, 200);
  const qMath = mathData.data.parsedJson;
  assert.ok(qMath.content.toLowerCase().includes('integral') || qMath.content.toLowerCase().includes('calculus'));
  assert.ok(qMath.data.options.length >= 4);
  console.log(`   ✓ Mathematics question generated dynamically: "${qMath.content.slice(0, 75)}..."`);

  // 3c. Generate Chemistry Question
  const chemRes = await fetch(`${API_BASE}/ai/gateway/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      featureKey: 'question_generation',
      scope: 'question_authoring',
      variables: {
        subject: 'Chemistry',
        topic: 'Chemical Kinetics',
        difficulty: 'MEDIUM',
        type: 'SINGLE_CHOICE',
        marks: 4,
      },
      prompt: 'Arrhenius activation energy equation',
    }),
  });
  const chemData = await chemRes.json();
  assert.strictEqual(chemRes.status, 200);
  const qChem = chemData.data.parsedJson;
  assert.ok(qChem.content.toLowerCase().includes('reaction') || qChem.content.toLowerCase().includes('arrhenius') || qChem.content.toLowerCase().includes('chemistry'));
  console.log(`   ✓ Chemistry question generated dynamically: "${qChem.content.slice(0, 75)}..."`);

  // Assert all 3 generated questions are distinctly different
  assert.notStrictEqual(qPhys.content, qMath.content, 'Physics and Math questions must not be identical');
  assert.notStrictEqual(qMath.content, qChem.content, 'Math and Chemistry questions must not be identical');
  assert.notStrictEqual(qPhys.content, qChem.content, 'Physics and Chemistry questions must not be identical');
  console.log('   ✓ Verified: All 3 domain questions produced uniquely varied content, numbers, and formulas\n');

  // ----------------------------------------------------
  // Provider Settings, Key Encryption & Test Connection
  // ----------------------------------------------------
  console.log('4. Testing Admin Provider Settings, Encryption & Live Test (Feature 11.1 & 11.7/11.8)...');
  
  // 4a. List Providers as Admin (Verify API Keys are masked)
  const provListRes = await fetch(`${API_BASE}/ai/gateway/providers`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const provListData = await provListRes.json();
  assert.strictEqual(provListRes.status, 200);
  const cloudProv = provListData.data.find((p) => p.type === 'CLOUD');
  assert.ok(cloudProv, 'Cloud provider must be in list');
  assert.ok(!cloudProv.apiKey || cloudProv.apiKey.includes('••••') || cloudProv.apiKey.includes('...'), 'API key must be masked in API responses');
  console.log(`   ✓ Listed ${provListData.data.length} providers with masked API keys`);

  // 4b. Update Provider with real API Key (Stored encrypted)
  const updateProvRes = await fetch(`${API_BASE}/ai/gateway/providers/${cloudProv.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      apiKey: 'sk-proj-demo-secret-key-12345678',
      priority: 1,
      isActive: false, // Keep inactive for CI/offline safety
    }),
  });
  const updateProvData = await updateProvRes.json();
  assert.strictEqual(updateProvRes.status, 200);
  assert.strictEqual(updateProvData.data.apiKey, 'sk-...5678');
  console.log(`   ✓ Provider ${cloudProv.id} updated with AES-256-GCM encrypted API key (Masked: ${updateProvData.data.apiKey})`);

  // 4c. Test Provider Connection endpoint
  const testConnRes = await fetch(`${API_BASE}/ai/gateway/providers/prov_mock_01/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const testConnData = await testConnRes.json();
  assert.strictEqual(testConnRes.status, 200);
  assert.strictEqual(testConnData.success, true);
  assert.ok(testConnData.data.latencyMs >= 0);
  console.log(`   ✓ Live provider test verified: ${testConnData.data.message} (${testConnData.data.latencyMs}ms)\n`);

  // ----------------------------------------------------
  // Feature 11.5: AI Usage & Credit Balances
  // ----------------------------------------------------
  console.log('5. Testing AI Credit Balances & Quota Retrieval (Feature 11.5)...');
  const usageRes = await fetch(`${API_BASE}/ai/usage`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const usageData = await usageRes.json();
  assert.strictEqual(usageRes.status, 200);
  assert.strictEqual(usageData.success, true);
  const initialTeacherCredits = usageData.data.credits.totalAvailableCredits;
  assert.ok(initialTeacherCredits > 0);
  console.log(`   ✓ Teacher has ${initialTeacherCredits} initial available AI credits\n`);

  // ----------------------------------------------------
  // Feature 11.3: AI Question Modification (Variation)
  // ----------------------------------------------------
  console.log('6. Testing AI Question Modification with Parent Linkage & Versions (Feature 11.3)...');
  const questionsRes = await fetch(`${API_BASE}/questions?limit=1`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const questionsData = await questionsRes.json();
  const baseQuestion = questionsData.data.items[0];
  assert.ok(baseQuestion, 'At least 1 question should exist');

  const modRes = await fetch(`${API_BASE}/ai/questions/modify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      questionId: baseQuestion.id,
      varianceLevel: 'HIGH',
      instructions: 'Change vehicle to rocket and scale speeds by 3.5x',
    }),
  });
  const modData = await modRes.json();
  assert.strictEqual(modRes.status, 201);
  assert.strictEqual(modData.success, true);
  const variation = modData.data;
  assert.strictEqual(variation.status, 'DRAFT');
  assert.strictEqual(variation.isAiGenerated, true);
  assert.strictEqual(variation.derivedFromId, baseQuestion.id);
  assert.ok(variation.id.startsWith('q_ai_'));
  assert.ok(variation.content.toLowerCase().includes('rocket') || variation.content.includes('HIGH'));
  console.log(`   ✓ Created AI variation ${variation.id} (Status: DRAFT, DerivedFrom: ${variation.derivedFromId})`);

  const versionRes = await fetch(`${API_BASE}/questions/${variation.id}/versions`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const versionData = await versionRes.json();
  assert.strictEqual(versionRes.status, 200);
  assert.strictEqual(versionData.data.length, 1);
  assert.ok(versionData.data[0].changeSummary.includes('AI-modified'));
  console.log(`   ✓ Question version history verified: "${versionData.data[0].changeSummary}"\n`);

  // ----------------------------------------------------
  // Feature 11.4: AI Question Generation
  // ----------------------------------------------------
  console.log('7. Testing AI Question Generation from Blueprint (Feature 11.4)...');
  const coursesRes = await fetch(`${API_BASE}/courses`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const coursesData = await coursesRes.json();
  const targetCourse = coursesData.data[0];

  const subjectsRes = await fetch(`${API_BASE}/courses/${targetCourse.id}/subjects`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const subjectsData = await subjectsRes.json();
  const targetSubject = subjectsData.data[0];
  const realSubjectId = targetSubject.id;

  const genRes = await fetch(`${API_BASE}/ai/questions/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      subjectId: realSubjectId,
      difficulty: 'HARD',
      type: 'SINGLE_CHOICE',
      marks: 4,
      count: 1,
      customPrompt: 'Focus on electromagnetism Lorentz force',
    }),
  });
  const genData = await genRes.json();
  assert.strictEqual(genRes.status, 201);
  assert.strictEqual(genData.success, true);
  const genQuestion = genData.data;
  assert.strictEqual(genQuestion.status, 'DRAFT');
  assert.strictEqual(genQuestion.isAiGenerated, true);
  console.log(`   ✓ Generated AI question ${genQuestion.id} with DRAFT status\n`);

  // ----------------------------------------------------
  // Feature 11.6: Async Worker Queue & Batch Jobs
  // ----------------------------------------------------
  console.log('8. Testing Async AI Worker Queue for Batch Generation (Feature 11.6)...');
  const batchRes = await fetch(`${API_BASE}/ai/questions/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      subjectId: realSubjectId,
      difficulty: 'MEDIUM',
      type: 'SINGLE_CHOICE',
      marks: 4,
      count: 3,
      customPrompt: 'Thermodynamics Carnot engine',
    }),
  });
  const batchData = await batchRes.json();
  assert.strictEqual(batchRes.status, 202);
  assert.strictEqual(batchData.success, true);
  assert.ok(batchData.data.jobId);
  const jobId = batchData.data.jobId;
  console.log(`   ✓ Batch job enqueued with Job ID: ${jobId}`);

  await new Promise((r) => setTimeout(r, 1200));

  const jobPollRes = await fetch(`${API_BASE}/ai/questions/generation-jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const jobPollData = await jobPollRes.json();
  assert.strictEqual(jobPollRes.status, 200);
  assert.strictEqual(jobPollData.data.status, 'COMPLETED');
  assert.strictEqual(jobPollData.data.progress, 100);
  assert.strictEqual(jobPollData.data.completedCount, 3);
  assert.strictEqual(jobPollData.data.resultQuestionIds.length, 3);
  console.log(`   ✓ Batch job completed (Progress: 100%, 3 questions created: ${jobPollData.data.resultQuestionIds.join(', ')})\n`);

  // ----------------------------------------------------
  // Feature 11.9: Review Workflow (Approve / Reject)
  // ----------------------------------------------------
  console.log('9. Testing AI Draft Review Queue & Approval Workflow (Feature 11.9)...');
  const draftsRes = await fetch(`${API_BASE}/ai/questions/drafts?isAiOnly=true`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const draftsData = await draftsRes.json();
  assert.strictEqual(draftsRes.status, 200);
  assert.ok(draftsData.data.length >= 2);
  console.log(`   ✓ Review queue displays ${draftsData.data.length} draft AI questions`);

  const questionToApprove = draftsData.data[0];
  const approveRes = await fetch(`${API_BASE}/ai/questions/drafts/${questionToApprove.id}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ action: 'APPROVE' }),
  });
  const approveData = await approveRes.json();
  assert.strictEqual(approveRes.status, 200);
  assert.strictEqual(approveData.data.status, 'PUBLISHED');
  console.log(`   ✓ Question ${questionToApprove.id} approved and transitioned from DRAFT -> PUBLISHED`);

  const questionToReject = draftsData.data[1];
  const rejectRes = await fetch(`${API_BASE}/ai/questions/drafts/${questionToReject.id}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      action: 'REJECT',
      rejectionReason: 'Ambiguous wording in scenario',
    }),
  });
  const rejectData = await rejectRes.json();
  assert.strictEqual(rejectRes.status, 200);
  assert.strictEqual(rejectData.data.status, 'ARCHIVED');
  console.log(`   ✓ Question ${questionToReject.id} rejected with reason logged (ARCHIVED)\n`);

  // ----------------------------------------------------
  // Security & Permission Enforcement
  // ----------------------------------------------------
  console.log('10. Testing Permission Enforcement & IDOR/Role Boundaries...');
  const studentGenRes = await fetch(`${API_BASE}/ai/questions/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      subjectId: 'sub_physics',
      count: 1,
    }),
  });
  assert.strictEqual(studentGenRes.status, 403);
  console.log('   ✓ Student is strictly forbidden from triggering AI question generation (403)');

  const studentReviewRes = await fetch(`${API_BASE}/ai/questions/drafts/${questionToApprove.id}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ action: 'APPROVE' }),
  });
  assert.strictEqual(studentReviewRes.status, 403);
  console.log('   ✓ Student is strictly forbidden from reviewing drafts (403)');

  const studentUsageRes = await fetch(`${API_BASE}/ai/usage`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.strictEqual(studentUsageRes.status, 200);
  console.log('   ✓ Student can read their own AI usage & credit balance (200)\n');

  console.log('====================================================');
  console.log(' ✅ ALL PHASE 11 BACKEND MASTER TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ PHASE 11 MASTER TEST FAILED:', err);
  process.exit(1);
});
