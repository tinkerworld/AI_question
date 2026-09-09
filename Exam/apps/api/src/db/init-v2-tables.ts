import { pgDb } from '@repo/database';

export async function initV2Tables(): Promise<void> {
  try {
    await pgDb.exec(`
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

    // Seed feature controls for all real platform feature areas if empty
    try {
      const fcCount = await pgDb.query(`SELECT COUNT(*) as count FROM "feature_controls"`);
      if (parseInt(fcCount.rows[0]?.count || '0', 10) === 0) {
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
          { key: 'vocabulary', name: 'Vocabulary Practice', desc: 'Flashcard drills and SuperMemo SM-2 retention engine' }
        ];

        for (const f of defaultFeatureControls) {
          await pgDb.query(
            `INSERT INTO "feature_controls" ("id", "featureKey", "name", "description", "status", "message", "allowAdmin", "allowTeacher", "allowStudent", "displayMode")
             VALUES ($1, $2, $3, $4, 'ACTIVE', $5, true, false, false, 'FULL_PAGE')
             ON CONFLICT ("featureKey") DO NOTHING`,
            [`feat_ctrl_${f.key}`, f.key, f.name, f.desc, `${f.name} is temporarily under maintenance.`]
          );
        }
      }
    } catch (fcErr) {
      console.error('[initV2Tables] Warning: Failed to seed feature_controls:', fcErr);
    }

    // Seed audio_voice_profiles if empty
    try {
      const voiceCount = await pgDb.query(`SELECT COUNT(*) as count FROM "audio_voice_profiles"`);
      if (parseInt(voiceCount.rows[0]?.count || '0', 10) === 0) {
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
          await pgDb.query(
            `INSERT INTO "audio_voice_profiles" ("id", "name", "provider", "voiceId", "accent", "gender", "isDefault", "isActive")
             VALUES ($1, $2, $3, $4, $5, $6, $7, true)
             ON CONFLICT ("id") DO NOTHING`,
            [v.id, v.name, v.provider, v.voiceId, v.accent, v.gender, v.isDefault]
          );
        }
      }
    } catch (vErr) {
      console.error('[initV2Tables] Warning: Failed to seed audio_voice_profiles:', vErr);
    }

    // Seed vocabulary_words if empty
    try {
      const vocabCount = await pgDb.query(`SELECT COUNT(*) as count FROM "vocabulary_words"`);
      if (parseInt(vocabCount.rows[0]?.count || '0', 10) === 0) {
        const defaultWords = [
          { word: 'achieve', phonetic: '/əˈtʃiːv/', partOfSpeech: 'verb', definition: 'To successfully accomplish something with effort.', exampleSentence: 'Students work hard to achieve high band scores.', difficulty: 'B1' },
          { word: 'analyse', phonetic: '/ˈæn.əl.aɪz/', partOfSpeech: 'verb', definition: 'To examine something methodically and in detail.', exampleSentence: 'Researchers analyse data before drawing conclusions.', difficulty: 'B2' },
          { word: 'coherent', phonetic: '/kəʊˈhɪə.rənt/', partOfSpeech: 'adjective', definition: 'Logical, orderly, and clearly articulated.', exampleSentence: 'Her essay was praised for its coherent arguments.', difficulty: 'B2' },
          { word: 'demonstrate', phonetic: '/ˈdem.ən.streɪt/', partOfSpeech: 'verb', definition: 'To clearly show or prove something with evidence.', exampleSentence: 'The study demonstrates the impact of sleep on memory.', difficulty: 'B2' },
          { word: 'evaluate', phonetic: '/ɪˈvæl.ju.eɪt/', partOfSpeech: 'verb', definition: 'To judge or calculate the quality or value of something.', exampleSentence: 'Examiners evaluate vocabulary, grammar, and fluency.', difficulty: 'B2' },
          { word: 'formulate', phonetic: '/ˈfɔː.mjə.leɪt/', partOfSpeech: 'verb', definition: 'To develop or express an idea methodically.', exampleSentence: 'Policy makers must formulate sustainable initiatives.', difficulty: 'C1' },
          { word: 'hypothesis', phonetic: '/haɪˈpɒθ.ə.sɪs/', partOfSpeech: 'noun', definition: 'A proposed explanation based on limited evidence.', exampleSentence: 'The scientist tested her hypothesis rigorously.', difficulty: 'C1' },
          { word: 'lucid', phonetic: '/ˈluː.sɪd/', partOfSpeech: 'adjective', definition: 'Expressed clearly and easy to understand.', exampleSentence: 'He provided a lucid explanation of quantum physics.', difficulty: 'C2' },
        ];
        for (const w of defaultWords) {
          const id = `vocab_${w.word.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          await pgDb.query(
            `INSERT INTO "vocabulary_words" ("id", "word", "phonetic", "partOfSpeech", "definition", "exampleSentence", "synonyms", "antonyms", "difficulty", "courseId")
             VALUES ($1, $2, $3, $4, $5, $6, '[]'::jsonb, '[]'::jsonb, $7, 'c3')
             ON CONFLICT ("id") DO NOTHING`,
            [id, w.word, w.phonetic, w.partOfSpeech, w.definition, w.exampleSentence, w.difficulty]
          );
        }
      }
    } catch (wErr) {
      console.error('[initV2Tables] Warning: Failed to seed vocabulary_words:', wErr);
    }

    // Seed q_interview_ielts_flow_01 if missing
    try {
      const qCheck = await pgDb.query(`SELECT "id" FROM "questions" WHERE "id" = 'q_interview_ielts_flow_01'`);
      if (qCheck.rows.length === 0) {
        const ieltsSpeakingRubric = [
          { id: 'fluency', name: 'Fluency & Coherence', maxScore: 9, criteria: ['Speech rate', 'Discourse markers', 'Logical structuring'] },
          { id: 'lexical', name: 'Lexical Resource', maxScore: 9, criteria: ['Academic vocabulary', 'Collocations', 'Idiomatic phrases'] },
          { id: 'grammar', name: 'Grammatical Range & Accuracy', maxScore: 9, criteria: ['Complex structures', 'Syntactic variety', 'Error density'] },
          { id: 'pronunciation', name: 'Pronunciation & Intonation', maxScore: 9, criteria: ['Intelligibility', 'Word stress', 'Pitch variation'] },
        ];
        const q = {
          id: 'q_interview_ielts_flow_01',
          type: 'INTERVIEW',
          content: 'Describe a significant technological innovation that has reshaped modern education in your country. Discuss both its transformative advantages and potential risks.',
          difficulty: 'MEDIUM',
          marks: 9.0,
          status: 'PUBLISHED',
          courseId: 'c3',
          subjectId: 'sub_ielts_speaking',
          syllabusNodeId: 'top_ielts_spk_p2',
          data: {
            examStyle: 'IELTS_SPEAKING',
            preset: 'IELTS_SPEAKING',
            scenario: 'Official IELTS Speaking Examination: Full 3-Part oral interview consisting of Introduction, Part 1 familiar topic discussion, Part 2 cue card monologue, and Part 3 two-way abstract discussion.',
            maxTurns: 10,
            expectedDurationMinutes: 14,
            cueCard: {
              topic: 'A significant technological innovation in education',
              bulletPoints: [
                'What the technology is and how it functions',
                'When and why it was introduced to classrooms',
                'What advantages and challenges students experience',
                'Explain why you consider this innovation significant for the future of learning',
              ],
            },
            rubric: ieltsSpeakingRubric,
          },
        };
        await pgDb.query(
          `INSERT INTO "questions" (
            "id", "type", "content", "data", "difficulty", "marks", "status", "version",
            "courseId", "subjectId", "syllabusNodeId", "createdById", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10, 'usr_admin_test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT ("id") DO UPDATE SET "data" = EXCLUDED."data", "content" = EXCLUDED."content"`,
          [q.id, q.type, q.content, JSON.stringify(q.data), q.difficulty, q.marks, q.status, q.courseId, q.subjectId, q.syllabusNodeId]
        );
      }
    } catch (qErr) {
      console.error('[initV2Tables] Warning: Failed to seed q_interview_ielts_flow_01:', qErr);
    }

    // Ensure 'system.maintenance' permission exists in permissions table and is granted to MAIN_ADMIN and SUB_ADMIN
    try {
      await pgDb.query(`
        INSERT INTO "permissions" ("id", "key", "description", "module")
        VALUES ('p_system_maintenance', 'system.maintenance', 'Configure system and feature level maintenance modes', 'system')
        ON CONFLICT ("key") DO NOTHING
      `);

      await pgDb.query(`
        INSERT INTO "role_permissions" ("roleId", "permissionId")
        SELECT r.id, p.id
        FROM "roles" r
        CROSS JOIN "permissions" p
        WHERE r.name IN ('MAIN_ADMIN', 'SUB_ADMIN') AND p.key = 'system.maintenance'
        ON CONFLICT ("roleId", "permissionId") DO NOTHING
      `);
    } catch (permErr) {
      console.error('[initV2Tables] Warning: Failed to ensure system.maintenance permission:', permErr);
    }

    // Ensure 'isVerified' column exists on 'translations' and metadata columns on 'translation_keys'
    try {
      await pgDb.query(`
        ALTER TABLE "translations" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;
      `);
      await pgDb.query(`
        ALTER TABLE "translation_keys" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'general';
      `);
      await pgDb.query(`
        ALTER TABLE "translation_keys" ADD COLUMN IF NOT EXISTS "module" TEXT NOT NULL DEFAULT 'common';
      `);
      await pgDb.query(`
        INSERT INTO "ai_providers" ("id", "name", "type", "modelId", "baseUrl", "priority", "scope", "isActive")
        VALUES ('prov_trans_batch_mock', 'Deterministic Multilingual Batch Translation Engine', 'MOCK', 'mock-translation-v1', 'http://localhost:4043/internal/ai/mock-translation', 1, 'translation_batch', true)
        ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "scope" = EXCLUDED."scope", "isActive" = true;
      `);
    } catch (tErr) {
      console.error('[initV2Tables] Warning: Failed to ensure translations isVerified column:', tErr);
    }
  } catch (err) {
    console.error('[initV2Tables] Warning: Failed to auto-initialize V2 tables:', err);
  }
}

