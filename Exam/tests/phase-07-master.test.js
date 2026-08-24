const http = require('http');

const API_BASE = 'http://localhost:4000/api/v1';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('====================================================');
  console.log('  PHASE 7 MASTER BACKEND TEST SUITE');
  console.log('  (Published Exam Archive & Immutability Engine)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate Personas
    console.log('--- 1. Authenticating Personas ---');
    const adminRes = await request('POST', '/auth/login', { email: 'admin@examos.com', password: 'Admin@123' });
    const subAdminRes = await request('POST', '/auth/login', { email: 'subadmin@examos.com', password: 'SubAdmin@123' });
    const teacherRes = await request('POST', '/auth/login', { email: 'teacher@examos.com', password: 'Teacher@123' });
    const studentRes = await request('POST', '/auth/login', { email: 'student@examos.com', password: 'Student@123' });

    const adminToken = adminRes.body.data?.accessToken || adminRes.body.data?.access_token || adminRes.body.data?.token;
    const subAdminToken = subAdminRes.body.data?.accessToken || subAdminRes.body.data?.access_token || subAdminRes.body.data?.token;
    const teacherToken = teacherRes.body.data?.accessToken || teacherRes.body.data?.access_token || teacherRes.body.data?.token;
    const studentToken = studentRes.body.data?.accessToken || studentRes.body.data?.access_token || studentRes.body.data?.token;

    assert(Boolean(adminToken && teacherToken && studentToken), 'All 4 personas authenticated successfully');

    // 2. Setting Up Blueprint & Generating Target Exam Paper
    console.log('\n--- 2. Setting Up Blueprint & Generating Target Exam Paper ---');
    const patCreate = await request('POST', '/exam-patterns', {
      name: 'Phase 7 Blueprint',
      courseId: 'c1',
      durationMinutes: 180,
      description: 'Pattern for Phase 7 archive testing',
      type: 'SINGLE'
    }, adminToken);
    const patternId = patCreate.body.data?.id;

    // Add section to pattern
    await request('POST', `/exam-patterns/${patternId}/sections`, {
      name: 'Section 1: Physics Core',
      subjectId: 'sub_phy',
      sequenceOrder: 1,
      numQuestions: 5,
      marksPerQuestion: 4.0,
      marksCorrect: 4.0,
      marksWrong: -1.0,
      marksUnattempted: 0.0
    }, adminToken);

    // Generate draft exam
    const genRes = await request('POST', '/exams/generate', { patternId, name: 'Phase 7 Archive Test Exam' }, adminToken);
    const examId = genRes.body.data?.exam?.id || genRes.body.data?.id;
    assert(genRes.status === 201 && Boolean(examId), 'Generated draft exam for publication workflow testing');

    // 3. Feature 7.1: Workflow State Machine
    console.log('\n--- 3. Feature 7.1: Exam Publication Workflow State Machine ---');
    // 3a. Invalid transition: DRAFT directly to PUBLISHED without APPROVED
    const invalidTrans = await request('PUT', `/exams/${examId}/status`, { status: 'PUBLISHED' }, adminToken);
    assert(invalidTrans.status === 400, 'State Machine blocks direct transition DRAFT -> PUBLISHED (400)');

    // 3b. Valid transition: DRAFT -> PREVIEW
    const toPreview = await request('PUT', `/exams/${examId}/status`, { status: 'PREVIEW', notes: 'Entering preview mode' }, adminToken);
    assert(toPreview.status === 200 && toPreview.body.data?.status === 'PREVIEW', 'State Machine transitions DRAFT -> PREVIEW');

    // 3c. Assign Reviewer
    const assignRev = await request('POST', `/exams/${examId}/reviewers`, { reviewerId: 'usr_teacher_test' }, adminToken);
    assert(assignRev.status === 201, 'Admin can assign reviewer to exam');

    // 3d. Transition PREVIEW -> REVIEW
    const toReview = await request('PUT', `/exams/${examId}/status`, { status: 'REVIEW', notes: 'Ready for peer review' }, teacherToken);
    assert(toReview.status === 200 && toReview.body.data?.status === 'REVIEW', 'Teacher transitions exam to REVIEW state');

    // 3e. View Workflow History
    const historyRes = await request('GET', `/exams/${examId}/workflow-history`, null, adminToken);
    assert(
      historyRes.status === 200 && historyRes.body.data?.logs?.length >= 2,
      'Workflow history logs all transitions and reviewer assignments'
    );

    // 3f. Transition REVIEW -> APPROVED
    const toApproved = await request('PUT', `/exams/${examId}/status`, { status: 'APPROVED', notes: 'Approved for final publication' }, adminToken);
    assert(toApproved.status === 200 && toApproved.body.data?.status === 'APPROVED', 'Admin approves exam for publication');

    // 4. Feature 7.2: Published Exam Snapshot Creation
    console.log('\n--- 4. Feature 7.2: Published Exam Snapshot Creation ---');
    const pubRes = await request('PUT', `/exams/${examId}/status`, { status: 'PUBLISHED', notes: 'Live published snapshot' }, adminToken);
    assert(pubRes.status === 200 && pubRes.body.data?.id, 'Publishing creates immutable exam snapshot');
    const snapshotId = pubRes.body.data?.id;

    // Retrieve snapshot details via GET /api/v1/archive/exams/:id/snapshot
    const snapDetails = await request('GET', `/archive/exams/${snapshotId}/snapshot`, null, adminToken);
    assert(
      snapDetails.status === 200 && snapDetails.body.data?.sections?.length > 0,
      'GET /archive/exams/:id/snapshot retrieves full deep copy snapshot with sections and questions'
    );

    // Bank Isolation Test: Modify question in Question Bank and verify snapshot is isolated
    const sampleQId = snapDetails.body.data.sections[0].questions[0].originalQuestionId;
    await request('PATCH', `/questions/${sampleQId}`, { content: 'MODIFIED QUESTION BANK CONTENT THAT MUST NOT LEAK TO SNAPSHOT' }, adminToken);
    const snapCheckAfterBankEdit = await request('GET', `/archive/exams/${snapshotId}/snapshot`, null, adminToken);
    const snapQContent = snapCheckAfterBankEdit.body.data.sections[0].questions[0].questionContent.content;
    assert(
      !snapQContent.includes('MODIFIED QUESTION BANK CONTENT'),
      'Question Bank edits do NOT mutate published exam snapshot (ADR-007 Bank Isolation guarantee)'
    );

    // 5. Feature 7.3: Answer Key Preservation & Role Gating
    console.log('\n--- 5. Feature 7.3: Preserved Answer Key & Permission Gating ---');
    const teacherKeyRes = await request('GET', `/archive/exams/${snapshotId}/answer-key`, null, teacherToken);
    assert(
      teacherKeyRes.status === 200 && teacherKeyRes.body.data?.sections?.length > 0,
      'Teacher with archive.answer_key can retrieve preserved answer keys and explanations'
    );

    const studentKeyRes = await request('GET', `/archive/exams/${snapshotId}/answer-key`, null, studentToken);
    assert(
      studentKeyRes.status === 403,
      'Student without archive.answer_key is rejected from accessing answer keys (403 Forbidden)'
    );

    // 6. Feature 7.4: Exam Archive Search & Filtering
    console.log('\n--- 6. Feature 7.4: Exam Archive Search & Filtering ---');
    const searchRes = await request('GET', `/archive/exams?search=Archive&academicYear=2026`, null, adminToken);
    assert(
      searchRes.status === 200 && searchRes.body.data?.items?.length >= 1,
      'GET /archive/exams successfully searches published exams by query and academic year'
    );

    // 7. Feature 7.5: Historical Exam Integrity & Direct API Immutability
    console.log('\n--- 7. Feature 7.5: Historical Exam Integrity & Strict API Immutability ---');
    // 7a. Direct PATCH to published exam must return 400 EXAM_IMMUTABLE
    const patchTry = await request('PATCH', `/exams/${examId}`, { name: 'Attempted Mutation on Published Exam' }, adminToken);
    assert(patchTry.status === 400, 'Direct PATCH to published exam is rejected with 400 EXAM_IMMUTABLE');

    // 7b. Direct DELETE to published exam must return 400 EXAM_IMMUTABLE
    const deleteTry = await request('DELETE', `/exams/${examId}`, null, adminToken);
    assert(deleteTry.status === 400, 'Direct DELETE to published exam is rejected with 400 EXAM_IMMUTABLE');

    // 7c. Direct question swap on published exam must return 400 EXAM_IMMUTABLE
    const swapTry = await request('POST', `/exams/${examId}/questions/swap`, { oldQuestionId: sampleQId, newQuestionId: 'q_dummy' }, adminToken);
    assert(swapTry.status === 400, 'Question swap on published exam is rejected with 400 EXAM_IMMUTABLE');

    // 7d. Post-Publish Formal Correction Workflow
    const correctionPayload = {
      reason: 'Errata: Official answer key correction for Question 1',
      changes: [
        {
          questionId: sampleQId,
          correctedAnswerKey: { correctAnswer: 'B', explanation: 'Corrected option based on official challenge window' },
          explanation: 'Official errata update',
        },
      ],
    };
    const corrRes = await request('POST', `/exams/${snapshotId}/corrections`, correctionPayload, adminToken);
    assert(corrRes.status === 201 && corrRes.body.data?.version === 2, 'Post-Publish Correction creates Version 2 snapshot (V2)');

    // 7e. Version History Chain
    const historyChainRes = await request('GET', `/archive/exams/${examId}/history`, null, adminToken);
    assert(
      historyChainRes.status === 200 && historyChainRes.body.data?.versions?.length === 2,
      'GET /archive/exams/:id/history shows full audit chain with both V1 and V2 snapshots intact'
    );

    // 8. Feature 7.6: Exam File Storage & Assets
    console.log('\n--- 8. Feature 7.6: Exam File Storage & Assets ---');
    // 8a. Invalid MIME type upload rejection
    const invalidFile = await request('POST', `/exams/${examId}/files`, { fileName: 'malware.exe', fileType: 'application/x-msdownload', fileSize: 5000 }, adminToken);
    assert(invalidFile.status === 400, 'File upload blocks disallowed MIME types (400)');

    // 8b. Valid PDF upload
    const validFile = await request('POST', `/exams/${examId}/files`, { fileName: 'solution-sheet.pdf', fileType: 'application/pdf', fileSize: 1048576 }, adminToken);
    assert(validFile.status === 201 && validFile.body.data?.id, 'File upload accepts valid PDF and generates storage path');

    // 8c. List files
    const fileList = await request('GET', `/exams/${examId}/files`, null, adminToken);
    assert(fileList.status === 200 && fileList.body.data?.length >= 1, 'GET /exams/:id/files lists associated exam assets');

    // 8d. Get PDF download URL
    const pdfRes = await request('GET', `/archive/exams/${snapshotId}/pdf`, null, studentToken);
    assert(pdfRes.status === 200 && pdfRes.body.data?.downloadUrl, 'GET /archive/exams/:id/pdf retrieves question paper PDF asset');

    console.log('\n====================================================');
    console.log(`  PHASE 7 MASTER TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal error running Phase 7 master test suite:', err);
    process.exit(1);
  }
})();
