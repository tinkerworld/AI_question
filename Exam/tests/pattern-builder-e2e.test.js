const http = require('http');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'examos_super_secret_jwt_key_2026_production';

const REAL_TOKEN = jwt.sign(
  { sub: 'usr_admin_test', email: 'admin@examos.com', roles: ['MAIN_ADMIN'], permissions: ['*'] },
  JWT_SECRET,
  { expiresIn: '1h' }
);

function request(method, urlPath, data = null, customToken = REAL_TOKEN) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath.startsWith('http') ? urlPath : `${API_BASE}${urlPath}`);
    const payload = data ? JSON.stringify(data) : null;

    const headers = {
      'Content-Type': 'application/json',
    };
    if (customToken) {
      headers['Authorization'] = `Bearer ${customToken}`;
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
          resolve({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runEndToEndTests() {
  console.log('====================================================');
  console.log(' EXAMPATTERNS END-TO-END VERIFICATION & AUTH AUDIT');
  console.log('====================================================\n');

  // Test 1: Verify mock_token is rejected by backend (401)
  console.log('1. Testing Auth Rejection with mock_token...');
  const mockRes = await request('POST', '/exam-patterns', {
    name: 'Mock Auth Test',
    courseId: 'c1',
    durationMinutes: 60,
  }, 'mock_token');
  assert.strictEqual(mockRes.status, 401, 'Backend must return 401 Unauthorized for mock_token');
  assert.strictEqual(mockRes.body.errorCode, 'INVALID_TOKEN');
  console.log('   [PASS] mock_token is strictly rejected with 401 INVALID_TOKEN');

  // Test 2: Verify real token succeeds (201 Created)
  console.log('\n2. Testing Real Token "Create Exam Pattern" flow...');
  const createRes = await request('POST', '/exam-patterns', {
    name: 'JEE Advanced Full Mock 2026',
    courseId: 'c1',
    durationMinutes: 180,
    type: 'MULTI',
    description: 'Comprehensive 3-subject pattern',
    subjectIds: ['sub_phy', 'sub_chem'],
  });
  assert.strictEqual(createRes.status, 201);
  assert.ok(createRes.body.success);
  assert.ok(createRes.body.data.id);
  const patternId = createRes.body.data.id;
  console.log(`   [PASS] Pattern created successfully with ID: ${patternId}`);

  // Test 3: Add Section (Feature 4.2)
  console.log('\n3. Testing Add Section (Feature 4.2)...');
  const addSecRes = await request('POST', `/exam-patterns/${patternId}/sections`, {
    name: 'Physics Section 1 (Single Correct)',
    subjectId: 'sub_phy',
    sequenceOrder: 0,
    numQuestions: 10,
    marksPerQuestion: 3,
    marksCorrect: 3,
    marksWrong: -1,
    marksUnattempted: 0,
  });
  assert.strictEqual(addSecRes.status, 201);
  const sectionId = addSecRes.body.data.id;
  console.log(`   [PASS] Section created with ID: ${sectionId}`);

  // Test 4: Configure Question Type Rules (Feature 4.3)
  console.log('\n4. Testing Set Section Rules (Feature 4.3)...');
  const rulesRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sectionId}/rules`, {
    allowedQuestionTypes: ['MCQ_SINGLE', 'MCQ_MULTI'],
    selectionMode: 'BALANCED',
    tags: ['pyq', 'high-yield'],
  });
  assert.strictEqual(rulesRes.status, 200);
  assert.deepStrictEqual(rulesRes.body.data.allowedQuestionTypes, ['MCQ_SINGLE', 'MCQ_MULTI']);
  console.log('   [PASS] Question rules configured (MCQ_SINGLE, MCQ_MULTI, BALANCED mode)');

  // Test 5: Configure Topic Distribution (Feature 4.4)
  console.log('\n5. Testing Set Topic Distribution (Feature 4.4)...');
  const topicsRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sectionId}/topics`, {
    distributionType: 'COUNT',
    topics: [
      { topicId: 'top_mech', value: 6 },
      { topicId: 'top_optics', value: 4 },
    ],
  });
  assert.strictEqual(topicsRes.status, 200);
  assert.strictEqual(topicsRes.body.data.length, 2);
  console.log('   [PASS] Topic distribution configured (6 Mechanics + 4 Optics = 10 Total)');

  // Test 6: Configure Difficulty Distribution (Feature 4.5)
  console.log('\n6. Testing Set Difficulty Distribution (Feature 4.5)...');
  const diffRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sectionId}/difficulty`, {
    distributionType: 'PERCENT',
    isAutomatic: false,
    difficulties: [
      { difficultyLevel: 'EASY', value: 30 },
      { difficultyLevel: 'MEDIUM', value: 50 },
      { difficultyLevel: 'HARD', value: 20 },
    ],
  });
  assert.strictEqual(diffRes.status, 200);
  console.log('   [PASS] Difficulty distribution configured (30% EASY / 50% MEDIUM / 20% HARD)');

  // Test 7: Configure Negative Marking Scheme (Feature 4.6)
  console.log('\n7. Testing Negative Marking Scheme (Feature 4.6)...');
  const markRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sectionId}/marking`, {
    marksCorrect: 3,
    marksWrong: -0.75,
    marksUnattempted: 0,
  });
  assert.strictEqual(markRes.status, 200);
  assert.strictEqual(markRes.body.data.marksWrong, -0.75);
  console.log('   [PASS] Negative marking scheme saved (+3 Correct / -0.75 Wrong / 0 Unattempted)');

  // Test 8: Multi-Subject Allocation (Feature 4.7)
  console.log('\n8. Testing Multi-Subject Allocation (Feature 4.7)...');
  const allocRes = await request('PUT', `/exam-patterns/${patternId}/subjects-allocation`, {
    subjectAllocations: [
      { subjectId: 'sub_phy', targetMarks: 60 },
      { subjectId: 'sub_chem', targetMarks: 60 },
    ],
    sectionSubjectMappings: [
      { sectionId: sectionId, subjectId: 'sub_phy' },
    ],
  });
  assert.strictEqual(allocRes.status, 200);
  console.log('   [PASS] Multi-Subject allocation saved (Physics 60 pts, Chemistry 60 pts)');

  // Test 9: Validation Engine (Feature 4.8)
  console.log('\n9. Testing Validation Engine (Feature 4.8)...');
  const valRes = await request('POST', `/exam-patterns/${patternId}/validate`);
  assert.strictEqual(valRes.status, 200);
  assert.ok(valRes.body.data !== undefined);
  console.log(`   [PASS] Validation Engine executed (isValid: ${valRes.body.data.isValid})`);

  // Test 10: Status transition & Version Snapshot (Feature 4.9)
  console.log('\n10. Testing Pattern Publishing & Version Snapshot (Feature 4.9)...');
  const pubRes = await request('PATCH', `/exam-patterns/${patternId}`, { status: 'PUBLISHED' });
  assert.strictEqual(pubRes.status, 200);
  assert.strictEqual(pubRes.body.data.status, 'PUBLISHED');

  // Edit published pattern -> creates v2 and saves entity_version snapshot
  const editPubRes = await request('PATCH', `/exam-patterns/${patternId}`, { durationMinutes: 200 });
  assert.strictEqual(editPubRes.status, 200);
  assert.strictEqual(editPubRes.body.data.version, 2);

  const verRes = await request('GET', `/exam-patterns/${patternId}/versions`);
  assert.strictEqual(verRes.status, 200);
  assert.ok(verRes.body.data.length >= 1);
  console.log(`   [PASS] Version snapshot created and retrieved (${verRes.body.data.length} snapshots in history)`);

  console.log('\n====================================================');
  console.log(' ALL END-TO-END PATTERN BUILDER TESTS PASSED! (10/10)');
  console.log('====================================================\n');
}

runEndToEndTests().catch((e) => {
  console.error('[FAIL] Test failed:', e);
  process.exit(1);
});
