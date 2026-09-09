/**
 * ExamOS Database Verification & Schema-Ensure Tool
 * ==============================================================
 * Connects to the local PostgreSQL (PGlite) database, applies
 * idempotent schema-ensure migrations (V2 tables, candidate profiles,
 * multilingual i18n, vocabulary, audio voice profiles, feature controls),
 * verifies table existence, and prints a comprehensive content report.
 *
 * Exit codes:
 *   0 = All expected tables are present and verified
 *   2 = One or more required feature tables are MISSING
 *   1 = Fatal error (invalid path, unreadable database, etc.)
 * ==============================================================
 */

const path = require('path');
const fs = require('fs');

// Resolve database path
function resolveDbPath() {
  if (process.argv[2]) {
    return path.resolve(process.argv[2]);
  }
  const rootCandidate = path.resolve(process.cwd(), 'postgres-data');
  if (fs.existsSync(path.join(rootCandidate, 'PG_VERSION'))) {
    return rootCandidate;
  }
  const scriptCandidate = path.resolve(__dirname, '../postgres-data');
  if (fs.existsSync(path.join(scriptCandidate, 'PG_VERSION'))) {
    return scriptCandidate;
  }
  return rootCandidate;
}

// Locate PGlite package
function getPGlite() {
  const candidates = [
    '@electric-sql/pglite',
    path.resolve(__dirname, '../node_modules/@electric-sql/pglite'),
    path.resolve(__dirname, '../Exam/node_modules/@electric-sql/pglite'),
  ];
  for (const c of candidates) {
    try {
      const mod = require(c);
      return mod.PGlite || mod;
    } catch {}
  }
  throw new Error('Could not find @electric-sql/pglite module in node_modules.');
}

// Expected feature tables checklist
const REQUIRED_TABLES = [
  // AI Interview & Candidate Profiles
  { name: 'candidate_interview_profiles', category: 'AI Interview & Profiles', critical: true },
  { name: 'interview_sessions', category: 'AI Interview & Profiles', critical: true },
  { name: 'interview_turns', category: 'AI Interview & Profiles', critical: true },

  // Multilingual / i18n
  { name: 'languages', category: 'Multilingual i18n', critical: true },
  { name: 'translation_keys', category: 'Multilingual i18n', critical: true },
  { name: 'translations', category: 'Multilingual i18n', critical: true },

  // Vocabulary & Spaced Repetition
  { name: 'vocabulary_words', category: 'Vocabulary Practice', critical: true },
  { name: 'student_vocabulary_progress', category: 'Vocabulary Practice', critical: true },

  // Audio & Speech Processing
  { name: 'audio_voice_profiles', category: 'Audio & Speech', critical: true },

  // Feature Controls & Maintenance
  { name: 'feature_controls', category: 'Feature Governance', critical: true },
  { name: 'feature_registry', category: 'Feature Governance', critical: true },
  { name: 'maintenance_configs', category: 'Feature Governance', critical: true },
  { name: 'promotional_entitlement_rules', category: 'Feature Governance', critical: false },

  // Subscriptions & Billing
  { name: 'plans', category: 'Billing & Plans', critical: true },
  { name: 'entitlement_rules', category: 'Billing & Plans', critical: true },
  { name: 'subscriptions', category: 'Billing & Plans', critical: true },
  { name: 'ai_credit_packages', category: 'Billing & Plans', critical: false },
  { name: 'invoices', category: 'Billing & Plans', critical: false },
  { name: 'refund_transactions', category: 'Billing & Plans', critical: false },

  // Core Platform & Assessment
  { name: 'users', category: 'Core Platform', critical: true },
  { name: 'roles', category: 'Core Platform', critical: true },
  { name: 'permissions', category: 'Core Platform', critical: true },
  { name: 'courses', category: 'Core Platform', critical: true },
  { name: 'subjects', category: 'Core Platform', critical: true },
  { name: 'syllabus_nodes', category: 'Core Platform', critical: true },
  { name: 'questions', category: 'Core Assessment', critical: true },
  { name: 'question_versions', category: 'Core Assessment', critical: false },
  { name: 'exam_patterns', category: 'Core Assessment', critical: true },
  { name: 'exams', category: 'Core Assessment', critical: true },
  { name: 'exam_attempts', category: 'Core Assessment', critical: true },
];

async function ensureSchema(db) {
  console.log('[Schema-Ensure] Running idempotent migration check against database...');

  // 1. Core Feature Tables (CREATE TABLE IF NOT EXISTS)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS "candidate_interview_profiles" (
      "userId" TEXT PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
      "name" TEXT,
      "hometown" TEXT,
      "profession" TEXT,
      "studyField" TEXT,
      "hobbies" JSONB DEFAULT '[]'::jsonb,
      "notableDetails" JSONB DEFAULT '[]'::jsonb,
      "topicsAsked" JSONB DEFAULT '[]'::jsonb,
      "weakAreas" JSONB DEFAULT '{}'::jsonb,
      "strugglePatterns" JSONB DEFAULT '{}'::jsonb,
      "lastSessionAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "sessionCount" INT DEFAULT 0,
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "interview_sessions" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "questionId" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
      "courseId" TEXT REFERENCES "courses"("id") ON DELETE SET NULL,
      "mode" TEXT NOT NULL DEFAULT 'PRACTICE',
      "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      "currentTurn" INT NOT NULL DEFAULT 0,
      "maxTurns" INT NOT NULL DEFAULT 5,
      "mainQuestionIndex" INT NOT NULL DEFAULT 1,
      "followUpCountForCurrentMain" INT NOT NULL DEFAULT 0,
      "totalMainQuestions" INT NOT NULL DEFAULT 5,
      "lastSelectedTemplate" TEXT,
      "debugInfo" JSONB DEFAULT '{}'::jsonb,
      "startedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt" TIMESTAMP,
      "finalScore" DOUBLE PRECISION,
      "maxScore" DOUBLE PRECISION,
      "rubricScores" JSONB,
      "feedback" TEXT,
      "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "weaknesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "recommendations" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "interview_turns" (
      "id" TEXT PRIMARY KEY,
      "sessionId" TEXT NOT NULL REFERENCES "interview_sessions"("id") ON DELETE CASCADE,
      "turnNumber" INT NOT NULL,
      "speaker" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "audioUrl" TEXT,
      "durationSeconds" INT,
      "evaluationNotes" TEXT,
      "mainQuestionIndex" INT NOT NULL DEFAULT 1,
      "followUpIndex" INT NOT NULL DEFAULT 0,
      "isMainQuestion" BOOLEAN NOT NULL DEFAULT false,
      "providerId" TEXT,
      "modelUsed" TEXT,
      "providerType" TEXT,
      "isFallback" BOOLEAN NOT NULL DEFAULT false,
      "selectedTemplate" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "languages" (
      "id" TEXT PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "nativeName" TEXT NOT NULL,
      "isRtl" BOOLEAN NOT NULL DEFAULT false,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "translation_keys" (
      "id" TEXT PRIMARY KEY,
      "key" TEXT NOT NULL UNIQUE,
      "description" TEXT,
      "category" TEXT NOT NULL DEFAULT 'general',
      "module" TEXT NOT NULL DEFAULT 'common',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "translations" (
      "id" TEXT PRIMARY KEY,
      "keyId" TEXT NOT NULL REFERENCES "translation_keys"("id") ON DELETE CASCADE,
      "langCode" TEXT NOT NULL REFERENCES "languages"("code") ON DELETE CASCADE,
      "value" TEXT NOT NULL,
      "isVerified" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("keyId", "langCode")
    );

    CREATE TABLE IF NOT EXISTS "vocabulary_words" (
      "id" TEXT PRIMARY KEY,
      "word" TEXT NOT NULL,
      "phonetic" TEXT,
      "partOfSpeech" TEXT,
      "definition" TEXT NOT NULL,
      "exampleSentence" TEXT,
      "synonyms" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "antonyms" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "difficulty" TEXT NOT NULL DEFAULT 'B2',
      "audioUrl" TEXT,
      "courseId" TEXT,
      "syllabusNodeId" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "student_vocabulary_progress" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "wordId" TEXT NOT NULL REFERENCES "vocabulary_words"("id") ON DELETE CASCADE,
      "masteryLevel" TEXT NOT NULL DEFAULT 'LEARNING',
      "repetitionCount" INT NOT NULL DEFAULT 0,
      "easinessFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
      "intervalDays" INT NOT NULL DEFAULT 0,
      "nextReviewDue" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastPracticedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("userId", "wordId")
    );

    CREATE TABLE IF NOT EXISTS "audio_voice_profiles" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "provider" TEXT NOT NULL DEFAULT 'MOCK',
      "voiceId" TEXT NOT NULL,
      "accent" TEXT NOT NULL DEFAULT 'British',
      "gender" TEXT NOT NULL DEFAULT 'FEMALE',
      "sampleAudioUrl" TEXT,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "feature_controls" (
      "id" TEXT PRIMARY KEY,
      "featureKey" TEXT UNIQUE NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "message" TEXT NOT NULL DEFAULT 'This feature is currently under maintenance.',
      "reason" TEXT,
      "startAt" TIMESTAMP WITH TIME ZONE,
      "endAt" TIMESTAMP WITH TIME ZONE,
      "allowAdmin" BOOLEAN NOT NULL DEFAULT true,
      "allowTeacher" BOOLEAN NOT NULL DEFAULT false,
      "allowStudent" BOOLEAN NOT NULL DEFAULT false,
      "displayMode" TEXT NOT NULL DEFAULT 'FULL_PAGE',
      "updatedBy" TEXT,
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "maintenance_configs" (
      "id" TEXT PRIMARY KEY,
      "scope" TEXT NOT NULL DEFAULT 'FEATURE',
      "featureKey" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT false,
      "message" TEXT NOT NULL DEFAULT 'System undergoing scheduled maintenance',
      "scheduledStart" TIMESTAMP,
      "scheduledEnd" TIMESTAMP,
      "allowedRoles" JSONB NOT NULL DEFAULT '["MAIN_ADMIN","SUB_ADMIN"]'::jsonb,
      "updatedBy" TEXT,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "feature_registry" (
      "id" TEXT PRIMARY KEY,
      "key" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'BOOLEAN',
      "defaultValue" TEXT NOT NULL DEFAULT 'false',
      "category" TEXT NOT NULL DEFAULT 'general',
      "description" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "promotional_entitlement_rules" (
      "id" TEXT PRIMARY KEY,
      "featureKey" TEXT NOT NULL,
      "courseId" TEXT,
      "startsAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" TIMESTAMP NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "description" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Add missing columns safely (ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
  try {
    await db.exec(`
      ALTER TABLE "translations" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE "translation_keys" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'general';
      ALTER TABLE "translation_keys" ADD COLUMN IF NOT EXISTS "module" TEXT NOT NULL DEFAULT 'common';
      ALTER TABLE "question_versions" ADD COLUMN IF NOT EXISTS "changeSummary" TEXT;
    `);
  } catch (colErr) {
    console.warn('  ! Column ensure notice:', colErr.message);
  }

  // 3. Seed baseline feature registry if empty
  try {
    const frCount = await db.query(`SELECT COUNT(*)::int as count FROM "feature_registry"`);
    if (frCount.rows[0].count === 0) {
      const defaultFeatures = [
        { key: 'listening_comprehension', name: 'Listening Comprehension Engine', type: 'BOOLEAN', defaultValue: 'true', category: 'assessment', desc: 'Audio listening comprehension and multi-part questions' },
        { key: 'writing_evaluator', name: 'AI Writing & Essay Diagnostic', type: 'BOOLEAN', defaultValue: 'true', category: 'assessment', desc: 'Automated multi-rubric writing evaluation and grammar feedback' },
        { key: 'vocabulary_practice', name: 'Vocabulary Drills & Spaced Repetition', type: 'BOOLEAN', defaultValue: 'true', category: 'practice', desc: 'Active vocabulary flashcards and retention tracking' },
        { key: 'full_assessment', name: 'Full Diagnostic Rubric Reports', type: 'BOOLEAN', defaultValue: 'false', category: 'analytics', desc: 'In-depth diagnostic reports and sentence level highlights' },
        { key: 'personalized_practice', name: 'Adaptive Weakness Remediation', type: 'BOOLEAN', defaultValue: 'false', category: 'practice', desc: 'Generate customized practice sets from student error pool' },
        { key: 'custom_topic', name: 'Custom Topics & Decks', type: 'BOOLEAN', defaultValue: 'false', category: 'practice', desc: 'Create custom practice drills and custom vocabulary decks' },
        { key: 'mock_tests', name: 'Mock Test Attempts Quota', type: 'NUMBER', defaultValue: '2', category: 'quota', desc: 'Total number of standard exam attempts permitted' },
        { key: 'ai_interview_daily', name: 'Daily AI Interview Quota', type: 'NUMBER', defaultValue: '1', category: 'quota', desc: 'Daily oral interview sessions permitted' },
      ];
      for (const f of defaultFeatures) {
        await db.query(
          `INSERT INTO "feature_registry" ("id", "key", "name", "type", "defaultValue", "category", "description")
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT ("key") DO NOTHING`,
          [`feat_${f.key}`, f.key, f.name, f.type, f.defaultValue, f.category, f.desc]
        );
      }
    }
  } catch {}

  // 4. Seed baseline feature controls if empty
  try {
    const fcCount = await db.query(`SELECT COUNT(*)::int as count FROM "feature_controls"`);
    if (fcCount.rows[0].count === 0) {
      const defaultFeatureControls = [
        { key: 'interview', name: 'AI Oral Interview & Viva', desc: 'Interactive conversational AI viva and oral test engine' },
        { key: 'practice', name: 'Practice & Drills', desc: 'Adaptive practice questions and weak-area drills' },
        { key: 'question_bank', name: 'Question Bank', desc: 'Authoring, browsing, and managing question banks' },
        { key: 'exams', name: 'Exams & Mock Tests', desc: 'Timed examinations, mock test taking, and paper generation' },
        { key: 'analytics', name: 'Analytics & Mastery', desc: 'Student performance, progress metrics, and mastery analytics' },
        { key: 'subscriptions', name: 'Subscriptions & Billing', desc: 'Plan subscriptions, invoices, and AI credits' },
        { key: 'ai_gateway', name: 'AI Gateway & Generation', desc: 'LLM integrations, prompt engineering, and automated grading' },
        { key: 'audio', name: 'Audio & Speech Processing', desc: 'Voice synthesis, audio listening questions, and speech evaluation' },
        { key: 'writing', name: 'Writing Assessment', desc: 'Essay grading, multi-criteria rubrics, and automated feedback' },
        { key: 'vocabulary', name: 'Vocabulary Practice', desc: 'Flashcard drills and SuperMemo SM-2 retention engine' },
      ];
      for (const f of defaultFeatureControls) {
        await db.query(
          `INSERT INTO "feature_controls" ("id", "featureKey", "name", "description", "status", "message", "allowAdmin", "allowTeacher", "allowStudent", "displayMode")
           VALUES ($1, $2, $3, $4, 'ACTIVE', $5, true, false, false, 'FULL_PAGE')
           ON CONFLICT ("featureKey") DO NOTHING`,
          [`feat_ctrl_${f.key}`, f.key, f.name, f.desc, `${f.name} is temporarily under maintenance.`]
        );
      }
    }
  } catch {}

  // 5. Seed baseline audio voice profiles if empty
  try {
    const voiceCount = await db.query(`SELECT COUNT(*)::int as count FROM "audio_voice_profiles"`);
    if (voiceCount.rows[0].count === 0) {
      const seededVoices = [
        { id: 'voice_en_gb_f_01', name: 'Emma (Received Pronunciation)', provider: 'MOCK', voiceId: 'en-GB-Neural2-A', accent: 'British', gender: 'FEMALE', isDefault: true },
        { id: 'voice_en_gb_m_01', name: 'Arthur (Received Pronunciation)', provider: 'MOCK', voiceId: 'en-GB-Neural2-B', accent: 'British', gender: 'MALE', isDefault: false },
        { id: 'voice_en_us_f_01', name: 'Sarah (Standard American)', provider: 'MOCK', voiceId: 'en-US-Neural2-F', accent: 'American', gender: 'FEMALE', isDefault: false },
        { id: 'voice_en_us_m_01', name: 'James (Standard American)', provider: 'MOCK', voiceId: 'en-US-Neural2-D', accent: 'American', gender: 'MALE', isDefault: false },
        { id: 'voice_en_au_f_01', name: 'Charlotte (Australian Native)', provider: 'MOCK', voiceId: 'en-AU-Neural2-C', accent: 'Australian', gender: 'FEMALE', isDefault: false },
        { id: 'voice_en_au_m_01', name: 'Liam (Australian Native)', provider: 'MOCK', voiceId: 'en-AU-Neural2-B', accent: 'Australian', gender: 'MALE', isDefault: false },
        { id: 'voice_en_in_f_01', name: 'Pooja (Indian English)', provider: 'MOCK', voiceId: 'en-IN-Neural2-D', accent: 'Indian', gender: 'FEMALE', isDefault: false },
        { id: 'voice_en_in_m_01', name: 'Rohan (Indian English)', provider: 'MOCK', voiceId: 'en-IN-Neural2-B', accent: 'Indian', gender: 'MALE', isDefault: false },
        { id: 'voice_en_ca_f_01', name: 'Chloe (Canadian English)', provider: 'MOCK', voiceId: 'en-CA-Neural2-A', accent: 'Canadian', gender: 'FEMALE', isDefault: false },
        { id: 'voice_en_ca_m_01', name: 'David (Canadian English)', provider: 'MOCK', voiceId: 'en-CA-Neural2-B', accent: 'Canadian', gender: 'MALE', isDefault: false },
      ];
      for (const v of seededVoices) {
        await db.query(
          `INSERT INTO "audio_voice_profiles" ("id", "name", "provider", "voiceId", "accent", "gender", "isDefault", "isActive")
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)
           ON CONFLICT ("id") DO NOTHING`,
          [v.id, v.name, v.provider, v.voiceId, v.accent, v.gender, v.isDefault]
        );
      }
    }
  } catch {}

  // 6. Ensure system.maintenance permission exists
  try {
    await db.query(`
      INSERT INTO "permissions" ("id", "key", "description", "module")
      VALUES ('p_system_maintenance', 'system.maintenance', 'Configure system and feature level maintenance modes', 'system')
      ON CONFLICT ("key") DO NOTHING;
      INSERT INTO "role_permissions" ("roleId", "permissionId")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('MAIN_ADMIN', 'SUB_ADMIN') AND p.key = 'system.maintenance'
      ON CONFLICT ("roleId", "permissionId") DO NOTHING;
    `);
  } catch {}

  // 7. Ensure mock batch translation AI provider exists
  try {
    await db.query(`
      INSERT INTO "ai_providers" ("id", "name", "type", "modelId", "baseUrl", "priority", "scope", "isActive")
      VALUES ('prov_trans_batch_mock', 'Deterministic Multilingual Batch Translation Engine', 'MOCK', 'mock-translation-v1', 'http://localhost:4043/internal/ai/mock-translation', 1, 'translation_batch', true)
      ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "scope" = EXCLUDED."scope", "isActive" = true;
    `);
  } catch {}

  console.log('[Schema-Ensure] Schema-ensure pass completed successfully.\n');
}

async function verifyTables(db) {
  console.log('==============================================================');
  console.log('  ExamOS Database Pre-Export Verification Checklist');
  console.log('==============================================================');

  const existingRes = await db.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `);
  const existingSet = new Set(existingRes.rows.map(r => r.tablename));

  const missing = [];
  let lastCategory = '';

  for (const item of REQUIRED_TABLES) {
    if (item.category !== lastCategory) {
      console.log(`\n  [${item.category}]`);
      lastCategory = item.category;
    }

    const exists = existingSet.has(item.name);
    const badge = exists ? '[PRESENT]' : '[MISSING]';
    const statusStr = exists ? `  ✓ ${badge} ${item.name}` : `  ✗ ${badge} ${item.name} (REQUIRED)`;
    console.log(statusStr);

    if (!exists && item.critical) {
      missing.push(item.name);
    }
  }

  console.log('\n--------------------------------------------------------------');
  return missing;
}

async function printRowCounts(db) {
  console.log('==============================================================');
  console.log('  ExamOS Content Fullness & Population Sanity Check');
  console.log('==============================================================');

  async function getCount(sql, fallback = 0) {
    try {
      const res = await db.query(sql);
      return parseInt(res.rows[0]?.count || fallback, 10);
    } catch {
      return fallback;
    }
  }

  const totalQuestions = await getCount('SELECT COUNT(*) as count FROM "questions"');
  let typeRows = [];
  try {
    const typeRes = await db.query('SELECT type, COUNT(*)::int as count FROM "questions" GROUP BY type ORDER BY count DESC');
    typeRows = typeRes.rows;
  } catch {}

  const totalTranslations = await getCount('SELECT COUNT(*) as count FROM "translations"');
  const verifiedTranslations = await getCount('SELECT COUNT(*) as count FROM "translations" WHERE "isVerified" = true');
  const translationKeys = await getCount('SELECT COUNT(*) as count FROM "translation_keys"');
  const languagesCount = await getCount('SELECT COUNT(*) as count FROM "languages"');

  const vocabWords = await getCount('SELECT COUNT(*) as count FROM "vocabulary_words"');
  const voiceProfiles = await getCount('SELECT COUNT(*) as count FROM "audio_voice_profiles"');
  const coursesCount = await getCount('SELECT COUNT(*) as count FROM "courses"');
  const examsCount = await getCount('SELECT COUNT(*) as count FROM "exams"');
  const patternsCount = await getCount('SELECT COUNT(*) as count FROM "exam_patterns"');
  const usersCount = await getCount('SELECT COUNT(*) as count FROM "users"');
  const plansCount = await getCount('SELECT COUNT(*) as count FROM "plans"');

  console.log(`  • Questions:           ${totalQuestions} total`);
  for (const t of typeRows) {
    console.log(`      - ${t.type.padEnd(16)}: ${t.count}`);
  }
  console.log(`  • Multilingual (i18n): ${totalTranslations} translations across ${languagesCount} languages`);
  console.log(`      - Verified:        ${verifiedTranslations}`);
  console.log(`      - Translation Keys:${translationKeys}`);
  console.log(`  • Vocabulary Words:    ${vocabWords} CEFR-graded academic terms`);
  console.log(`  • Audio Voice Profiles:${voiceProfiles} synthesis voices`);
  console.log(`  • Academic Structure:  ${coursesCount} courses, ${examsCount} exams, ${patternsCount} blueprints`);
  console.log(`  • Platform Accounts:   ${usersCount} user personas`);
  console.log(`  • Subscription Plans:  ${plansCount} tiers configured`);
  console.log('==============================================================\n');
}

async function main() {
  const dbPath = resolveDbPath();
  console.log(`[DB Verify] Target database directory: ${dbPath}`);

  if (!fs.existsSync(path.join(dbPath, 'PG_VERSION'))) {
    console.error(`[ERROR] Invalid database directory. PG_VERSION not found in: ${dbPath}`);
    process.exit(1);
  }

  // Remove stale postmaster.pid lock file
  const pidFile = path.join(dbPath, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    try {
      fs.unlinkSync(pidFile);
    } catch {}
  }

  const PGliteClass = getPGlite();
  let db;

  try {
    db = new PGliteClass(dbPath);
    if (db.waitReady) {
      await db.waitReady;
    }
  } catch (initErr) {
    console.error(`[ERROR] Failed to connect to PGlite database:`, initErr.message);
    process.exit(1);
  }

  try {
    // 1. Pre-packaging schema ensure
    await ensureSchema(db);

    // 2. Table checklist verification
    const missing = await verifyTables(db);

    // 3. Row count sanity check
    await printRowCounts(db);

    await db.close();

    if (missing.length > 0) {
      console.error('**************************************************************');
      console.error('  WARNING: DATABASE VERIFICATION FAILED!');
      console.error(`  The following ${missing.length} required table(s) are MISSING:`);
      for (const m of missing) {
        console.error(`    - ${m}`);
      }
      console.error('**************************************************************\n');
      process.exit(2);
    }

    console.log('✓ All expected feature tables are present and verified!\n');
    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Verification execution failed:', err);
    try {
      if (db) await db.close();
    } catch {}
    process.exit(1);
  }
}

main();
