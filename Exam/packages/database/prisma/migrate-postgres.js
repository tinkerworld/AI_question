const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

function getDbPath() {
  if (process.env.PG_DATA_DIR) {
    return path.resolve(process.env.PG_DATA_DIR);
  }
  let cur = __dirname;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, 'start_all.bat')) || fs.existsSync(path.join(cur, 'ExamOS-Build-Directive.md'))) {
      const targetDir = path.join(cur, 'postgres-data');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      return targetDir;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  const fallback = path.resolve(process.cwd(), 'postgres-data');
  if (!fs.existsSync(fallback)) {
    fs.mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

const dbPath = getDbPath();
const pidFile = path.join(dbPath, 'postmaster.pid');
if (fs.existsSync(pidFile)) {
  try {
    fs.unlinkSync(pidFile);
  } catch {}
}

const db = new PGlite(dbPath);

async function migrate() {
  console.log('Applying native PostgreSQL 16 DDL schema to PGlite database:', dbPath);

  await db.exec(`
    -- Drop existing tables if present
    DROP TABLE IF EXISTS "interview_turns" CASCADE;
    DROP TABLE IF EXISTS "interview_sessions" CASCADE;
    DROP TABLE IF EXISTS "ai_generation_jobs" CASCADE;
    DROP TABLE IF EXISTS "ai_usage_history" CASCADE;
    DROP TABLE IF EXISTS "user_ai_credits" CASCADE;
    DROP TABLE IF EXISTS "ai_gateway_logs" CASCADE;
    DROP TABLE IF EXISTS "ai_prompt_templates" CASCADE;
    DROP TABLE IF EXISTS "ai_providers" CASCADE;
    DROP TABLE IF EXISTS "preview_audit_logs" CASCADE;
    DROP TABLE IF EXISTS "impersonation_sessions" CASCADE;
    DROP TABLE IF EXISTS "preview_profiles" CASCADE;
    DROP TABLE IF EXISTS "mastery_tracking" CASCADE;
    DROP TABLE IF EXISTS "practice_attempt_answers" CASCADE;
    DROP TABLE IF EXISTS "practice_attempts" CASCADE;
    DROP TABLE IF EXISTS "practice_questions" CASCADE;
    DROP TABLE IF EXISTS "practice_papers" CASCADE;
    DROP TABLE IF EXISTS "mastery_score_history" CASCADE;
    DROP TABLE IF EXISTS "student_strengths" CASCADE;
    DROP TABLE IF EXISTS "student_weaknesses" CASCADE;
    DROP TABLE IF EXISTS "student_topic_progress" CASCADE;
    DROP TABLE IF EXISTS "student_mastery" CASCADE;
    DROP TABLE IF EXISTS "exam_files" CASCADE;
    DROP TABLE IF EXISTS "exam_corrections" CASCADE;
    DROP TABLE IF EXISTS "exam_reviewers" CASCADE;
    DROP TABLE IF EXISTS "exam_workflow_logs" CASCADE;
    DROP TABLE IF EXISTS "exam_snapshot_questions" CASCADE;
    DROP TABLE IF EXISTS "exam_snapshot_sections" CASCADE;
    DROP TABLE IF EXISTS "exam_snapshots" CASCADE;
    DROP TABLE IF EXISTS "question_attempts" CASCADE;
    DROP TABLE IF EXISTS "exam_attempts" CASCADE;
    DROP TABLE IF EXISTS "exam_questions" CASCADE;
    DROP TABLE IF EXISTS "exam_sections" CASCADE;
    DROP TABLE IF EXISTS "exams" CASCADE;
    DROP TABLE IF EXISTS "exam_pattern_section_difficulties" CASCADE;
    DROP TABLE IF EXISTS "exam_pattern_section_topics" CASCADE;
    DROP TABLE IF EXISTS "exam_pattern_section_rules" CASCADE;
    DROP TABLE IF EXISTS "exam_pattern_sections" CASCADE;
    DROP TABLE IF EXISTS "exam_pattern_subjects" CASCADE;
    DROP TABLE IF EXISTS "exam_patterns" CASCADE;
    DROP TABLE IF EXISTS "user_preferences" CASCADE;
    DROP TABLE IF EXISTS "translations" CASCADE;
    DROP TABLE IF EXISTS "translation_keys" CASCADE;
    DROP TABLE IF EXISTS "languages" CASCADE;
    DROP TABLE IF EXISTS "previous_exam_usages" CASCADE;
    DROP TABLE IF EXISTS "question_tags" CASCADE;
    DROP TABLE IF EXISTS "tags" CASCADE;
    DROP TABLE IF EXISTS "question_versions" CASCADE;
    DROP TABLE IF EXISTS "questions" CASCADE;
    DROP TABLE IF EXISTS "enrollments" CASCADE;
    DROP TABLE IF EXISTS "syllabus_nodes" CASCADE;
    DROP TABLE IF EXISTS "subjects" CASCADE;
    DROP TABLE IF EXISTS "courses" CASCADE;
    DROP TABLE IF EXISTS "entity_versions" CASCADE;
    DROP TABLE IF EXISTS "audit_logs" CASCADE;
    DROP TABLE IF EXISTS "refresh_tokens" CASCADE;
    DROP TABLE IF EXISTS "user_roles" CASCADE;
    DROP TABLE IF EXISTS "role_permissions" CASCADE;
    DROP TABLE IF EXISTS "permissions" CASCADE;
    DROP TABLE IF EXISTS "roles" CASCADE;
    DROP TABLE IF EXISTS "users" CASCADE;

    DROP TYPE IF EXISTS "ExamStatus" CASCADE;
    DROP TYPE IF EXISTS "DistributionType" CASCADE;
    DROP TYPE IF EXISTS "ExamPatternType" CASCADE;
    DROP TYPE IF EXISTS "ExamPatternStatus" CASCADE;
    DROP TYPE IF EXISTS "ThemeMode" CASCADE;
    DROP TYPE IF EXISTS "QuestionStatus" CASCADE;
    DROP TYPE IF EXISTS "QuestionDifficulty" CASCADE;
    DROP TYPE IF EXISTS "EnrollmentStatus" CASCADE;
    DROP TYPE IF EXISTS "SyllabusNodeType" CASCADE;
    DROP TYPE IF EXISTS "CourseStatus" CASCADE;
    DROP TYPE IF EXISTS "UserStatus" CASCADE;

    -- Create PostgreSQL Enums
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
    CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
    CREATE TYPE "SyllabusNodeType" AS ENUM ('UNIT', 'TOPIC', 'SUBTOPIC', 'CONCEPT');
    CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');
    CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
    CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');
    CREATE TYPE "ThemeMode" AS ENUM ('LIGHT', 'GRAY', 'DARK');
    CREATE TYPE "ExamPatternStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
    CREATE TYPE "ExamPatternType" AS ENUM ('SINGLE', 'MULTI');
    CREATE TYPE "DistributionType" AS ENUM ('COUNT', 'PERCENT');
    CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PREVIEW', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'ARCHIVED');

    -- Create Tables with native JSONB columns
    CREATE TABLE "users" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT UNIQUE NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "firstName" TEXT NOT NULL,
      "lastName" TEXT NOT NULL,
      "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
      "phone" TEXT,
      "metadata" JSONB,
      "version" INT NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "roles" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT UNIQUE NOT NULL,
      "description" TEXT,
      "isSystem" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "permissions" (
      "id" TEXT PRIMARY KEY,
      "key" TEXT UNIQUE NOT NULL,
      "description" TEXT,
      "module" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "role_permissions" (
      "roleId" TEXT NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
      "permissionId" TEXT NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
      PRIMARY KEY ("roleId", "permissionId")
    );

    CREATE TABLE "user_roles" (
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "roleId" TEXT NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
      PRIMARY KEY ("userId", "roleId")
    );

    CREATE TABLE "refresh_tokens" (
      "id" TEXT PRIMARY KEY,
      "token" TEXT UNIQUE NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "expiresAt" TIMESTAMP NOT NULL,
      "revoked" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "audit_logs" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
      "action" TEXT NOT NULL,
      "resource" TEXT,
      "resourceId" TEXT,
      "details" JSONB,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "entity_versions" (
      "id" TEXT PRIMARY KEY,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "version" INT NOT NULL,
      "data" JSONB NOT NULL,
      "changeSummary" TEXT NOT NULL,
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("entityType", "entityId", "version")
    );

    CREATE TABLE "courses" (
      "id" TEXT PRIMARY KEY,
      "code" TEXT UNIQUE NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
      "thumbnailUrl" TEXT,
      "durationMonths" INT NOT NULL DEFAULT 12,
      "createdById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "subjects" (
      "id" TEXT PRIMARY KEY,
      "courseId" TEXT NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "description" TEXT,
      "credits" INT NOT NULL DEFAULT 1,
      "order" INT NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("courseId", "code")
    );

    CREATE TABLE "syllabus_nodes" (
      "id" TEXT PRIMARY KEY,
      "subjectId" TEXT NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
      "parentId" TEXT REFERENCES "syllabus_nodes"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "type" "SyllabusNodeType" NOT NULL DEFAULT 'TOPIC',
      "depth" INT NOT NULL DEFAULT 0,
      "orderIndex" INT NOT NULL DEFAULT 0,
      "description" TEXT,
      "learningObjectives" JSONB,
      "estimatedMinutes" INT NOT NULL DEFAULT 60,
      "status" "CourseStatus" NOT NULL DEFAULT 'PUBLISHED',
      "tags" JSONB,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "enrollments" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "courseId" TEXT NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
      "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
      "enrolledAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("userId", "courseId")
    );

    CREATE TABLE "questions" (
      "id" TEXT PRIMARY KEY,
      "type" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "data" JSONB NOT NULL,
      "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'MEDIUM',
      "marks" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
      "version" INT NOT NULL DEFAULT 1,
      "courseId" TEXT REFERENCES "courses"("id") ON DELETE SET NULL,
      "subjectId" TEXT REFERENCES "subjects"("id") ON DELETE SET NULL,
      "syllabusNodeId" TEXT REFERENCES "syllabus_nodes"("id") ON DELETE SET NULL,
      "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
      "derivedFromId" TEXT REFERENCES "questions"("id") ON DELETE SET NULL,
      "createdById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "question_versions" (
      "id" TEXT PRIMARY KEY,
      "questionId" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
      "version" INT NOT NULL,
      "content" TEXT NOT NULL,
      "data" JSONB NOT NULL,
      "difficulty" "QuestionDifficulty" NOT NULL,
      "marks" DOUBLE PRECISION NOT NULL,
      "changeSummary" TEXT,
      "changedById" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("questionId", "version")
    );

    CREATE TABLE "tags" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT UNIQUE NOT NULL
    );

    CREATE TABLE "question_tags" (
      "questionId" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
      "tagId" TEXT NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
      PRIMARY KEY ("questionId", "tagId")
    );

    CREATE TABLE "previous_exam_usages" (
      "id" TEXT PRIMARY KEY,
      "questionId" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
      "examName" TEXT NOT NULL,
      "year" INT NOT NULL,
      "shift" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

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
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("languageId", "translationKeyId")
    );

    CREATE TABLE "user_preferences" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "themeMode" "ThemeMode" NOT NULL DEFAULT 'DARK',
      "languageCode" TEXT NOT NULL DEFAULT 'en',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "exam_patterns" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "courseId" TEXT NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
      "levelId" TEXT,
      "durationMinutes" INT NOT NULL DEFAULT 60,
      "description" TEXT,
      "status" "ExamPatternStatus" NOT NULL DEFAULT 'DRAFT',
      "type" "ExamPatternType" NOT NULL DEFAULT 'SINGLE',
      "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "version" INT NOT NULL DEFAULT 1,
      "parentId" TEXT,
      "tenantId" TEXT,
      "createdById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "exam_pattern_subjects" (
      "examPatternId" TEXT NOT NULL REFERENCES "exam_patterns"("id") ON DELETE CASCADE,
      "subjectId" TEXT NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
      "targetMarks" DOUBLE PRECISION,
      PRIMARY KEY ("examPatternId", "subjectId")
    );

    CREATE TABLE "exam_pattern_sections" (
      "id" TEXT PRIMARY KEY,
      "examPatternId" TEXT NOT NULL REFERENCES "exam_patterns"("id") ON DELETE CASCADE,
      "subjectId" TEXT REFERENCES "subjects"("id") ON DELETE SET NULL,
      "name" TEXT NOT NULL,
      "sequenceOrder" INT NOT NULL DEFAULT 0,
      "numQuestions" INT NOT NULL DEFAULT 10,
      "marksPerQuestion" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
      "marksCorrect" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "marksWrong" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "marksUnattempted" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "exam_pattern_section_rules" (
      "id" TEXT PRIMARY KEY,
      "sectionId" TEXT UNIQUE NOT NULL REFERENCES "exam_pattern_sections"("id") ON DELETE CASCADE,
      "allowedQuestionTypes" JSONB,
      "allowedCategories" JSONB,
      "selectionMode" TEXT NOT NULL DEFAULT 'RANDOM',
      "sourceFilters" JSONB,
      "tags" JSONB,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "exam_pattern_section_topics" (
      "id" TEXT PRIMARY KEY,
      "sectionId" TEXT NOT NULL REFERENCES "exam_pattern_sections"("id") ON DELETE CASCADE,
      "topicId" TEXT NOT NULL REFERENCES "syllabus_nodes"("id") ON DELETE CASCADE,
      "distributionType" "DistributionType" NOT NULL DEFAULT 'COUNT',
      "value" DOUBLE PRECISION NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE ("sectionId", "topicId")
    );

    CREATE TABLE "exam_pattern_section_difficulties" (
      "id" TEXT PRIMARY KEY,
      "sectionId" TEXT NOT NULL REFERENCES "exam_pattern_sections"("id") ON DELETE CASCADE,
      "difficultyLevel" "QuestionDifficulty" NOT NULL,
      "distributionType" "DistributionType" NOT NULL DEFAULT 'COUNT',
      "value" DOUBLE PRECISION NOT NULL,
      "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE ("sectionId", "difficultyLevel")
    );

    -- Phase 5 Tables (Exam Generator & Publishing)
    CREATE TABLE "exams" (
      "id" TEXT PRIMARY KEY,
      "patternId" TEXT REFERENCES "exam_patterns"("id") ON DELETE SET NULL,
      "courseId" TEXT REFERENCES "courses"("id") ON DELETE SET NULL,
      "name" TEXT NOT NULL,
      "instructions" TEXT,
      "durationMinutes" INT NOT NULL DEFAULT 60,
      "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "startTime" TIMESTAMP,
      "endTime" TIMESTAMP,
      "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
      "createdById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "exam_sections" (
      "id" TEXT PRIMARY KEY,
      "examId" TEXT NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "sequenceOrder" INT NOT NULL DEFAULT 0,
      "subjectId" TEXT REFERENCES "subjects"("id") ON DELETE SET NULL,
      "numQuestions" INT NOT NULL DEFAULT 0,
      "marksPerQuestion" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "marksCorrect" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "marksWrong" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "marksUnattempted" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "exam_questions" (
      "id" TEXT PRIMARY KEY,
      "examId" TEXT NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
      "examSectionId" TEXT NOT NULL REFERENCES "exam_sections"("id") ON DELETE CASCADE,
      "questionId" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
      "sequenceOrder" INT NOT NULL DEFAULT 0,
      "marksCorrect" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "marksWrong" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("examId", "questionId")
    );

    -- Phase 6 Tables (Exam System & Student Attempts Engine)
    CREATE TABLE "exam_attempts" (
      "id" TEXT PRIMARY KEY,
      "examId" TEXT NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "shuffleSeed" TEXT NOT NULL,
      "startTime" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endTime" TIMESTAMP,
      "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      "totalScore" DOUBLE PRECISION,
      "percentage" DOUBLE PRECISION,
      "totalQuestions" INT NOT NULL DEFAULT 0,
      "correctAnswers" INT NOT NULL DEFAULT 0,
      "wrongAnswers" INT NOT NULL DEFAULT 0,
      "unattempted" INT NOT NULL DEFAULT 0,
      "marksObtained" DOUBLE PRECISION,
      "maxMarks" DOUBLE PRECISION,
      "isFlagged" BOOLEAN NOT NULL DEFAULT false,
      "flagReason" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "question_attempts" (
      "id" TEXT PRIMARY KEY,
      "attemptId" TEXT NOT NULL REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
      "questionId" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
      "examSectionId" TEXT REFERENCES "exam_sections"("id") ON DELETE SET NULL,
      "sequenceOrder" INT NOT NULL DEFAULT 0,
      "questionSnapshot" JSONB NOT NULL,
      "studentAnswer" JSONB,
      "isMarkedForReview" BOOLEAN NOT NULL DEFAULT false,
      "timeSpentSeconds" INT NOT NULL DEFAULT 0,
      "isCorrect" BOOLEAN,
      "marksAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "evaluatorComments" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("attemptId", "questionId")
    );

    -- Phase 7 Tables (Published Exam Archive & Immutability Engine)
    CREATE TABLE "exam_snapshots" (
      "id" TEXT PRIMARY KEY,
      "examId" TEXT NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
      "academicYear" TEXT NOT NULL DEFAULT '2026',
      "courseId" TEXT REFERENCES "courses"("id") ON DELETE SET NULL,
      "subjectId" TEXT REFERENCES "subjects"("id") ON DELETE SET NULL,
      "examName" TEXT NOT NULL,
      "patternSnapshot" JSONB NOT NULL,
      "instructions" TEXT,
      "durationMinutes" INT NOT NULL DEFAULT 60,
      "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "storagePath" TEXT,
      "publishedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "publishedById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
      "version" INT NOT NULL DEFAULT 1,
      "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "exam_snapshot_sections" (
      "id" TEXT PRIMARY KEY,
      "snapshotId" TEXT NOT NULL REFERENCES "exam_snapshots"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "sequenceOrder" INT NOT NULL DEFAULT 0,
      "subjectId" TEXT REFERENCES "subjects"("id") ON DELETE SET NULL,
      "numQuestions" INT NOT NULL DEFAULT 0,
      "marksPerQuestion" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "marksCorrect" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "marksWrong" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "marksUnattempted" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "sectionRules" JSONB,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "exam_snapshot_questions" (
      "id" TEXT PRIMARY KEY,
      "snapshotSectionId" TEXT NOT NULL REFERENCES "exam_snapshot_sections"("id") ON DELETE CASCADE,
      "snapshotId" TEXT NOT NULL REFERENCES "exam_snapshots"("id") ON DELETE CASCADE,
      "originalQuestionId" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
      "questionVersion" INT NOT NULL DEFAULT 1,
      "questionType" TEXT NOT NULL,
      "questionContent" JSONB NOT NULL,
      "answerKey" JSONB NOT NULL,
      "marks" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "negativeMarks" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "displayOrder" INT NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "exam_workflow_logs" (
      "id" TEXT PRIMARY KEY,
      "examId" TEXT NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
      "fromStatus" TEXT NOT NULL,
      "toStatus" TEXT NOT NULL,
      "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
      "notes" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "exam_reviewers" (
      "id" TEXT PRIMARY KEY,
      "examId" TEXT NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
      "reviewerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "assignedById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "feedback" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("examId", "reviewerId")
    );

    CREATE TABLE "exam_corrections" (
      "id" TEXT PRIMARY KEY,
      "originalSnapshotId" TEXT NOT NULL REFERENCES "exam_snapshots"("id") ON DELETE CASCADE,
      "correctedSnapshotId" TEXT REFERENCES "exam_snapshots"("id") ON DELETE SET NULL,
      "version" INT NOT NULL DEFAULT 2,
      "reason" TEXT NOT NULL,
      "changesSummary" JSONB NOT NULL,
      "initiatedById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "status" TEXT NOT NULL DEFAULT 'APPLIED',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "exam_files" (
      "id" TEXT PRIMARY KEY,
      "examId" TEXT NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
      "snapshotId" TEXT REFERENCES "exam_snapshots"("id") ON DELETE SET NULL,
      "fileName" TEXT NOT NULL,
      "fileType" TEXT NOT NULL,
      "fileSize" INT NOT NULL,
      "storagePath" TEXT NOT NULL,
      "createdById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Phase 8 Tables (Student Analytics & Mastery Engine)
    CREATE TABLE "student_mastery" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE UNIQUE,
      "overallProficiency" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "totalExamsTaken" INT NOT NULL DEFAULT 0,
      "totalQuestionsAttempted" INT NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "student_topic_progress" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "syllabusNodeId" TEXT NOT NULL REFERENCES "syllabus_nodes"("id") ON DELETE CASCADE,
      "proficiencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "attemptsCount" INT NOT NULL DEFAULT 0,
      "correctCount" INT NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'GREY',
      "statusChangedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastEvaluatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("userId", "syllabusNodeId")
    );

    CREATE TABLE "student_weaknesses" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "syllabusNodeId" TEXT NOT NULL REFERENCES "syllabus_nodes"("id") ON DELETE CASCADE,
      "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "severity" TEXT NOT NULL DEFAULT 'MODERATE',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "firstWeakAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("userId", "syllabusNodeId")
    );

    CREATE TABLE "student_strengths" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "syllabusNodeId" TEXT NOT NULL REFERENCES "syllabus_nodes"("id") ON DELETE CASCADE,
      "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "confidenceCount" INT NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("userId", "syllabusNodeId")
    );

    CREATE TABLE "mastery_score_history" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "syllabusNodeId" TEXT NOT NULL REFERENCES "syllabus_nodes"("id") ON DELETE CASCADE,
      "attemptId" TEXT REFERENCES "exam_attempts"("id") ON DELETE SET NULL,
      "score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "status" TEXT NOT NULL DEFAULT 'DEVELOPING',
      "recordedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Phase 9 Tables (Personalized Practice & Adaptive Mastery Tracking)
    CREATE TABLE "practice_papers" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "courseId" TEXT REFERENCES "courses"("id") ON DELETE SET NULL,
      "targetNodeIds" JSONB NOT NULL DEFAULT '[]',
      "totalQuestions" INT NOT NULL DEFAULT 10,
      "status" TEXT NOT NULL DEFAULT 'GENERATED',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "practice_questions" (
      "id" TEXT PRIMARY KEY,
      "practicePaperId" TEXT NOT NULL REFERENCES "practice_papers"("id") ON DELETE CASCADE,
      "questionId" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
      "syllabusNodeId" TEXT REFERENCES "syllabus_nodes"("id") ON DELETE SET NULL,
      "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
      "displayOrder" INT NOT NULL DEFAULT 1,
      "versionNum" INT NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("practicePaperId", "questionId")
    );

    CREATE TABLE "practice_attempts" (
      "id" TEXT PRIMARY KEY,
      "practicePaperId" TEXT NOT NULL REFERENCES "practice_papers"("id") ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      "score" DOUBLE PRECISION DEFAULT 0.0,
      "accuracyPercentage" DOUBLE PRECISION DEFAULT 0.0,
      "correctCount" INT NOT NULL DEFAULT 0,
      "totalAttempted" INT NOT NULL DEFAULT 0,
      "startedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "practice_attempt_answers" (
      "id" TEXT PRIMARY KEY,
      "attemptId" TEXT NOT NULL REFERENCES "practice_attempts"("id") ON DELETE CASCADE,
      "questionId" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
      "selectedOption" TEXT,
      "selectedOptions" JSONB,
      "numericalAnswer" TEXT,
      "isCorrect" BOOLEAN NOT NULL DEFAULT false,
      "timeSpentSeconds" INT DEFAULT 0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("attemptId", "questionId")
    );

    CREATE TABLE "mastery_tracking" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "syllabusNodeId" TEXT NOT NULL REFERENCES "syllabus_nodes"("id") ON DELETE CASCADE,
      "consecutiveCorrect" INT NOT NULL DEFAULT 0,
      "masteryThreshold" INT NOT NULL DEFAULT 3,
      "isMastered" BOOLEAN NOT NULL DEFAULT false,
      "masteredAt" TIMESTAMP,
      "lastAttemptedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("userId", "syllabusNodeId")
    );

    -- Phase 10: Preview & Impersonation System Tables
    CREATE TABLE "preview_profiles" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "billingPlan" TEXT NOT NULL DEFAULT 'FREE',
      "contentVersion" TEXT NOT NULL DEFAULT 'PUBLISHED',
      "usageMode" TEXT NOT NULL DEFAULT 'NORMAL',
      "courseAccess" JSONB NOT NULL DEFAULT '[]',
      "featureFlags" JSONB NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "impersonation_sessions" (
      "id" TEXT PRIMARY KEY,
      "token" TEXT UNIQUE,
      "actorUserId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "effectiveUserId" TEXT NOT NULL,
      "effectiveUserEmail" TEXT,
      "mode" TEXT NOT NULL,
      "reason" TEXT,
      "sessionData" JSONB NOT NULL DEFAULT '{}',
      "startedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" TIMESTAMP NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "preview_audit_logs" (
      "id" TEXT PRIMARY KEY,
      "actorUserId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "actorEmail" TEXT,
      "effectiveUserId" TEXT NOT NULL,
      "effectiveEmail" TEXT,
      "mode" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "resource" TEXT,
      "resourceId" TEXT,
      "details" JSONB,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Phase 11: AI Question System & Gateway Tables
    CREATE TABLE "ai_providers" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'MOCK',
      "modelId" TEXT NOT NULL,
      "baseUrl" TEXT,
      "apiKey" TEXT,
      "priority" INT NOT NULL DEFAULT 1,
      "scope" TEXT NOT NULL DEFAULT 'question_authoring',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "circuitBroken" BOOLEAN NOT NULL DEFAULT false,
      "failureCount" INT NOT NULL DEFAULT 0,
      "lastFailureAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "ai_prompt_templates" (
      "id" TEXT PRIMARY KEY,
      "featureKey" TEXT NOT NULL,
      "version" INT NOT NULL DEFAULT 1,
      "systemPrompt" TEXT NOT NULL,
      "userPromptTemplate" TEXT NOT NULL,
      "expectedSchema" JSONB,
      "dailyLimit" INT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "ai_gateway_logs" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
      "featureKey" TEXT NOT NULL,
      "providerId" TEXT REFERENCES "ai_providers"("id") ON DELETE SET NULL,
      "modelUsed" TEXT NOT NULL,
      "promptTokens" INT NOT NULL DEFAULT 0,
      "completionTokens" INT NOT NULL DEFAULT 0,
      "totalTokens" INT NOT NULL DEFAULT 0,
      "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "latencyMs" INT NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'SUCCESS',
      "errorMessage" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "user_ai_credits" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "includedDailyCredits" INT NOT NULL DEFAULT 20,
      "dailyCreditsUsed" INT NOT NULL DEFAULT 0,
      "lastDailyReset" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "purchasedCredits" INT NOT NULL DEFAULT 0,
      "monthlyTokenCap" INT NOT NULL DEFAULT 500000,
      "tokensUsedThisMonth" INT NOT NULL DEFAULT 0,
      "isCapped" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "ai_usage_history" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "feature" TEXT NOT NULL,
      "creditType" TEXT NOT NULL DEFAULT 'INCLUDED',
      "creditsDeducted" INT NOT NULL DEFAULT 1,
      "tokensUsed" INT NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'CONSUMED',
      "jobId" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "ai_generation_jobs" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "type" TEXT NOT NULL,
      "params" JSONB NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'QUEUED',
      "totalCount" INT NOT NULL DEFAULT 1,
      "completedCount" INT NOT NULL DEFAULT 0,
      "progress" INT NOT NULL DEFAULT 0,
      "resultQuestionIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "errorMessage" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "interview_sessions" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "questionId" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
      "courseId" TEXT REFERENCES "courses"("id") ON DELETE SET NULL,
      "mode" TEXT NOT NULL DEFAULT 'PRACTICE',
      "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      "currentTurn" INT NOT NULL DEFAULT 0,
      "maxTurns" INT NOT NULL DEFAULT 5,
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

    CREATE TABLE "interview_turns" (
      "id" TEXT PRIMARY KEY,
      "sessionId" TEXT NOT NULL REFERENCES "interview_sessions"("id") ON DELETE CASCADE,
      "turnNumber" INT NOT NULL,
      "speaker" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "audioUrl" TEXT,
      "durationSeconds" INT,
      "evaluationNotes" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX "idx_interview_sessions_user" ON "interview_sessions"("userId");
    CREATE INDEX "idx_interview_sessions_question" ON "interview_sessions"("questionId");
    CREATE INDEX "idx_interview_turns_session" ON "interview_turns"("sessionId");

    -- Phase 13 Tables (Subscriptions, Entitlements & Pluggable Billing Engine)
    CREATE TABLE "plans" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "code" TEXT UNIQUE NOT NULL,
      "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
      "description" TEXT,
      "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "entitlement_rules" (
      "id" TEXT PRIMARY KEY,
      "planCode" TEXT NOT NULL REFERENCES "plans"("code") ON DELETE CASCADE,
      "entitlementKey" TEXT NOT NULL,
      "entitlementType" TEXT NOT NULL DEFAULT 'BOOLEAN',
      "entitlementValue" TEXT NOT NULL DEFAULT 'false',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("planCode", "entitlementKey")
    );

    CREATE TABLE "subscriptions" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "planCode" TEXT NOT NULL DEFAULT 'FREE',
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "startDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endDate" TIMESTAMP NOT NULL,
      "cancelledAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "ai_credit_packages" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "creditsCount" INT NOT NULL DEFAULT 5,
      "price" DOUBLE PRECISION NOT NULL DEFAULT 9.99,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "invoices" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "status" TEXT NOT NULL DEFAULT 'PAID',
      "externalId" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "refund_transactions" (
      "id" TEXT PRIMARY KEY,
      "subscriptionId" TEXT REFERENCES "subscriptions"("id") ON DELETE SET NULL,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "actorUserId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "gateway" TEXT NOT NULL DEFAULT 'MOCK',
      "gatewayPaymentId" TEXT NOT NULL,
      "gatewayRefundId" TEXT NOT NULL,
      "originalAmount" DOUBLE PRECISION NOT NULL,
      "refundAmount" DOUBLE PRECISION NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "isPartial" BOOLEAN NOT NULL DEFAULT false,
      "clawbackCreditsCount" INT NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'COMPLETED',
      "reason" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX "idx_subscriptions_user" ON "subscriptions"("userId");
    CREATE INDEX "idx_invoices_user" ON "invoices"("userId");
    CREATE INDEX "idx_refund_transactions_user" ON "refund_transactions"("userId");
    CREATE INDEX "idx_refund_transactions_gateway_payment" ON "refund_transactions"("gatewayPaymentId");
  `);

  console.log('PostgreSQL 16 Schema Migration Completed Successfully!');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
