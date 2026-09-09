const assert = require('assert');
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');
const { PGlite } = require('@electric-sql/pglite');

require('ts-node').register({
  transpileOnly: true,
  project: path.resolve(__dirname, '../apps/api/tsconfig.json'),
});
require('tsconfig-paths').register();

const { setTestDb } = require('../packages/database/src/index.ts');
const { JWT_SECRET, authenticate } = require('../apps/api/src/middleware/auth.ts');
const { requirePermission } = require('../apps/api/src/middleware/permission.ts');
const { errorHandler } = require('../apps/api/src/middleware/error.ts');
const { PERMISSIONS } = require('../packages/permissions/src/index.ts');

console.log('================================================================');
console.log(' EXAMOS PERMISSION FRESHNESS & DYNAMIC FALLBACK TEST SUITE');
console.log(' Seamless Role/Permission Updates Without Requiring User Logout');
console.log('================================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function pass(desc) {
    passed++;
    console.log(`  [PASS] ${desc}`);
  }

  // 1. Setup isolated in-memory DB with full RBAC schema
  console.log('1. Setting up isolated in-memory database with RBAC schema...');
  total++;
  const memDb = new PGlite();
  setTestDb(memDb);

  await memDb.exec(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT UNIQUE NOT NULL,
      "firstName" TEXT NOT NULL,
      "lastName" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "roles" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT UNIQUE NOT NULL,
      "description" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "permissions" (
      "id" TEXT PRIMARY KEY,
      "key" TEXT UNIQUE NOT NULL,
      "module" TEXT NOT NULL,
      "description" TEXT
    );

    CREATE TABLE IF NOT EXISTS "role_permissions" (
      "id" TEXT PRIMARY KEY,
      "roleId" TEXT NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
      "permissionId" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "user_roles" (
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "roleId" TEXT NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
      PRIMARY KEY ("userId", "roleId")
    );
  `);

  // 2. Seed initial user, role, and permissions
  const ALICE_ID = 'usr_alice_001';
  const ROLE_EXAM_ADMIN_ID = 'role_exam_admin_001';

  await memDb.query(`
    INSERT INTO "users" ("id", "email", "firstName", "lastName")
    VALUES ($1, 'alice@examos.com', 'Alice', 'Admin')
  `, [ALICE_ID]);

  await memDb.query(`
    INSERT INTO "roles" ("id", "name", "description")
    VALUES ($1, 'EXAM_ADMIN', 'Exam Administrator Role')
  `, [ROLE_EXAM_ADMIN_ID]);

  await memDb.query(`
    INSERT INTO "user_roles" ("userId", "roleId")
    VALUES ($1, $2)
  `, [ALICE_ID, ROLE_EXAM_ADMIN_ID]);

  // Seed permissions table
  await memDb.query(`
    INSERT INTO "permissions" ("id", "key", "module", "description") VALUES
      ('perm_exams_read', 'exams.read', 'exams', 'Read exams'),
      ('perm_exams_create', 'exams.create', 'exams', 'Create exams'),
      ('perm_i18n_manage', 'i18n.manage', 'i18n', 'Manage system i18n'),
      ('perm_system_maint', 'system.maintenance', 'system', 'Maintenance mode')
  `);

  // Grant ONLY exams.read to role_exam_admin initially
  await memDb.query(`
    INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
    VALUES ('rp_1', $1, 'perm_exams_read')
  `, [ROLE_EXAM_ADMIN_ID]);

  pass('RBAC schema and initial user/role seeded (only exams.read granted)');

  // 3. Issue a JWT token with ONLY ['exams.read'] (missing 'i18n.manage')
  console.log('\n2. Issuing JWT access token for Alice containing only "exams.read"...');
  total++;
  const aliceToken = jwt.sign(
    {
      sub: ALICE_ID,
      email: 'alice@examos.com',
      roles: ['EXAM_ADMIN'],
      permissions: [PERMISSIONS.EXAMS_READ], // Deliberately missing i18n.manage!
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  pass('Alice token issued with stale/limited permissions array: ["exams.read"]');

  // 4. Create express test server with protected endpoints
  const app = express();
  app.use(express.json());

  app.get('/api/test/exams', authenticate, requirePermission(PERMISSIONS.EXAMS_READ), (req, res) => {
    res.json({ success: true, message: 'Exams list retrieved', user: req.user });
  });

  app.post('/api/test/i18n/seed', authenticate, requirePermission(PERMISSIONS.I18N_MANAGE), (req, res) => {
    res.json({ success: true, message: 'I18n seeded successfully', permissions: req.user.permissions });
  });

  app.post('/api/test/maintenance', authenticate, requirePermission(PERMISSIONS.SYSTEM_MAINTENANCE), (req, res) => {
    res.json({ success: true, message: 'Maintenance triggered', permissions: req.user.permissions });
  });

  app.delete('/api/test/users/:id', authenticate, requirePermission(PERMISSIONS.USERS_DELETE), (req, res) => {
    res.json({ success: true, message: 'User deleted' });
  });

  app.use(errorHandler);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/test`;

  try {
    // ------------------------------------------------------------------------
    // Step 1: Fast path — Endpoint requiring exams.read succeeds
    // ------------------------------------------------------------------------
    console.log('\n3. Testing fast path with existing token permission...');
    total++;
    const resExams = await fetch(`${baseUrl}/exams`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    assert.strictEqual(resExams.status, 200);
    const bodyExams = await resExams.json();
    assert.strictEqual(bodyExams.success, true);
    pass('Fast path succeeded immediately: GET /exams returns 200 OK');

    // ------------------------------------------------------------------------
    // Step 2: Stale token attempt — Endpoint requiring i18n.manage is initially rejected
    // ------------------------------------------------------------------------
    console.log('\n4. Testing initial attempt on /i18n/seed before permission added...');
    total++;
    const resInitialI18n = await fetch(`${baseUrl}/i18n/seed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    assert.strictEqual(resInitialI18n.status, 403, 'Must return 403 before permission is added');
    const bodyInitialI18n = await resInitialI18n.json();
    assert.strictEqual(bodyInitialI18n.errorCode, 'PERMISSION_DENIED');
    pass('POST /i18n/seed properly rejected with 403 PERMISSION_DENIED (not granted yet in DB or token)');

    // ------------------------------------------------------------------------
    // Step 3: Admin adds i18n.manage to Alice\'s role in the database
    // ------------------------------------------------------------------------
    console.log('\n5. Adding "i18n.manage" to Alice\'s role (EXAM_ADMIN) in PostgreSQL...');
    total++;
    await memDb.query(`
      INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
      VALUES ('rp_2', $1, 'perm_i18n_manage')
    `, [ROLE_EXAM_ADMIN_ID]);
    pass('New permission "i18n.manage" successfully persisted to role_permissions in DB');

    // ------------------------------------------------------------------------
    // Step 4: Permission Freshness: Alice calls /i18n/seed with the SAME OLD token!
    // NO LOGOUT, NO RE-LOGIN, NO NEW TOKEN
    // ------------------------------------------------------------------------
    console.log('\n6. Testing dynamic permission freshness with the EXACT SAME stale token...');
    total++;
    const resFreshI18n = await fetch(`${baseUrl}/i18n/seed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceToken}` }, // Still using the same aliceToken!
    });
    assert.strictEqual(
      resFreshI18n.status,
      200,
      `Expected 200 OK after permission was added to role in DB, got ${resFreshI18n.status}`
    );
    const bodyFreshI18n = await resFreshI18n.json();
    assert.strictEqual(bodyFreshI18n.success, true);
    assert.ok(
      bodyFreshI18n.permissions.includes(PERMISSIONS.I18N_MANAGE),
      'Refreshed permissions on req.user must include newly added i18n.manage'
    );
    pass('PERMISSION FRESHNESS RESOLVED: Stale token succeeded (200 OK) without requiring logout!');

    // ------------------------------------------------------------------------
    // Step 5: Test dynamic role addition in DB
    // ------------------------------------------------------------------------
    console.log('\n7. Testing new role assignment to user in DB without logout...');
    total++;
    const ROLE_MAINT_ID = 'role_maint_001';
    await memDb.query(`
      INSERT INTO "roles" ("id", "name", "description")
      VALUES ($1, 'MAINTENANCE_TECH', 'Maintenance Tech')
    `, [ROLE_MAINT_ID]);

    await memDb.query(`
      INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
      VALUES ('rp_3', $1, 'perm_system_maint')
    `, [ROLE_MAINT_ID]);

    // Assign new role to Alice in DB
    await memDb.query(`
      INSERT INTO "user_roles" ("userId", "roleId")
      VALUES ($1, $2)
    `, [ALICE_ID, ROLE_MAINT_ID]);

    // Alice calls maintenance endpoint using her ORIGINAL token
    const resMaint = await fetch(`${baseUrl}/maintenance`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    assert.strictEqual(resMaint.status, 200, 'Endpoint must succeed when new role is assigned in DB');
    const bodyMaint = await resMaint.json();
    assert.strictEqual(bodyMaint.success, true);
    assert.ok(bodyMaint.permissions.includes(PERMISSIONS.SYSTEM_MAINTENANCE));
    pass('ROLE FRESHNESS RESOLVED: Newly assigned role permissions picked up dynamically without logout');

    // ------------------------------------------------------------------------
    // Step 6: Negative verification — Still blocks truly ungranted permissions
    // ------------------------------------------------------------------------
    console.log('\n8. Verifying ungranted permissions are still strictly denied (403)...');
    total++;
    const resDelete = await fetch(`${baseUrl}/users/123`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    assert.strictEqual(resDelete.status, 403);
    const bodyDelete = await resDelete.json();
    assert.strictEqual(bodyDelete.errorCode, 'PERMISSION_DENIED');
    pass('Truly ungranted permissions (users.delete) remain securely blocked with 403 PERMISSION_DENIED');

    // ------------------------------------------------------------------------
    // Step 7: Unauthenticated requests still return 401
    // ------------------------------------------------------------------------
    console.log('\n9. Verifying unauthenticated requests return 401...');
    total++;
    const resNoAuth = await fetch(`${baseUrl}/exams`);
    assert.strictEqual(resNoAuth.status, 401);
    const bodyNoAuth = await resNoAuth.json();
    assert.strictEqual(bodyNoAuth.errorCode, 'AUTH_REQUIRED');
    pass('Unauthenticated requests rejected with 401 AUTH_REQUIRED');

  } finally {
    server.close();
    setTestDb(null);
  }

  console.log('\n================================================================');
  console.log(` ALL ${passed}/${total} PERMISSION FRESHNESS TESTS PASSED!`);
  console.log('================================================================\n');
}

runTests().then(() => {
  setTimeout(() => process.exit(0), 100);
}).catch((err) => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  process.exit(1);
});
