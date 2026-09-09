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
const { JWT_SECRET } = require('../apps/api/src/middleware/auth.ts');
const { errorHandler } = require('../apps/api/src/middleware/error.ts');
const { PERMISSIONS } = require('../packages/permissions/src/index.ts');
const i18nRoutes = require('../apps/api/src/routes/i18n.routes.ts').default;

console.log('================================================================');
console.log(' EXAMOS I18N LANGUAGE LIFECYCLE (TOGGLE / DELETE) TEST SUITE');
console.log(' Guards, Active Filter, Cascade Delete & User Preference Reset');
console.log('================================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function pass(desc) {
    passed++;
    console.log(`  [PASS] ${desc}`);
  }

  // 1. Setup in-memory PGlite DB
  console.log('1. Initializing isolated in-memory test database...');
  total++;
  const memDb = new PGlite();
  setTestDb(memDb);

  await memDb.exec(`
    CREATE TABLE IF NOT EXISTS "languages" (
      "id" TEXT PRIMARY KEY,
      "code" TEXT UNIQUE NOT NULL,
      "name" TEXT NOT NULL,
      "nativeName" TEXT NOT NULL,
      "isRTL" BOOLEAN NOT NULL DEFAULT false,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "translation_keys" (
      "id" TEXT PRIMARY KEY,
      "key" TEXT UNIQUE NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'general',
      "module" TEXT NOT NULL DEFAULT 'common',
      "description" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "translations" (
      "id" TEXT PRIMARY KEY,
      "languageId" TEXT NOT NULL REFERENCES "languages"("id") ON DELETE CASCADE,
      "translationKeyId" TEXT NOT NULL REFERENCES "translation_keys"("id") ON DELETE CASCADE,
      "value" TEXT NOT NULL,
      "isVerified" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("languageId", "translationKeyId")
    );

    CREATE TABLE IF NOT EXISTS "user_preferences" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "themeMode" TEXT NOT NULL DEFAULT 'DARK',
      "languageCode" TEXT NOT NULL DEFAULT 'en',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT,
      "action" TEXT NOT NULL,
      "resource" TEXT NOT NULL,
      "resourceId" TEXT,
      "details" TEXT,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed baseline test data
  await memDb.query(`
    INSERT INTO "languages" ("id", "code", "name", "nativeName", "isActive", "isDefault") VALUES
      ('lang_en', 'en', 'English', 'English', true, true),
      ('lang_fr', 'fr', 'French', 'Français', true, false),
      ('lang_de', 'de', 'German', 'Deutsch', true, false),
      ('lang_custom_def', 'custom-def', 'Custom Default', 'Custom', true, true)
  `);

  await memDb.query(`
    INSERT INTO "translation_keys" ("id", "key", "description", "module") VALUES
      ('tk_welcome', 'welcome', 'Welcome banner', 'common'),
      ('tk_goodbye', 'goodbye', 'Goodbye message', 'common')
  `);

  await memDb.query(`
    INSERT INTO "translations" ("id", "languageId", "translationKeyId", "value", "isVerified") VALUES
      ('tr_en_1', 'lang_en', 'tk_welcome', 'Welcome', true),
      ('tr_en_2', 'lang_en', 'tk_goodbye', 'Goodbye', true),
      ('tr_fr_1', 'lang_fr', 'tk_welcome', 'Bienvenue', true),
      ('tr_fr_2', 'lang_fr', 'tk_goodbye', 'Au revoir', true),
      ('tr_de_1', 'lang_de', 'tk_welcome', 'Willkommen', true)
  `);

  await memDb.query(`
    INSERT INTO "user_preferences" ("id", "userId", "languageCode") VALUES
      ('pref_user_1', 'user_1', 'fr'),
      ('pref_user_2', 'user_2', 'en')
  `);

  pass('Isolated database schema and initial seed data created');

  // 2. Setup JWT tokens
  const adminToken = jwt.sign(
    { userId: 'admin_1', email: 'admin@examos.com', role: 'SUPER_ADMIN', permissions: [PERMISSIONS.I18N_MANAGE] },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const studentToken = jwt.sign(
    { userId: 'student_1', email: 'student@examos.com', role: 'STUDENT', permissions: [] },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 3. Mount ephemeral test server
  const app = express();
  app.use(express.json());
  app.use('/api/v1/i18n', i18nRoutes);
  app.use(errorHandler);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1/i18n`;

  try {
    // ------------------------------------------------------------------------
    // Step 2: Test safeguards on 'en' and default languages
    // ------------------------------------------------------------------------
    console.log('\n2. Testing safeguards against disabling and deleting default languages...');

    // 2a. Reject disabling 'en'
    total++;
    const resDisableEn = await fetch(`${baseUrl}/languages/en/toggle-active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resDisableEn.status, 400, 'Disabling en must return 400');
    const bodyDisableEn = await resDisableEn.json();
    assert.strictEqual(bodyDisableEn.errorCode, 'CANNOT_DISABLE_DEFAULT_LANGUAGE');
    pass('PATCH /languages/en/toggle-active rejected with CANNOT_DISABLE_DEFAULT_LANGUAGE');

    // 2b. Reject deleting 'en'
    total++;
    const resDeleteEn = await fetch(`${baseUrl}/languages/en`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resDeleteEn.status, 400, 'Deleting en must return 400');
    const bodyDeleteEn = await resDeleteEn.json();
    assert.strictEqual(bodyDeleteEn.errorCode, 'CANNOT_DELETE_DEFAULT_LANGUAGE');
    pass('DELETE /languages/en rejected with CANNOT_DELETE_DEFAULT_LANGUAGE');

    // 2c. Reject disabling custom language with isDefault: true
    total++;
    const resDisableDef = await fetch(`${baseUrl}/languages/custom-def/toggle-active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resDisableDef.status, 400, 'Disabling isDefault language must return 400');
    const bodyDisableDef = await resDisableDef.json();
    assert.strictEqual(bodyDisableDef.errorCode, 'CANNOT_DISABLE_DEFAULT_LANGUAGE');
    pass('PATCH /languages/:code/toggle-active on isDefault language rejected with CANNOT_DISABLE_DEFAULT_LANGUAGE');

    // 2d. Reject deleting custom language with isDefault: true
    total++;
    const resDeleteDef = await fetch(`${baseUrl}/languages/custom-def`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resDeleteDef.status, 400, 'Deleting isDefault language must return 400');
    const bodyDeleteDef = await resDeleteDef.json();
    assert.strictEqual(bodyDeleteDef.errorCode, 'CANNOT_DELETE_DEFAULT_LANGUAGE');
    pass('DELETE /languages/:code on isDefault language rejected with CANNOT_DELETE_DEFAULT_LANGUAGE');

    // ------------------------------------------------------------------------
    // Step 3: Test authorization & permission requirements
    // ------------------------------------------------------------------------
    console.log('\n3. Testing authorization & atomic permission requirements...');

    // 3a. Unauthenticated toggle rejected
    total++;
    const resNoAuthToggle = await fetch(`${baseUrl}/languages/fr/toggle-active`, { method: 'PATCH' });
    assert.strictEqual(resNoAuthToggle.status, 401, 'Unauthenticated toggle must return 401');
    pass('PATCH /languages/:code/toggle-active requires authentication (401)');

    // 3b. Unauthenticated delete rejected
    total++;
    const resNoAuthDelete = await fetch(`${baseUrl}/languages/fr`, { method: 'DELETE' });
    assert.strictEqual(resNoAuthDelete.status, 401, 'Unauthenticated delete must return 401');
    pass('DELETE /languages/:code requires authentication (401)');

    // 3c. Forbidden toggle without I18N_MANAGE
    total++;
    const resForbiddenToggle = await fetch(`${baseUrl}/languages/fr/toggle-active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(resForbiddenToggle.status, 403, 'Toggle without permission must return 403');
    pass('PATCH /languages/:code/toggle-active requires I18N_MANAGE permission (403)');

    // 3d. Forbidden delete without I18N_MANAGE
    total++;
    const resForbiddenDelete = await fetch(`${baseUrl}/languages/fr`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(resForbiddenDelete.status, 403, 'Delete without permission must return 403');
    pass('DELETE /languages/:code requires I18N_MANAGE permission (403)');

    // ------------------------------------------------------------------------
    // Step 4: Toggle Active: Disable non-default language
    // ------------------------------------------------------------------------
    console.log('\n4. Testing toggling non-default language to inactive...');
    total++;
    const resToggleFr = await fetch(`${baseUrl}/languages/fr/toggle-active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resToggleFr.status, 200, 'Disabling French must return 200 OK');
    const bodyToggleFr = await resToggleFr.json();
    assert.strictEqual(bodyToggleFr.success, true);
    assert.strictEqual(bodyToggleFr.data?.code, 'fr');
    assert.strictEqual(bodyToggleFr.data?.isActive, false);

    const dbFrCheck = await memDb.query(`SELECT "isActive" FROM "languages" WHERE "code" = 'fr'`);
    assert.strictEqual(dbFrCheck.rows[0].isActive, false);
    pass('French toggled to inactive (isActive: false in DB)');

    // ------------------------------------------------------------------------
    // Step 5: Active-only filtering in GET /languages
    // ------------------------------------------------------------------------
    console.log('\n5. Testing GET /languages with ?activeOnly=true and unfiltered...');

    // 5a. activeOnly=true should EXCLUDE French
    total++;
    const resActiveOnly = await fetch(`${baseUrl}/languages?activeOnly=true`);
    assert.strictEqual(resActiveOnly.status, 200);
    const bodyActiveOnly = await resActiveOnly.json();
    assert.strictEqual(bodyActiveOnly.success, true);
    const activeCodes = bodyActiveOnly.data.map((l) => l.code);
    assert.ok(!activeCodes.includes('fr'), 'Inactive language "fr" must NOT be in activeOnly results');
    assert.ok(activeCodes.includes('en'), 'Default language "en" must be in activeOnly results');
    assert.ok(activeCodes.includes('de'), 'Active language "de" must be in activeOnly results');
    pass('GET /languages?activeOnly=true excludes inactive language "fr"');

    // 5b. Unfiltered (admin view) should INCLUDE French with isActive: false
    total++;
    const resAll = await fetch(`${baseUrl}/languages`);
    assert.strictEqual(resAll.status, 200);
    const bodyAll = await resAll.json();
    assert.strictEqual(bodyAll.success, true);
    const allLangs = bodyAll.data;
    const frEntry = allLangs.find((l) => l.code === 'fr');
    assert.ok(frEntry, 'French must be present in unfiltered language list');
    assert.strictEqual(frEntry.isActive, false, 'French must have isActive: false');
    pass('Unfiltered GET /languages includes inactive language "fr" with isActive: false');

    // ------------------------------------------------------------------------
    // Step 6: Re-enabling language restores it to activeOnly list
    // ------------------------------------------------------------------------
    console.log('\n6. Testing re-enabling language restores active status...');
    total++;
    const resReenableFr = await fetch(`${baseUrl}/languages/fr/toggle-active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resReenableFr.status, 200);
    const bodyReenableFr = await resReenableFr.json();
    assert.strictEqual(bodyReenableFr.data?.isActive, true);

    const resRecheckActive = await fetch(`${baseUrl}/languages?activeOnly=true`);
    const bodyRecheckActive = await resRecheckActive.json();
    const recheckCodes = bodyRecheckActive.data.map((l) => l.code);
    assert.ok(recheckCodes.includes('fr'), 'French must be present in activeOnly after re-enabling');
    pass('Re-enabled French appears back in GET /languages?activeOnly=true');

    // ------------------------------------------------------------------------
    // Step 7: DELETE language: translations cascade & user preference reset
    // ------------------------------------------------------------------------
    console.log('\n7. Testing DELETE language with cascade & user preferences reset...');

    // Check pre-conditions
    const preTrans = await memDb.query(`SELECT COUNT(*)::int AS count FROM "translations" WHERE "languageId" = 'lang_fr'`);
    assert.strictEqual(preTrans.rows[0].count, 2, 'Pre-condition: 2 French translations must exist');
    const prePref = await memDb.query(`SELECT "languageCode" FROM "user_preferences" WHERE "userId" = 'user_1'`);
    assert.strictEqual(prePref.rows[0].languageCode, 'fr', 'Pre-condition: user_1 preference must be "fr"');

    total++;
    const resDeleteFr = await fetch(`${baseUrl}/languages/fr`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resDeleteFr.status, 200, 'DELETE /languages/fr must return 200 OK');
    const bodyDeleteFr = await resDeleteFr.json();
    assert.strictEqual(bodyDeleteFr.success, true);
    pass('DELETE /languages/fr succeeded');

    // Verify DB post-conditions
    total++;
    const postLang = await memDb.query(`SELECT * FROM "languages" WHERE "code" = 'fr'`);
    assert.strictEqual(postLang.rows.length, 0, 'Language "fr" must be completely removed from "languages"');

    const postTrans = await memDb.query(`SELECT COUNT(*)::int AS count FROM "translations" WHERE "languageId" = 'lang_fr'`);
    assert.strictEqual(postTrans.rows[0].count, 0, 'All translations for "fr" must be cascaded and deleted');

    const postPref = await memDb.query(`SELECT "languageCode" FROM "user_preferences" WHERE "userId" = 'user_1'`);
    assert.strictEqual(
      postPref.rows[0].languageCode,
      'en',
      'User preference with deleted language "fr" must be reset to "en"'
    );

    const untouchedPref = await memDb.query(`SELECT "languageCode" FROM "user_preferences" WHERE "userId" = 'user_2'`);
    assert.strictEqual(untouchedPref.rows[0].languageCode, 'en', 'Untouched user preference remains "en"');
    pass('Translations cascaded and user preferences successfully reset from "fr" to "en"');

    // ------------------------------------------------------------------------
    // Step 8: Subsequent GET /languages does not contain deleted language
    // ------------------------------------------------------------------------
    console.log('\n8. Verifying deleted language no longer appears in GET /languages...');
    total++;
    const resPostDeleteAll = await fetch(`${baseUrl}/languages`);
    const bodyPostDeleteAll = await resPostDeleteAll.json();
    const finalCodes = bodyPostDeleteAll.data.map((l) => l.code);
    assert.ok(!finalCodes.includes('fr'), 'Deleted language "fr" must not appear in any language list');
    pass('Confirmed: "fr" completely removed from GET /languages');

    // ------------------------------------------------------------------------
    // Step 9: Audit logging verification
    // ------------------------------------------------------------------------
    console.log('\n9. Verifying audit log records for TOGGLE_ACTIVE and DELETE...');
    total++;
    // Allow brief microtask tick for async res.on('finish') audit log
    await new Promise((r) => setTimeout(r, 100));

    const auditLogs = await memDb.query(`SELECT "action", "resource", "resourceId", "userId" FROM "audit_logs" ORDER BY "createdAt" ASC`);
    const toggleLog = auditLogs.rows.find((l) => l.action === 'TOGGLE_ACTIVE' && l.resourceId === 'fr');
    assert.ok(toggleLog, 'Must have recorded TOGGLE_ACTIVE audit log for "fr"');
    assert.strictEqual(toggleLog.resource, 'language');
    assert.strictEqual(toggleLog.userId, 'admin_1');

    const deleteLog = auditLogs.rows.find((l) => l.action === 'DELETE' && l.resourceId === 'fr');
    assert.ok(deleteLog, 'Must have recorded DELETE audit log for "fr"');
    assert.strictEqual(deleteLog.resource, 'language');
    assert.strictEqual(deleteLog.userId, 'admin_1');
    pass('Audit logs verified: TOGGLE_ACTIVE and DELETE recorded with admin userId and resourceId="fr"');

  } finally {
    server.close();
    setTestDb(null);
  }

  console.log('\n================================================================');
  console.log(` ALL ${passed}/${total} LANGUAGE LIFECYCLE TESTS PASSED!`);
  console.log('================================================================\n');
}

runTests().then(() => {
  setTimeout(() => process.exit(0), 100);
}).catch((err) => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  process.exit(1);
});
