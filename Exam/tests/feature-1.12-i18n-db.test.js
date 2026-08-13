require('dotenv').config();
const assert = require('assert');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('====================================================');
console.log(' EXAMOS FEATURE 1.12 — DATABASE-DRIVEN I18N VERIFICATION');
console.log('====================================================\n');

async function run() {
  try {
    // 1. Verify 23 baseline languages exist in PostgreSQL DB table `languages`
    console.log('1. Querying `languages` DB table...');
    const dbLanguages = await prisma.language.findMany({ orderBy: { code: 'asc' } });
    console.log(`   Found ${dbLanguages.length} database language rows.`);
    assert.ok(dbLanguages.length >= 23, 'Must have at least 23 baseline languages in DB');

    const defaultLang = dbLanguages.find((l) => l.isDefault);
    assert.ok(defaultLang, 'Must have a default language (English) in DB');
    console.log(`   Default DB Language: ${defaultLang.name} (${defaultLang.code})`);

    // 2. Query baseline translation keys from DB table `translation_keys`
    console.log('\n2. Querying `translation_keys` DB table...');
    const keys = await prisma.translationKey.findMany();
    console.log(`   Found ${keys.length} database translation key rows.`);
    assert.ok(keys.length > 0, 'Must have translation keys in DB');

    // 3. Register a brand new custom language (French 'fr') into the database
    console.log('\n3. Registering test language "fr" (French) into Database...');
    const frLang = await prisma.language.upsert({
      where: { code: 'fr' },
      update: { name: 'French', nativeName: 'Français' },
      create: { code: 'fr', name: 'French', nativeName: 'Français' },
    });
    console.log(`   Created DB Language Row: ID=${frLang.id}, Code=${frLang.code}, NativeName=${frLang.nativeName}`);

    // 4. Persist translation string into DB table `translations`
    console.log('\n4. Persisting translation strings into `translations` DB table...');
    const welcomeKey = keys.find((k) => k.key === 'welcome') || keys[0];

    const frTrans = await prisma.translation.upsert({
      where: {
        languageId_translationKeyId: {
          languageId: frLang.id,
          translationKeyId: welcomeKey.id,
        },
      },
      update: { value: 'Bienvenue sur la plateforme ExamOS' },
      create: {
        languageId: frLang.id,
        translationKeyId: welcomeKey.id,
        value: 'Bienvenue sur la plateforme ExamOS',
      },
    });

    console.log('   Created DB Translation Row:');
    console.log(`   - ID: ${frTrans.id}`);
    console.log(`   - Language ID: ${frTrans.languageId}`);
    console.log(`   - Translation Key ID: ${frTrans.translationKeyId}`);
    console.log(`   - Value: "${frTrans.value}"`);

    // 5. Query full joined record from DB to prove complete round-trip
    console.log('\n5. Performing joined DB verification query (Language + TranslationKey + Translation)...');
    const joinedRecord = await prisma.translation.findUnique({
      where: { id: frTrans.id },
      include: { language: true, translationKey: true },
    });

    assert.strictEqual(joinedRecord.language.code, 'fr');
    assert.strictEqual(joinedRecord.translationKey.key, welcomeKey.key);
    assert.strictEqual(joinedRecord.value, 'Bienvenue sur la plateforme ExamOS');

    console.log('   [DB ROUND-TRIP SUCCESSFUL]');
    console.log(`   Language: ${joinedRecord.language.name} (${joinedRecord.language.code})`);
    console.log(`   Key: "${joinedRecord.translationKey.key}"`);
    console.log(`   Persisted DB Value: "${joinedRecord.value}"`);

    // 6. Test User Preference Persistence in `user_preferences` DB Table
    console.log('\n6. Testing User Preference DB Persistence in `user_preferences`...');
    const adminUser = await prisma.user.findFirst();
    if (adminUser) {
      const pref = await prisma.userPreference.upsert({
        where: { userId: adminUser.id },
        update: { themeMode: 'DARK', languageCode: 'fr' },
        create: { userId: adminUser.id, themeMode: 'DARK', languageCode: 'fr' },
      });
      console.log('   Created/Updated user_preferences DB Row:');
      console.log(`   - User ID: ${pref.userId}`);
      console.log(`   - Theme Mode: ${pref.themeMode}`);
      console.log(`   - Language Code: ${pref.languageCode}`);
      assert.strictEqual(pref.languageCode, 'fr');
      assert.strictEqual(pref.themeMode, 'DARK');
    }

    console.log('\n====================================================');
    console.log(' ALL DATABASE ROUND-TRIP VERIFICATION TESTS PASSED');
    console.log('====================================================');
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
