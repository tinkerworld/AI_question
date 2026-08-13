const { PGlite } = require('@electric-sql/pglite');
const path = require('path');

const dbPath = path.resolve(__dirname, 'postgres-data');
const db = new PGlite(dbPath);

const PERMISSIONS = [
  { id: 'p1', key: 'users.create', description: 'Create user accounts', module: 'users' },
  { id: 'p2', key: 'users.read', description: 'View user profiles', module: 'users' },
  { id: 'p3', key: 'users.update', description: 'Update user profiles', module: 'users' },
  { id: 'p4', key: 'users.delete', description: 'Delete user accounts', module: 'users' },
  { id: 'p5', key: 'roles.manage', description: 'Manage roles and permissions', module: 'roles' },
  { id: 'p6', key: 'audit.read', description: 'View system audit logs', module: 'audit' },
  { id: 'p7', key: 'i18n.manage', description: 'Manage multilingual translations', module: 'i18n' },
  { id: 'p8', key: 'preferences.update', description: 'Update system preferences', module: 'preferences' },
  { id: 'p9', key: 'courses.create', description: 'Create courses and subjects', module: 'courses' },
  { id: 'p10', key: 'courses.read', description: 'View courses and syllabus', module: 'courses' },
  { id: 'p11', key: 'courses.update', description: 'Update courses and syllabus', module: 'courses' },
  { id: 'p12', key: 'courses.delete', description: 'Delete courses', module: 'courses' },
  { id: 'p13', key: 'questions.create', description: 'Create question bank items', module: 'questions' },
  { id: 'p14', key: 'questions.read', description: 'View question bank', module: 'questions' },
  { id: 'p15', key: 'questions.update', description: 'Update question items', module: 'questions' },
  { id: 'p16', key: 'questions.delete', description: 'Delete question items', module: 'questions' },
  { id: 'p17', key: 'exams.create', description: 'Create exam patterns', module: 'exams' },
  { id: 'p18', key: 'exams.read', description: 'View exam patterns and results', module: 'exams' },
  { id: 'p19', key: 'exams.publish', description: 'Publish exams', module: 'exams' },
  { id: 'p20', key: 'exams.attempt', description: 'Attempt student exams', module: 'exams' },
];

const ROLES = [
  { id: 'r1', name: 'MAIN_ADMIN', description: 'System Super Administrator', isSystem: true, permissions: PERMISSIONS.map((p) => p.key) },
  { id: 'r2', name: 'SUB_ADMIN', description: 'Delegated Administrator', isSystem: true, permissions: ['users.read', 'courses.read', 'questions.read'] },
  { id: 'r3', name: 'TEACHER', description: 'Faculty and question author', isSystem: true, permissions: ['courses.read', 'questions.read'] },
  { id: 'r4', name: 'STUDENT', description: 'Enrolled learner persona', isSystem: true, permissions: ['courses.read'] },
];

const BASELINE_LANGUAGES = [
  { id: 'l1', code: 'en', name: 'English', nativeName: 'English', isDefault: true },
  { id: 'l2', code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isDefault: false },
  { id: 'l3', code: 'bn', name: 'Bengali', nativeName: 'বাংলা', isDefault: false },
  { id: 'l4', code: 'te', name: 'Telugu', nativeName: 'తెలుగు', isDefault: false },
  { id: 'l5', code: 'mr', name: 'Marathi', nativeName: 'मराठी', isDefault: false },
  { id: 'l6', code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', isDefault: false },
  { id: 'l7', code: 'ur', name: 'Urdu', nativeName: 'اردو', isDefault: false },
  { id: 'l8', code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', isDefault: false },
  { id: 'l9', code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', isDefault: false },
  { id: 'l10', code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', isDefault: false },
  { id: 'l11', code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', isDefault: false },
  { id: 'l12', code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', isDefault: false },
  { id: 'l13', code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', isDefault: false },
  { id: 'l14', code: 'ma', name: 'Maithili', nativeName: 'मैथिली', isDefault: false },
  { id: 'l15', code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', isDefault: false },
  { id: 'l16', code: 'ks', name: 'Kashmiri', nativeName: 'कश्मीरी', isDefault: false },
  { id: 'l17', code: 'ne', name: 'Nepali', nativeName: 'नेपाली', isDefault: false },
  { id: 'l18', code: 'sd', name: 'Sindhi', nativeName: 'सिंधी', isDefault: false },
  { id: 'l19', code: 'br', name: 'Bodo', nativeName: 'बोडो', isDefault: false },
  { id: 'l20', code: 'doi', name: 'Dogri', nativeName: 'डोगरी', isDefault: false },
  { id: 'l21', code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', isDefault: false },
  { id: 'l22', code: 'sat', name: 'Santhali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', isDefault: false },
  { id: 'l23', code: 'lus', name: 'Mizo', nativeName: 'Mizo', isDefault: false },
];

const TRANSLATION_KEYS = [
  { id: 'tk1', key: 'welcome', description: 'Welcome banner heading', module: 'common' },
  { id: 'tk2', key: 'app_title', description: 'Application header title', module: 'common' },
  { id: 'tk3', key: 'dashboard', description: 'Navigation dashboard label', module: 'navigation' },
  { id: 'tk4', key: 'users', description: 'Navigation user management label', module: 'navigation' },
  { id: 'tk5', key: 'courses', description: 'Navigation academic courses label', module: 'navigation' },
  { id: 'tk6', key: 'question_bank', description: 'Navigation question bank label', module: 'navigation' },
  { id: 'tk7', key: 'exam_patterns', description: 'Navigation exam patterns label', module: 'navigation' },
  { id: 'tk8', key: 'analytics', description: 'Navigation student analytics label', module: 'navigation' },
];

const SEED_TRANSLATIONS = {
  en: { welcome: 'Welcome to ExamOS Platform', app_title: 'ExamOS // Adaptive Learning Platform', dashboard: 'Dashboard', users: 'User Management', courses: 'Academic Courses', question_bank: 'Question Bank', exam_patterns: 'Exam Patterns', analytics: 'Student Analytics' },
  hi: { welcome: 'ExamOS प्लेटफॉर्म में आपका स्वागत है', app_title: 'ExamOS // अनुकूलनीय शिक्षण मंच', dashboard: 'डैशबोर्ड', users: 'उपयोगकर्ता प्रबंधन', courses: 'अकादमिक पाठ्यक्रम', question_bank: 'प्रश्न बैंक', exam_patterns: 'परीक्षा पैटर्न', analytics: 'छात्र विश्लेषण' },
};

async function seed() {
  console.log('Seeding permissions & roles into PostgreSQL...');
  for (const p of PERMISSIONS) {
    await db.query(
      `INSERT INTO "permissions" ("id", "key", "description", "module") VALUES ($1, $2, $3, $4) ON CONFLICT ("key") DO NOTHING`,
      [p.id, p.key, p.description, p.module]
    );
  }

  for (const r of ROLES) {
    await db.query(
      `INSERT INTO "roles" ("id", "name", "description", "isSystem") VALUES ($1, $2, $3, $4) ON CONFLICT ("name") DO NOTHING`,
      [r.id, r.name, r.description, r.isSystem]
    );
  }

  console.log('Seeding 23 baseline languages into PostgreSQL...');
  for (const l of BASELINE_LANGUAGES) {
    await db.query(
      `INSERT INTO "languages" ("id", "code", "name", "nativeName", "isDefault") VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("code") DO NOTHING`,
      [l.id, l.code, l.name, l.nativeName, l.isDefault]
    );
  }

  console.log('Seeding translation keys & values into PostgreSQL...');
  for (const k of TRANSLATION_KEYS) {
    await db.query(
      `INSERT INTO "translation_keys" ("id", "key", "description", "module") VALUES ($1, $2, $3, $4) ON CONFLICT ("key") DO NOTHING`,
      [k.id, k.key, k.description, k.module]
    );
  }

  for (const [langCode, keyVals] of Object.entries(SEED_TRANSLATIONS)) {
    const langRes = await db.query(`SELECT "id" FROM "languages" WHERE "code" = $1`, [langCode]);
    if (langRes.rows.length > 0) {
      const langId = langRes.rows[0].id;
      for (const [key, value] of Object.entries(keyVals)) {
        const keyRes = await db.query(`SELECT "id" FROM "translation_keys" WHERE "key" = $1`, [key]);
        if (keyRes.rows.length > 0) {
          const keyId = keyRes.rows[0].id;
          const id = `t_${langCode}_${key}`;
          await db.query(
            `INSERT INTO "translations" ("id", "languageId", "translationKeyId", "value") VALUES ($1, $2, $3, $4) ON CONFLICT ("languageId", "translationKeyId") DO UPDATE SET "value" = EXCLUDED."value"`,
            [id, langId, keyId, value]
          );
        }
      }
    }
  }

  console.log('PostgreSQL Database Seed Complete with 23 Baseline Languages & Translations!');
  process.exit(0);
}

seed().catch((e) => {
  console.error('Seeding failed:', e);
  process.exit(1);
});
