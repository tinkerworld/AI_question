require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: 'users.create', description: 'Create user accounts', module: 'users' },
  { key: 'users.read', description: 'View user profiles', module: 'users' },
  { key: 'users.update', description: 'Update user profiles', module: 'users' },
  { key: 'users.delete', description: 'Delete user accounts', module: 'users' },
  { key: 'roles.manage', description: 'Manage roles and permissions', module: 'roles' },
  { key: 'audit.read', description: 'View system audit logs', module: 'audit' },
  { key: 'i18n.manage', description: 'Manage multilingual translations', module: 'i18n' },
  { key: 'preferences.update', description: 'Update system preferences', module: 'preferences' },
  { key: 'courses.create', description: 'Create courses and subjects', module: 'courses' },
  { key: 'courses.read', description: 'View courses and syllabus', module: 'courses' },
  { key: 'courses.update', description: 'Update courses and syllabus', module: 'courses' },
  { key: 'courses.delete', description: 'Delete courses', module: 'courses' },
  { key: 'questions.create', description: 'Create question bank items', module: 'questions' },
  { key: 'questions.read', description: 'View question bank', module: 'questions' },
  { key: 'questions.update', description: 'Update question items', module: 'questions' },
  { key: 'questions.delete', description: 'Delete question items', module: 'questions' },
  { key: 'exams.create', description: 'Create exam patterns', module: 'exams' },
  { key: 'exams.read', description: 'View exam patterns and results', module: 'exams' },
  { key: 'exams.publish', description: 'Publish exams', module: 'exams' },
  { key: 'exams.attempt', description: 'Attempt student exams', module: 'exams' },
];

const ROLES = [
  {
    name: 'MAIN_ADMIN',
    description: 'System Super Administrator with full authority',
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.key),
  },
  {
    name: 'SUB_ADMIN',
    description: 'Delegated Administrator for content & user ops',
    isSystem: true,
    permissions: [
      'users.read', 'users.create', 'users.update',
      'courses.read', 'courses.create', 'courses.update',
      'questions.read', 'questions.create', 'questions.update',
      'exams.read', 'audit.read',
    ],
  },
  {
    name: 'TEACHER',
    description: 'Faculty and question author',
    isSystem: true,
    permissions: [
      'courses.read', 'questions.read', 'questions.create',
      'questions.update', 'exams.read', 'exams.create',
    ],
  },
  {
    name: 'STUDENT',
    description: 'Enrolled learner persona',
    isSystem: true,
    permissions: ['courses.read', 'exams.read', 'exams.attempt'],
  },
];

const BASELINE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', isDefault: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isDefault: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', isDefault: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', isDefault: false },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', isDefault: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', isDefault: false },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', isDefault: false },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', isDefault: false },
  { code: 'kn', name: 'Kannada', nativeName: 'కನ್ನಡ', isDefault: false },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', isDefault: false },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', isDefault: false },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', isDefault: false },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', isDefault: false },
  { code: 'ma', name: 'Maithili', nativeName: 'मैथिली', isDefault: false },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', isDefault: false },
  { code: 'ks', name: 'Kashmiri', nativeName: 'कश्मीरी', isDefault: false },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', isDefault: false },
  { code: 'sd', name: 'Sindhi', nativeName: 'सिंधी', isDefault: false },
  { code: 'br', name: 'Bodo', nativeName: 'बोडो', isDefault: false },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', isDefault: false },
  { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', isDefault: false },
  { code: 'sat', name: 'Santhali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', isDefault: false },
  { code: 'lus', name: 'Mizo', nativeName: 'Mizo', isDefault: false },
];

const TRANSLATION_KEYS = [
  { key: 'welcome', description: 'Welcome banner heading', module: 'common' },
  { key: 'app_title', description: 'Application header title', module: 'common' },
  { key: 'dashboard', description: 'Navigation dashboard label', module: 'navigation' },
  { key: 'users', description: 'Navigation user management label', module: 'navigation' },
  { key: 'courses', description: 'Navigation academic courses label', module: 'navigation' },
  { key: 'question_bank', description: 'Navigation question bank label', module: 'navigation' },
  { key: 'exam_patterns', description: 'Navigation exam patterns label', module: 'navigation' },
  { key: 'analytics', description: 'Navigation student analytics label', module: 'navigation' },
];

const SEED_TRANSLATIONS = {
  en: { welcome: 'Welcome to ExamOS Platform', app_title: 'ExamOS // Adaptive Learning Platform', dashboard: 'Dashboard', users: 'User Management', courses: 'Academic Courses', question_bank: 'Question Bank', exam_patterns: 'Exam Patterns', analytics: 'Student Analytics' },
  hi: { welcome: 'ExamOS प्लेटफॉर्म में आपका स्वागत है', app_title: 'ExamOS // अनुकूलनीय शिक्षण मंच', dashboard: 'डैशबोर्ड', users: 'उपयोगकर्ता प्रबंधन', courses: 'अकादमिक पाठ्यक्रम', question_bank: 'प्रश्न बैंक', exam_patterns: 'परीक्षा पैटर्न', analytics: 'छात्र विश्लेषण' },
};

async function seed() {
  console.log('Seeding permissions & roles...');
  const permMap = new Map();
  for (const p of PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description, module: p.module },
      create: { key: p.key, description: p.description, module: p.module },
    });
    permMap.set(p.key, perm.id);
  }

  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description, isSystem: r.isSystem },
      create: { name: r.name, description: r.description, isSystem: r.isSystem },
    });
    for (const permKey of r.permissions) {
      const permId = permMap.get(permKey);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
          update: {},
          create: { roleId: role.id, permissionId: permId },
        });
      }
    }
  }

  console.log('Seeding 23 baseline languages into database...');
  const langMap = new Map();
  for (const l of BASELINE_LANGUAGES) {
    const lang = await prisma.language.upsert({
      where: { code: l.code },
      update: { name: l.name, nativeName: l.nativeName, isDefault: l.isDefault },
      create: { code: l.code, name: l.name, nativeName: l.nativeName, isDefault: l.isDefault },
    });
    langMap.set(l.code, lang.id);
  }

  console.log('Seeding translation keys & values into database...');
  const keyMap = new Map();
  for (const k of TRANSLATION_KEYS) {
    const tk = await prisma.translationKey.upsert({
      where: { key: k.key },
      update: { description: k.description, module: k.module },
      create: { key: k.key, description: k.description, module: k.module },
    });
    keyMap.set(k.key, tk.id);
  }

  for (const [langCode, keyVals] of Object.entries(SEED_TRANSLATIONS)) {
    const langId = langMap.get(langCode);
    if (langId) {
      for (const [key, value] of Object.entries(keyVals)) {
        const keyId = keyMap.get(key);
        if (keyId) {
          await prisma.translation.upsert({
            where: {
              languageId_translationKeyId: { languageId: langId, translationKeyId: keyId },
            },
            update: { value },
            create: { languageId: langId, translationKeyId: keyId, value },
          });
        }
      }
    }
  }

  console.log('Database seed complete with 23 baseline languages & translations!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
