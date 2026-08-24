const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:4000';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(email, password) {
  const res = await request('POST', '/api/v1/auth/login', { email, password });
  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return res.data.data.accessToken;
}

async function runPhase10MasterTests() {
  console.log('================================================================');
  console.log('  RUNNING PHASE 10 MASTER INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  let adminToken, subAdminToken, teacherToken, studentToken;
  let createdProfileId, previewSessionToken, impersonationSessionToken;

  // 1. Authenticate Personas
  console.log('1. Authenticating test personas...');
  adminToken = await login('admin@examos.com', 'Admin@123');
  subAdminToken = await login('subadmin@examos.com', 'SubAdmin@123');
  teacherToken = await login('teacher@examos.com', 'Teacher@123');
  studentToken = await login('student@examos.com', 'Student@123');
  console.log('   ✓ Admin, Sub-Admin, Teacher, and Student authenticated\n');

  // 2. Feature 10.1: Preview Student Profile CRUD
  console.log('2. Testing Feature 10.1: Preview Student Profile CRUD...');
  
  // 2.1 Student cannot create preview profile (403 Forbidden)
  const studentCreateRes = await request('POST', '/api/v1/preview/profiles', {
    name: 'Student Unauthorized Profile',
    billingPlan: 'PREMIUM',
  }, studentToken);
  assert.strictEqual(studentCreateRes.status, 403, 'Student must receive 403 when attempting to create preview profile');
  console.log('   ✓ Student is rejected with 403 on profile creation');

  // 2.2 Admin creates a preview profile
  const createProfileRes = await request('POST', '/api/v1/preview/profiles', {
    name: 'JEE Advanced High Achiever Simulation',
    billingPlan: 'PREMIUM_PLUS',
    contentVersion: 'DRAFT',
    usageMode: 'UNLIMITED_QA',
    courseAccess: ['crs_jee_main', 'crs_neet_ug'],
    featureFlags: { enableAdvancedAnalytics: true },
  }, adminToken);
  assert.strictEqual(createProfileRes.status, 201, 'Admin should successfully create preview profile');
  assert.strictEqual(createProfileRes.data.success, true);
  createdProfileId = createProfileRes.data.data.id;
  assert.strictEqual(createProfileRes.data.data.billingPlan, 'PREMIUM_PLUS');
  assert.strictEqual(createProfileRes.data.data.contentVersion, 'DRAFT');
  console.log(`   ✓ Admin created preview profile: ${createdProfileId}`);

  // 2.3 Teacher views the created profile
  const getProfileRes = await request('GET', `/api/v1/preview/profiles/${createdProfileId}`, null, teacherToken);
  assert.strictEqual(getProfileRes.status, 200);
  assert.strictEqual(getProfileRes.data.data.name, 'JEE Advanced High Achiever Simulation');
  console.log('   ✓ Teacher can read preview profile configuration');

  // 2.4 Update preview profile
  const patchProfileRes = await request('PATCH', `/api/v1/preview/profiles/${createdProfileId}`, {
    name: 'JEE Advanced High Achiever - Updated',
    billingPlan: 'PREMIUM',
  }, adminToken);
  assert.strictEqual(patchProfileRes.status, 200);
  assert.strictEqual(patchProfileRes.data.data.name, 'JEE Advanced High Achiever - Updated');
  assert.strictEqual(patchProfileRes.data.data.billingPlan, 'PREMIUM');
  console.log('   ✓ Profile successfully updated with new attributes\n');

  // 3. Feature 10.3 / 10.4: Preview Session Start & Entitlement Context
  console.log('3. Testing Feature 10.3 & 10.4: Preview Session Lifecycle & Entitlements...');

  // 3.1 Teacher launches Preview session using Preset 'FREE'
  const startPreviewFreeRes = await request('POST', '/api/v1/preview/start', {
    preset: 'FREE',
  }, teacherToken);
  assert.strictEqual(startPreviewFreeRes.status, 200);
  assert.strictEqual(startPreviewFreeRes.data.success, true);
  assert(startPreviewFreeRes.data.data.sessionToken, 'Must issue dual-identity JWT session token');
  assert.strictEqual(startPreviewFreeRes.data.data.session.mode, 'PREVIEW_STUDENT');
  assert.strictEqual(startPreviewFreeRes.data.data.session.sessionData.simulatedPlan, 'FREE');
  console.log('   ✓ Teacher started Free student preview session with dual-identity JWT');

  // 3.2 Admin launches Preview session using created Profile (PREMIUM)
  const startPreviewProfileRes = await request('POST', '/api/v1/preview/start', {
    profileId: createdProfileId,
  }, adminToken);
  assert.strictEqual(startPreviewProfileRes.status, 200);
  previewSessionToken = startPreviewProfileRes.data.data.sessionToken;
  const previewSessionId = startPreviewProfileRes.data.data.session.id;
  assert.strictEqual(startPreviewProfileRes.data.data.session.sessionData.simulatedPlan, 'PREMIUM');
  console.log(`   ✓ Admin started Preview session using Profile (Session ID: ${previewSessionId})`);

  // 3.3 Verify Preview Session token can access student endpoints
  const studentAccessRes = await request('GET', '/api/v1/practice/weakness-pool', null, previewSessionToken);
  assert.strictEqual(studentAccessRes.status, 200, 'Preview student session should successfully query student weakness pool');
  console.log('   ✓ Preview token operates seamlessly as student on student endpoints');

  // 3.4 Check Session Status
  const statusRes = await request('GET', `/api/v1/preview/status?sessionId=${previewSessionId}`, null, adminToken);
  assert.strictEqual(statusRes.status, 200);
  assert.strictEqual(statusRes.data.data.active, true);
  console.log('   ✓ Session status verified active');

  // 3.5 Stop Preview Session
  const stopPreviewRes = await request('POST', '/api/v1/preview/stop', {
    sessionId: previewSessionId,
  }, adminToken);
  assert.strictEqual(stopPreviewRes.status, 200);
  assert.strictEqual(stopPreviewRes.data.success, true);
  console.log('   ✓ Preview session ended and marked inactive\n');

  // 4. Feature 10.3: Impersonation of Real Students & IDOR Enforcement
  console.log('4. Testing Feature 10.3: Real Student Impersonation & Role Enforcement...');

  // 4.1 Teacher tries to impersonate a real student (MUST BE REJECTED with 403)
  const teacherImpRes = await request('POST', '/api/v1/preview/impersonate/start', {
    targetUserId: 'usr_student_test',
    reason: 'Investigating student complaint about exam marks',
  }, teacherToken);
  assert.strictEqual(teacherImpRes.status, 403, 'Teacher must receive 403 when trying to impersonate a real student');
  console.log('   ✓ Teacher is strictly forbidden from impersonating real students (403)');

  // 4.2 Impersonation without valid reason (< 10 chars) MUST BE REJECTED with 400
  const shortReasonRes = await request('POST', '/api/v1/preview/impersonate/start', {
    targetUserId: 'usr_student_test',
    reason: 'test',
  }, adminToken);
  assert.strictEqual(shortReasonRes.status, 400, 'Impersonation with reason < 10 chars must be rejected with 400');
  console.log('   ✓ Impersonation without sufficient justification is rejected with 400');

  // 4.3 Admin tries to impersonate another staff/admin (MUST BE REJECTED with 403)
  const staffImpRes = await request('POST', '/api/v1/preview/impersonate/start', {
    targetUserId: 'usr_subadmin_test',
    reason: 'Attempting to impersonate another administrator',
  }, adminToken);
  assert.strictEqual(staffImpRes.status, 403, 'Impersonating another staff member must be rejected with 403');
  console.log('   ✓ Impersonation of staff/admin is strictly forbidden (403)');

  // 4.4 Admin impersonates real student with valid justification
  const adminImpRes = await request('POST', '/api/v1/preview/impersonate/start', {
    targetUserId: 'usr_student_test',
    reason: 'Investigating student report of question rendering issue in Physics exam',
  }, adminToken);
  assert.strictEqual(adminImpRes.status, 200);
  assert.strictEqual(adminImpRes.data.success, true);
  impersonationSessionToken = adminImpRes.data.data.sessionToken;
  const impSessionId = adminImpRes.data.data.session.id;
  assert.strictEqual(adminImpRes.data.data.session.mode, 'IMPERSONATE_REAL_STUDENT');
  assert.strictEqual(adminImpRes.data.data.session.effectiveUserId, 'usr_student_test');
  assert.strictEqual(adminImpRes.data.data.session.actorUserId, 'usr_admin_test');
  console.log(`   ✓ Admin successfully initiated impersonation of real student (Session: ${impSessionId})`);

  // 4.5 Sub-Admin also has impersonate.use permission for student support
  const subAdminImpRes = await request('POST', '/api/v1/preview/impersonate/start', {
    targetUserId: 'usr_student_2_test',
    reason: 'Resolving enrollment access issue for Priya Patel',
  }, subAdminToken);
  assert.strictEqual(subAdminImpRes.status, 200);
  assert.strictEqual(subAdminImpRes.data.data.session.mode, 'IMPERSONATE_REAL_STUDENT');
  console.log('   ✓ Sub-Admin successfully initiated support impersonation session');

  // 4.6 Stop Impersonation Session
  const stopImpRes = await request('POST', '/api/v1/preview/impersonate/stop', {
    sessionId: impSessionId,
  }, adminToken);
  assert.strictEqual(stopImpRes.status, 200);
  console.log('   ✓ Impersonation session terminated cleanly\n');

  // 5. Feature 10.5: Preview & Impersonation Audit Trail Verification
  console.log('5. Testing Feature 10.5: Preview & Impersonation Audit Trail...');

  // 5.1 Student cannot view audit logs (403)
  const studentAuditRes = await request('GET', '/api/v1/preview/audit-logs', null, studentToken);
  assert.strictEqual(studentAuditRes.status, 403, 'Student cannot view preview audit logs');
  console.log('   ✓ Student is forbidden from accessing preview audit logs (403)');

  // 5.2 Admin queries preview audit logs
  const auditLogsRes = await request('GET', '/api/v1/preview/audit-logs?limit=50', null, adminToken);
  assert.strictEqual(auditLogsRes.status, 200);
  assert(auditLogsRes.data.data.items.length >= 4, 'Should record at least 4 audit log entries');

  const logs = auditLogsRes.data.data.items;
  const startLog = logs.find((l) => l.action === 'IMPERSONATION_SESSION_START');
  assert(startLog, 'Audit log for IMPERSONATION_SESSION_START must exist');
  assert(['usr_admin_test', 'usr_subadmin_test'].includes(startLog.actorUserId), 'Actor must be Admin or SubAdmin');
  assert.strictEqual(startLog.mode, 'IMPERSONATE_REAL_STUDENT');
  assert(startLog.details && startLog.details.reason, 'Audit log details must contain the recorded justification');
  console.log(`   ✓ Found ${logs.length} audit entries with accurate actor, effective user, and justification`);
  console.log(`   ✓ Latest audit entry: [${startLog.mode}] ${startLog.action} by Actor: ${startLog.actorUserId} -> Target: ${startLog.effectiveUserId}\n`);

  // ----------------------------------------------------
  // 6. Security Boundary: Server-Side Revocation Exploit Replay Test
  // ----------------------------------------------------
  console.log('6. Testing Server-Side Session Revocation (Exploit Replay Test)...');
  
  // 6.1 Start a fresh impersonation session and capture its JWT token
  const exploitSessionRes = await request('POST', '/api/v1/preview/impersonate/start', {
    targetUserId: 'usr_student_test',
    reason: 'Security audit test for session revocation verification',
  }, adminToken);
  assert.strictEqual(exploitSessionRes.status, 200);
  const capturedToken = exploitSessionRes.data.data.sessionToken;
  const targetSessionId = exploitSessionRes.data.data.session.id;
  
  // 6.2 Confirm the token works while the session is active
  const activeAccessRes = await request('GET', '/api/v1/practice/weakness-pool', null, capturedToken);
  assert.strictEqual(activeAccessRes.status, 200, 'Active impersonation token should work before revocation');
  console.log('   ✓ Captured active impersonation token successfully authenticated request (200)');

  // 6.3 Terminate / Exit the session (updates DB isActive = false)
  const stopSessionRes = await request('POST', '/api/v1/preview/impersonate/stop', {
    sessionId: targetSessionId,
  }, adminToken);
  assert.strictEqual(stopSessionRes.status, 200);
  console.log(`   ✓ Impersonation session ${targetSessionId} stopped and marked inactive in database`);

  // 6.4 Exploit Attempt: Replay a request using the captured token AFTER session was terminated
  const replayedAccessRes = await request('GET', '/api/v1/practice/weakness-pool', null, capturedToken);
  
  // MUST be rejected with 401 Unauthorized because the server validates isActive in the database
  assert.strictEqual(
    replayedAccessRes.status,
    401,
    'Replayed request with terminated impersonation token MUST be rejected with 401 Unauthorized'
  );
  assert.strictEqual(
    replayedAccessRes.data.errorCode,
    'IMPERSONATION_SESSION_REVOKED',
    'Error code must indicate session revocation'
  );
  console.log('   ✓ Exploit blocked: Replayed request with revoked token was strictly rejected with 401 (IMPERSONATION_SESSION_REVOKED)');

  // 6.5 Also verify for Preview Profile Session revocation
  const exploitPreviewRes = await request('POST', '/api/v1/preview/start', {
    preset: 'FREE',
  }, teacherToken);
  assert.strictEqual(exploitPreviewRes.status, 200);
  const capturedPreviewToken = exploitPreviewRes.data.data.sessionToken;
  const targetPreviewSessionId = exploitPreviewRes.data.data.session.id;

  // Stop preview session
  await request('POST', '/api/v1/preview/stop', { sessionId: targetPreviewSessionId }, teacherToken);

  // Replay request with revoked preview token
  const replayedPreviewRes = await request('GET', '/api/v1/practice/weakness-pool', null, capturedPreviewToken);
  assert.strictEqual(replayedPreviewRes.status, 401, 'Replayed preview token MUST be rejected with 401');
  assert.strictEqual(replayedPreviewRes.data.errorCode, 'IMPERSONATION_SESSION_REVOKED');
  console.log('   ✓ Exploit blocked: Replayed preview session token was strictly rejected with 401 (IMPERSONATION_SESSION_REVOKED)\n');

  console.log('================================================================');
  console.log('  ✅ ALL PHASE 10 MASTER INTEGRATION TESTS PASSED (100%)');
  console.log('================================================================\n');
}

runPhase10MasterTests().catch((err) => {
  console.error('\n❌ Phase 10 Master Test Suite Failed:', err);
  process.exit(1);
});
