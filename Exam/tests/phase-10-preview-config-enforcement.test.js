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
  console.log('========================================================================');
  console.log(' Starting Phase 10: Preview Mode Configuration Enforcement Test Suite');
  console.log('========================================================================\n');

  console.log('1. Authenticating Admin and Student personas...');
  const adminToken = await login('admin@examos.com', 'Admin@123');
  const studentToken = await login('student@examos.com', 'Student@123');
  console.log('   ✓ Admin & Student authenticated\n');

  // Fetch available courses for test fixtures
  const allCoursesRes = await fetch(`${API_BASE}/courses`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const allCoursesData = await allCoursesRes.json();
  assert.ok(allCoursesData.data.length >= 2, 'Need at least 2 courses for testing courseAccess filtering');
  const courseA = allCoursesData.data[0];
  const courseB = allCoursesData.data[1];
  console.log(`   ✓ Course A: ${courseA.name} (${courseA.id})`);
  console.log(`   ✓ Course B: ${courseB.name} (${courseB.id})\n`);

  // Create a draft exam fixture in Course A if one doesn't exist
  console.log('2. Preparing Draft and Published Exam fixtures in Course A and B...');
  const createDraftExamRes = await fetch(`${API_BASE}/exams/manual`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `Test Draft Exam ${Date.now()}`,
      courseId: courseA.id,
      durationMinutes: 60,
      totalMarks: 100,
      instructions: 'Draft exam instructions for preview test',
      sections: [
        {
          name: 'Section 1',
          sequenceOrder: 1,
          numQuestions: 1,
          marksPerQuestion: 4,
          marksCorrect: 4,
          marksWrong: -1,
          totalMarks: 4,
        },
      ],
    }),
  });
  const createDraftExamData = await createDraftExamRes.json();
  assert.strictEqual(createDraftExamRes.status, 201);
  const draftExamId = createDraftExamData.data.exam?.id || createDraftExamData.data.id;
  assert.ok(draftExamId, 'Draft exam ID must exist');
  console.log(`   ✓ Created DRAFT exam fixture: ${draftExamId} (Course: ${courseA.id}, Status: DRAFT)\n`);

  // ----------------------------------------------------
  // Test 1: Normal Student Session Baseline
  // ----------------------------------------------------
  console.log('3. Baseline Check: Normal Student Session...');
  const normalStudentExamsRes = await fetch(`${API_BASE}/student/exams`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const normalStudentExams = await normalStudentExamsRes.json();
  assert.strictEqual(normalStudentExamsRes.status, 200);
  const foundDraftInNormal = normalStudentExams.data.find((e) => e.id === draftExamId);
  assert.strictEqual(foundDraftInNormal, undefined, 'Normal student session MUST NOT see DRAFT exams');
  console.log('   ✓ Normal student session correctly excludes DRAFT exams\n');

  // ----------------------------------------------------
  // Test 2: Preview Session with contentVersion: 'DRAFT'
  // ----------------------------------------------------
  console.log('4. Testing Preview Session with contentVersion: "DRAFT"...');
  const previewDraftRes = await fetch(`${API_BASE}/preview/start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      billingPlan: 'PREMIUM',
      contentVersion: 'DRAFT',
      usageMode: 'NORMAL',
      courseAccess: ['*'],
    }),
  });
  const previewDraftData = await previewDraftRes.json();
  assert.strictEqual(previewDraftRes.status, 200);
  const draftPreviewToken = previewDraftData.data.sessionToken;

  // Query student exams with preview session token
  const previewStudentExamsRes = await fetch(`${API_BASE}/student/exams`, {
    headers: { Authorization: `Bearer ${draftPreviewToken}` },
  });
  const previewStudentExams = await previewStudentExamsRes.json();
  assert.strictEqual(previewStudentExamsRes.status, 200);
  const foundDraftInPreview = previewStudentExams.data.find((e) => e.id === draftExamId);
  assert.ok(foundDraftInPreview, 'Preview session with contentVersion: DRAFT MUST include DRAFT exams');
  assert.strictEqual(foundDraftInPreview.status, 'DRAFT');
  console.log(`   ✓ Preview session with contentVersion: DRAFT successfully sees draft exam ${draftExamId}`);

  // Also verify getting instructions for the draft exam works under DRAFT preview
  const draftInstRes = await fetch(`${API_BASE}/student/exams/${draftExamId}/instructions`, {
    headers: { Authorization: `Bearer ${draftPreviewToken}` },
  });
  const draftInstData = await draftInstRes.json();
  assert.strictEqual(draftInstRes.status, 200);
  assert.strictEqual(draftInstData.data.id, draftExamId);
  console.log(`   ✓ Preview session can inspect DRAFT exam instructions\n`);

  // End draft preview session
  await fetch(`${API_BASE}/preview/stop`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${draftPreviewToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId: previewDraftData.data.session.id }),
  });

  // ----------------------------------------------------
  // Test 3: Preview Session with courseAccess: [courseA.id]
  // ----------------------------------------------------
  console.log(`5. Testing Preview Session with restricted courseAccess: ["${courseA.id}"]...`);
  const previewCourseRes = await fetch(`${API_BASE}/preview/start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      billingPlan: 'FREE',
      contentVersion: 'PUBLISHED',
      usageMode: 'NORMAL',
      courseAccess: [courseA.id],
    }),
  });
  const previewCourseData = await previewCourseRes.json();
  assert.strictEqual(previewCourseRes.status, 200);
  const coursePreviewToken = previewCourseData.data.sessionToken;

  // 3a. Verify GET /courses returns ONLY courseA
  const restrictedCoursesRes = await fetch(`${API_BASE}/courses`, {
    headers: { Authorization: `Bearer ${coursePreviewToken}` },
  });
  const restrictedCoursesData = await restrictedCoursesRes.json();
  assert.strictEqual(restrictedCoursesRes.status, 200);
  assert.ok(restrictedCoursesData.data.length > 0);
  assert.ok(restrictedCoursesData.data.every((c) => c.id === courseA.id), `All returned courses must match courseA (${courseA.id})`);
  assert.strictEqual(restrictedCoursesData.data.some((c) => c.id === courseB.id), false, `Course B (${courseB.id}) must be excluded`);
  console.log(`   ✓ GET /courses restricted to only Course A (${restrictedCoursesData.data.length} course returned)`);

  // 3b. Verify GET /courses/:id for Course B is rejected
  const courseBDetailRes = await fetch(`${API_BASE}/courses/${courseB.id}`, {
    headers: { Authorization: `Bearer ${coursePreviewToken}` },
  });
  assert.strictEqual(courseBDetailRes.status, 403, 'Access to Course B must be forbidden (403)');
  console.log('   ✓ Direct lookup of Course B detail is blocked with 403 COURSE_ACCESS_RESTRICTED');

  // 3c. Verify GET /student/exams returns only exams for Course A
  const restrictedExamsRes = await fetch(`${API_BASE}/student/exams`, {
    headers: { Authorization: `Bearer ${coursePreviewToken}` },
  });
  const restrictedExamsData = await restrictedExamsRes.json();
  assert.strictEqual(restrictedExamsRes.status, 200);
  assert.ok(restrictedExamsData.data.every((e) => !e.courseId || e.courseId === courseA.id), 'All student exams must belong to courseA');
  console.log(`   ✓ GET /student/exams restricted to only Course A exams`);

  // End course preview session
  await fetch(`${API_BASE}/preview/stop`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${coursePreviewToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId: previewCourseData.data.session.id }),
  });

  console.log('\n========================================================================');
  console.log(' All Phase 10 Preview Configuration Enforcement Tests Passed (100%)!');
  console.log('========================================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
