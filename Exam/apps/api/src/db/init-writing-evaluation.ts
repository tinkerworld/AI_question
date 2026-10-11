import { pgDb } from '@repo/database';
import { VoiceMicroserviceClient } from '../services/voice-microservice.client';

export async function initWritingEvaluationSchema(): Promise<void> {
  const db = pgDb;

  try {
    // 1. Ensure writing_evaluations table exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS "writing_evaluations" (
        "id" TEXT PRIMARY KEY,
        "sessionId" TEXT,
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "questionId" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
        "attemptId" TEXT,
        "taskType" TEXT NOT NULL DEFAULT 'TASK_2',
        "submittedText" TEXT NOT NULL,
        "questionSnapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "wordCount" INT NOT NULL DEFAULT 0,
        "sentenceCount" INT NOT NULL DEFAULT 0,
        "paragraphCount" INT NOT NULL DEFAULT 0,
        "textStats" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "reviewReasons" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "reliabilityStatus" TEXT NOT NULL DEFAULT 'HIGH',
        "rawModelOutput" TEXT,
        "providerId" TEXT,
        "modelUsed" TEXT,
        "rubricVersion" TEXT NOT NULL DEFAULT 'IELTS_ACADEMIC_2026_V1',
        "promptVersion" TEXT NOT NULL DEFAULT '1.0',
        "retrievalVersion" TEXT NOT NULL DEFAULT '1.0',
        "retrievedDocumentIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "roundedBand" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "bandLabel" TEXT NOT NULL DEFAULT 'Estimated IELTS band 0.0',
        "criteriaScores" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "strengths" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "priorityImprovements" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "grammarCorrections" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "vocabularySuggestions" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "overallFeedback" TEXT,
        "failureReason" TEXT,
        "teacherReviewed" BOOLEAN NOT NULL DEFAULT false,
        "teacherReviewId" TEXT,
        "latestTeacherScore" DOUBLE PRECISION,
        "teacherNotes" TEXT,
        "teacherReviewedAt" TIMESTAMP,
        "idempotencyKey" TEXT UNIQUE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Migration: Add complete examiner criteria columns if not exists
      ALTER TABLE "writing_evaluations" ADD COLUMN IF NOT EXISTS "annotations" JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE "writing_evaluations" ADD COLUMN IF NOT EXISTS "detailedChecks" JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE "writing_evaluations" ADD COLUMN IF NOT EXISTS "errorFreeMetrics" JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE "writing_evaluations" ADD COLUMN IF NOT EXISTS "mainPriority" TEXT;
      ALTER TABLE "writing_evaluations" ADD COLUMN IF NOT EXISTS "nextBandTarget" TEXT;
      ALTER TABLE "writing_evaluations" ADD COLUMN IF NOT EXISTS "taskSpecification" JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE "writing_evaluations" ADD COLUMN IF NOT EXISTS "evaluatorVersion" TEXT NOT NULL DEFAULT '2.0.0';
      ALTER TABLE "writing_evaluations" ADD COLUMN IF NOT EXISTS "rawAverageScore" DOUBLE PRECISION;

      CREATE INDEX IF NOT EXISTS "idx_wrt_eval_user" ON "writing_evaluations"("userId");
      CREATE INDEX IF NOT EXISTS "idx_wrt_eval_question" ON "writing_evaluations"("questionId");
      CREATE INDEX IF NOT EXISTS "idx_wrt_eval_status" ON "writing_evaluations"("status");
      CREATE INDEX IF NOT EXISTS "idx_wrt_eval_task_type" ON "writing_evaluations"("taskType");
      CREATE INDEX IF NOT EXISTS "idx_wrt_eval_idempotency" ON "writing_evaluations"("idempotencyKey");

      CREATE TABLE IF NOT EXISTS "writing_teacher_reviews" (
        "id" TEXT PRIMARY KEY,
        "evaluationId" TEXT NOT NULL REFERENCES "writing_evaluations"("id") ON DELETE CASCADE,
        "teacherId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "originalCriteriaScores" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "correctedCriteriaScores" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "originalOverallScore" DOUBLE PRECISION NOT NULL,
        "correctedOverallScore" DOUBLE PRECISION NOT NULL,
        "teacherNotes" TEXT,
        "isApproved" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "idx_wrt_review_eval" ON "writing_teacher_reviews"("evaluationId");
      CREATE INDEX IF NOT EXISTS "idx_wrt_review_teacher" ON "writing_teacher_reviews"("teacherId");

      ALTER TABLE "writing_teacher_reviews" ADD COLUMN IF NOT EXISTS "correctedAnnotations" JSONB DEFAULT '[]'::jsonb;

      CREATE TABLE IF NOT EXISTS "writing_reference_records" (
        "id" TEXT PRIMARY KEY,
        "workspaceId" TEXT NOT NULL,
        "taskType" TEXT NOT NULL,
        "questionType" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "questionPrompt" TEXT NOT NULL,
        "sampleAnswer" TEXT NOT NULL,
        "bandScore" DOUBLE PRECISION NOT NULL,
        "criterionScores" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "criterionExplanations" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "chartFacts" JSONB DEFAULT '{}'::jsonb,
        "source" TEXT NOT NULL,
        "reviewStatus" TEXT NOT NULL DEFAULT 'APPROVED',
        "version" TEXT NOT NULL DEFAULT '1.0.0',
        "isApproved" BOOLEAN NOT NULL DEFAULT true,
        "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "idx_wrt_ref_task_ws" ON "writing_reference_records"("workspaceId", "taskType", "reviewStatus");

      CREATE TABLE IF NOT EXISTS "writing_question_chart_facts" (
        "questionId" TEXT PRIMARY KEY REFERENCES "questions"("id") ON DELETE CASCADE,
        "isTeacherVerified" BOOLEAN NOT NULL DEFAULT true,
        "verifiedBy" TEXT,
        "verifiedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "chartTitle" TEXT NOT NULL,
        "chartType" TEXT NOT NULL,
        "units" TEXT,
        "timeframes" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "keyDataPoints" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "majorTrends" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "keyComparisons" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "processStagesOrMapChanges" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "expectedOverviewFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "sourceImageUrl" TEXT,
        "notes" TEXT
      );
    `);

    // 2. Ensure Course c3 and Subject sub_ielts_writing exist
    await db.exec(`
      INSERT INTO "courses" ("id", "name", "code", "description", "status")
      VALUES ('c3', 'International English Language Testing System (IELTS)', 'IELTS-101', 'Official IELTS Academic preparation and diagnostic suite', 'PUBLISHED')
      ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "status" = 'PUBLISHED';

      INSERT INTO "subjects" ("id", "courseId", "name", "code", "description")
      VALUES ('sub_ielts_writing', 'c3', 'IELTS Academic Writing', 'IELTS-WRT', 'Data Synthesis (Task 1) & Academic Argumentation (Task 2)')
      ON CONFLICT ("id") DO UPDATE SET "courseId" = 'c3', "name" = EXCLUDED."name";

      INSERT INTO "syllabus_nodes" ("id", "subjectId", "title", "orderIndex")
      VALUES 
        ('top_ielts_write_t1', 'sub_ielts_writing', 'Writing Task 1: Graphical Data, Process & Map Synthesis', 1),
        ('top_ielts_write_t2', 'sub_ielts_writing', 'Writing Task 2: Academic Discursive Essay & Argumentation', 2)
      ON CONFLICT ("id") DO NOTHING;
    `);

    // 3. Seed all standard IELTS Writing Questions (Task 1 & Task 2)
    const questionsToSeed = [
      {
        id: 'q_ielts_wrt_01',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t1',
        type: 'IELTS_WRITING_TASK_1',
        difficulty: 'MEDIUM',
        marks: 9.0,
        content: 'IELTS Academic Writing Task 1: The bar chart illustrates the proportions of renewable electricity generation (solar, wind, and hydroelectric) across five European nations between 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words).',
        data: {
          preset: 'IELTS_TASK_1',
          taskType: 'TASK_1_GRAPH',
          promptStem: 'IELTS Academic Writing Task 1: The bar chart illustrates the proportions of renewable electricity generation across five European nations between 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
          promptText: 'IELTS Academic Writing Task 1: The bar chart illustrates the proportions of renewable electricity generation across five European nations between 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
          promptImageUrl: '/assets/charts/ielts_task1_renewable_energy.svg',
          stimulusText: 'Review the multi-nation renewable electricity generation bar chart (2010 vs 2024) across Germany, United Kingdom, France, Spain, and Norway.',
          minWords: 150,
          minWordCount: 150,
          maxWords: 250,
          maxWordCount: 250,
          recommendedTimeMinutes: 20,
          timeLimitMinutes: 20,
          rubricCriteria: [
            { id: 'task_achievement', name: 'Task Achievement', maxScore: 9, weight: 0.25, description: 'Accurate overview, key features selected and illustrated with data.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Logical paragraph progression, cohesive devices, reference and substitution.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Range of vocabulary, collocations, precision, and spelling accuracy.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Variety of complex structures, error-free sentences, and punctuation.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_02',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t1',
        type: 'IELTS_WRITING_TASK_1',
        difficulty: 'HARD',
        marks: 9.0,
        content: 'IELTS Academic Writing Task 1: The flow diagram illustrates the multi-stage technical process of seawater reverse osmosis desalination and municipal potable water distribution. Summarise the process by describing the main chronological stages. (Write at least 150 words).',
        data: {
          preset: 'IELTS_TASK_1',
          taskType: 'TASK_1_PROCESS',
          promptStem: 'IELTS Academic Writing Task 1: The flow diagram illustrates the multi-stage technical process of seawater reverse osmosis desalination and municipal potable water distribution. Summarise the process by describing the main chronological stages.',
          promptText: 'IELTS Academic Writing Task 1: The flow diagram illustrates the multi-stage technical process of seawater reverse osmosis desalination and municipal potable water distribution. Summarise the process by describing the main chronological stages.',
          promptImageUrl: '/assets/charts/ielts_task1_desalination_process.svg',
          stimulusText: 'Examine the 6-stage seawater reverse osmosis (SWRO) flow diagram: 1. Ocean Intake -> 2. Coagulation & Media Filtration -> 3. High-Pressure Booster Pump -> 4. Polyamide Membrane RO Separation -> 5. Post-Treatment Mineralization -> 6. Municipal Storage & Urban Distribution.',
          minWords: 150,
          minWordCount: 150,
          maxWords: 250,
          maxWordCount: 250,
          recommendedTimeMinutes: 20,
          timeLimitMinutes: 20,
          rubricCriteria: [
            { id: 'task_achievement', name: 'Task Achievement', maxScore: 9, weight: 0.25, description: 'Accurate overview, key features selected and illustrated with data.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Logical paragraph progression, cohesive devices, reference and substitution.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Range of vocabulary, collocations, precision, and spelling accuracy.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Variety of complex structures, error-free sentences, and punctuation.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_03',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t2',
        type: 'IELTS_WRITING_TASK_2',
        difficulty: 'MEDIUM',
        marks: 9.0,
        content: 'IELTS Academic Writing Task 2: In many nations, modern automated artificial intelligence systems are increasingly being deployed in diagnostic medicine and legal adjudication. Some believe this enhances precision and reduces human prejudice, whereas others fear the erosion of empathy and accountability. Discuss both views and give your own opinion. (Write at least 250 words).',
        data: {
          preset: 'IELTS_TASK_2',
          taskType: 'TASK_2_ESSAY',
          promptStem: 'IELTS Academic Writing Task 2: In many nations, modern automated artificial intelligence systems are increasingly being deployed in diagnostic medicine and legal adjudication. Some believe this enhances precision and reduces human prejudice, whereas others fear the erosion of empathy and accountability. Discuss both views and give your own opinion.',
          promptText: 'IELTS Academic Writing Task 2: In many nations, modern automated artificial intelligence systems are increasingly being deployed in diagnostic medicine and legal adjudication. Some believe this enhances precision and reduces human prejudice, whereas others fear the erosion of empathy and accountability. Discuss both views and give your own opinion.',
          minWords: 250,
          minWordCount: 250,
          maxWords: 400,
          maxWordCount: 400,
          recommendedTimeMinutes: 40,
          timeLimitMinutes: 40,
          rubricCriteria: [
            { id: 'task_response', name: 'Task Response', maxScore: 9, weight: 0.25, description: 'Addresses all parts of task, clear position throughout, extended ideas.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Sequencing, clear central topic in each paragraph, cohesive links.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Sufficient range of vocabulary, style, natural collocations, minimal errors.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Complex sentence forms, good control of grammar, clear communicative effect.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_04',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t2',
        type: 'IELTS_WRITING_TASK_2',
        difficulty: 'HARD',
        marks: 9.0,
        content: 'IELTS Academic Writing Task 2: Rapid global urbanization has precipitated an acute shortage of affordable housing, resulting in urban sprawl and environmental degradation. Some argue that governments should impose stringent caps on city expansion and mandate vertical residential high-rises. Others assert that the development of independent satellite eco-towns is the only viable long-term solution. Discuss both views and provide your reasoned verdict. (Write at least 250 words).',
        data: {
          preset: 'IELTS_TASK_2',
          taskType: 'TASK_2_ESSAY',
          promptStem: 'IELTS Academic Writing Task 2: Rapid global urbanization has precipitated an acute shortage of affordable housing, resulting in urban sprawl and environmental degradation. Discuss both views and provide your reasoned verdict.',
          promptText: 'IELTS Academic Writing Task 2: Rapid global urbanization has precipitated an acute shortage of affordable housing, resulting in urban sprawl and environmental degradation. Discuss both views and provide your reasoned verdict.',
          minWords: 250,
          minWordCount: 250,
          maxWords: 400,
          maxWordCount: 400,
          recommendedTimeMinutes: 40,
          timeLimitMinutes: 40,
          rubricCriteria: [
            { id: 'task_response', name: 'Task Response', maxScore: 9, weight: 0.25, description: 'Addresses all parts of task, clear position throughout, extended ideas.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Sequencing, clear central topic in each paragraph, cohesive links.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Sufficient range of vocabulary, style, natural collocations, minimal errors.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Complex sentence forms, good control of grammar, clear communicative effect.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_05',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t1',
        type: 'IELTS_WRITING_TASK_1',
        difficulty: 'MEDIUM',
        marks: 9.0,
        content: 'IELTS Academic Writing Task 1: The demographic population pyramid illustrates the proportion of age cohorts and gender distributions in an industrialized nation comparing 1970 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words).',
        data: {
          preset: 'IELTS_TASK_1',
          taskType: 'TASK_1_GRAPH',
          promptStem: 'IELTS Academic Writing Task 1: The demographic population pyramid illustrates the proportion of age cohorts and gender distributions comparing 1970 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
          promptText: 'IELTS Academic Writing Task 1: The demographic population pyramid illustrates the proportion of age cohorts and gender distributions comparing 1970 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
          promptImageUrl: '/assets/charts/ielts_task1_population_pyramid.svg',
          minWords: 150,
          minWordCount: 150,
          maxWords: 250,
          maxWordCount: 250,
          recommendedTimeMinutes: 20,
          timeLimitMinutes: 20,
          rubricCriteria: [
            { id: 'task_achievement', name: 'Task Achievement', maxScore: 9, weight: 0.25, description: 'Accurate overview, key features selected and illustrated with data.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Logical paragraph progression, cohesive devices, reference and substitution.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Range of vocabulary, collocations, precision, and spelling accuracy.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Variety of complex structures, error-free sentences, and punctuation.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_06',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t1',
        type: 'IELTS_WRITING_TASK_1',
        difficulty: 'HARD',
        marks: 9.0,
        content: 'IELTS Academic Writing Task 1: The two maps illustrate the layout of an international airport terminal in 2010 and following substantial structural redevelopment in 2024. Summarise the changes by describing the main reconfigurations and newly added transit infrastructure. (Write at least 150 words).',
        data: {
          preset: 'IELTS_TASK_1',
          taskType: 'TASK_1_MAP',
          promptStem: 'IELTS Academic Writing Task 1: The two maps illustrate the layout of an international airport terminal in 2010 and following redevelopment in 2024. Summarise the changes by describing the main reconfigurations and transit infrastructure.',
          promptText: 'IELTS Academic Writing Task 1: The two maps illustrate the layout of an international airport terminal in 2010 and following redevelopment in 2024. Summarise the changes by describing the main reconfigurations and transit infrastructure.',
          promptImageUrl: '/assets/charts/ielts_task1_airport_redevelopment.svg',
          minWords: 150,
          minWordCount: 150,
          maxWords: 250,
          maxWordCount: 250,
          recommendedTimeMinutes: 20,
          timeLimitMinutes: 20,
          rubricCriteria: [
            { id: 'task_achievement', name: 'Task Achievement', maxScore: 9, weight: 0.25, description: 'Accurate overview, key features selected and illustrated with data.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Logical paragraph progression, cohesive devices, reference and substitution.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Range of vocabulary, collocations, precision, and spelling accuracy.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Variety of complex structures, error-free sentences, and punctuation.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_07',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t2',
        type: 'IELTS_WRITING_TASK_2',
        difficulty: 'MEDIUM',
        marks: 9.0,
        content: 'IELTS Academic Writing Task 2: Some people believe that spending enormous sums of money on space exploration is an irresponsible use of global resources when severe issues such as poverty, hunger, and environmental degradation persist on Earth. To what extent do you agree or disagree? (Write at least 250 words).',
        data: {
          preset: 'IELTS_TASK_2',
          taskType: 'TASK_2_ESSAY',
          promptStem: 'IELTS Academic Writing Task 2: Some people believe that spending enormous sums of money on space exploration is an irresponsible use of global resources when severe issues persist on Earth. To what extent do you agree or disagree?',
          promptText: 'IELTS Academic Writing Task 2: Some people believe that spending enormous sums of money on space exploration is an irresponsible use of global resources when severe issues persist on Earth. To what extent do you agree or disagree?',
          minWords: 250,
          minWordCount: 250,
          maxWords: 400,
          maxWordCount: 400,
          recommendedTimeMinutes: 40,
          timeLimitMinutes: 40,
          rubricCriteria: [
            { id: 'task_response', name: 'Task Response', maxScore: 9, weight: 0.25, description: 'Addresses all parts of task, clear position throughout, extended ideas.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Sequencing, clear central topic in each paragraph, cohesive links.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Sufficient range of vocabulary, style, natural collocations, minimal errors.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Complex sentence forms, good control of grammar, clear communicative effect.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_08',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t2',
        type: 'IELTS_WRITING_TASK_2',
        difficulty: 'HARD',
        marks: 9.0,
        content: 'IELTS Academic Writing Task 2: While international tourism fosters cross-cultural diplomacy and brings economic prosperity, it frequently triggers ecological degradation, cultural commercialization, and soaring living costs for native inhabitants. Do the benefits of international tourism outweigh its drawbacks? (Write at least 250 words).',
        data: {
          preset: 'IELTS_TASK_2',
          taskType: 'TASK_2_ESSAY',
          promptStem: 'IELTS Academic Writing Task 2: While international tourism fosters cross-cultural diplomacy and brings economic prosperity, it frequently triggers ecological degradation and soaring living costs. Do the benefits of international tourism outweigh its drawbacks?',
          promptText: 'IELTS Academic Writing Task 2: While international tourism fosters cross-cultural diplomacy and brings economic prosperity, it frequently triggers ecological degradation and soaring living costs. Do the benefits of international tourism outweigh its drawbacks?',
          minWords: 250,
          minWordCount: 250,
          maxWords: 400,
          maxWordCount: 400,
          recommendedTimeMinutes: 40,
          timeLimitMinutes: 40,
          rubricCriteria: [
            { id: 'task_response', name: 'Task Response', maxScore: 9, weight: 0.25, description: 'Addresses all parts of task, clear position throughout, extended ideas.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Sequencing, clear central topic in each paragraph, cohesive links.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Sufficient range of vocabulary, style, natural collocations, minimal errors.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Complex sentence forms, good control of grammar, clear communicative effect.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_09',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t1',
        type: 'IELTS_WRITING_TASK_1',
        difficulty: 'MEDIUM',
        marks: 9.0,
        content: 'IELTS Academic Writing Task 1: The comparative table details international student enrolments across six major universities between 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words).',
        data: {
          preset: 'IELTS_TASK_1',
          taskType: 'TASK_1_TABLE',
          promptStem: 'IELTS Academic Writing Task 1: The comparative table details international student enrolments across six major universities between 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
          promptText: 'IELTS Academic Writing Task 1: The comparative table details international student enrolments across six major universities between 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
          promptImageUrl: '/assets/charts/ielts_task1_student_enrolments_table.svg',
          stimulusText: 'Review the comparative table detailing international student enrolments across six major universities (Oxford, Cambridge, Melbourne, Toronto, NUS, Imperial) between 2015 and 2025. Highlight significant proportional shifts and totals.',
          minWords: 150,
          minWordCount: 150,
          maxWords: 250,
          maxWordCount: 250,
          recommendedTimeMinutes: 20,
          timeLimitMinutes: 20,
          rubricCriteria: [
            { id: 'task_achievement', name: 'Task Achievement', maxScore: 9, weight: 0.25, description: 'Accurate overview, key features selected and illustrated with data.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Logical paragraph progression, cohesive devices, reference and substitution.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Range of vocabulary, collocations, precision, and spelling accuracy.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Variety of complex structures, error-free sentences, and punctuation.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_gt_01',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t1',
        type: 'IELTS_WRITING_TASK_1',
        difficulty: 'MEDIUM',
        marks: 9.0,
        content: 'IELTS General Training Writing Task 1: You have noticed severe road damage and dangerous potholes near your neighborhood school. Write a formal letter to your local municipal council. In your letter: describe the road conditions and exact hazard location; explain how this affects neighborhood residents and schoolchildren; propose specific urgent repairs and safety measures. (Write at least 150 words).',
        data: {
          preset: 'IELTS_TASK_1',
          taskType: 'TASK_1_GENERAL',
          promptStem: 'IELTS General Training Writing Task 1: You have noticed severe road damage and dangerous potholes near your neighborhood school. Write a formal letter to your local municipal council.',
          promptText: 'IELTS General Training Writing Task 1: You have noticed severe road damage and dangerous potholes near your neighborhood school. Write a formal letter to your local municipal council.',
          minWords: 150,
          minWordCount: 150,
          maxWords: 250,
          maxWordCount: 250,
          recommendedTimeMinutes: 20,
          timeLimitMinutes: 20,
          taskSpecification: {
            taskType: 'TASK_1_GENERAL',
            generalTask1: {
              recipient: 'AUTHORITY',
              purpose: 'Complain about severe road damage and request municipal road repair',
              requiredBulletPoints: [
                'describe road conditions and location',
                'explain consequences for residents and schoolchildren',
                'propose specific urgent repairs and safety measures'
              ],
              expectedTone: 'FORMAL'
            }
          },
          rubricCriteria: [
            { id: 'task_achievement', name: 'Task Achievement', maxScore: 9, weight: 0.25, description: 'Clear purpose, all bullet points covered, appropriate formal tone.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Logical paragraph progression, formal transitions, clear sequencing.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Formal municipal vocabulary, collocations, precise request terminology.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Complex formal sentence structures, error-free grammar and punctuation.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_gt_02',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t1',
        type: 'IELTS_WRITING_TASK_1',
        difficulty: 'EASY',
        marks: 9.0,
        content: 'IELTS General Training Writing Task 1: A close friend has written to you inviting you to their hometown, but you have not replied for several weeks. Write an informal letter to your friend. In your letter: apologize for the delay in writing back; explain why you have been so busy; invite them to visit you instead and propose holiday activities. (Write at least 150 words).',
        data: {
          preset: 'IELTS_TASK_1',
          taskType: 'TASK_1_GENERAL',
          promptStem: 'IELTS General Training Writing Task 1: A close friend has written to you inviting you to their hometown. Write an informal letter to your friend.',
          promptText: 'IELTS General Training Writing Task 1: A close friend has written to you inviting you to their hometown. Write an informal letter to your friend.',
          minWords: 150,
          minWordCount: 150,
          maxWords: 250,
          maxWordCount: 250,
          recommendedTimeMinutes: 20,
          timeLimitMinutes: 20,
          taskSpecification: {
            taskType: 'TASK_1_GENERAL',
            generalTask1: {
              recipient: 'FRIEND',
              purpose: 'Apologize for delayed reply, explain circumstances, and invite friend to visit',
              requiredBulletPoints: [
                'apologize for the delay in writing back',
                'explain why you have been busy',
                'invite them to visit and propose holiday plans'
              ],
              expectedTone: 'INFORMAL'
            }
          },
          rubricCriteria: [
            { id: 'task_achievement', name: 'Task Achievement', maxScore: 9, weight: 0.25, description: 'Friendly purpose, all bullet points developed, warm informal tone.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Natural paragraph flow, conversational linkers, smooth sequencing.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Natural idiomatic expressions, varied vocabulary, informal register.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Variety of sentence forms, conversational flow, accurate grammar.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_10',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t2',
        type: 'IELTS_WRITING_TASK_2',
        difficulty: 'MEDIUM',
        marks: 9.0,
        content: 'IELTS Academic Writing Task 2: In many nations around the globe, biodiversity is declining at an alarming rate, and countless plant and animal species are facing extinction. What are the principal causes of this crisis, and what severe effects will it have on humanity and the global ecosystem? (Write at least 250 words).',
        data: {
          preset: 'IELTS_TASK_2',
          taskType: 'TASK_2_ESSAY',
          promptStem: 'IELTS Academic Writing Task 2: Biodiversity is declining at an alarming rate. What are the principal causes of this crisis, and what severe effects will it have?',
          promptText: 'IELTS Academic Writing Task 2: Biodiversity is declining at an alarming rate. What are the principal causes of this crisis, and what severe effects will it have?',
          minWords: 250,
          minWordCount: 250,
          maxWords: 400,
          maxWordCount: 400,
          recommendedTimeMinutes: 40,
          timeLimitMinutes: 40,
          taskSpecification: {
            taskType: 'TASK_2',
            task2: {
              questionType: 'CAUSES_EFFECTS',
              individualInstructions: [
                'Explain the principal root causes of accelerating biodiversity loss',
                'Analyze the severe direct and indirect consequences for humanity and ecosystems'
              ],
              requiresPosition: false
            }
          },
          rubricCriteria: [
            { id: 'task_response', name: 'Task Response', maxScore: 9, weight: 0.25, description: 'Both causes and effects analyzed thoroughly with concrete illustrations.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Cause-and-effect logical transitions, distinct paragraphs, clear topic sentences.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Ecological and scientific terminology, collocations, precision.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Complex causative and conditional sentences, high grammatical control.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_11',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t2',
        type: 'IELTS_WRITING_TASK_2',
        difficulty: 'HARD',
        marks: 9.0,
        content: 'IELTS Academic Writing Task 2: Due to advances in medical science and improved public sanitation, average human life expectancy has increased significantly in recent decades. Why are people living longer today, and is this demographic transition a positive or negative development overall? (Write at least 250 words).',
        data: {
          preset: 'IELTS_TASK_2',
          taskType: 'TASK_2_ESSAY',
          promptStem: 'IELTS Academic Writing Task 2: Average human life expectancy has increased significantly. Why are people living longer today, and is this demographic transition a positive or negative development overall?',
          promptText: 'IELTS Academic Writing Task 2: Average human life expectancy has increased significantly. Why are people living longer today, and is this demographic transition a positive or negative development overall?',
          minWords: 250,
          minWordCount: 250,
          maxWords: 400,
          maxWordCount: 400,
          recommendedTimeMinutes: 40,
          timeLimitMinutes: 40,
          taskSpecification: {
            taskType: 'TASK_2',
            task2: {
              questionType: 'TWO_PART',
              individualInstructions: [
                'Identify and analyze why human life expectancy has lengthened',
                'Provide an unambiguous evaluated stance on whether this shift is predominantly positive or negative'
              ],
              requiresPosition: true
            }
          },
          rubricCriteria: [
            { id: 'task_response', name: 'Task Response', maxScore: 9, weight: 0.25, description: 'Addresses both distinct questions with clear sustained position.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Logical progression between medical causes and societal consequences.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Demographic, medical, and socioeconomic vocabulary and collocations.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Complex comparative and evaluative structures, high grammatical accuracy.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_12',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t1',
        type: 'IELTS_WRITING_TASK_1',
        difficulty: 'MEDIUM',
        marks: 9.0,
        content: 'IELTS Academic Writing Task 1: The line graph illustrates annual global carbon dioxide (CO₂) emissions across four regions (China, United States, European Union, and India) between 1990 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words).',
        data: {
          preset: 'IELTS_TASK_1',
          taskType: 'TASK_1_GRAPH',
          promptStem: 'IELTS Academic Writing Task 1: The line graph illustrates annual global carbon dioxide (CO₂) emissions across four regions (China, United States, European Union, and India) between 1990 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
          promptText: 'IELTS Academic Writing Task 1: The line graph illustrates annual global carbon dioxide (CO₂) emissions across four regions (China, United States, European Union, and India) between 1990 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
          promptImageUrl: '/assets/charts/ielts_task1_global_co2_trends.svg',
          stimulusText: 'Review the multi-region CO2 emissions line graph (1990 to 2025) comparing China, the United States, the European Union, and India. Highlight primary trajectories, divergences, and key crossover points.',
          minWords: 150,
          minWordCount: 150,
          maxWords: 250,
          maxWordCount: 250,
          recommendedTimeMinutes: 20,
          timeLimitMinutes: 20,
          rubricCriteria: [
            { id: 'task_achievement', name: 'Task Achievement', maxScore: 9, weight: 0.25, description: 'Accurate overview, key features selected and illustrated with data.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Logical paragraph progression, cohesive devices, reference and substitution.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Range of vocabulary, collocations, precision, and spelling accuracy.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Variety of complex structures, error-free sentences, and punctuation.' },
          ],
        },
      },
      {
        id: 'q_ielts_wrt_13',
        subjectId: 'sub_ielts_writing',
        syllabusNodeId: 'top_ielts_write_t1',
        type: 'IELTS_WRITING_TASK_1',
        difficulty: 'MEDIUM',
        marks: 9.0,
        content: 'IELTS Academic Writing Task 1: The two pie charts compare the proportions of average weekly household expenditure across six spending categories in a nation in 1975 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words).',
        data: {
          preset: 'IELTS_TASK_1',
          taskType: 'TASK_1_PIE',
          promptStem: 'IELTS Academic Writing Task 1: The two pie charts compare the proportions of average weekly household expenditure across six spending categories in a nation in 1975 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
          promptText: 'IELTS Academic Writing Task 1: The two pie charts compare the proportions of average weekly household expenditure across six spending categories in a nation in 1975 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
          promptImageUrl: '/assets/charts/ielts_task1_household_expenditure_pie.svg',
          stimulusText: 'Review the two expenditure pie charts (1975 vs 2025) comparing Food & Groceries, Housing & Energy, Transport & Fuel, Tech & Telecom, Leisure, and Clothing. Note budget shifts from essentials to tech and housing.',
          minWords: 150,
          minWordCount: 150,
          maxWords: 250,
          maxWordCount: 250,
          recommendedTimeMinutes: 20,
          timeLimitMinutes: 20,
          rubricCriteria: [
            { id: 'task_achievement', name: 'Task Achievement', maxScore: 9, weight: 0.25, description: 'Accurate overview, key features selected and illustrated with data.' },
            { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Logical paragraph progression, cohesive devices, reference and substitution.' },
            { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Range of vocabulary, collocations, precision, and spelling accuracy.' },
            { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Variety of complex structures, error-free sentences, and punctuation.' },
          ],
        },
      },
    ];

    for (const q of questionsToSeed) {
      await db.query(
        `INSERT INTO "questions" (
          "id", "type", "content", "data", "difficulty", "marks", "status", "version",
          "courseId", "subjectId", "syllabusNodeId", "createdById", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PUBLISHED', 1, 'c3', $7, $8, 'usr_admin_test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("id") DO UPDATE SET
          "type" = EXCLUDED."type",
          "content" = EXCLUDED."content",
          "data" = EXCLUDED."data",
          "difficulty" = EXCLUDED."difficulty",
          "marks" = EXCLUDED."marks",
          "status" = 'PUBLISHED',
          "courseId" = 'c3',
          "subjectId" = EXCLUDED."subjectId",
          "syllabusNodeId" = EXCLUDED."syllabusNodeId"`,
        [q.id, q.type, q.content, JSON.stringify(q.data), q.difficulty, q.marks, q.subjectId, q.syllabusNodeId]
      );
    }

    // Migrate any legacy WRITING questions to specialized IELTS categories
    await db.query(`
      UPDATE "questions"
      SET "type" = 'IELTS_WRITING_TASK_1', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "type" = 'WRITING' AND (
        "data"->>'preset' = 'IELTS_TASK_1' OR 
        "data"->>'taskType' LIKE 'TASK_1%' OR
        "content" ILIKE '%task 1%'
      )
    `);

    await db.query(`
      UPDATE "questions"
      SET "type" = 'IELTS_WRITING_TASK_2', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "type" = 'WRITING' AND (
        "data"->>'preset' = 'IELTS_TASK_2' OR 
        "data"->>'taskType' LIKE 'TASK_2%' OR
        "content" ILIKE '%task 2%'
      )
    `);

    // 4. Seed Teacher-Verified Chart Facts for Task 1 questions
    await db.query(`
      INSERT INTO "writing_question_chart_facts" (
        "questionId", "isTeacherVerified", "verifiedBy", "chartTitle", "chartType", "units",
        "timeframes", "keyDataPoints", "majorTrends", "keyComparisons", "processStagesOrMapChanges",
        "expectedOverviewFeatures", "sourceImageUrl", "notes"
      ) VALUES 
      (
        'q_ielts_wrt_01',
        true,
        'usr_admin_test',
        'Renewable Electricity Generation by Source (2010 vs 2024)',
        'BAR_CHART',
        'percentage share of total domestic generation (%)',
        ARRAY['2010', '2024'],
        '[
          {"country": "Norway", "2010": {"hydro": 90, "wind": 1, "solar": 0}, "2024": {"hydro": 88, "wind": 5, "solar": 1}},
          {"country": "Germany", "2010": {"hydro": 4, "wind": 9, "solar": 3}, "2024": {"hydro": 4, "wind": 32, "solar": 18}},
          {"country": "United Kingdom", "2010": {"hydro": 2, "wind": 5, "solar": 0}, "2024": {"hydro": 2, "wind": 28, "solar": 7}},
          {"country": "Spain", "2010": {"hydro": 12, "wind": 16, "solar": 2}, "2024": {"hydro": 11, "wind": 26, "solar": 20}},
          {"country": "France", "2010": {"hydro": 11, "wind": 2, "solar": 1}, "2024": {"hydro": 12, "wind": 10, "solar": 6}}
        ]'::jsonb,
        ARRAY[
          'Wind and solar electricity generation expanded substantially across all five nations between 2010 and 2024.',
          'Hydroelectric power shares remained virtually flat/stable across all surveyed countries.',
          'Germany and Spain recorded the most dramatic proportional expansions in solar power.'
        ],
        ARRAY[
          'Norway maintained by far the highest total renewable share, dominated overwhelmingly by hydroelectricity (>85%).',
          'Wind became the single largest renewable component in Germany (32%) and the UK (28%) by 2024.',
          'Solar generation rose from negligible figures (<3%) in 2010 to significant double-digit shares in Spain (20%) and Germany (18%).'
        ],
        ARRAY[]::TEXT[],
        ARRAY[
          'An overview statement noting overall growth in renewables across all 5 nations.',
          'Observation that wind and solar drove the expansion while hydro remained steady.',
          'Highlighting Norway as the highest overall generator throughout the entire period.'
        ],
        '/assets/charts/ielts_task1_renewable_energy.svg',
        'Teacher-verified data based on Cambridge IELTS Academic Benchmark series.'
      ),
      (
        'q_ielts_wrt_02',
        true,
        'usr_admin_test',
        'Seawater Reverse Osmosis (SWRO) Desalination Process',
        'PROCESS_FLOW',
        'process stages / technical workflow',
        ARRAY['continuous industrial operational cycle'],
        '[
          {"stage": 1, "title": "Ocean Intake", "description": "Raw seawater is drawn from deep ocean intake pipes with protective marine screens."},
          {"stage": 2, "title": "Coagulation & Dual-Media Filtration", "description": "Chemical coagulants bind micro-particles, and anthracite/sand filters remove suspended solids."},
          {"stage": 3, "title": "High-Pressure Booster Pump", "description": "High-pressure pumps generate 60-80 bar to overcome natural osmotic pressure."},
          {"stage": 4, "title": "Reverse Osmosis Membrane Separation", "description": "Semi-permeable polyamide spiral membranes separate fresh permeate water from concentrated brine reject."},
          {"stage": 5, "title": "Post-Treatment & Remineralization", "description": "Permeate receives calcium/magnesium rebalancing, pH adjustment, and chlorine disinfection."},
          {"stage": 6, "title": "Storage & Municipal Distribution", "description": "Potable water is pumped into covered reservoirs and distributed into the municipal drinking network."}
        ]'::jsonb,
        ARRAY[
          'Linear sequential industrial process from ocean intake to municipal tap.',
          'Bifurcation at the membrane stage: potable water moves forward to post-treatment while reject brine is discharged to the sea.'
        ],
        ARRAY[
          'Pre-treatment handles physical sediment removal while reverse osmosis handles dissolved mineral separation.',
          'Post-treatment chemically restores taste and microbiological safety after filtration strips minerals.'
        ],
        ARRAY[
          'Stage 1: Ocean Water Extraction',
          'Stage 2: Physical & Chemical Pre-Treatment',
          'Stage 3: High-Pressure Pumping',
          'Stage 4: Polyamide Membrane RO Separation',
          'Stage 5: Remineralization & Disinfection',
          'Stage 6: Municipal Water Supply & Brine Discharge'
        ],
        ARRAY[
          'Identification of the process as a six-stage industrial desalination workflow.',
          'Clear recognition of two key outputs: potable drinking water for consumers and concentrated brine return.'
        ],
        '/assets/charts/ielts_task1_desalination_process.svg',
        'Teacher-verified engineering schematics.'
      ),
      (
        'q_ielts_wrt_05',
        true,
        'usr_admin_test',
        'Demographic Population Pyramid: Age Cohorts & Gender (1970 vs 2024)',
        'POPULATION_PYRAMID',
        'percentage share of national population (%)',
        ARRAY['1970', '2024'],
        '[
          {"cohort": "0-14 yrs", "1970": {"male": 14.5, "female": 14.0, "total": 28.5}, "2024": {"male": 5.0, "female": 4.5, "total": 9.5}},
          {"cohort": "15-29 yrs", "1970": {"male": 12.0, "female": 11.5, "total": 23.5}, "2024": {"male": 8.5, "female": 8.0, "total": 16.5}},
          {"cohort": "30-44 yrs", "1970": {"male": 10.5, "female": 10.5, "total": 21.0}, "2024": {"male": 10.0, "female": 10.0, "total": 20.0}},
          {"cohort": "45-59 yrs", "1970": {"male": 8.5, "female": 9.0, "total": 17.5}, "2024": {"male": 11.5, "female": 11.5, "total": 23.0}},
          {"cohort": "60-74 yrs", "1970": {"male": 4.5, "female": 6.0, "total": 10.5}, "2024": {"male": 9.5, "female": 10.5, "total": 20.0}},
          {"cohort": "75+ yrs", "1970": {"male": 1.5, "female": 2.5, "total": 4.0}, "2024": {"male": 4.5, "female": 6.5, "total": 11.0}}
        ]'::jsonb,
        ARRAY[
          'Significant contraction of the youth population under 30 years old between 1970 and 2024.',
          'Pronounced expansion in the elderly segments aged 60 and over, more than doubling from 14.5% to 31.0%.'
        ],
        ARRAY[
          'In 1970, children aged 0-14 constituted the largest cohort at 28.5%, whereas in 2024 the 45-59 age group became dominant at 23.0%.',
          'Females consistently outnumbered males in the 75+ bracket in both years (2.5% vs 1.5% in 1970; 6.5% vs 4.5% in 2024).'
        ],
        ARRAY[]::TEXT[],
        ARRAY[
          'Overview noting the demographic transition from an expansive young population pyramid in 1970 to an inverted aging demographic structure by 2024.',
          'Highlighting the sharp drop in children (0-14) and the dramatic rise in seniors (60+).'
        ],
        '/assets/charts/ielts_task1_population_pyramid.svg',
        'Teacher-verified demographic statistical data.'
      ),
      (
        'q_ielts_wrt_06',
        true,
        'usr_admin_test',
        'Southwest International Airport: Terminal Layout (2010 vs 2024)',
        'MAP_COMPARISON',
        'structural site plans / spatial map features',
        ARRAY['2010', '2024'],
        '[
          {"feature": "Departure Gates", "2010": 8, "2024": 18, "change": "+10 gates across dual satellite concourses"},
          {"feature": "Vehicle Parking", "2010": 250, "2024": 1500, "change": "6-fold increase via new multi-storey garage"},
          {"feature": "Check-in Desks", "2010": 14, "2024": 40, "change": "Nearly tripled with automated baggage drops"},
          {"feature": "Public Rail Link", "2010": "None (Taxi only)", "2024": "Direct Underground Metro Rail Station & SkyTrain", "change": "New rapid transit integration"}
        ]'::jsonb,
        ARRAY[
          'Significant expansion of terminal footprint, more than doubling passenger boarding capacity from 8 to 18 gates.',
          'Transformation of landside transport from private vehicular and taxi reliance to integrated multi-modal rail transit.'
        ],
        ARRAY[
          'The single linear concourse in 2010 was replaced by an expanded terminal with dual Y-shaped satellite concourses.',
          'Surface parking lot was replaced by a 5-level multi-storey car park increasing capacity from 250 to 1,500 spaces.'
        ],
        ARRAY[
          'Addition of automated SkyTrain people mover linking main terminal to satellite gates.',
          'Introduction of underground metro link directly connecting the terminal to the city center.',
          'Construction of central duty-free mall, VIP lounges, and currency exchange.'
        ],
        ARRAY[
          'Overview describing the modernization and expansion from a modest regional single-concourse terminal into a major multi-modal transit hub.',
          'Highlighting increased gate capacity and introduction of direct rail connectivity.'
        ],
        '/assets/charts/ielts_task1_airport_redevelopment.svg',
        'Teacher-verified airport engineering masterplan maps.'
      ),
      (
        'q_ielts_wrt_09',
        true,
        'usr_admin_test',
        'International Student Enrolments Across Six Major Universities (2015 vs 2025)',
        'COMPARATIVE_TABLE',
        'student headcount / percentage change (%)',
        ARRAY['2015', '2025'],
        '[
          {"institution": "University of Oxford", "country": "UK", "2015": 8400, "2025": 12600, "netChange": 4200, "growthPercent": 50.0},
          {"institution": "University of Cambridge", "country": "UK", "2015": 7500, "2025": 11100, "netChange": 3600, "growthPercent": 48.0},
          {"institution": "University of Melbourne", "country": "Australia", "2015": 14200, "2025": 22700, "netChange": 8500, "growthPercent": 59.9},
          {"institution": "University of Toronto", "country": "Canada", "2015": 15800, "2025": 27400, "netChange": 11600, "growthPercent": 73.4},
          {"institution": "National University of Singapore", "country": "Singapore", "2015": 8900, "2025": 10800, "netChange": 1900, "growthPercent": 21.3},
          {"institution": "Imperial College London", "country": "UK", "2015": 9100, "2025": 13200, "netChange": 4100, "growthPercent": 45.1}
        ]'::jsonb,
        ARRAY[
          'International student enrolments increased across all six surveyed universities between 2015 and 2025.',
          'The University of Toronto consistently maintained the highest student cohort and recorded the highest growth rate (+73.4%).',
          'National University of Singapore experienced the slowest proportional growth at +21.3%.'
        ],
        ARRAY[
          'University of Toronto and University of Melbourne educated far higher numbers of international students than the UK and Singapore universities throughout both years.',
          'Toronto gained 11,600 additional international students, which was more than double Oxford (+4,200) and triple Cambridge (+3,600).',
          'Total international enrolments across all six institutions grew by over 53% from 63,900 in 2015 to 97,800 in 2025.'
        ],
        ARRAY[]::TEXT[],
        ARRAY[
          'Overview identifying overall growth across all six higher education institutions.',
          'Identification of Toronto as the highest volume and fastest-growing university.',
          'Recognition of NUS as having the lowest rate of expansion despite increasing numbers.'
        ],
        '/assets/charts/ielts_task1_student_enrolments_table.svg',
        'Teacher-verified benchmark international admissions statistics.'
      ),
      (
        'q_ielts_wrt_12',
        true,
        'usr_admin_test',
        'Global Carbon Dioxide (CO₂) Emissions in Four Regions (1990–2025)',
        'LINE_GRAPH',
        'Gigatonnes (Gt) of CO2 equivalent per year',
        ARRAY['1990', '1995', '2000', '2005', '2010', '2015', '2020', '2025'],
        '[
          {"region": "China", "1990": 2.4, "2000": 3.5, "2010": 8.5, "2020": 11.7, "2025": 12.8},
          {"region": "United States", "1990": 5.1, "2000": 6.0, "2010": 5.6, "2020": 4.7, "2025": 4.6},
          {"region": "European Union", "1990": 4.4, "2000": 4.1, "2010": 3.8, "2020": 2.9, "2025": 2.7},
          {"region": "India", "1990": 0.6, "2000": 1.0, "2010": 1.7, "2020": 2.4, "2025": 2.9}
        ]'::jsonb,
        ARRAY[
          'China experienced unprecedented exponential growth, overtaking the United States around 2006 to become the dominant global emitter.',
          'Emissions from the United States and the European Union exhibited a steady long-term downward trajectory after peaking.',
          'India witnessed consistent gradual increases throughout the 35-year timeframe.'
        ],
        ARRAY[
          'In 1990, the United States was the highest emitter at 5.1 Gt, more than double China (2.4 Gt). By 2025, China emitted 12.8 Gt, nearly triple US emissions (4.6 Gt).',
          'EU emissions steadily declined from 4.4 Gt to 2.7 Gt, being overtaken by India around 2022.',
          'India overtook the EU in annual emissions by 2025 (2.9 Gt vs 2.7 Gt).'
        ],
        ARRAY[]::TEXT[],
        ARRAY[
          'Overview highlighting diverging trajectories: rapid expansion in Asian economies (China, India) contrasted with steady reductions in western regions (US, EU).',
          'Noting China as overtaking the US to become the highest emitter by a large margin.',
          'Noting India surpassing the European Union towards the end of the period.'
        ],
        '/assets/charts/ielts_task1_global_co2_trends.svg',
        'Teacher-verified emissions data based on global environmental monitoring series.'
      ),
      (
        'q_ielts_wrt_13',
        true,
        'usr_admin_test',
        'Comparative Household Expenditure Distribution (1975 vs 2025)',
        'PIE_CHART',
        'percentage share of total weekly household expenditure (%)',
        ARRAY['1975', '2025'],
        '[
          {"category": "Food & Groceries", "1975": 35, "2025": 16, "change": -19},
          {"category": "Housing & Energy", "1975": 22, "2025": 32, "change": 10},
          {"category": "Clothing", "1975": 15, "2025": 5, "change": -10},
          {"category": "Transport & Fuel", "1975": 14, "2025": 17, "change": 3},
          {"category": "Leisure", "1975": 12, "2025": 16, "change": 4},
          {"category": "Tech & Telecom", "1975": 2, "2025": 14, "change": 12}
        ]'::jsonb,
        ARRAY[
          'Proportion spent on food and clothing declined drastically over the 50-year interval.',
          'Housing and energy surged to become the single largest expenditure category by 2025.',
          'Tech and telecommunications witnessed a seven-fold proportional expansion from 2% to 14%.'
        ],
        ARRAY[
          'Food was the largest expenditure in 1975 at 35%, but fell to 16% in 2025, being supplanted by Housing (32%).',
          'Clothing experienced a 3-fold contraction from 15% in 1975 to just 5% in 2025.',
          'Tech & Telecom rose from being negligible at 2% in 1975 to 14% in 2025.'
        ],
        ARRAY[]::TEXT[],
        ARRAY[
          'Overview identifying the major structural shift away from basic subsistence (food, clothing) toward housing and modern technological communication.',
          'Identification of Housing as the new dominant expenditure category in 2025.',
          'Highlighting the dramatic rise in tech spending alongside steep drops in grocery shares.'
        ],
        '/assets/charts/ielts_task1_household_expenditure_pie.svg',
        'Teacher-verified national economic statistical survey.'
      )
      ON CONFLICT ("questionId") DO UPDATE SET
        "isTeacherVerified" = EXCLUDED."isTeacherVerified",
        "chartTitle" = EXCLUDED."chartTitle",
        "keyDataPoints" = EXCLUDED."keyDataPoints",
        "majorTrends" = EXCLUDED."majorTrends",
        "keyComparisons" = EXCLUDED."keyComparisons",
        "expectedOverviewFeatures" = EXCLUDED."expectedOverviewFeatures";
    `);

    // 5. Seed Reviewed Reference Records for Task 1 and Task 2 Knowledge Workspaces
    await db.query(`
      INSERT INTO "writing_reference_records" (
        "id", "workspaceId", "taskType", "questionType", "title", "questionPrompt", "sampleAnswer",
        "bandScore", "criterionScores", "criterionExplanations", "chartFacts", "source", "reviewStatus", "version", "isApproved", "tags"
      ) VALUES
      (
        'wrt_ref_task1_01',
        'ws_ielts_writing_task1',
        'TASK_1',
        'BAR_CHART',
        'European Renewable Electricity Generation Benchmark',
        'The bar chart illustrates the proportions of renewable electricity generation across five European nations between 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        'The provided bar chart compares the percentage shares of renewable electricity generated via solar, wind, and hydroelectric sources across five European countries over a 14-year period from 2010 to 2024. Overall, renewable energy generation expanded substantially in all five nations, with wind and solar recording the most pronounced percentage gains, while hydroelectric power remained dominant in Norway. In 2010, Norway led all surveyed nations with hydroelectricity accounting for nearly 90% of its domestic output, a proportion that remained virtually unchanged by 2024 at approximately 88%. By contrast, wind power in Germany witnessed a dramatic upward trajectory, surging from roughly 9% in 2010 to over 32% in 2024. Solar generation in Spain climbed from 2% to nearly 20%, while the United Kingdom exhibited a parallel expansion in offshore wind to 28%. France maintained modest gains across solar and wind while retaining a stable baseline of hydroelectricity at around 11%.',
        8.5,
        '{"task_achievement": 8.5, "coherence_cohesion": 8.5, "lexical_resource": 8.5, "grammatical_range": 8.5}'::jsonb,
        '{
          "task_achievement": "Exemplary overview highlighting overarching growth; key comparative features selected and supported with accurate percentage data.",
          "coherence_cohesion": "Smooth logical progression from global overview to country-specific comparisons; varied cohesive devices used without friction.",
          "lexical_resource": "Rich, precise vocabulary for quantitative trends (percentage gains, dramatic upward trajectory, parallel expansion).",
          "grammatical_range": "High syntactic versatility featuring participle clauses, complex comparative structures, and total grammatical accuracy."
        }'::jsonb,
        '{"units": "percentage share (%)", "timeframes": ["2010", "2024"]}'::jsonb,
        'Senior Examiner Verification Series 2026',
        'APPROVED',
        '1.0.0',
        true,
        ARRAY['task1', 'bar_chart', 'energy', 'band8.5']
      ),
      (
        'wrt_ref_task1_02',
        'ws_ielts_writing_task1',
        'TASK_1',
        'PROCESS_DIAGRAM',
        'Seawater Reverse Osmosis Technical Process Benchmark',
        'The flow diagram illustrates the multi-stage technical process of seawater reverse osmosis desalination and municipal potable water distribution. Summarise the process by describing the main chronological stages.',
        'The flow diagram delineates the sequential technical stages involved in extracting, treating, and purifying ocean seawater through high-pressure reverse osmosis filtration before mineral rebalancing and municipal delivery. Overall, the operation encompasses six distinct chronological phases, commencing with ocean extraction and culminating in domestic potable supply, while separated brine is returned to the sea. Initially, raw seawater is drawn via submerged ocean intake pipes into pre-treatment tanks where chemical coagulation and dual-media filtration eliminate suspended debris. Subsequently, a high-pressure booster pump propels the clarified saline solution through semi-permeable polyamide membranes. Fresh water permeates through, whereas concentrated brine reject is safely diverted and discharged into the ocean. In the post-treatment phase, the permeate undergoes remineralization with calcium alongside chlorine disinfection. Finally, the safe drinking water is pumped into covered elevated reservoirs and distributed into the municipal municipal water network.',
        8.5,
        '{"task_achievement": 8.5, "coherence_cohesion": 8.5, "lexical_resource": 8.5, "grammatical_range": 8.5}'::jsonb,
        '{
          "task_achievement": "Accurately identifies all 6 sequential stages and the critical dual-stream output of freshwater and brine reject.",
          "coherence_cohesion": "Clear chronological sequencing markers (initially, subsequently, in the post-treatment phase, finally).",
          "lexical_resource": "Accurate technical and process vocabulary (semi-permeable polyamide membranes, permeate, coagulation, remineralization).",
          "grammatical_range": "Flawless passive voice implementations essential for academic process descriptions."
        }'::jsonb,
        '{"stagesCount": 6, "type": "industrial_process"}'::jsonb,
        'Senior Examiner Verification Series 2026',
        'APPROVED',
        '1.0.0',
        true,
        ARRAY['task1', 'process_flow', 'engineering', 'band8.5']
      ),
      (
        'wrt_ref_task2_01',
        'ws_ielts_writing_task2',
        'TASK_2',
        'OPINION_ESSAY',
        'Space Exploration vs Terrestrial Funding Discursive Benchmark',
        'Some people believe that spending enormous sums of money on space exploration is an irresponsible use of global resources when severe issues persist on Earth. To what extent do you agree or disagree?',
        'In an era marked by profound social inequality, escalating climate instability, and overburdened healthcare systems, allocating billions of dollars to extraterrestrial exploration frequently evokes intense moral reproach. Many critics maintain that humanitarian crises on Earth demand total fiscal prioritization over speculative interplanetary voyages. While addressing human suffering is undeniably an ethical imperative, I disagree that defunding space exploration is the remedy, as astronomical research provides the technological, ecological, and economic tools essential for solving terrestrial problems.\n\nFirst, the perceived dichotomy between space spending and domestic poverty alleviation relies on a fundamental misconception regarding how space budgets are utilized. Governments do not literally send piles of cash into orbit; rather, capital is invested terrestrially in scientists, engineers, manufacturing supply chains, and academic research institutions. The aerospace sector drives high-wage employment, scientific infrastructure, and tax revenues that directly finance social welfare programs. Furthermore, global space budgets represent a minuscule fraction of national expenditures compared to military defense and corporate subsidies, making it illogical to blame space initiatives for socioeconomic neglect.\n\nMore importantly, space exploration yields indispensable technological spin-offs that directly mitigate acute planetary and human suffering. Modern satellite constellations provide the real-time meteorological and orbital imagery required to model climate change, track agricultural drought patterns, optimize freshwater distribution, and orchestrate humanitarian disaster relief during catastrophic typhoons. Medical innovations originally developed for astronaut survival—such as advanced dialysis filtration, portable cardiac monitors, and robotic micro-surgical tools—have transformed public healthcare worldwide. Defunding space programs would cripple our ability to safeguard global food security and monitor environmental collapse.\n\nIn conclusion, astronomical exploration is not an extravagant vanity project, but an indispensable catalyst for scientific progress and planetary stewardship. Rather than curtailing space exploration, governments should reallocate wasteful military spending toward poverty alleviation while sustaining the orbital innovations that protect humanity''s collective future.',
        8.5,
        '{"task_response": 8.5, "coherence_cohesion": 8.5, "lexical_resource": 8.5, "grammatical_range": 8.5}'::jsonb,
        '{
          "task_response": "Fully addresses all parts of the prompt with a clear and compelling nuanced position throughout; deeply extended and well-supported rationale.",
          "coherence_cohesion": "Masterful paragraph structure with elegant transitions between economic counter-arguments and concrete technological spin-offs.",
          "lexical_resource": "Exceptional academic register and collocations (intense moral reproach, perceived dichotomy, meteorological and orbital imagery, indispensable catalyst).",
          "grammatical_range": "Effortless deployment of complex subordinating conjunctions, non-finite clauses, and inversion."
        }'::jsonb,
        '{}'::jsonb,
        'Official IELTS Senior Examiner Exemplar Bank 2026',
        'APPROVED',
        '1.0.0',
        true,
        ARRAY['task2', 'opinion', 'space', 'science', 'band8.5']
      ),
      (
        'wrt_ref_task2_02',
        'ws_ielts_writing_task2',
        'TASK_2',
        'DISCUSSION_ESSAY',
        'AI in Medicine and Legal Adjudication Benchmark',
        'In many nations, modern automated artificial intelligence systems are increasingly being deployed in diagnostic medicine and legal adjudication. Some believe this enhances precision and reduces human prejudice, whereas others fear the erosion of empathy and accountability. Discuss both views and give your own opinion.',
        'The accelerating integration of artificial intelligence into critical domains such as clinical healthcare and judicial administration has provoked fierce debate regarding the optimal balance between computational precision and human discretion. Proponents argue that machine learning models minimize diagnostic oversights and eradicate subjective judicial prejudice. Conversely, skeptics caution that algorithmic opacity undermines moral accountability and eliminates necessary human empathy. In my assessment, while algorithmic diagnostics serve as exceptional advisory instruments, final verdicts in both medical treatment and legal sentencing must remain firmly anchored in human moral judgment.\n\nOn one hand, the principal argument for deploying automated systems lies in their unmatched analytical speed and empirical consistency. In diagnostic medicine, deep neural networks can inspect thousands of radiological scans within seconds, identifying subtle oncological anomalies that fatigue or cognitive bias might cause human physicians to overlook. Similarly, in legal bail and sentencing recommendations, predictive risk models are lauded for neutralizing human prejudices associated with racial profiling or socioeconomic status, theoretically providing a standardized standard of equitable justice.\n\nOn the other hand, the profound peril of algorithmic governance stems from the absence of moral consciousness and contextual empathy. Medical prognosis involves more than statistical survival probabilities; it demands compassionate dialogue regarding quality of life and patient values. Likewise, the administration of justice requires understanding individual mitigating circumstances—an intrinsically qualitative assessment that black-box algorithms cannot replicate. If an autonomous model issues a catastrophic diagnostic recommendation or an unjust penal sentence, legal accountability becomes dangerously diffused.\n\nIn conclusion, while the analytical precision of artificial intelligence provides revolutionary support in identifying clinical patterns and standardizing judicial data, it cannot substitute for moral empathy. AI systems should function strictly as decision-support mechanisms, leaving final life-altering decisions to accountable human practitioners.',
        8.5,
        '{"task_response": 8.5, "coherence_cohesion": 8.5, "lexical_resource": 8.5, "grammatical_range": 8.5}'::jsonb,
        '{
          "task_response": "Balanced discussion of both medical/legal benefits and ethical perils, concluding with an articulate, nuanced position.",
          "coherence_cohesion": "Smooth discourse development and parallel structural balance between the two perspectives.",
          "lexical_resource": "Nuanced academic discourse markers and domain-specific terminology (algorithmic opacity, empirical consistency, cognitive bias, black-box algorithms).",
          "grammatical_range": "Sophisticated complex syntax with varied sentence lengths and flawless grammar."
        }'::jsonb,
        '{}'::jsonb,
        'Official IELTS Senior Examiner Exemplar Bank 2026',
        'APPROVED',
        '1.0.0',
        true,
        ARRAY['task2', 'discussion', 'ai', 'ethics', 'band8.5']
      ),
      (
        'wrt_ref_task1_03',
        'ws_ielts_writing_task1',
        'TASK_1',
        'BAR_CHART',
        'Renewable Electricity European Trends Benchmark (Band 6.5)',
        'The bar chart illustrates the proportions of renewable electricity generation across five European nations between 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        'The chart illustrates the proportion of renewable electricity in five European countries in 2010 and 2024. Overall, renewable energy increased in all five countries, and Norway remained the highest throughout the period. In 2010, Norway produced about 90% of electricity from hydroelectric sources, and in 2024 it stayed almost the same at around 88%. Denmark showed the fastest growth, rising from 21% in 2010 to 55% in 2024, mainly driven by wind energy. Germany and Spain also showed increases. Germany wind energy increased from 9% to 32%, and Spain solar rose from 2% to 20%. The UK also grew in wind from 5% to 28%. In summary, every country increased its renewable capacity.',
        6.5,
        '{"task_achievement": 6.5, "coherence_cohesion": 6.5, "lexical_resource": 6.5, "grammatical_range": 6.5}'::jsonb,
        '{
          "task_achievement": "Identifies the main trends and provides an overview, but comparisons between countries are largely mechanical listing.",
          "coherence_cohesion": "Organized into paragraphs, but transition phrases are repetitive (In 2010, Denmark showed, Germany and Spain also).",
          "lexical_resource": "Adequate vocabulary for describing changes (fastest growth, rising from, mainly driven by) with limited flexibility.",
          "grammatical_range": "Mix of simple and complex sentences; grammar is generally clear with few minor punctuation slips."
        }'::jsonb,
        '{"units": "percentage share (%)", "timeframes": ["2010", "2024"]}'::jsonb,
        'Senior Examiner Verification Series 2026',
        'APPROVED',
        '1.0.0',
        true,
        ARRAY['task1', 'bar_chart', 'energy', 'band6.5']
      ),
      (
        'wrt_ref_task1_04',
        'ws_ielts_writing_task1',
        'TASK_1',
        'POPULATION_PYRAMID',
        'Demographic Population Pyramid Shifts Benchmark (Band 8.5)',
        'The demographic population pyramid illustrates the proportion of male and female citizens across six age brackets in 1970 and 2024. Summarise the data by reporting the main features and making comparisons.',
        'The population pyramids compare the distribution of males and females across six distinct age cohorts between 1970 and 2024. Overall, the demographic profile underwent a dramatic transition from an expansive, youth-dominated structure in 1970 to an inverted, aging demographic distribution by 2024, with elderly cohorts expanding while the youth population contracted significantly. In 1970, children aged 0-14 represented the largest segment, with males and females comprising 14.5% and 14.0% of the total population respectively (28.5% combined). By 2024, this youngest cohort had dropped sharply to 9.5% overall (5.0% males and 4.5% females). Conversely, the senior segments expanded substantially. Citizens aged 60 to 74 nearly doubled from 10.5% in 1970 to 20.0% in 2024, with balanced gender representation. In the oldest category (75+), females consistently outnumbered males in both surveyed years, rising from 2.5% in 1970 to 6.5% in 2024, compared to male figures of 1.5% and 4.5% respectively.',
        8.5,
        '{"task_achievement": 8.5, "coherence_cohesion": 8.5, "lexical_resource": 8.5, "grammatical_range": 8.5}'::jsonb,
        '{
          "task_achievement": "Outstanding overview capturing the demographic inversion; reports exact male and female percentages and contrasts youth contraction with elderly expansion.",
          "coherence_cohesion": "Smooth logical progression from general demographic transition to youth cohorts, followed by senior cohorts and gender comparisons.",
          "lexical_resource": "Precise demographic terminology (inverted aging demographic distribution, gender representation, expansive youth-dominated structure).",
          "grammatical_range": "Complex comparative sentence structures, accurate adverbial placement, and zero grammatical errors."
        }'::jsonb,
        '{"units": "percentage share of national population (%)", "timeframes": ["1970", "2024"]}'::jsonb,
        'Senior Examiner Verification Series 2026',
        'APPROVED',
        '1.0.0',
        true,
        ARRAY['task1', 'population_pyramid', 'demographic', 'band8.5']
      ),
      (
        'wrt_ref_task1_05',
        'ws_ielts_writing_task1',
        'TASK_1',
        'POPULATION_PYRAMID',
        'Demographic Population Pyramid Shifts Benchmark (Band 6.0)',
        'The demographic population pyramid illustrates the proportion of male and female citizens across six age brackets in 1970 and 2024. Summarise the data by reporting the main features and making comparisons.',
        'The chart gives information about population ages and gender in 1970 and 2024. Overall, the population became older and the number of young people decreased over the period. In 1970, the 0-14 age group was the largest group with around 14.5% for boys and 14% for girls. In 2024, this group decreased to only 5% for males and 4.5% for females. On the other hand, older people increased. People aged 60-74 was 10.5% in 1970 and became 20% in 2024. For 75+, women were 2.5% in 1970 and 6.5% in 2024, while men were 1.5% and 4.5%. In conclusion, there were fewer children and more old people.',
        6.0,
        '{"task_achievement": 6.0, "coherence_cohesion": 6.0, "lexical_resource": 6.0, "grammatical_range": 6.0}'::jsonb,
        '{
          "task_achievement": "Presents an overview and includes relevant numbers, but intermediate age groups (15-29, 30-44, 45-59) are omitted.",
          "coherence_cohesion": "Basic paragraphing and simple transitions (In 1970, On the other hand, In conclusion); some mechanical sequencing.",
          "lexical_resource": "Adequate vocabulary for description (decreased, increased, largest group), but repetitive phrasing.",
          "grammatical_range": "Mix of simple and compound sentences with occasional agreement errors (People aged 60-74 was)."
        }'::jsonb,
        '{"units": "percentage share of national population (%)", "timeframes": ["1970", "2024"]}'::jsonb,
        'Senior Examiner Verification Series 2026',
        'APPROVED',
        '1.0.0',
        true,
        ARRAY['task1', 'population_pyramid', 'demographic', 'band6.0']
      ),
      (
        'wrt_ref_task2_03',
        'ws_ielts_writing_task2',
        'TASK_2',
        'PROBLEM_SOLUTION',
        'Urbanization and Affordable Housing Benchmark (Band 8.0)',
        'Rapid global urbanization has precipitated an acute shortage of affordable housing, resulting in urban sprawl and environmental degradation. Discuss the causes and evaluate solutions.',
        'In recent decades, unprecedented demographic shifts toward metropolitan regions have placed severe strain on municipal housing stock, triggering suburban sprawl and ecological destruction. Addressing this complex crisis requires combining vertical densification with the coordinated development of sustainable satellite communities.\n\nFirst, housing unaffordability is primarily caused by static urban zoning laws and speculative real estate investment. In many global capitals, archaic height restrictions prevent brownfield redevelopment, forcing developers into greenfield suburban fringes where infrastructure delivery is economically inefficient. Furthermore, treating residential property as a speculative asset class rather than public utility has inflated land values beyond the reach of average wage earners.\n\nTo remediate these issues, governments must pursue a dual-pronged strategy. On one hand, upzoning inner-city transport corridors for high-density vertical high-rises provides immediate capacity while conserving surrounding agrarian land. On the other hand, building self-contained satellite eco-towns equipped with dedicated rail links, regional hospitals, and enterprise zones relieves pressure on central business districts.\n\nIn conclusion, resolving metropolitan housing deficits requires both vertical urban densification and master-planned regional eco-communities to ensure long-term livability.',
        8.0,
        '{"task_response": 8.0, "coherence_cohesion": 8.0, "lexical_resource": 8.0, "grammatical_range": 8.0}'::jsonb,
        '{
          "task_response": "Thoroughly answers all aspects of the prompt with well-developed causes and practical, multi-faceted solutions.",
          "coherence_cohesion": "Smooth logical progression from underlying causes to targeted remedial policies.",
          "lexical_resource": "Rich, academic vocabulary (vertical densification, speculative asset class, brownfield redevelopment, self-contained satellite eco-towns).",
          "grammatical_range": "Controlled variety of complex structures with accurate participial phrases and compound sentences."
        }'::jsonb,
        '{}'::jsonb,
        'Official IELTS Senior Examiner Exemplar Bank 2026',
        'APPROVED',
        '1.0.0',
        true,
        ARRAY['task2', 'problem_solution', 'urbanization', 'housing', 'band8.0']
      ),
      (
        'wrt_ref_task2_04',
        'ws_ielts_writing_task2',
        'TASK_2',
        'OPINION_ESSAY',
        'Space Exploration vs Terrestrial Needs Benchmark (Band 6.5)',
        'Some people believe that spending enormous sums of money on space exploration is an irresponsible use of global resources when severe issues persist on Earth. To what extent do you agree or disagree?',
        'Many individuals believe that governments spend too much money on space missions while there are serious problems like poverty and starvation on Earth. In my opinion, although social issues require urgent funding, space exploration should not be stopped completely because it produces helpful technologies for human beings.\n\nFirst of all, investing in space creates advanced technology that helps ordinary citizens. For example, weather satellites help meteorologists warn farmers about storms and droughts, which protects food supplies. In addition, many medical devices like heart monitors were originally created by space scientists. Therefore, money spent on space brings practical benefits back to our society.\n\nOn the other hand, governments should balance their budgets more carefully. It is true that millions of people lack basic healthcare and clean drinking water. If space agencies spend trillions without helping poor communities directly, citizens will feel that their tax money is wasted. Hence, governments must control unnecessary spending on Mars missions.\n\nIn conclusion, while domestic welfare should be prioritized, space programs provide essential scientific knowledge and should receive reasonable support.',
        6.5,
        '{"task_response": 6.5, "coherence_cohesion": 6.5, "lexical_resource": 6.5, "grammatical_range": 6.5}'::jsonb,
        '{
          "task_response": "Presents a clear position that is relevant to the question, with main points supported by basic examples.",
          "coherence_cohesion": "Logically structured with standard paragraphing, but cohesive markers are formulaic (First of all, In addition, On the other hand, In conclusion).",
          "lexical_resource": "Adequate lexical resource with clear meaning (weather satellites, food supplies, practical benefits), but lacks sophisticated collocations.",
          "grammatical_range": "Good control of simple and compound structures; occasional repetition of sentence patterns."
        }'::jsonb,
        '{}'::jsonb,
        'Official IELTS Senior Examiner Exemplar Bank 2026',
        'APPROVED',
        '1.0.0',
        true,
        ARRAY['task2', 'opinion', 'space', 'technology', 'band6.5']
      )
      ON CONFLICT ("id") DO UPDATE SET
        "title" = EXCLUDED."title",
        "sampleAnswer" = EXCLUDED."sampleAnswer",
        "criterionScores" = EXCLUDED."criterionScores",
        "criterionExplanations" = EXCLUDED."criterionExplanations",
        "reviewStatus" = 'APPROVED',
        "isApproved" = true;
    `);

    // 6. Asynchronously ensure microservice workspaces exist
    ensureMicroserviceWritingWorkspaces().catch((err) => {
      console.warn('[WritingEvaluation] Warning: Microservice workspace registration deferred:', err.message);
    });

    console.log('[initWritingEvaluationSchema] Writing evaluation engine tables, facts, and benchmarks initialized successfully.');
  } catch (err: any) {
    console.error('[initWritingEvaluationSchema] Error initializing writing schema:', err);
  }
}

/**
 * Ensures Task 1 and Task 2 workspaces exist on the voice/RAG microservice.
 */
export async function ensureMicroserviceWritingWorkspaces(): Promise<void> {
  const client = VoiceMicroserviceClient.getInstance();
  try {
    const isHealthy = await client.isHealthy();
    if (!isHealthy) return;

    const existingWorkspaces = await client.listWorkspaces();
    const existingIds = new Set(existingWorkspaces.map((w: any) => w.id));

    const hasT1 = Array.from(existingIds).some((id) => id === 'ws_ielts_writing_task1' || id.startsWith('ws_ielts_writing_task_1'));
    const hasT2 = Array.from(existingIds).some((id) => id === 'ws_ielts_writing_task2' || id.startsWith('ws_ielts_writing_task_2'));

    if (!hasT1) {
      await client.createWorkspace(
        'IELTS Writing Task 1 Academic Benchmark Repository',
        'IELTS Writing Task 1',
        'Reviewed reference benchmarks for IELTS Academic Task 1: Bar charts, line graphs, pie charts, tables, process diagrams, and maps.',
        ['ielts_task1', 'data_synthesis', 'charts', 'processes', 'maps']
      ).catch(() => {});
    }

    if (!hasT2) {
      await client.createWorkspace(
        'IELTS Writing Task 2 Academic Discursive Repository',
        'IELTS Writing Task 2',
        'Reviewed reference benchmarks for IELTS Academic Task 2: Opinion essays, discussion essays, advantages/disadvantages, problem/solution, and direct questions.',
        ['ielts_task2', 'discursive_essay', 'argumentation', 'coherence', 'critical_thinking']
      ).catch(() => {});
    }
  } catch (err: any) {
    // Non-blocking: remote microservice workspace creation is idempotent and soft-failing
  }
}
