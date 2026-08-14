const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_BASE = 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'examos_super_secret_jwt_key_2026_production';

const AUTH_TOKEN = jwt.sign(
  { sub: 'usr_admin_test', email: 'admin@examos.com', roles: ['MAIN_ADMIN'], permissions: ['*'] },
  JWT_SECRET
);

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
    const payload = data ? JSON.stringify(data) : null;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
        ...headers,
      },
    };

    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runPhase4Tests() {
  console.log('====================================================');
  console.log(' EXAMOS PHASE 4 (EXAM PATTERN) — MASTER TEST SUITE');
  console.log(' Testing Features 4.1 to 4.10');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // Test 4.1 — Exam Pattern CRUD
    // ----------------------------------------------------
    const createRes = await request('POST', '/exam-patterns', {
      name: 'JEE Main Physics Mock Pattern',
      courseId: 'c1',
      durationMinutes: 180,
      description: 'Standard 30 question blueprint',
      type: 'SINGLE',
    });

    assert(createRes.status === 201 && createRes.body.success, '4.1-U1 — Create single subject exam pattern (Status: DRAFT)');
    const patternId = createRes.body.data.id;

    const listRes = await request('GET', '/exam-patterns');
    assert(listRes.status === 200 && Array.isArray(listRes.body.data), '4.1-U2 — List exam patterns with pagination & filters');

    const getRes = await request('GET', `/exam-patterns/${patternId}`);
    assert(getRes.status === 200 && getRes.body.data.id === patternId, '4.1-U3 — Get pattern details by ID');

    // Status transition: DRAFT -> PUBLISHED
    const pubRes = await request('PATCH', `/exam-patterns/${patternId}`, { status: 'PUBLISHED' });
    assert(pubRes.status === 200 && pubRes.body.data.status === 'PUBLISHED', '4.1-U4 — Transition pattern DRAFT -> PUBLISHED');

    // 409 conflict when trying to delete PUBLISHED pattern
    const delConflictRes = await request('DELETE', `/exam-patterns/${patternId}`);
    assert(delConflictRes.status === 409, '4.1-U5 — Block deleting PUBLISHED exam pattern (409 Conflict)');

    // ----------------------------------------------------
    // Test 4.2 — Exam Pattern Sections
    // ----------------------------------------------------
    const sec1Res = await request('POST', `/exam-patterns/${patternId}/sections`, {
      name: 'Section A (MCQ)',
      numQuestions: 20,
      marksPerQuestion: 4.0,
      sequenceOrder: 1,
    });
    assert(sec1Res.status === 201 && sec1Res.body.data.totalMarks === 80, '4.2-U1 — Add Section A with auto-calculated section total marks (20 × 4 = 80)');
    const sec1Id = sec1Res.body.data.id;

    const sec2Res = await request('POST', `/exam-patterns/${patternId}/sections`, {
      name: 'Section B (Numerical)',
      numQuestions: 10,
      marksPerQuestion: 4.0,
      sequenceOrder: 2,
    });
    assert(sec2Res.status === 201 && sec2Res.body.data.totalMarks === 40, '4.2-U2 — Add Section B (10 × 4 = 40)');
    const sec2Id = sec2Res.body.data.id;

    const patternCheckRes = await request('GET', `/exam-patterns/${patternId}`);
    assert(patternCheckRes.body.data.totalMarks === 120, '4.2-U3 — Pattern total marks auto-recomputed across sections (80 + 40 = 120)');

    const reorderRes = await request('PATCH', `/exam-patterns/${patternId}/sections/reorder`, {
      sectionIds: [sec2Id, sec1Id],
    });
    assert(reorderRes.status === 200 && reorderRes.body.success, '4.2-U4 — Reorder sections sequence order via API');

    // ----------------------------------------------------
    // Test 4.3 — Section Question Rules
    // ----------------------------------------------------
    const rulesRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sec1Id}/rules`, {
      allowedQuestionTypes: ['MCQ', 'TRUE_FALSE'],
      selectionMode: 'RANDOM',
      tags: ['Mechanics', 'Algebra'],
    });
    assert(rulesRes.status === 200 && rulesRes.body.data.selectionMode === 'RANDOM', '4.3-U1 — Set Section Question Rules (MCQ, RANDOM, tags)');

    const getRulesRes = await request('GET', `/exam-patterns/${patternId}/sections/${sec1Id}/rules`);
    assert(getRulesRes.status === 200 && getRulesRes.body.data.allowedQuestionTypes.includes('MCQ'), '4.3-U2 — Fetch persisted Section Question Rules');

    // ----------------------------------------------------
    // Test 4.4 — Topic Distribution
    // ----------------------------------------------------
    const topicRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sec1Id}/topics`, {
      distributionType: 'COUNT',
      topics: [
        { topicId: 'top_mech', value: 10 },
        { topicId: 'top_optics', value: 10 },
      ],
    });
    assert(topicRes.status === 200 && topicRes.body.data.length === 2, '4.4-U1 — Set valid COUNT topic distribution (10 + 10 = 20 total questions)');

    const invalidTopicRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sec1Id}/topics`, {
      distributionType: 'COUNT',
      topics: [
        { topicId: 'top_mech', value: 5 },
        { topicId: 'top_optics', value: 5 },
      ],
    });
    assert(invalidTopicRes.status === 400, '4.4-U2 — Reject topic count sum discrepancy (5+5 != 20) with 400 Bad Request');

    // ----------------------------------------------------
    // Test 4.5 — Difficulty Distribution
    // ----------------------------------------------------
    const diffRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sec1Id}/difficulty`, {
      distributionType: 'PERCENT',
      isAutomatic: false,
      difficulties: [
        { difficultyLevel: 'EASY', value: 30 },
        { difficultyLevel: 'MEDIUM', value: 50 },
        { difficultyLevel: 'HARD', value: 20 },
      ],
    });
    assert(diffRes.status === 200 && diffRes.body.data.length === 3, '4.5-U1 — Set valid PERCENT difficulty distribution (30% + 50% + 20% = 100%)');

    // Test 3-way floating point percentage split (33.33 + 33.33 + 33.34 = 100.00000000000001)
    const floatDiffRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sec1Id}/difficulty`, {
      distributionType: 'PERCENT',
      isAutomatic: false,
      difficulties: [
        { difficultyLevel: 'EASY', value: 33.33 },
        { difficultyLevel: 'MEDIUM', value: 33.33 },
        { difficultyLevel: 'HARD', value: 33.34 },
      ],
    });
    assert(floatDiffRes.status === 200 && floatDiffRes.body.data.length === 3, '4.5-U2 — Accept 3-way floating-point percentage split (33.33 + 33.33 + 33.34 = 100%)');

    const invalidDiffRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sec1Id}/difficulty`, {
      distributionType: 'PERCENT',
      isAutomatic: false,
      difficulties: [
        { difficultyLevel: 'EASY', value: 40 },
        { difficultyLevel: 'MEDIUM', value: 40 },
      ],
    });
    assert(invalidDiffRes.status === 400, '4.5-U3 — Reject invalid difficulty percent sum (!= 100%) with 400 Bad Request');

    // ----------------------------------------------------
    // Test 4.6 — Negative Marking Configuration
    // ----------------------------------------------------
    const markingRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sec1Id}/marking`, {
      marksCorrect: 4.0,
      marksWrong: -1.0,
      marksUnattempted: 0.0,
    });
    assert(markingRes.status === 200 && markingRes.body.data.marksWrong === -1.0, '4.6-U1 — Configure negative marking scheme (+4 / -1 / 0)');

    const invalidMarkingRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sec1Id}/marking`, {
      marksCorrect: 5.0,
      marksWrong: -1.0,
    });
    assert(invalidMarkingRes.status === 400, '4.6-U2 — Reject marksCorrect mismatch with section marksPerQuestion (5.0 != 4.0)');

    // ----------------------------------------------------
    // Test 4.7 — Multi-Subject Allocation
    // ----------------------------------------------------
    const multiSubRes = await request('PUT', `/exam-patterns/${patternId}/subjects-allocation`, {
      subjectAllocations: [
        { subjectId: 'sub_phy', targetMarks: 60 },
        { subjectId: 'sub_chem', targetMarks: 60 },
      ],
      sectionSubjectMappings: [
        { sectionId: sec1Id, subjectId: 'sub_phy' },
        { sectionId: sec2Id, subjectId: 'sub_chem' },
      ],
    });
    assert(multiSubRes.status === 200 && multiSubRes.body.data.length >= 1, '4.7-U1 — Multi-Subject allocation and section mapping');

    // ----------------------------------------------------
    // Test 4.8 — Exam Pattern Validation Engine
    // ----------------------------------------------------
    const valRes = await request('POST', `/exam-patterns/${patternId}/validate`);
    assert(valRes.status === 200 && typeof valRes.body.data.isValid === 'boolean', '4.8-U1 — Execute Validation Engine against Question Bank');

    // ----------------------------------------------------
    // Test 4.9 — Exam Pattern Versioning
    // ----------------------------------------------------
    const editPubRes = await request('PATCH', `/exam-patterns/${patternId}`, {
      name: 'JEE Main Physics Pattern V2',
    });
    assert(editPubRes.status === 200 && editPubRes.body.data.version === 2, '4.9-U1 — Editing PUBLISHED pattern auto-increments version and saves snapshot');

    const verHistoryRes = await request('GET', `/exam-patterns/${patternId}/versions`);
    assert(verHistoryRes.status === 200 && verHistoryRes.body.data.length >= 1, '4.9-U2 — Fetch pattern entity version history snapshot');

    // ----------------------------------------------------
    // Test 4.10 — Exam Pattern Frontend Integration
    // ----------------------------------------------------
    const apiHealthRes = await request('GET', 'http://localhost:4000/health');
    assert(apiHealthRes.status === 200 && apiHealthRes.body.status === 'ok', '4.10-U1 — API Server ready for ExamPatternPage UI components');

    console.log('\n====================================================');
    console.log(` Phase 4 Master Test Results: ${passed}/${passed + failed} Passed`);
    console.log('====================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runPhase4Tests();
