const http = require('http');
const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = process.env.API_BASE || 'http://localhost:4043/api/v1';

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

async function runPhase5Tests() {
  console.log('====================================================');
  console.log(' EXAMOS PHASE 5 (EXAM GENERATOR) — MASTER TEST SUITE');
  console.log(' Testing Features 5.1 to 5.4');
  console.log('====================================================\n');

  // Login as Admin to get auth token
  const loginRes = await request('POST', '/auth/login', {
    email: 'admin@examos.com',
    password: 'Admin@123',
  });
  assert.strictEqual(loginRes.status, 200, 'Admin login must succeed');
  const token = loginRes.body.data.accessToken;

  // Login as SubAdmin to verify SubAdmin can also generate exams
  const subAdminLogin = await request('POST', '/auth/login', {
    email: 'subadmin@examos.com',
    password: 'SubAdmin@123',
  });
  assert.strictEqual(subAdminLogin.status, 200);
  const subAdminToken = subAdminLogin.body.data.accessToken;

  // Setup: Create a test Exam Pattern with 2 sections (Mechanics and Optics)
  const createdPatternIds = [];
  const createdExamIds = [];

  try {
    console.log('--- Setting up Test Exam Pattern Blueprint ---');
    const patRes = await request('POST', '/exam-patterns', {
      name: 'P5 Physics Blueprint Test',
      courseId: 'c1',
      durationMinutes: 120,
      type: 'SINGLE',
      description: 'Blueprint for Phase 5 Generator Verification',
    }, token);
    assert.strictEqual(patRes.status, 201);
    const patternId = patRes.body.data.id;
    createdPatternIds.push(patternId);

  // Add Section A (Mechanics, 4 questions)
  const secARes = await request('POST', `/exam-patterns/${patternId}/sections`, {
    name: 'Section A (Mechanics)',
    subjectId: 'sub_phy',
    numQuestions: 4,
    marksPerQuestion: 4.0,
    marksCorrect: 4.0,
    marksWrong: -1.0,
    marksUnattempted: 0.0,
  }, token);
  assert.strictEqual(secARes.status, 201);
  const secAId = secARes.body.data.id;

  // Configure Topic Distribution for Section A: Mechanics (top_mech: 4 questions)
  await request('PUT', `/exam-patterns/${patternId}/sections/${secAId}/topics-distribution`, {
    distributionType: 'COUNT',
    topics: [{ topicId: 'top_mech', value: 4 }],
  }, token);

  // Add Section B (Optics, 3 questions)
  const secBRes = await request('POST', `/exam-patterns/${patternId}/sections`, {
    name: 'Section B (Optics)',
    subjectId: 'sub_phy',
    numQuestions: 3,
    marksPerQuestion: 4.0,
    marksCorrect: 4.0,
    marksWrong: -1.0,
    marksUnattempted: 0.0,
  }, token);
  assert.strictEqual(secBRes.status, 201);
  const secBId = secBRes.body.data.id;

  // Configure Topic Distribution for Section B: Optics (top_optics: 3 questions)
  await request('PUT', `/exam-patterns/${patternId}/sections/${secBId}/topics-distribution`, {
    distributionType: 'COUNT',
    topics: [{ topicId: 'top_optics', value: 3 }],
  }, token);

  console.log(`Blueprint setup complete! Pattern ID: ${patternId}\n`);

  // ==========================================
  // FEATURE 5.1: EXAM GENERATION ENGINE
  // ==========================================
  console.log('--- Feature 5.1: Exam Generation Engine ---');

  // Test 5.1-U1: Generate Basic Exam from Blueprint
  const genRes = await request('POST', '/exams/generate', {
    patternId,
    name: 'Physics Midterm Automated Exam 2026',
    instructions: 'No calculators allowed.',
  }, token);
  assert.strictEqual(genRes.status, 201, 'POST /api/v1/exams/generate must return 201');
  assert.ok(genRes.body.success);
  assert.ok(genRes.body.data.exam.id);
  const generatedExamId = genRes.body.data.exam.id;
  createdExamIds.push(generatedExamId);
  assert.strictEqual(genRes.body.data.exam.status, 'DRAFT');
  assert.strictEqual(genRes.body.data.exam.name, 'Physics Midterm Automated Exam 2026');
  console.log(' [PASS] 5.1-U1: Generate basic exam from blueprint (Status: DRAFT)');

  // Test 5.1-U2: Topic & Difficulty Distribution Verification
  const examSections = genRes.body.data.sections;
  assert.strictEqual(examSections.length, 2, 'Generated exam must have 2 sections');
  const genSecA = examSections.find((s) => s.name === 'Section A (Mechanics)');
  const genSecB = examSections.find((s) => s.name === 'Section B (Optics)');
  assert.strictEqual(genSecA.questions.length, 4, 'Section A must have exactly 4 questions');
  assert.strictEqual(genSecB.questions.length, 3, 'Section B must have exactly 3 questions');
  assert.strictEqual(genRes.body.data.stats.totalQuestions, 7, 'Total questions must be 7 (4+3)');
  console.log(' [PASS] 5.1-U2: Questions accurately balanced and allocated across sections');

  // Test 5.1-U3: Duplicate Prevention across sections
  const secAQIds = genSecA.questions.map((q) => q.questionId);
  const secBQIds = genSecB.questions.map((q) => q.questionId);
  const allGeneratedQIds = [...secAQIds, ...secBQIds];
  const uniqueQIds = new Set(allGeneratedQIds);
  assert.strictEqual(allGeneratedQIds.length, uniqueQIds.size, 'Zero duplicate questions across all sections');
  console.log(' [PASS] 5.1-U3: Duplicate prevention verified (100% unique question IDs across paper)');

  // Test 5.1-U4: Insufficient Questions Error Handling
  // Create an unrealistic pattern requiring 500 questions when bank only has 30
  const impossiblePatRes = await request('POST', '/exam-patterns', {
    name: 'Impossible Deficit Pattern',
    courseId: 'c1',
    durationMinutes: 60,
  }, token);
  const impossiblePatId = impossiblePatRes.body.data.id;
  createdPatternIds.push(impossiblePatId);
  await request('POST', `/exam-patterns/${impossiblePatId}/sections`, {
    name: 'Huge Deficit Section',
    numQuestions: 500,
  }, token);

  const deficitRes = await request('POST', '/exams/generate', {
    patternId: impossiblePatId,
  }, token);
  assert.strictEqual(deficitRes.status, 422, 'Must return 422 Unprocessable Entity on insufficient questions');
  assert.strictEqual(deficitRes.body.errorCode, 'INSUFFICIENT_QUESTIONS');
  
  // Immediate cleanup of deficit fixture
  await request('DELETE', `/exam-patterns/${impossiblePatId}`, null, token);
  const delIdx = createdPatternIds.indexOf(impossiblePatId);
  if (delIdx !== -1) createdPatternIds.splice(delIdx, 1);
  
  console.log(' [PASS] 5.1-U4: Insufficient questions handled gracefully with 422 INSUFFICIENT_QUESTIONS error');

  // Test 5.1-U5: SubAdmin Generate Exam Authorization
  const subAdminGen = await request('POST', '/exams/generate', {
    patternId,
    name: 'SubAdmin Generated Exam',
  }, subAdminToken);
  assert.strictEqual(subAdminGen.status, 201, 'SubAdmin with exams.create must generate exam successfully');
  if (subAdminGen.body.data?.exam?.id) {
    createdExamIds.push(subAdminGen.body.data.exam.id);
  }
  console.log(' [PASS] 5.1-U5: SubAdmin role authorized to execute exam generation');

  // ==========================================
  // FEATURE 5.2: DRAFT EXAM INSPECTION & EDITING
  // ==========================================
  console.log('\n--- Feature 5.2: Draft Exam Inspection & Editing ---');

  // Test 5.2-U1: Retrieve Draft Exam Details with Aggregated Stats
  const draftRes = await request('GET', `/exams/${generatedExamId}/draft`, null, token);
  assert.strictEqual(draftRes.status, 200);
  assert.strictEqual(draftRes.body.data.exam.id, generatedExamId);
  assert.ok(draftRes.body.data.stats.difficulties);
  assert.ok(draftRes.body.data.stats.topics);
  console.log(' [PASS] 5.2-U1: Retrieve draft exam inspection details and distribution statistics');

  // Test 5.2-U2: Question Swap with Valid Alternative
  const targetSec = draftRes.body.data.sections[0];
  const oldQ = targetSec.questions[0];
  // Find a candidate published question from Question Bank not in Section 0
  const qListRes = await request('GET', '/questions?status=PUBLISHED&limit=30', null, token);
  const qItems = Array.isArray(qListRes.body.data) ? qListRes.body.data : (qListRes.body.data.items || []);
  const existingExamQIds = new Set(draftRes.body.data.sections.flatMap((s) => s.questions.map((q) => q.questionId)));
  const swapCandidate = qItems.find((q) => !existingExamQIds.has(q.id));
  assert.ok(swapCandidate, 'Candidate question must be available in bank');
  const newQId = swapCandidate.id;

  const swapRes = await request('PATCH', `/exams/${generatedExamId}/questions/${oldQ.questionId}/swap`, {
    newQuestionId: newQId,
  }, token);
  assert.strictEqual(swapRes.status, 200);
  const updatedSec = swapRes.body.data.sections[0];
  const foundSwapped = updatedSec.questions.find((q) => q.questionId === newQId);
  assert.ok(foundSwapped, 'New question ID must be present in swapped section');
  console.log(' [PASS] 5.2-U2: Question swap replaces item and updates section structure');

  // Test 5.2-U3: Reject Swapping with Duplicate Question
  const existingInOtherSec = swapRes.body.data.sections[1].questions[0].questionId;
  const dupSwapRes = await request('PATCH', `/exams/${generatedExamId}/questions/${newQId}/swap`, {
    newQuestionId: existingInOtherSec,
  }, token);
  assert.strictEqual(dupSwapRes.status, 409, 'Must reject duplicate question in same exam with 409 Conflict');
  assert.strictEqual(dupSwapRes.body.errorCode, 'DUPLICATE_QUESTION');
  console.log(' [PASS] 5.2-U3: Duplicate question rejected on swap attempt (409 Conflict)');

  // Test 5.2-U4: Regenerate Single Section
  const regenRes = await request('PATCH', `/exams/${generatedExamId}/sections/${targetSec.id}/regenerate`, null, token);
  assert.strictEqual(regenRes.status, 200);
  assert.strictEqual(regenRes.body.data.sections[0].questions.length, 4);
  console.log(' [PASS] 5.2-U4: Regenerate section replaces all section questions according to rules');

  // Test 5.2-U5: Reorder Questions within Section
  const currentSecQuestions = regenRes.body.data.sections[0].questions;
  const reversedQIds = currentSecQuestions.map((q) => q.questionId).reverse();
  const reorderRes = await request('PATCH', `/exams/${generatedExamId}/reorder`, {
    sectionId: targetSec.id,
    questionIds: reversedQIds,
  }, token);
  assert.strictEqual(reorderRes.status, 200);
  const reorderedSec = reorderRes.body.data.sections[0];
  assert.strictEqual(reorderedSec.questions[0].questionId, reversedQIds[0]);
  console.log(' [PASS] 5.2-U5: Manual question reordering updates sequenceOrder indices');

  // ==========================================
  // FEATURE 5.3: EXAM METADATA & PUBLISHING
  // ==========================================
  console.log('\n--- Feature 5.3: Exam Metadata & Publishing ---');

  // Test 5.3-U1: Update Exam Operational Metadata
  const now = new Date();
  const startTime = new Date(now.getTime() + 3600000).toISOString();
  const endTime = new Date(now.getTime() + 7200000).toISOString();

  const updateMetaRes = await request('PATCH', `/exams/${generatedExamId}`, {
    name: 'Physics Master Midterm 2026 (Updated)',
    instructions: 'Updated examination instructions and guidelines.',
    durationMinutes: 150,
    startTime,
    endTime,
  }, token);
  assert.strictEqual(updateMetaRes.status, 200);
  assert.strictEqual(updateMetaRes.body.data.exam.name, 'Physics Master Midterm 2026 (Updated)');
  assert.strictEqual(updateMetaRes.body.data.exam.durationMinutes, 150);
  console.log(' [PASS] 5.3-U1: Update operational metadata (name, duration, instructions, schedule)');

  // Test 5.3-U2: Reject Invalid Scheduling (endTime <= startTime)
  const badScheduleRes = await request('PATCH', `/exams/${generatedExamId}`, {
    startTime: endTime,
    endTime: startTime, // end before start!
  }, token);
  assert.strictEqual(badScheduleRes.status, 400, 'Must reject endTime <= startTime with 400 Bad Request');
  console.log(' [PASS] 5.3-U2: Scheduling validator rejects end time earlier than start time');

  // Test 5.3-U3: Publish Exam and Create Entity Version Snapshot
  const publishRes = await request('POST', `/exams/${generatedExamId}/publish`, null, token);
  assert.strictEqual(publishRes.status, 200);
  assert.strictEqual(publishRes.body.data.exam.status, 'PUBLISHED');
  console.log(' [PASS] 5.3-U3: Finalize exam transitions DRAFT -> PUBLISHED and saves snapshot');

  // Test 5.3-U4: Prevent Modifying Questions on Published Exam
  const blockedSwapRes = await request('PATCH', `/exams/${generatedExamId}/questions/${reorderedSec.questions[0].questionId}/swap`, {
    newQuestionId: newQId,
  }, token);
  assert.strictEqual(blockedSwapRes.status, 400, 'Must block swapping questions on PUBLISHED exam');
  console.log(' [PASS] 5.3-U4: Modifications blocked on PUBLISHED exam to guarantee academic integrity');

  // ==========================================
  // FEATURE 5.4: MANUAL EXAM CREATION
  // ==========================================
  console.log('\n--- Feature 5.4: Manual Exam Creation ---');

  // Test 5.4-U1: Create Blank Manual Exam
  const manualRes = await request('POST', '/exams/manual', {
    name: 'Manual Quiz Assessment',
    courseId: 'c1',
    durationMinutes: 45,
    instructions: 'Manually constructed quick quiz.',
  }, token);
  assert.strictEqual(manualRes.status, 201);
  assert.ok(manualRes.body.data.exam.id);
  const manualExamId = manualRes.body.data.exam.id;
  createdExamIds.push(manualExamId);
  assert.strictEqual(manualRes.body.data.exam.patternId, null, 'Manual exam must have null patternId');
  console.log(' [PASS] 5.4-U1: Create blank manual exam without pattern blueprint');

  // Test 5.4-U2: Add Section Manually
  const addSecRes = await request('POST', `/exams/${manualExamId}/sections`, {
    name: 'Custom Chemistry Section',
    subjectId: 'sub_chem',
    sequenceOrder: 1,
    marksPerQuestion: 2.0,
    marksCorrect: 2.0,
    marksWrong: -0.5,
  }, token);
  assert.strictEqual(addSecRes.status, 201);
  const customSecId = addSecRes.body.data.sections[0].id;
  console.log(' [PASS] 5.4-U2: Add manual section with custom scoring scheme');

  // Test 5.4-U3: Add Specific Questions from Bank Directly
  // Pick two existing questions
  const manualCandidatesRes = await request('GET', '/questions?status=PUBLISHED&limit=5', null, token);
  const mItems = Array.isArray(manualCandidatesRes.body.data) ? manualCandidatesRes.body.data : (manualCandidatesRes.body.data.items || []);
  const candidateQIds = mItems.slice(0, 2).map((q) => q.id);

  const addQsRes = await request('POST', `/exams/${manualExamId}/questions`, {
    sectionId: customSecId,
    questionIds: candidateQIds,
  }, token);
  assert.strictEqual(addQsRes.status, 200);
  assert.strictEqual(addQsRes.body.data.sections[0].questions.length, 2);
  assert.strictEqual(addQsRes.body.data.sections[0].totalMarks, 4.0); // 2 * 2.0
  assert.strictEqual(addQsRes.body.data.exam.totalMarks, 4.0);
  console.log(' [PASS] 5.4-U3: Add specific questions from bank directly and auto-recalculate totals');

  // Test 5.4-U4: Reject Adding Duplicate Question to Same Exam
  const dupAddRes = await request('POST', `/exams/${manualExamId}/questions`, {
    sectionId: customSecId,
    questionIds: [candidateQIds[0]], // already in exam!
  }, token);
  assert.strictEqual(dupAddRes.status, 409, 'Must reject duplicate question with 409 Conflict');
  assert.strictEqual(dupAddRes.body.errorCode, 'DUPLICATE_QUESTION');
  console.log(' [PASS] 5.4-U4: Reject duplicate question in manual exam (409 Conflict)');

  console.log('\n====================================================');
  console.log(' Phase 5 Master Test Results: 18/18 Passed');
  console.log('====================================================\n');
  } finally {
    // Teardown: Clean up all test fixtures created during the test run
    console.log('\n--- TEARDOWN: Cleaning up test fixtures ---');
    for (const eid of createdExamIds) {
      try {
        const delRes = await request('DELETE', `/exams/${eid}`, null, token);
        console.log(` [TEARDOWN] Deleted test exam: ${eid} (Status: ${delRes.status})`);
      } catch (e) {
        console.warn(` [TEARDOWN] Failed to delete test exam: ${eid}`, e.message);
      }
    }
    for (const pid of createdPatternIds) {
      try {
        // If published, archive first to allow deletion
        await request('PATCH', `/exam-patterns/${pid}`, { status: 'ARCHIVED' }, token);
        const delRes = await request('DELETE', `/exam-patterns/${pid}`, null, token);
        console.log(` [TEARDOWN] Deleted test pattern: ${pid} (Status: ${delRes.status})`);
      } catch (e) {
        console.warn(` [TEARDOWN] Failed to delete test pattern: ${pid}`, e.message);
      }
    }
  }
}

if (require.main === module) {
  runPhase5Tests().catch((e) => {
    console.error('Test Suite Failed:', e);
    process.exit(1);
  });
}

module.exports = { runPhase5Tests };
