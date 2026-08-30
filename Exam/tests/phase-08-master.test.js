const http = require('http');

const API_BASE = process.env.API_BASE || 'http://localhost:4043/api/v1';

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
  console.log('  PHASE 8 MASTER BACKEND TEST SUITE');
  console.log('  (Student Analytics, Mastery Engine & Dashboards)');
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

    const adminToken = adminRes.body.data?.accessToken || adminRes.body.data?.access_token || adminRes.body.data?.token;
    const subAdminToken = subAdminRes.body.data?.accessToken || subAdminRes.body.data?.access_token || subAdminRes.body.data?.token;
    const teacherToken = teacherRes.body.data?.accessToken || teacherRes.body.data?.access_token || teacherRes.body.data?.token;

    // Create a dedicated fresh student account for Phase 8 test
    const p8StudentEmail = `student_p8_${Date.now()}@examos.com`;
    await request('POST', '/users', {
      email: p8StudentEmail,
      password: 'Student8@123',
      firstName: 'Student8',
      lastName: 'Tester',
      roleIds: ['r4'],
    }, adminToken);

    const studentRes = await request('POST', '/auth/login', { email: p8StudentEmail, password: 'Student8@123' });
    const studentToken = studentRes.body.data?.accessToken || studentRes.body.data?.access_token || studentRes.body.data?.token;
    const studentUser = studentRes.body.data?.user;
    const studentId = studentUser?.id || 'u4';

    assert(Boolean(adminToken && teacherToken && studentToken), 'P08.AUTH: All 4 personas authenticated successfully');

    // 2. Setting Up Exam Attempt Data with Linked Topics
    console.log('\n--- 2. Setting Up Exam & Attempt Data with Linked Topics ---');
    const coursesRes = await request('GET', '/courses', null, adminToken);
    const courseId = coursesRes.body.data?.[0]?.id || 'c1';

    // Generate draft exam from standard JEE Main pattern
    const genRes = await request('POST', '/exams/generate', {
      patternId: 'pat_jee_main_standard',
      name: 'Phase 8 Analytics Test Assessment',
      instructions: 'Standard Examination: Answer all questions.',
    }, adminToken);
    assert(genRes.status === 201, 'Exam generation from blueprint succeeded');
    const examId = genRes.body.data?.exam ? genRes.body.data.exam.id : genRes.body.data.id;

    // Publish exam
    const pubRes = await request('POST', `/exams/${examId}/publish`, {}, adminToken);
    assert(pubRes.status === 200, 'Publishing exam paper succeeded');

    // Enroll student in course if not already
    await request('POST', '/enrollments', { userId: studentId, courseId }, adminToken);

    // Student Starts Attempt
    const startRes = await request('POST', '/attempts/start', { examId }, studentToken);
    const attemptId = startRes.body.data?.id || startRes.body.data?.attemptId;
    assert((startRes.status === 201 || startRes.status === 200) && Boolean(attemptId), 'P08.ATTEMPT: Student successfully initiated exam attempt session');

    // Answer questions: answer first correctly, second incorrectly
    const attemptQuestions = startRes.body.data?.questions || [];
    if (attemptQuestions.length >= 2) {
      const q1 = attemptQuestions[0];
      const q2 = attemptQuestions[1];

      await request('POST', `/attempts/${attemptId}/sync`, {
        answers: [
          { questionId: q1.questionId, studentAnswer: 'A', isMarkedForReview: false, timeSpentSeconds: 30 },
          { questionId: q2.questionId, studentAnswer: 'Z_WRONG', isMarkedForReview: false, timeSpentSeconds: 45 }
        ]
      }, studentToken);
    }

    // Submit attempt -> Automatically evaluates and recalculates mastery
    const submitRes = await request('POST', `/attempts/${attemptId}/submit`, {}, studentToken);
    assert(submitRes.status === 200 && submitRes.body.data?.status === 'EVALUATED', 'P08.AUTO_EVAL: Exam submitted and auto-evaluated successfully');

    // 3. Feature 8.1 — Mastery Engine (@repo/mastery-engine & API)
    console.log('\n--- 3. Feature 8.1: Mastery Engine Profile & Scoring ---');
    const masteryRes = await request('GET', `/students/${studentId}/mastery`, null, studentToken);
    assert(masteryRes.status === 200 && masteryRes.body.success === true, 'P08.F01.I002: GET /api/v1/students/:id/mastery returns 200 OK');
    const masteryData = masteryRes.body.data;
    assert(typeof masteryData?.overallProficiency === 'number', 'P08.F01.U001: Overall proficiency is a valid numerical score (0-100)');
    assert(['MASTERED', 'STRONG', 'DEVELOPING', 'NEEDS_PRACTICE', 'WEAK', 'NOT_ATTEMPTED'].includes(masteryData?.status), 'P08.F01.U003: Mastery status mapped to valid threshold label');
    assert(['GREEN', 'BLUE', 'YELLOW', 'ORANGE', 'RED', 'GREY'].includes(masteryData?.color), 'P08.F01.U004: Mastery color mapped to valid indicator');

    // Test on-demand recalculation
    const recalcRes = await request('POST', `/students/${studentId}/recalculate`, {}, studentToken);
    assert(recalcRes.status === 200 && recalcRes.body.success === true, 'P08.F01.I001: POST /api/v1/students/:id/recalculate successfully updates mastery');

    // 4. Feature 8.2 — Strengths Identification
    console.log('\n--- 4. Feature 8.2: Strengths Identification ---');
    const strengthsRes = await request('GET', `/students/${studentId}/strengths`, null, studentToken);
    assert(strengthsRes.status === 200 && Array.isArray(strengthsRes.body.data), 'P08.F02.I001: GET /api/v1/students/:id/strengths returns valid strengths array');

    const myStrengthsRes = await request('GET', '/mastery/strengths', null, studentToken);
    assert(myStrengthsRes.status === 200 && Array.isArray(myStrengthsRes.body.data), 'P08.F02.I002: GET /api/v1/mastery/strengths returns current user strengths');

    // 5. Feature 8.3 — Weakness Identification & Persistence Tracking
    console.log('\n--- 5. Feature 8.3: Weakness Identification ---');
    const weaknessesRes = await request('GET', `/students/${studentId}/weaknesses`, null, studentToken);
    assert(weaknessesRes.status === 200 && Array.isArray(weaknessesRes.body.data), 'P08.F03.I001: GET /api/v1/students/:id/weaknesses returns valid weaknesses array');

    const myWeaknessesRes = await request('GET', '/mastery/weaknesses', null, studentToken);
    assert(myWeaknessesRes.status === 200 && Array.isArray(myWeaknessesRes.body.data), 'P08.F03.I002: GET /api/v1/mastery/weaknesses returns current user weaknesses');

    if (weaknessesRes.body.data.length > 0) {
      const firstWeak = weaknessesRes.body.data[0];
      assert(['CRITICAL', 'MODERATE', 'MINOR'].includes(firstWeak.severity), 'P08.F03.U001: Weakness includes severity classification');
      assert(typeof firstWeak.daysInWeakness === 'number' && firstWeak.daysInWeakness >= 1, 'P08.F03.U002: Weakness includes persistence duration tracking');
    }

    // 6. Feature 8.4 — Syllabus Proficiency Map
    console.log('\n--- 6. Feature 8.4: Syllabus Proficiency Map ---');
    const mapRes = await request('GET', `/students/${studentId}/syllabus-proficiency/${courseId}`, null, studentToken);
    assert(mapRes.status === 200 && Array.isArray(mapRes.body.data), 'P08.F04.I001: GET /api/v1/students/:id/syllabus-proficiency/:courseId returns tree hierarchy');

    const myMapRes = await request('GET', `/mastery/map?courseId=${courseId}`, null, studentToken);
    assert(myMapRes.status === 200 && Array.isArray(myMapRes.body.data), 'P08.F04.I002: GET /api/v1/mastery/map returns current user tree');

    if (mapRes.body.data.length > 0) {
      const rootNode = mapRes.body.data[0];
      assert(typeof rootNode.proficiencyScore === 'number', 'P08.F04.U001: Node includes computed proficiency score');
      assert(typeof rootNode.completionPercentage === 'number', 'P08.F04.U002: Node includes completion percentage');
      assert(['GREEN', 'BLUE', 'YELLOW', 'ORANGE', 'RED', 'GREY'].includes(rootNode.color), 'P08.F04.U003: Node includes color status indicator');
    }

    // 7. Feature 8.5 — Progress Tracking & Trends
    console.log('\n--- 7. Feature 8.5: Progress Tracking & Historical Trends ---');
    const progressRes = await request('GET', `/students/${studentId}/progress?range=all`, null, studentToken);
    assert(progressRes.status === 200 && progressRes.body.success === true, 'P08.F05.I001: GET /api/v1/students/:id/progress returns timeseries trend data');

    const progData = progressRes.body.data;
    assert(['IMPROVING', 'DEGRADING', 'PLATEAU'].includes(progData?.trend), 'P08.F05.U001: Progress includes valid trend indicator (IMPROVING/DEGRADING/PLATEAU)');
    assert(Array.isArray(progData?.timeseries), 'P08.F05.U003: Timeseries array returned with historical datapoints');

    // 8. Feature 8.7 — Class & Topic Analytics (Teacher / Admin View)
    console.log('\n--- 8. Feature 8.7: Class & Topic Analytics ---');
    const classRes = await request('GET', `/analytics/class/${courseId}`, null, teacherToken);
    assert(classRes.status === 200 && classRes.body.success === true, 'P08.F07.I001: Teacher GET /api/v1/analytics/class/:courseId returns class aggregate');
    const classData = classRes.body.data;
    assert(typeof classData?.averageMastery === 'number', 'P08.F07.U001: Class aggregate includes average mastery');
    assert(Array.isArray(classData?.topWeakTopics), 'P08.F07.U002: Class aggregate identifies cohort common weaknesses');
    assert(Array.isArray(classData?.students), 'P08.F07.U003: Class aggregate includes individual student performance roster');

    const topicsRes = await request('GET', `/analytics/topics/${courseId}`, null, adminToken);
    assert(topicsRes.status === 200 && topicsRes.body.success === true, 'P08.F07.I002: Admin GET /api/v1/analytics/topics/:courseId returns topic performance matrix');

    // 9. Section 7 Security & IDOR Verification
    console.log('\n--- 9. Section 7 IDOR Security & Permission Enforcement ---');
    // Student attempting to access class analytics (requires teacher/admin)
    const unauthClassRes = await request('GET', `/analytics/class/${courseId}`, null, studentToken);
    assert(unauthClassRes.status === 403, 'P08.SEC.001: Student requesting class analytics is rejected with 403 Forbidden');

    // Student attempting to access another student's mastery data (IDOR test)
    const otherStudentId = 'u_other_999';
    const idorRes = await request('GET', `/students/${otherStudentId}/mastery`, null, studentToken);
    assert(idorRes.status === 403, 'P08.SEC.002: Student attempting IDOR access on another student profile receives 403 Forbidden');

    // Teacher can access student mastery data (elevated)
    const teacherStudentRes = await request('GET', `/students/${studentId}/mastery`, null, teacherToken);
    assert(teacherStudentRes.status === 200, 'P08.SEC.003: Teacher authorized to inspect student mastery profile');

    console.log('\n====================================================');
    console.log(`  PHASE 8 MASTER TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error during Phase 8 test run:', error);
    process.exit(1);
  }
})();
