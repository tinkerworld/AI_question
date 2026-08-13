require('dotenv').config();
const assert = require('assert');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const dbPath = path.resolve(__dirname, '../packages/database/prisma/postgres-data');
const db = new PGlite(dbPath);

console.log('====================================================');
console.log(' EXAMOS FEATURE 1.12 — POSTGRESQL 16 I18N VERIFICATION');
console.log('====================================================\n');

async function run() {
  try {
    // 1. Query `languages` table in PostgreSQL 16
    console.log('1. Querying `languages` PostgreSQL 16 table...');
    const langRes = await db.query(`SELECT * FROM "languages" ORDER BY "code" ASC`);
    console.log(`   Found ${langRes.rows.length} PostgreSQL database language rows.`);
    assert.ok(langRes.rows.length >= 23, 'Must have at least 23 baseline languages in PostgreSQL');

    const defaultLang = langRes.rows.find((l) => l.isDefault);
    assert.ok(defaultLang, 'Must have default language (English) in PostgreSQL');
    console.log(`   Default PostgreSQL Language: ${defaultLang.name} (${defaultLang.code})`);

    // 2. Query `translation_keys` table in PostgreSQL 16
    console.log('\n2. Querying `translation_keys` PostgreSQL 16 table...');
    const keyRes = await db.query(`SELECT * FROM "translation_keys"`);
    console.log(`   Found ${keyRes.rows.length} PostgreSQL database translation key rows.`);
    assert.ok(keyRes.rows.length > 0, 'Must have translation keys in PostgreSQL');

    // 3. Register test language 'fr' (French) into PostgreSQL 16
    console.log('\n3. Registering test language "fr" (French) into PostgreSQL 16...');
    const frId = 'lang_fr_test';
    await db.query(
      `INSERT INTO "languages" ("id", "code", "name", "nativeName", "isDefault") VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name"`,
      [frId, 'fr', 'French', 'Français', false]
    );

    const frFetch = await db.query(`SELECT * FROM "languages" WHERE "code" = 'fr'`);
    const frLang = frFetch.rows[0];
    console.log(`   Created PostgreSQL Language Row: ID=${frLang.id}, Code=${frLang.code}, NativeName=${frLang.nativeName}`);

    // 4. Persist translation string into PostgreSQL 16 `translations` table
    console.log('\n4. Persisting translation strings into PostgreSQL 16 `translations` table...');
    const welcomeKey = keyRes.rows.find((k) => k.key === 'welcome') || keyRes.rows[0];
    const transId = 'trans_fr_welcome';

    await db.query(
      `INSERT INTO "translations" ("id", "languageId", "translationKeyId", "value") VALUES ($1, $2, $3, $4) ON CONFLICT ("languageId", "translationKeyId") DO UPDATE SET "value" = EXCLUDED."value"`,
      [transId, frLang.id, welcomeKey.id, 'Bienvenue sur la plateforme ExamOS']
    );

    const transFetch = await db.query(`SELECT * FROM "translations" WHERE "id" = $1`, [transId]);
    const frTrans = transFetch.rows[0];
    console.log('   Created PostgreSQL Translation Row:');
    console.log(`   - ID: ${frTrans.id}`);
    console.log(`   - Language ID: ${frTrans.languageId}`);
    console.log(`   - Translation Key ID: ${frTrans.translationKeyId}`);
    console.log(`   - Value: "${frTrans.value}"`);

    // 5. Perform Joined PostgreSQL Verification Query
    console.log('\n5. Performing Joined PostgreSQL Verification Query (Language + TranslationKey + Translation)...');
    const joinedRes = await db.query(
      `SELECT t."value", l."code" AS "lang_code", l."name" AS "lang_name", tk."key" AS "key_name"
       FROM "translations" t
       JOIN "languages" l ON t."languageId" = l."id"
       JOIN "translation_keys" tk ON t."translationKeyId" = tk."id"
       WHERE t."id" = $1`,
      [transId]
    );

    const joinedRecord = joinedRes.rows[0];
    assert.strictEqual(joinedRecord.lang_code, 'fr');
    assert.strictEqual(joinedRecord.key_name, welcomeKey.key);
    assert.strictEqual(joinedRecord.value, 'Bienvenue sur la plateforme ExamOS');

    console.log('   [POSTGRESQL 16 ROUND-TRIP SUCCESSFUL]');
    console.log(`   Language: ${joinedRecord.lang_name} (${joinedRecord.lang_code})`);
    console.log(`   Key: "${joinedRecord.key_name}"`);
    console.log(`   Persisted PostgreSQL Value: "${joinedRecord.value}"`);

    // 6. Test User Preference Persistence in PostgreSQL `user_preferences` Table
    console.log('\n6. Testing User Preference DB Persistence in PostgreSQL `user_preferences`...');
    const userId = 'usr_admin_test';
    await db.query(
      `INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName") VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("email") DO NOTHING`,
      [userId, 'admin@examos.io', '$2b$10$xyz', 'Admin', 'User']
    );

    await db.query(
      `INSERT INTO "user_preferences" ("id", "userId", "themeMode", "languageCode") VALUES ($1, $2, $3, $4) ON CONFLICT ("userId") DO UPDATE SET "themeMode" = EXCLUDED."themeMode", "languageCode" = EXCLUDED."languageCode"`,
      ['pref_admin_test', userId, 'DARK', 'fr']
    );

    const prefRes = await db.query(`SELECT * FROM "user_preferences" WHERE "userId" = $1`, [userId]);
    const pref = prefRes.rows[0];
    console.log('   Created/Updated PostgreSQL user_preferences Row:');
    console.log(`   - User ID: ${pref.userId}`);
    console.log(`   - Theme Mode: ${pref.themeMode}`);
    console.log(`   - Language Code: ${pref.languageCode}`);
    assert.strictEqual(pref.languageCode, 'fr');
    assert.strictEqual(pref.themeMode, 'DARK');

    console.log('\n====================================================');
    console.log(' ALL POSTGRESQL 16 ROUND-TRIP VERIFICATION TESTS PASSED');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  }
}

run();
