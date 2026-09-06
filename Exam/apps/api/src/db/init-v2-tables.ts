import { pgDb } from '@repo/database';

export async function initV2Tables(): Promise<void> {
  try {
    await pgDb.exec(`
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

      CREATE INDEX IF NOT EXISTS "idx_vocab_words_course" ON "vocabulary_words"("courseId");
      CREATE INDEX IF NOT EXISTS "idx_student_vocab_due" ON "student_vocabulary_progress"("userId", "nextReviewDue");
      CREATE INDEX IF NOT EXISTS "idx_promotional_rules_key" ON "promotional_entitlement_rules"("featureKey");
    `);

    // Seed default feature registry if empty
    const featCount = await pgDb.query(`SELECT COUNT(*) as count FROM "feature_registry"`);
    if (parseInt(featCount.rows[0].count, 10) === 0) {
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
        await pgDb.query(
          `INSERT INTO "feature_registry" ("id", "key", "name", "type", "defaultValue", "category", "description")
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT ("key") DO NOTHING`,
          [`feat_${f.key}`, f.key, f.name, f.type, f.defaultValue, f.category, f.desc]
        );
      }
    }

    // Seed default voices if empty
    const voiceCount = await pgDb.query(`SELECT COUNT(*) as count FROM "audio_voice_profiles"`);
    if (parseInt(voiceCount.rows[0].count, 10) === 0) {
      const defaultVoices = [
        { id: 'voice_en_gb_01', name: 'Emma (Received Pronunciation)', provider: 'MOCK', voiceId: 'en-GB-Neural2-A', accent: 'British', gender: 'FEMALE', isDefault: true },
        { id: 'voice_en_us_01', name: 'James (Standard General American)', provider: 'MOCK', voiceId: 'en-US-Neural2-D', accent: 'American', gender: 'MALE', isDefault: false },
        { id: 'voice_en_au_01', name: 'Charlotte (Australian Native)', provider: 'MOCK', voiceId: 'en-AU-Neural2-C', accent: 'Australian', gender: 'FEMALE', isDefault: false },
        { id: 'voice_en_in_01', name: 'Pooja (Indian English)', provider: 'MOCK', voiceId: 'en-IN-Neural2-D', accent: 'Indian', gender: 'FEMALE', isDefault: false },
      ];

      for (const v of defaultVoices) {
        await pgDb.query(
          `INSERT INTO "audio_voice_profiles" ("id", "name", "provider", "voiceId", "accent", "gender", "isDefault", "isActive")
           VALUES ($1, $2, $3, $4, $5, $6, $7, true) ON CONFLICT ("id") DO NOTHING`,
          [v.id, v.name, v.provider, v.voiceId, v.accent, v.gender, v.isDefault]
        );
      }
    }

    // Seed sample vocabulary words if empty
    const wordCount = await pgDb.query(`SELECT COUNT(*) as count FROM "vocabulary_words"`);
    if (parseInt(wordCount.rows[0].count, 10) === 0) {
      const sampleWords = [
        {
          id: 'vocab_01',
          word: 'Ubiquitous',
          phonetic: '/juːˈbɪk.wɪ.təs/',
          partOfSpeech: 'Adjective',
          definition: 'Present, appearing, or found everywhere simultaneously.',
          exampleSentence: 'Smartphones have become ubiquitous in modern metropolitan life.',
          synonyms: ['omnipresent', 'pervasive', 'universal'],
          antonyms: ['rare', 'scarce', 'seldom'],
          difficulty: 'C1',
        },
        {
          id: 'vocab_02',
          word: 'Ameliorate',
          phonetic: '/əˈmiː.li.ə.reɪt/',
          partOfSpeech: 'Verb',
          definition: 'To make something bad or unsatisfactory better or more tolerable.',
          exampleSentence: 'Targeted policy reforms helped ameliorate socioeconomic hardships.',
          synonyms: ['improve', 'mitigate', 'alleviate'],
          antonyms: ['worsen', 'exacerbate', 'aggravate'],
          difficulty: 'C1',
        },
        {
          id: 'vocab_03',
          word: 'Ephemeral',
          phonetic: '/ɪˈfem.ər.əl/',
          partOfSpeech: 'Adjective',
          definition: 'Lasting for a very brief period of time; fleeting.',
          exampleSentence: 'The ephemeral morning mist vanished as soon as sunlight crested the horizon.',
          synonyms: ['transient', 'fleeting', 'momentary'],
          antonyms: ['enduring', 'permanent', 'perpetual'],
          difficulty: 'B2',
        },
        {
          id: 'vocab_04',
          word: 'Equilibrium',
          phonetic: '/ˌiː.kwəˈlɪb.ri.əm/',
          partOfSpeech: 'Noun',
          definition: 'A state in which opposing forces or influences are balanced.',
          exampleSentence: 'The chemical reaction achieved dynamic equilibrium at constant pressure.',
          synonyms: ['balance', 'symmetry', 'poise'],
          antonyms: ['imbalance', 'disequilibrium'],
          difficulty: 'B2',
        },
        {
          id: 'vocab_05',
          word: 'Pragmatic',
          phonetic: '/præɡˈmæt.ɪk/',
          partOfSpeech: 'Adjective',
          definition: 'Dealing with things sensibly and realistically based on practical considerations.',
          exampleSentence: 'Engineers adopted a pragmatic approach to meet the tight deadline.',
          synonyms: ['practical', 'realistic', 'sensible'],
          antonyms: ['idealistic', 'impractical'],
          difficulty: 'B2',
        },
      ];

      for (const w of sampleWords) {
        await pgDb.query(
          `INSERT INTO "vocabulary_words" ("id", "word", "phonetic", "partOfSpeech", "definition", "exampleSentence", "synonyms", "antonyms", "difficulty")
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9) ON CONFLICT ("id") DO NOTHING`,
          [w.id, w.word, w.phonetic, w.partOfSpeech, w.definition, w.exampleSentence, JSON.stringify(w.synonyms), JSON.stringify(w.antonyms), w.difficulty]
        );
      }
    }
  } catch (err) {
    console.error('[initV2Tables] Warning: Failed to auto-initialize V2 tables:', err);
  }
}
