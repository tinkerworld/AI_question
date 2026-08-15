const http = require('http');
const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = 'http://localhost:4000/api/v1';

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
  console.log(' EXAMOS AUTHENTICATION & PATTERN BUILDER E2E AUDIT');
  console.log(' Testing Real Login Session, Token Storage & API Calls');
  console.log('====================================================\n');

  // Step 1: Reject unauthenticated / null token requests
  console.log('1. Testing Unauthenticated Request Guarding (no token)...');
  const unauthRes = await request('POST', '/exam-patterns', {
    name: 'Unauth Test',
    courseId: 'c1',
    durationMinutes: 60,
  }, null);
  assert.strictEqual(unauthRes.status, 401, 'Backend must return 401 for unauthenticated request');
  console.log('   [PASS] Unauthenticated request rejected with 401 Unauthorized');

  // Step 2: Reject invalid password
  console.log('\n2. Testing Login with Invalid Credentials...');
  const badLoginRes = await request('POST', '/auth/login', {
    email: 'admin@examos.com',
    password: 'WrongPassword123!',
  });
  assert.strictEqual(badLoginRes.status, 401);
  assert.strictEqual(badLoginRes.body.errorCode, 'INVALID_CREDENTIALS');
  console.log('   [PASS] Invalid password rejected with 401 INVALID_CREDENTIALS');

  // Step 3: Login as Admin with real credentials
  console.log('\n3. Testing Real Admin Login (POST /api/v1/auth/login)...');
  const loginRes = await request('POST', '/auth/login', {
    email: 'admin@examos.com',
    password: 'Admin@123',
  });
  assert.strictEqual(loginRes.status, 200, 'Login must succeed with 200 OK');
  assert.ok(loginRes.body.success, 'Login response must indicate success');
  assert.ok(loginRes.body.data.accessToken, 'Must return accessToken');
  assert.ok(loginRes.body.data.refreshToken, 'Must return refreshToken');
  assert.strictEqual(loginRes.body.data.user.email, 'admin@examos.com');
  assert.ok(loginRes.body.data.user.roles.includes('MAIN_ADMIN'));

  const sessionToken = loginRes.body.data.accessToken;
  const sessionRefresh = loginRes.body.data.refreshToken;
  console.log('   [PASS] Login successful! Tokens received and user permissions loaded.');

  // Step 4: Verify /auth/me with session token
  console.log('\n4. Testing Session Verification (GET /api/v1/auth/me)...');
  const meRes = await request('GET', '/auth/me', null, sessionToken);
  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meRes.body.data.email, 'admin@examos.com');
  console.log(`   [PASS] Authenticated user verified: ${meRes.body.data.firstName} (${meRes.body.data.email})`);

  // Step 5: User preference synchronization (Theme & Language)
  console.log('\n5. Testing User Preferences Sync with Real Token (Theme & Language)...');
  const prefRes = await request('PATCH', '/users/me/preferences', {
    themeMode: 'DARK',
    languageCode: 'hi',
  }, sessionToken);
  assert.strictEqual(prefRes.status, 200);
  console.log('   [PASS] User preferences synced successfully with real token');

  // Step 6: Create Exam Pattern using the Real Logged-in Token
  console.log('\n6. Testing Create Exam Pattern (Feature 4.1) using Real Logged-In Session...');
  const createRes = await request('POST', '/exam-patterns', {
    name: 'JEE Advanced Master Pattern (Logged-in)',
    courseId: 'c1',
    durationMinutes: 180,
    type: 'MULTI',
    description: 'Created via real logged-in admin session',
    subjectIds: ['sub_phy', 'sub_chem'],
  }, sessionToken);
  assert.strictEqual(createRes.status, 201);
  assert.ok(createRes.body.success);
  const patternId = createRes.body.data.id;
  console.log(`   [PASS] Pattern created successfully! ID: ${patternId}`);

  // Step 7: Add Section with Real Token (Feature 4.2)
  console.log('\n7. Testing Add Section (Feature 4.2)...');
  const addSecRes = await request('POST', `/exam-patterns/${patternId}/sections`, {
    name: 'Physics Section A (Single Correct)',
    subjectId: 'sub_phy',
    sequenceOrder: 0,
    numQuestions: 15,
    marksPerQuestion: 4,
    marksCorrect: 4,
    marksWrong: -1,
    marksUnattempted: 0,
  }, sessionToken);
  assert.strictEqual(addSecRes.status, 201);
  const sectionId = addSecRes.body.data.id;
  console.log(`   [PASS] Section created with ID: ${sectionId} (Total marks: 60)`);

  // Step 8: Configure Rules, Topics, Difficulty, Marking with Real Token (Features 4.3 - 4.6)
  console.log('\n8. Testing Section Rules & Distribution Config (Features 4.3, 4.4, 4.5, 4.6)...');
  const rulesRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sectionId}/rules`, {
    allowedQuestionTypes: ['MCQ_SINGLE', 'MCQ_MULTI'],
    selectionMode: 'BALANCED',
    tags: ['pyq', 'jee-main'],
  }, sessionToken);
  assert.strictEqual(rulesRes.status, 200);

  const topicsRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sectionId}/topics`, {
    distributionType: 'COUNT',
    topics: [
      { topicId: 'top_mech', value: 10 },
      { topicId: 'top_optics', value: 5 },
    ],
  }, sessionToken);
  assert.strictEqual(topicsRes.status, 200);

  const diffRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sectionId}/difficulty`, {
    distributionType: 'PERCENT',
    isAutomatic: false,
    difficulties: [
      { difficultyLevel: 'EASY', value: 30 },
      { difficultyLevel: 'MEDIUM', value: 50 },
      { difficultyLevel: 'HARD', value: 20 },
    ],
  }, sessionToken);
  assert.strictEqual(diffRes.status, 200);

  const markRes = await request('PUT', `/exam-patterns/${patternId}/sections/${sectionId}/marking`, {
    marksCorrect: 4,
    marksWrong: -1,
    marksUnattempted: 0,
  }, sessionToken);
  assert.strictEqual(markRes.status, 200);
  console.log('   [PASS] Rules, Topics (10+5=15), Difficulty (30/50/20), and Marking (+4/-1/0) configured!');

  // Step 9: Multi-Subject Allocation & Validation Engine (Features 4.7 & 4.8)
  console.log('\n9. Testing Multi-Subject Allocation & Validation Engine...');
  const allocRes = await request('PUT', `/exam-patterns/${patternId}/subjects-allocation`, {
    subjectAllocations: [
      { subjectId: 'sub_phy', targetMarks: 60 },
      { subjectId: 'sub_chem', targetMarks: 60 },
    ],
    sectionSubjectMappings: [
      { sectionId: sectionId, subjectId: 'sub_phy' },
    ],
  }, sessionToken);
  assert.strictEqual(allocRes.status, 200);

  const valRes = await request('POST', `/exam-patterns/${patternId}/validate`, null, sessionToken);
  assert.strictEqual(valRes.status, 200);
  console.log('   [PASS] Multi-Subject allocation and Validation Engine executed successfully');

  // Step 10: Token Refresh Rotation (Feature 1.6)
  console.log('\n10. Testing Refresh Token Rotation (POST /api/v1/auth/refresh)...');
  const refRes = await request('POST', '/auth/refresh', { refreshToken: sessionRefresh });
  assert.strictEqual(refRes.status, 200);
  assert.ok(refRes.body.data.accessToken);
  assert.ok(refRes.body.data.refreshToken);
  assert.notStrictEqual(refRes.body.data.refreshToken, sessionRefresh, 'Refresh token must be rotated');
  console.log('   [PASS] Token rotated successfully with new access & refresh tokens');

  // Step 11: Logout (POST /api/v1/auth/logout)
  console.log('\n11. Testing Logout (POST /api/v1/auth/logout)...');
  const logoutRes = await request('POST', '/auth/logout', {
    refreshToken: refRes.body.data.refreshToken,
  }, refRes.body.data.accessToken);
  assert.strictEqual(logoutRes.status, 200);
  assert.ok(logoutRes.body.success);
  console.log('   [PASS] User session revoked and logged out successfully');

  console.log('\n====================================================');
  console.log(' ALL AUTHENTICATION & PATTERN BUILDER TESTS PASSED! (11/11)');
  console.log('====================================================\n');
}

runEndToEndTests().catch((e) => {
  console.error('[FAIL] Test failed:', e);
  process.exit(1);
});
