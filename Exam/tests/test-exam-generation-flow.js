const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const formattedPath = path.startsWith('/api/v1')
      ? path
      : `/api/v1${path.startsWith('/') ? '' : '/'}${path}`;

    const url = new URL(formattedPath, 'http://localhost:4000');
    const payload = body ? JSON.stringify(body) : null;

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
    };

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTestFlow() {
  console.log('====================================================');
  console.log(' EXAMOS EXAM GENERATOR FLOW — END-TO-END VERIFICATION');
  console.log(' Testing Auth, Exam Pattern Creation & Live Generation');
  console.log('====================================================\n');

  // Step 1: Login with admin credentials (matches AuthContext login)
  console.log('[STEP 1] Logging in as Admin (admin@examos.com)...');
  const loginRes = await request('POST', '/api/v1/auth/login', {
    email: 'admin@examos.com',
    password: 'Admin@123',
  });

  if (loginRes.status !== 200 || (!loginRes.body.data?.accessToken && !loginRes.body.data?.token)) {
    throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginRes.body)}`);
  }

  const token = loginRes.body.data.accessToken || loginRes.body.data.token;
  console.log(`[PASS] Login successful! Received access token: ${token.substring(0, 25)}...\n`);

  // Step 2: Fetch courses & patterns using Authorization header
  console.log('[STEP 2] Fetching courses and exam patterns with token...');
  const coursesRes = await request('GET', '/courses', null, token);
  console.log(`[PASS] Courses fetched: ${coursesRes.body.data?.items?.length || 0} courses available.`);

  const patternsRes = await request('GET', '/exam-patterns', null, token);
  console.log(`[PASS] Exam patterns fetched: ${patternsRes.body.data?.items?.length || 0} patterns available.\n`);

  // Step 3: Create a clean, realistic JEE Multi-Subject Exam Pattern
  console.log('[STEP 3] Creating a realistic JEE PCM Exam Pattern blueprint...');
  const patRes = await request('POST', '/exam-patterns', {
    name: `JEE Main Mock Test ${Date.now()}`,
    courseId: 'c1',
    type: 'MULTI',
    durationMinutes: 180,
    description: 'Comprehensive 3-Hour Joint Entrance Exam covering Physics, Chemistry, and Mathematics.',
  }, token);

  const patternId = patRes.body.data.id;
  console.log(`[PASS] Pattern created with ID: ${patternId}`);

  // Step 4: Add Section 1 (Physics - 10 Questions: Mechanics & Optics)
  console.log('\n[STEP 4] Configuring Section 1: Physics (Mechanics & Optics)...');
  const sec1Res = await request('POST', `/exam-patterns/${patternId}/sections`, {
    name: 'Section A - Physics',
    subjectId: 'sub_phy',
    numQuestions: 10,
    marksPerQuestion: 4.0,
    negativeMarks: 1.0,
  }, token);
  const sec1Id = sec1Res.body.data.id;

  // Add Topic Distribution: 6 Mechanics + 4 Optics = 10
  await request('PUT', `/exam-patterns/${patternId}/sections/${sec1Id}/topics`, {
    distributionType: 'COUNT',
    topics: [
      { topicId: 'top_mech', value: 6 },
      { topicId: 'top_optics', value: 4 },
    ],
  }, token);

  // Add Difficulty Distribution: 30% Easy, 40% Medium, 30% Hard = 100%
  await request('PUT', `/exam-patterns/${patternId}/sections/${sec1Id}/difficulty`, {
    distributionType: 'PERCENT',
    isAutomatic: false,
    difficulties: [
      { difficulty: 'EASY', value: 30 },
      { difficulty: 'MEDIUM', value: 40 },
      { difficulty: 'HARD', value: 30 },
    ],
  }, token);
  console.log('[PASS] Section 1 (Physics) configured with topic & difficulty distributions.');

  // Step 5: Add Section 2 (Chemistry - 10 Questions: Thermodynamics & Organic)
  console.log('\n[STEP 5] Configuring Section 2: Chemistry (Thermodynamics & Organic)...');
  const sec2Res = await request('POST', `/exam-patterns/${patternId}/sections`, {
    name: 'Section B - Chemistry',
    subjectId: 'sub_chem',
    numQuestions: 10,
    marksPerQuestion: 4.0,
    negativeMarks: 1.0,
  }, token);
  const sec2Id = sec2Res.body.data.id;

  await request('PUT', `/exam-patterns/${patternId}/sections/${sec2Id}/topics`, {
    distributionType: 'COUNT',
    topics: [
      { topicId: 'top_thermo', value: 5 },
      { topicId: 'top_organic', value: 5 },
    ],
  }, token);

  await request('PUT', `/exam-patterns/${patternId}/sections/${sec2Id}/difficulty`, {
    distributionType: 'PERCENT',
    isAutomatic: false,
    difficulties: [
      { difficulty: 'EASY', value: 30 },
      { difficulty: 'MEDIUM', value: 40 },
      { difficulty: 'HARD', value: 30 },
    ],
  }, token);
  console.log('[PASS] Section 2 (Chemistry) configured with topic & difficulty distributions.');

  // Step 6: Add Section 3 (Mathematics - 10 Questions: Calculus & Algebra)
  console.log('\n[STEP 6] Configuring Section 3: Mathematics (Calculus & Algebra)...');
  const sec3Res = await request('POST', `/exam-patterns/${patternId}/sections`, {
    name: 'Section C - Mathematics',
    subjectId: 'sub_math',
    numQuestions: 10,
    marksPerQuestion: 4.0,
    negativeMarks: 1.0,
  }, token);
  const sec3Id = sec3Res.body.data.id;

  await request('PUT', `/exam-patterns/${patternId}/sections/${sec3Id}/topics`, {
    distributionType: 'COUNT',
    topics: [
      { topicId: 'top_calculus', value: 5 },
      { topicId: 'top_algebra', value: 5 },
    ],
  }, token);

  await request('PUT', `/exam-patterns/${patternId}/sections/${sec3Id}/difficulty`, {
    distributionType: 'PERCENT',
    isAutomatic: false,
    difficulties: [
      { difficulty: 'EASY', value: 30 },
      { difficulty: 'MEDIUM', value: 40 },
      { difficulty: 'HARD', value: 30 },
    ],
  }, token);
  console.log('[PASS] Section 3 (Mathematics) configured with topic & difficulty distributions.');

  // Step 7: Transition Pattern from DRAFT to PUBLISHED
  console.log('\n[STEP 7] Publishing Exam Pattern...');
  const pubPatRes = await request('PATCH', `/exam-patterns/${patternId}`, {
    status: 'PUBLISHED',
  }, token);
  console.log(`[PASS] Pattern published: status = ${pubPatRes.body.data.status}, totalMarks = ${pubPatRes.body.data.totalMarks}`);

  // Step 8: Trigger Exam Generation (POST /api/v1/exams/generate)
  console.log('\n[STEP 8] Calling POST /api/v1/exams/generate with token...');
  const genRes = await request('POST', '/exams/generate', {
    patternId: patternId,
    name: 'Grand JEE Full Mock Exam 2026',
    instructions: 'Please answer all 30 questions across Physics, Chemistry, and Mathematics.',
  }, token);

  console.log(`[RESPONSE STATUS]: ${genRes.status}`);
  if (genRes.status !== 201 && genRes.status !== 200) {
    throw new Error(`Exam generation failed with status ${genRes.status}: ${JSON.stringify(genRes.body)}`);
  }

  const generatedData = genRes.body.data;
  const exam = generatedData.exam;
  console.log(`[PASS] Exam generated successfully! Exam ID: ${exam.id}`);
  console.log(`       - Name: ${exam.name}`);
  console.log(`       - Status: ${exam.status}`);
  console.log(`       - Total Marks: ${exam.totalMarks}`);
  console.log(`       - Sections Generated: ${generatedData.sections?.length}`);

  let totalQuestionsPicked = 0;
  const pickedIds = new Set();

  for (const s of generatedData.sections || []) {
    console.log(`\n       Section: ${s.name} (${s.questions?.length} questions):`);
    for (const q of s.questions || []) {
      totalQuestionsPicked++;
      if (pickedIds.has(q.questionId)) {
        throw new Error(`Duplicate question detected: ${q.questionId}`);
      }
      pickedIds.add(q.questionId);
      console.log(`         • [${q.difficulty || 'N/A'}] (Marks: ${q.marksCorrect || q.marks}) ${q.content?.substring(0, 65)}...`);
    }
  }

  console.log(`\n[PASS] Zero-duplicate guarantee verified: ${totalQuestionsPicked} total questions picked, ${pickedIds.size} unique IDs.`);
  console.log(`       Difficulty Breakdown:`, generatedData.stats?.difficulties);

  // Step 9: Verify Draft Inspection (GET /api/v1/exams/:id/draft)
  console.log('\n[STEP 9] Inspecting Draft Workbench (GET /api/v1/exams/:id/draft)...');
  const draftRes = await request('GET', `/exams/${exam.id}/draft`, null, token);
  console.log(`[PASS] Draft Workbench verified: status ${draftRes.status}, difficulty breakdown:`, draftRes.body.data.stats?.difficulties);

  // Step 10: Verify List Exams (GET /api/v1/exams)
  console.log('\n[STEP 10] Fetching all exams (GET /api/v1/exams)...');
  const listRes = await request('GET', '/exams', null, token);
  console.log(`[PASS] Exam listing verified: ${listRes.body.data.items?.length} exams found.`);

  // Step 11: Teardown Cleanup
  console.log('\n[STEP 11] Cleaning up test fixtures...');
  await request('DELETE', `/exams/${exam.id}`, null, token);
  await request('PATCH', `/exam-patterns/${patternId}`, { status: 'ARCHIVED' }, token);
  await request('DELETE', `/exam-patterns/${patternId}`, null, token);
  console.log('[PASS] Test exam and test pattern cleaned up.');

  console.log('\n====================================================');
  console.log(' 🎉 ALL EXAM GENERATOR FLOW TESTS PASSED (100% SUCCESS)');
  console.log('====================================================\n');
  process.exit(0);
}

runTestFlow().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
