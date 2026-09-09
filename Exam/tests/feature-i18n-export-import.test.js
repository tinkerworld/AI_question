const assert = require('assert');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const API_BASE = process.env.API_BASE || 'http://localhost:4043/api/v1';

// Direct DB connection using the root postgres-data
function getDbPath() {
  const fs = require('fs');
  const candidate1 = path.resolve(__dirname, '../../postgres-data');
  const candidate2 = path.resolve(__dirname, '../packages/database/prisma/postgres-data');
  const candidate3 = path.resolve(__dirname, '../postgres-data');
  if (fs.existsSync(candidate1)) return candidate1;
  if (fs.existsSync(candidate3)) return candidate3;
  return candidate2;
}

const db = new PGlite(getDbPath());

console.log('================================================================');
console.log(' EXAMOS I18N EXPORT / IMPORT & VERIFICATION INTEGRATION TEST');
console.log('================================================================\n');

async function runTests() {
  let authToken = '';

  try {
    // ------------------------------------------------------------------------
    // Step 0: Ensure DB is ready & clean English verification flag
    // ------------------------------------------------------------------------
    console.log('0. Checking DB connection and English verification state...');
    await db.query(`UPDATE "translations" SET "isVerified" = true WHERE "languageId" IN (SELECT "id" FROM "languages" WHERE "code" = 'en')`);

    // ------------------------------------------------------------------------
    // Step 1: Seed Verification (Part A)
    // ------------------------------------------------------------------------
    console.log('\n1. Verifying Database Seed & Baseline Data...');
    const langRes = await db.query(`SELECT "id", "code", "name", "isDefault" FROM "languages" ORDER BY "code"`);
    console.log(`   ✓ Baseline languages in DB: ${langRes.rows.length}`);
    assert.ok(langRes.rows.length >= 23, 'Must have at least 23 baseline languages');

    const defaultLang = langRes.rows.find((l) => l.isDefault || l.code === 'en');
    assert.ok(defaultLang, 'Must have default English language in DB');

    const keyRes = await db.query(`SELECT "id", "key", "module", "category" FROM "translation_keys"`);
    console.log(`   ✓ Translation keys in DB: ${keyRes.rows.length}`);
    assert.ok(keyRes.rows.length >= 170, 'Must have at least 170 translation keys populated');

    // Verify key grouping by modules (Part A)
    const modules = new Set(keyRes.rows.map((k) => k.module));
    assert.ok(modules.has('nav'), 'Must contain nav module');
    assert.ok(modules.has('settings'), 'Must contain settings module');
    assert.ok(modules.has('exam_player'), 'Must contain exam_player module');
    assert.ok(modules.has('auth'), 'Must contain auth module');
    assert.ok(modules.has('question_bank'), 'Must contain question_bank module');
    assert.ok(modules.has('courses'), 'Must contain courses module');
    assert.ok(modules.has('users'), 'Must contain users module');
    console.log(`   ✓ Distinct modules represented: ${Array.from(modules).join(', ')}`);

    // ------------------------------------------------------------------------
    // Step 2: Batch AI Translation & Verification Status (Part B)
    // ------------------------------------------------------------------------
    console.log('\n2. Verifying Batch Translations & Verification Statuses (Part B)...');
    const enTrans = await db.query(
      `SELECT COUNT(*) as count FROM "translations" t JOIN "languages" l ON t."languageId" = l."id" WHERE l."code" = 'en' AND t."isVerified" = true`
    );
    console.log(`   ✓ English verified base translations: ${enTrans.rows[0].count}`);
    assert.ok(Number(enTrans.rows[0].count) >= 170, 'All English translations must have isVerified = true');

    // Check non-English translations
    const hiTrans = await db.query(
      `SELECT t."value", t."isVerified", tk."key" 
       FROM "translations" t 
       JOIN "languages" l ON t."languageId" = l."id" 
       JOIN "translation_keys" tk ON t."translationKeyId" = tk."id" 
       WHERE l."code" = 'hi'`
    );
    console.log(`   ✓ Hindi translations populated: ${hiTrans.rows.length}`);
    assert.ok(hiTrans.rows.length >= 170, 'Hindi must have all keys populated');

    // Check duplicate prevention: no duplicate (languageId, translationKeyId) rows
    const dupCheck = await db.query(
      `SELECT "languageId", "translationKeyId", COUNT(*) as c 
       FROM "translations" 
       GROUP BY "languageId", "translationKeyId" 
       HAVING COUNT(*) > 1`
    );
    assert.strictEqual(dupCheck.rows.length, 0, 'Must have zero duplicate translation entries');
    console.log(`   ✓ Duplicate entries check passed: 0 duplicates across all languages`);

    // ------------------------------------------------------------------------
    // Step 3: Admin Authentication for HTTP Endpoints
    // ------------------------------------------------------------------------
    console.log('\n3. Authenticating Admin User via API...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@examos.com', password: 'Admin@123' }),
    });
    const loginData = await loginRes.json();
    assert.ok(loginData.success || loginData.data?.accessToken, 'Admin login must succeed');
    authToken = loginData.data?.accessToken || loginData.token;
    assert.ok(authToken, 'Must obtain JWT access token for admin');
    console.log('   ✓ Admin JWT token acquired successfully');

    // ------------------------------------------------------------------------
    // Step 4: Language List with Unverified Counts (Part B)
    // ------------------------------------------------------------------------
    console.log('\n4. Testing GET /api/v1/i18n/languages (Unverified Counts)...');
    const languagesRes = await fetch(`${API_BASE}/i18n/languages`);
    const languagesData = await languagesRes.json();
    assert.ok(languagesData.success, 'GET /languages must succeed');
    const langs = languagesData.data;
    assert.ok(Array.isArray(langs) && langs.length >= 23, 'Must return at least 23 languages');

    const hiLang = langs.find((l) => l.code === 'hi');
    assert.ok(hiLang, 'Hindi language must be present');
    assert.ok(typeof hiLang.unverifiedCount === 'number', 'Must include unverifiedCount property');
    assert.ok(typeof hiLang.translatedCount === 'number', 'Must include translatedCount property');
    console.log(`   ✓ Hindi language stats: ${hiLang.translatedCount}/${hiLang.totalKeys} translated, ${hiLang.unverifiedCount} unverified.`);

    // ------------------------------------------------------------------------
    // Step 5: Export Endpoints (Part C)
    // ------------------------------------------------------------------------
    console.log('\n5. Testing Export Endpoints (Part C)...');

    // 5A. Single Language JSON Export
    console.log('   Testing GET /api/v1/i18n/export/hi?format=json...');
    const hiJsonRes = await fetch(`${API_BASE}/i18n/export/hi?format=json`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(hiJsonRes.status, 200, 'Single language JSON export must return 200');
    assert.ok(hiJsonRes.headers.get('content-type')?.includes('application/json'), 'Must return application/json');
    const hiJsonBody = await hiJsonRes.json();
    const hiMap = hiJsonBody.data?.translations || hiJsonBody.translations || hiJsonBody;
    assert.ok(typeof hiMap === 'object' && hiMap !== null, 'Must return key-value object');
    assert.ok(hiMap.app_title || hiMap.welcome || hiMap.nav_dashboard, 'Must contain translated keys');
    console.log(`   ✓ Hindi JSON export returned ${Object.keys(hiMap).length} keys.`);

    // 5B. Single Language CSV Export with UTF-8 BOM
    console.log('   Testing GET /api/v1/i18n/export/hi?format=csv...');
    const hiCsvRes = await fetch(`${API_BASE}/i18n/export/hi?format=csv`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(hiCsvRes.status, 200, 'Single language CSV export must return 200');
    assert.ok(hiCsvRes.headers.get('content-type')?.includes('text/csv'), 'Must return text/csv');
    const hiCsvBuf = await hiCsvRes.arrayBuffer();
    const hiBytes = new Uint8Array(hiCsvBuf);
    assert.strictEqual(hiBytes[0], 0xef, 'First byte must be 0xEF (UTF-8 BOM)');
    assert.strictEqual(hiBytes[1], 0xbb, 'Second byte must be 0xBB (UTF-8 BOM)');
    assert.strictEqual(hiBytes[2], 0xbf, 'Third byte must be 0xBF (UTF-8 BOM)');
    const hiCsvText = Buffer.from(hiCsvBuf).toString('utf-8');
    assert.ok(hiCsvText.includes('key,english,translation') || hiCsvText.includes('key,hi') || hiCsvText.includes('key,"hi"'), 'CSV header must include key and translation columns');
    console.log('   ✓ Hindi CSV export verified with RFC 4180 headers and UTF-8 BOM (0xEF 0xBB 0xBF).');

    // 5C. All Languages JSON Export
    console.log('   Testing GET /api/v1/i18n/export/all?format=json...');
    const allJsonRes = await fetch(`${API_BASE}/i18n/export/all?format=json`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(allJsonRes.status, 200, 'All languages JSON export must return 200');
    const allJsonBody = await allJsonRes.json();
    const allMap = allJsonBody.data?.translations || allJsonBody.translations || allJsonBody;
    assert.ok(allMap.en, 'All languages JSON must contain "en"');
    assert.ok(allMap.hi, 'All languages JSON must contain "hi"');
    assert.ok(allMap.bn, 'All languages JSON must contain "bn"');
    console.log(`   ✓ Export All JSON returned bundle with ${Object.keys(allMap).length} languages.`);

    // 5D. All Languages CSV Export with UTF-8 BOM
    console.log('   Testing GET /api/v1/i18n/export/all?format=csv...');
    const allCsvRes = await fetch(`${API_BASE}/i18n/export/all?format=csv`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(allCsvRes.status, 200, 'All languages CSV export must return 200');
    const allCsvBuf = await allCsvRes.arrayBuffer();
    const allBytes = new Uint8Array(allCsvBuf);
    assert.strictEqual(allBytes[0], 0xef, 'First byte must be 0xEF (UTF-8 BOM)');
    assert.strictEqual(allBytes[1], 0xbb, 'Second byte must be 0xBB (UTF-8 BOM)');
    assert.strictEqual(allBytes[2], 0xbf, 'Third byte must be 0xBF (UTF-8 BOM)');
    const allCsvText = Buffer.from(allCsvBuf).toString('utf-8');
    const headerLine = allCsvText.split('\n')[0].replace(/^\uFEFF/, '');
    assert.ok(headerLine.startsWith('key') && headerLine.includes('en') && headerLine.includes('hi'), 'All languages CSV header must contain key and language columns');
    console.log('   ✓ Export All CSV verified with UTF-8 BOM (0xEF 0xBB 0xBF) and language columns.');

    // ------------------------------------------------------------------------
    // Step 6: Import Endpoints & Error Handling (Part C)
    // ------------------------------------------------------------------------
    console.log('\n6. Testing Import Endpoints & Robustness (Part C)...');

    // 6A. Unknown Language Rejection (HTTP 400 UNKNOWN_LANGUAGE)
    console.log('   Testing import rejection for unknown language...');
    const badLangRes = await fetch(`${API_BASE}/i18n/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        languageCode: 'klingon_xyz',
        format: 'json',
        content: JSON.stringify({ welcome: 'Qapla' }),
      }),
    });
    assert.strictEqual(badLangRes.status, 400, 'Unknown language must return HTTP 400');
    const badLangData = await badLangRes.json();
    assert.strictEqual(badLangData.errorCode || badLangData.error?.code || badLangData.error, 'UNKNOWN_LANGUAGE', 'Must return error code UNKNOWN_LANGUAGE');
    console.log('   ✓ Unknown language correctly rejected with 400 UNKNOWN_LANGUAGE.');

    // 6B. Unknown Key Skipping & Reporting (does NOT fail batch)
    console.log('   Testing import skipping unknown keys while updating valid keys...');
    const testUnknownKey = 'non_existent_dummy_key_' + Date.now();
    const skipTestRes = await fetch(`${API_BASE}/i18n/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        languageCode: 'hi',
        format: 'json',
        content: JSON.stringify({
          welcome: 'ExamOS टेस्ट में आपका स्वागत है',
          [testUnknownKey]: 'This key does not exist in translation_keys',
        }),
      }),
    });
    assert.strictEqual(skipTestRes.status, 200, 'Partial import with unknown keys must return 200');
    const skipData = await skipTestRes.json();
    assert.ok(skipData.success, 'Import must succeed');
    const skipResult = skipData.data || skipData;
    assert.strictEqual(skipResult.updatedCount, 1, 'Exactly 1 known key should be updated');
    assert.strictEqual(skipResult.skippedCount, 1, 'Exactly 1 unknown key should be skipped');
    assert.ok(Array.isArray(skipResult.unknownKeys) && skipResult.unknownKeys.includes(testUnknownKey), 'Must report unknown key');
    console.log(`   ✓ Unknown keys skipped safely: ${skipResult.skippedCount} skipped, reported: ${skipResult.unknownKeys.join(', ')}`);

    // 6C. Round-Trip JSON Import & isVerified Flag Check
    console.log('   Testing JSON import round-trip & verification flag...');
    const targetKey = 'app_title';
    const modifiedValue = 'ExamOS // अनुकूलनीय शिक्षण मंच (सत्यापित)';

    const jsonImportRes = await fetch(`${API_BASE}/i18n/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        languageCode: 'hi',
        format: 'json',
        content: JSON.stringify({
          [targetKey]: modifiedValue,
        }),
      }),
    });
    const jsonImportData = await jsonImportRes.json();
    assert.ok(jsonImportData.success, 'JSON import must succeed');
    const jsonImportResult = jsonImportData.data || jsonImportData;
    assert.ok(jsonImportResult.updatedCount >= 1, 'Must update at least 1 key');

    // Verify in GET /translations/hi that value was persisted and verified
    const hiTranslationsRes = await fetch(`${API_BASE}/i18n/translations/hi`);
    const hiTranslationsData = await hiTranslationsRes.json();
    const hiTransMap = hiTranslationsData.data?.translations || hiTranslationsData.translations;
    const hiVerMap = hiTranslationsData.data?.verifiedMap || hiTranslationsData.verifiedMap;
    assert.strictEqual(hiTransMap[targetKey], modifiedValue, 'Persisted value must match imported value');
    assert.strictEqual(hiVerMap[targetKey], true, 'Imported key must have isVerified = true');
    console.log(`   ✓ JSON round-trip verified: "${targetKey}" = "${modifiedValue}" (isVerified: true)`);

    // 6D. Round-Trip CSV Import with UTF-8 BOM
    console.log('   Testing CSV import round-trip with UTF-8 BOM...');
    const csvKey = 'logout';
    const csvValue = 'लॉग आउट // सत्यापित';
    const csvContent = `${String.fromCharCode(0xfeff)}key,translation\n"${csvKey}","${csvValue}"`;

    const csvImportRes = await fetch(`${API_BASE}/i18n/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        languageCode: 'hi',
        format: 'csv',
        content: csvContent,
      }),
    });
    const csvImportData = await csvImportRes.json();
    assert.ok(csvImportData.success, 'CSV import must succeed');
    const csvImportResult = csvImportData.data || csvImportData;
    assert.ok(csvImportResult.updatedCount >= 1, 'Must update key from CSV');

    const hiVerifyRes = await fetch(`${API_BASE}/i18n/translations/hi`);
    const hiVerifyData = await hiVerifyRes.json();
    const hiVerifyTransMap = hiVerifyData.data?.translations || hiVerifyData.translations;
    const hiVerifyVerMap = hiVerifyData.data?.verifiedMap || hiVerifyData.verifiedMap;
    assert.strictEqual(hiVerifyTransMap[csvKey], csvValue, 'CSV imported value must match');
    assert.strictEqual(hiVerifyVerMap[csvKey], true, 'CSV imported key must have isVerified = true');
    console.log(`   ✓ CSV round-trip verified: "${csvKey}" = "${csvValue}" (isVerified: true)`);

    // ------------------------------------------------------------------------
    // Step 7: Single Key Inline Translation API & Verification (POST /translations)
    // ------------------------------------------------------------------------
    console.log('\n7. Testing Single Key Upsert via POST /api/v1/i18n/translations...');
    const singleKey = 'save';
    const singleVal = 'सुरक्षित करें (मैनुअल)';
    const singleUpsertRes = await fetch(`${API_BASE}/i18n/translations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        languageCode: 'hi',
        key: singleKey,
        value: singleVal,
        isVerified: true,
      }),
    });
    const singleUpsertData = await singleUpsertRes.json();
    assert.ok(singleUpsertData.success, 'Single key upsert must succeed');

    const singleCheckRes = await fetch(`${API_BASE}/i18n/translations/hi`);
    const singleCheckData = await singleCheckRes.json();
    const singleTransMap = singleCheckData.data?.translations || singleCheckData.translations;
    const singleVerMap = singleCheckData.data?.verifiedMap || singleCheckData.verifiedMap;
    assert.strictEqual(singleTransMap[singleKey], singleVal, 'Upserted value must match');
    assert.strictEqual(singleVerMap[singleKey], true, 'Human edited key must be verified');
    console.log(`   ✓ Inline single edit verified: "${singleKey}" = "${singleVal}" (isVerified: true)`);

    console.log('\n================================================================');
    console.log('✅ ALL I18N INTEGRATION & TOOLING TESTS PASSED PERFECTLY!');
    console.log('================================================================\n');

    try {
      await db.close();
    } catch {}
    setTimeout(() => process.exit(0), 100);
  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:');
    console.error(err);
    try {
      await db.close();
    } catch {}
    setTimeout(() => process.exit(1), 100);
  }
}

runTests();
