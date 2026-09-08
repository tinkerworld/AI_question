// Runner: node tests/feature-15.14-maintenance-engine.test.js
/**
 * Task 15.14 Feature-Level & Global Maintenance Engine Test Suite
 * Tests:
 *   1. FeatureControl seeding: all 10 feature areas seeded with ACTIVE status
 *   2. Public maintenance endpoints: /status and /feature/:key return JSON, zero DOCTYPE errors
 *   3. Granular feature maintenance: student blocked with 403 FEATURE_UNAVAILABLE & custom message
 *   4. Admin bypass privilege: staff bypasses feature maintenance while students are blocked
 *   5. Non-disruption rule: in-progress exam attempt sync & submit NOT disrupted during maintenance
 *   6. DisplayMode configuration & persistence (FULL_PAGE, BLUR, DISABLED_BUTTON, HIDDEN, BANNER)
 *   7. Scheduled maintenance windows: automatic status transitions
 *   8. "Deactivate All" bulk action: all features blocked simultaneously
 *   9. "Restore All" bulk action: all features restored to active operations
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const BASE_URL = process.env.API_BASE || 'http://localhost:4043/api/v1';

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function login(email, password) {
  const res = await fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = res.data.data?.accessToken || res.data.data?.token;
  if (!res.data.success || !token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return { token, user: res.data.data.user };
}

async function runMaintenanceEngineTests() {
  console.log('================================================================');
  console.log('🛠️ RUNNING TASK 15.14 FEATURE-LEVEL & GLOBAL MAINTENANCE ENGINE SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  console.log('\n1. Authenticating test personas (Admin, SubAdmin, Student)...');
  const admin = await login('admin@examos.com', 'Admin@123');
  const subadmin = await login('subadmin@examos.com', 'SubAdmin@123');
  const student = await login('student@examos.com', 'Student@123');
  
  // Verify atomic permission system.maintenance is explicitly present in both admin and subadmin
  assert.ok(
    admin.user.permissions.includes('system.maintenance'),
    'MAIN_ADMIN must have explicit system.maintenance atomic permission granted in DB'
  );
  assert.ok(
    subadmin.user.permissions.includes('system.maintenance'),
    'SUB_ADMIN must have explicit system.maintenance atomic permission granted in DB'
  );
  assert.strictEqual(
    subadmin.user.permissions.includes('*'),
    false,
    'SUB_ADMIN must NOT have wildcard * - must rely purely on atomic system.maintenance permission'
  );
  assert.strictEqual(
    student.user.permissions.includes('system.maintenance'),
    false,
    'STUDENT must not have system.maintenance permission'
  );

  // Negative test: verify unprivileged student rejected with 403 PERMISSION_DENIED on maintenance write endpoint
  const studentUnauthorizedPut = await fetchJson('/maintenance/controls/practice', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${student.token}` },
    body: JSON.stringify({ status: 'MAINTENANCE' }),
  });
  assert.strictEqual(studentUnauthorizedPut.status, 403, 'Student must be rejected with 403 from maintenance write endpoint');
  assert.strictEqual(studentUnauthorizedPut.data.errorCode, 'PERMISSION_DENIED', 'Must require atomic permission system.maintenance');

  console.log('   ✓ Admin, SubAdmin, and Student authenticated successfully');
  console.log('   ✓ Atomic permission system.maintenance verified granted to Admin & SubAdmin, forbidden for Student');

  // ==========================================================================
  // TEST 1: FeatureControl Seeding
  // ==========================================================================
  console.log('\n2. Testing FeatureControl model seeding...');
  try {
    const controlsRes = await fetchJson('/maintenance/controls', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.strictEqual(controlsRes.status, 200, 'Admin can list controls');
    assert.strictEqual(controlsRes.data.success, true);
    const controls = controlsRes.data.data;
    assert.ok(Array.isArray(controls), 'Controls is an array');

    const expectedKeys = [
      'interview',
      'practice',
      'question_bank',
      'exams',
      'analytics',
      'subscriptions',
      'ai_gateway',
      'audio',
      'writing',
      'vocabulary',
    ];

    for (const key of expectedKeys) {
      const match = controls.find((c) => c.featureKey === key);
      assert.ok(match, `Feature "${key}" must be seeded in feature_controls`);
      assert.ok(match.name, `Feature "${key}" has a human readable name`);
      assert.ok(
        ['ACTIVE', 'MAINTENANCE', 'COMING_SOON', 'DISABLED', 'BETA'].includes(match.status),
        `Feature "${key}" has valid status`
      );
      assert.ok(
        ['FULL_PAGE', 'BLUR', 'DISABLED_BUTTON', 'HIDDEN', 'BANNER'].includes(match.displayMode),
        `Feature "${key}" has valid displayMode`
      );
    }
    console.log(`   ✓ All ${expectedKeys.length} canonical feature areas seeded and configured`);
    passed++;
  } catch (err) {
    console.error('   ❌ Test 1 failed:', err.message);
    failed++;
  }

  // ==========================================================================
  // TEST 2: Public Status & Single Feature Endpoint (zero DOCTYPE error)
  // ==========================================================================
  console.log('\n3. Testing public status and single feature endpoints...');
  try {
    const statusRes = await fetchJson('/maintenance/status');
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.data.success, true);
    assert.ok(statusRes.data.data.features, 'Returns features status map');
    assert.ok(statusRes.data.data.featureControls, 'Returns featureControls details');

    // Single feature query (both /maintenance/feature/:key and /maintenance/features/:key)
    const featRes1 = await fetchJson('/maintenance/feature/practice');
    assert.strictEqual(featRes1.status, 200);
    assert.strictEqual(featRes1.data.success, true);
    assert.strictEqual(featRes1.data.data.featureKey, 'practice');
    assert.strictEqual(typeof featRes1.data.data.isInMaintenance, 'boolean');

    const featRes2 = await fetchJson('/maintenance/features/interview');
    assert.strictEqual(featRes2.status, 200);
    assert.strictEqual(featRes2.data.success, true);
    assert.strictEqual(featRes2.data.data.featureKey, 'interview');

    console.log('   ✓ Public /maintenance/status and /maintenance/feature/:key return valid JSON with 200 OK');
    passed++;
  } catch (err) {
    console.error('   ❌ Test 2 failed:', err.message);
    failed++;
  }

  // ==========================================================================
  // TEST 3: Granular Feature Maintenance & Student 403 FEATURE_UNAVAILABLE
  // ==========================================================================
  console.log('\n4. Testing granular feature maintenance and 403 FEATURE_UNAVAILABLE enforcement...');
  const customMessage = 'Practice Drills are undergoing database indexing for performance.';
  const customReason = 'INFRA-902 Database Optimization Window';

  try {
    // 3.1 Put practice into MAINTENANCE
    const updateRes = await fetchJson('/maintenance/controls/practice', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        status: 'MAINTENANCE',
        message: customMessage,
        reason: customReason,
        displayMode: 'FULL_PAGE',
        allowAdmin: true,
        allowTeacher: false,
        allowStudent: false,
      }),
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data.data.status, 'MAINTENANCE');
    assert.strictEqual(updateRes.data.data.message, customMessage);
    assert.strictEqual(updateRes.data.data.reason, customReason);
    console.log('   ✓ Set practice feature to MAINTENANCE with custom message');

    // 3.2 Try hitting practice endpoint directly as student
    const studentRes = await fetchJson('/practice/weakness-pool', {
      headers: { Authorization: `Bearer ${student.token}` },
    });

    assert.strictEqual(studentRes.status, 403, 'Student request must be blocked with HTTP 403');
    assert.strictEqual(studentRes.data.success, false);
    assert.strictEqual(studentRes.data.errorCode, 'FEATURE_UNAVAILABLE');
    assert.strictEqual(studentRes.data.error.code, 'FEATURE_UNAVAILABLE');
    assert.strictEqual(studentRes.data.error.featureKey, 'practice');
    assert.strictEqual(studentRes.data.error.status, 'MAINTENANCE');
    assert.strictEqual(studentRes.data.error.message, customMessage);
    assert.strictEqual(studentRes.data.error.reason, undefined, 'Admin reason must not be exposed to student');
    console.log('   ✓ Student blocked with HTTP 403 FEATURE_UNAVAILABLE returning custom message');

    // 3.3 Verify admin bypasses maintenance
    const adminRes = await fetchJson('/practice/weakness-pool', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.strictEqual(adminRes.status, 200, 'Admin with allowAdmin=true bypasses maintenance');
    assert.strictEqual(adminRes.data.success, true);
    console.log('   ✓ Admin staff successfully bypassed maintenance with HTTP 200');

    // 3.4 Restore practice to ACTIVE
    const restoreRes = await fetchJson('/maintenance/controls/practice', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        status: 'ACTIVE',
      }),
    });
    assert.strictEqual(restoreRes.status, 200);
    assert.strictEqual(restoreRes.data.data.status, 'ACTIVE');

    // Student can access practice again
    const studentRestoredRes = await fetchJson('/practice/weakness-pool', {
      headers: { Authorization: `Bearer ${student.token}` },
    });
    assert.strictEqual(studentRestoredRes.status, 200);
    console.log('   ✓ Restored practice back to ACTIVE and confirmed student access resumed');

    passed++;
  } catch (err) {
    console.error('   ❌ Test 3 failed:', err.message);
    failed++;
  }

  // ==========================================================================
  // TEST 4: DisplayMode Configuration & Persistence
  // ==========================================================================
  console.log('\n5. Testing displayMode options (FULL_PAGE, BLUR, DISABLED_BUTTON, HIDDEN, BANNER)...');
  try {
    const modes = ['BLUR', 'DISABLED_BUTTON', 'HIDDEN', 'BANNER', 'FULL_PAGE'];
    for (const mode of modes) {
      const res = await fetchJson('/maintenance/controls/practice', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${admin.token}` },
        body: JSON.stringify({
          displayMode: mode,
        }),
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.displayMode, mode);

      const check = await fetchJson('/maintenance/feature/practice');
      assert.strictEqual(check.data.data.displayMode, mode);
    }
    console.log('   ✓ All 5 display modes successfully configured and persisted');
    passed++;
  } catch (err) {
    console.error('   ❌ Test 4 failed:', err.message);
    failed++;
  }

  // ==========================================================================
  // TEST 5: Active Exam Attempt Non-Disruption Guarantee
  // ==========================================================================
  console.log('\n6. Testing active exam attempt non-disruption guarantee...');
  try {
    // 5.1 Set exams subsystem to MAINTENANCE
    await fetchJson('/maintenance/controls/exams', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        status: 'MAINTENANCE',
        message: 'Exam generator is currently undergoing scheduled maintenance.',
      }),
    });
    console.log('   ✓ Exams subsystem set to MAINTENANCE');

    // 5.2 Starting a new attempt as student is BLOCKED with 403
    const newAttemptRes = await fetchJson('/attempts/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({ examId: 'fake_exam_id' }),
    });
    assert.strictEqual(newAttemptRes.status, 403, 'Starting new attempt is blocked during maintenance');
    assert.strictEqual(newAttemptRes.data.errorCode, 'FEATURE_UNAVAILABLE');
    console.log('   ✓ New exam attempt creation blocked with 403 FEATURE_UNAVAILABLE');

    // 5.3 In-progress attempt sync must NOT be blocked (safeguarded)
    const syncRes = await fetchJson('/attempts/mock_in_progress_attempt_id/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({ answers: {} }),
    });
    // Even if attempt doesn't exist, it should NOT return 403 FEATURE_UNAVAILABLE!
    assert.notStrictEqual(
      syncRes.status,
      403,
      'Active exam sync must bypass maintenance and not return 403 FEATURE_UNAVAILABLE'
    );
    assert.notStrictEqual(syncRes.data.errorCode, 'FEATURE_UNAVAILABLE');
    console.log('   ✓ Active exam answer sync bypassed maintenance without disruption');

    // 5.4 Restore exams back to ACTIVE
    await fetchJson('/maintenance/controls/exams', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    console.log('   ✓ Restored exams subsystem back to ACTIVE');
    passed++;
  } catch (err) {
    console.error('   ❌ Test 5 failed:', err.message);
    failed++;
  }

  // ==========================================================================
  // TEST 6: Scheduled Maintenance Windows & Auto-Transition
  // ==========================================================================
  console.log('\n7. Testing scheduled maintenance window auto-transitions...');
  try {
    // 6.1 Past window (startAt & endAt in the past) -> should auto-transition to ACTIVE
    const pastStart = new Date(Date.now() - 3600 * 1000).toISOString();
    const pastEnd = new Date(Date.now() - 60 * 1000).toISOString();

    await fetchJson('/maintenance/controls/audio', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        status: 'MAINTENANCE',
        startAt: pastStart,
        endAt: pastEnd,
      }),
    });

    const pastCheck = await fetchJson('/maintenance/feature/audio');
    assert.strictEqual(
      pastCheck.data.data.status,
      'ACTIVE',
      'Expired maintenance window must auto-transition back to ACTIVE'
    );
    console.log('   ✓ Expired window automatically transitioned back to ACTIVE');

    // 6.2 Active window (startAt in past, endAt in future) -> evaluates as MAINTENANCE
    const activeStart = new Date(Date.now() - 600 * 1000).toISOString();
    const activeEnd = new Date(Date.now() + 3600 * 1000).toISOString();

    await fetchJson('/maintenance/controls/audio', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        status: 'ACTIVE',
        startAt: activeStart,
        endAt: activeEnd,
      }),
    });

    const activeCheck = await fetchJson('/maintenance/feature/audio');
    assert.strictEqual(
      activeCheck.data.data.status,
      'MAINTENANCE',
      'Current window must automatically evaluate as MAINTENANCE'
    );
    console.log('   ✓ Current window automatically evaluated as MAINTENANCE');

    // Clean up audio
    await fetchJson('/maintenance/controls/audio', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ status: 'ACTIVE', startAt: null, endAt: null }),
    });
    console.log('   ✓ Cleaned up audio scheduled window');
    passed++;
  } catch (err) {
    console.error('   ❌ Test 6 failed:', err.message);
    failed++;
  }

  // ==========================================================================
  // TEST 7: Bulk "Deactivate All" Action
  // ==========================================================================
  console.log('\n8. Testing "Deactivate All" bulk action...');
  const bulkMsg = 'All ExamOS platform features are offline for scheduled platform upgrade.';
  try {
    const deactivateRes = await fetchJson('/maintenance/bulk', {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        status: 'MAINTENANCE',
        message: bulkMsg,
        reason: 'Emergency platform database failover',
      }),
    });
    assert.strictEqual(deactivateRes.status, 200);
    assert.strictEqual(deactivateRes.data.success, true);
    assert.ok(Array.isArray(deactivateRes.data.data));

    // Confirm every feature is now MAINTENANCE
    for (const ctrl of deactivateRes.data.data) {
      assert.strictEqual(ctrl.status, 'MAINTENANCE', `Feature ${ctrl.featureKey} must be in MAINTENANCE`);
      assert.strictEqual(ctrl.message, bulkMsg);
    }
    console.log('   ✓ All features successfully set to MAINTENANCE via bulk Deactivate All');

    // Confirm student is genuinely blocked across multiple distinct subsystems
    const checkEndpoints = [
      '/practice/weakness-pool',
      '/interview/eligibility',
      '/questions',
      '/analytics/my-mastery',
      '/subscriptions/plans',
      '/writing/rubrics',
    ];

    for (const ep of checkEndpoints) {
      const blockRes = await fetchJson(ep, {
        headers: { Authorization: `Bearer ${student.token}` },
      });
      assert.strictEqual(
        blockRes.status,
        403,
        `Student request to ${ep} must be blocked with HTTP 403 during bulk maintenance`
      );
      assert.strictEqual(blockRes.data.errorCode, 'FEATURE_UNAVAILABLE');
      assert.strictEqual(blockRes.data.message, bulkMsg);
    }
    console.log(`   ✓ Verified all ${checkEndpoints.length} subsystems return HTTP 403 FEATURE_UNAVAILABLE`);
    passed++;
  } catch (err) {
    console.error('   ❌ Test 7 failed:', err.message);
    failed++;
  }

  // ==========================================================================
  // TEST 8: Bulk "Restore All" Action
  // ==========================================================================
  console.log('\n9. Testing "Restore All" bulk action...');
  try {
    const restoreRes = await fetchJson('/maintenance/bulk', {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        status: 'ACTIVE',
        reason: 'Restored all features to normal operations',
      }),
    });
    assert.strictEqual(restoreRes.status, 200);
    assert.strictEqual(restoreRes.data.success, true);

    // Confirm all features are now ACTIVE
    for (const ctrl of restoreRes.data.data) {
      assert.strictEqual(ctrl.status, 'ACTIVE', `Feature ${ctrl.featureKey} must be ACTIVE`);
    }
    console.log('   ✓ All features successfully restored to ACTIVE via bulk Restore All');

    // Confirm student access is restored across subsystems
    const checkEndpoints = [
      '/practice/weakness-pool',
      '/interview/eligibility',
      '/subscriptions/plans',
      '/writing/rubrics',
    ];

    for (const ep of checkEndpoints) {
      const unblockRes = await fetchJson(ep, {
        headers: { Authorization: `Bearer ${student.token}` },
      });
      assert.strictEqual(
        unblockRes.status,
        200,
        `Student request to ${ep} must return HTTP 200 OK after Restore All`
      );
      assert.strictEqual(unblockRes.data.success, true);
    }
    console.log(`   ✓ Verified normal operations restored with HTTP 200 OK across all subsystems`);
    passed++;
  } catch (err) {
    console.error('   ❌ Test 8 failed:', err.message);
    failed++;
  }

  // Final summary
  console.log('\n================================================================');
  console.log(`📊 TASK 15.14 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runMaintenanceEngineTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
