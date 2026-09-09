const assert = require('assert');
const path = require('path');
const http = require('http');
const express = require('express');
const { PGlite } = require('@electric-sql/pglite');

require('ts-node').register({
  transpileOnly: true,
  project: path.resolve(__dirname, '../apps/api/tsconfig.json'),
});
require('tsconfig-paths').register();

const { setTestDb } = require('../packages/database/src/index.ts');
const { BASELINE_LANGUAGES } = require('../packages/types/src/index.ts');
const { ensureLanguagesSeeded } = require('../apps/api/src/db/init-v2-tables.ts');
const i18nRoutes = require('../apps/api/src/routes/i18n.routes.ts').default;

console.log('================================================================');
console.log(' EXAMOS LANGUAGE-LIST CONSISTENCY & SELF-HEALING INTEGRATION TEST');
console.log('================================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function pass(desc) {
    passed++;
    console.log(`  [PASS] ${desc}`);
  }

  // --------------------------------------------------------------------------
  // Step 1: Initialize isolated in-memory DB with only 2 languages
  // --------------------------------------------------------------------------
  console.log('1. Setting up simulated stale database with only 2 languages...');
  total++;
  const memDb = new PGlite();
  setTestDb(memDb);

  // Create schema
  await memDb.exec(`
    CREATE TABLE "languages" (
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

    CREATE TABLE "translation_keys" (
      "id" TEXT PRIMARY KEY,
      "key" TEXT UNIQUE NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'general',
      "module" TEXT NOT NULL DEFAULT 'common',
      "description" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "translations" (
      "id" TEXT PRIMARY KEY,
      "languageId" TEXT NOT NULL REFERENCES "languages"("id") ON DELETE CASCADE,
      "translationKeyId" TEXT NOT NULL REFERENCES "translation_keys"("id") ON DELETE CASCADE,
      "value" TEXT NOT NULL,
      "isVerified" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("languageId", "translationKeyId")
    );
  `);

  // Seed ONLY 2 languages: 'en' and 'hi'
  await memDb.query(
    `INSERT INTO "languages" ("id", "code", "name", "nativeName", "isDefault") VALUES
     ('lang_en', 'en', 'English', 'English', true),
     ('lang_hi', 'hi', 'Hindi', 'हिन्दी', false)`
  );

  // Seed 1 translation key
  await memDb.query(
    `INSERT INTO "translation_keys" ("id", "key", "description", "module") VALUES
     ('tk_welcome', 'welcome', 'Welcome banner', 'common')`
  );

  // Seed 1 pre-existing custom translation for Hindi
  const CUSTOM_HINDI_VAL = 'PRE_EXISTING_CUSTOM_HINDI_TRANSLATION_DO_NOT_OVERWRITE';
  await memDb.query(
    `INSERT INTO "translations" ("id", "languageId", "translationKeyId", "value", "isVerified") VALUES
     ('tr_hi_welcome_custom', 'lang_hi', 'tk_welcome', $1, true)`,
    [CUSTOM_HINDI_VAL]
  );

  // Verify initial state: exactly 2 languages exist
  const initialLangs = await memDb.query(`SELECT "code" FROM "languages"`);
  assert.strictEqual(initialLangs.rows.length, 2, 'Initial database must have exactly 2 languages');
  pass(`Stale DB setup confirmed: exactly 2 languages ('en', 'hi') and 1 pre-existing translation`);

  // --------------------------------------------------------------------------
  // Step 2: Run ensureLanguagesSeeded() to trigger self-healing
  // --------------------------------------------------------------------------
  console.log('\n2. Executing ensureLanguagesSeeded(memDb)...');
  total++;
  await ensureLanguagesSeeded(memDb);
  pass('ensureLanguagesSeeded(memDb) completed execution');

  // --------------------------------------------------------------------------
  // Step 3: Assert all 23 baseline languages are now present in DB
  // --------------------------------------------------------------------------
  console.log('\n3. Verifying all 23 baseline languages are now present in DB...');
  total++;
  const healedLangs = await memDb.query(`SELECT "code", "name", "nativeName" FROM "languages" ORDER BY "code"`);
  assert.strictEqual(
    healedLangs.rows.length,
    BASELINE_LANGUAGES.length,
    `Expected exactly ${BASELINE_LANGUAGES.length} languages, found ${healedLangs.rows.length}`
  );

  for (const expected of BASELINE_LANGUAGES) {
    const found = healedLangs.rows.find((l) => l.code === expected.code);
    assert.ok(found, `Expected language code "${expected.code}" (${expected.name}) to be present`);
  }
  pass(`All ${BASELINE_LANGUAGES.length} baseline languages present in DB with correct codes and metadata`);

  // --------------------------------------------------------------------------
  // Step 4: Assert pre-existing translation was NOT overwritten or corrupted
  // --------------------------------------------------------------------------
  console.log('\n4. Verifying pre-existing translation was NOT overwritten or corrupted...');
  total++;
  const hindiTransCheck = await memDb.query(
    `SELECT "value", "isVerified" FROM "translations" WHERE "languageId" = 'lang_hi' AND "translationKeyId" = 'tk_welcome'`
  );
  assert.strictEqual(hindiTransCheck.rows.length, 1, 'Hindi welcome translation must exist');
  assert.strictEqual(
    hindiTransCheck.rows[0].value,
    CUSTOM_HINDI_VAL,
    'Custom Hindi translation value must remain uncorrupted and NOT overwritten'
  );
  pass(`Pre-existing translation preserved intact: "${hindiTransCheck.rows[0].value}"`);

  // --------------------------------------------------------------------------
  // Step 5: Assert idempotency — running ensureLanguagesSeeded() a second time is a no-op
  // --------------------------------------------------------------------------
  console.log('\n5. Verifying idempotency on secondary run of ensureLanguagesSeeded(memDb)...');
  total++;
  await ensureLanguagesSeeded(memDb);

  const secondRunLangs = await memDb.query(`SELECT COUNT(*)::int AS count FROM "languages"`);
  assert.strictEqual(
    secondRunLangs.rows[0].count,
    23,
    'Row count must remain exactly 23 on second run'
  );

  const secondRunCustom = await memDb.query(
    `SELECT "value" FROM "translations" WHERE "languageId" = 'lang_hi' AND "translationKeyId" = 'tk_welcome'`
  );
  assert.strictEqual(
    secondRunCustom.rows[0].value,
    CUSTOM_HINDI_VAL,
    'Pre-existing translation must still be preserved after second run'
  );
  pass(`Idempotency verified: exactly 23 languages preserved, 0 duplicates, pre-existing translations unchanged`);

  // --------------------------------------------------------------------------
  // Step 6: Assert GET /i18n/languages endpoint returns 23 items
  // --------------------------------------------------------------------------
  console.log('\n6. Verifying GET /i18n/languages endpoint returns exactly 23 items...');
  total++;

  // Mount i18n router on an ephemeral express test server
  const testApp = express();
  testApp.use('/api/v1/i18n', i18nRoutes);
  testApp.use('/i18n', i18nRoutes);

  await new Promise((resolve, reject) => {
    const server = testApp.listen(0, async () => {
      try {
        const port = server.address().port;
        const res = await fetch(`http://localhost:${port}/i18n/languages`);
        assert.strictEqual(res.status, 200, 'GET /i18n/languages must return 200 OK');

        const body = await res.json();
        assert.strictEqual(body.success, true, 'Response must have success: true');
        assert.ok(Array.isArray(body.data), 'Response data must be an array');
        assert.strictEqual(
          body.data.length,
          23,
          `Expected 23 languages returned from GET /i18n/languages, received ${body.data.length}`
        );

        // Verify some specific language codes are present in the endpoint payload
        const codes = body.data.map((l) => l.code);
        for (const expectedCode of ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'ur', 'gu', 'kn', 'ml', 'or', 'pa', 'as', 'ma', 'sa', 'ks', 'ne', 'sd', 'br', 'doi', 'mni', 'sat', 'lus']) {
          assert.ok(codes.includes(expectedCode), `Expected code ${expectedCode} in endpoint response`);
        }

        server.close(() => resolve());
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });

  pass('GET /i18n/languages returned exactly 23 baseline languages');

  // --------------------------------------------------------------------------
  // Step 7: Verify shared constant consistency across frontend and backend
  // --------------------------------------------------------------------------
  console.log('\n7. Verifying single source of truth for BASELINE_LANGUAGES...');
  total++;
  assert.strictEqual(BASELINE_LANGUAGES.length, 23, 'Shared BASELINE_LANGUAGES must contain 23 entries');
  const codesSet = new Set(BASELINE_LANGUAGES.map((l) => l.code));
  assert.strictEqual(codesSet.size, 23, 'All 23 codes in BASELINE_LANGUAGES must be unique');
  pass('Single source of truth confirmed: 23 unique baseline languages exported from @repo/types');

  setTestDb(null);

  console.log('\n================================================================');
  console.log(` ALL ${passed}/${total} LANGUAGE CONSISTENCY & SELF-HEALING TESTS PASSED!`);
  console.log('================================================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  process.exit(1);
});
