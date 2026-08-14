const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'postgres-data');
const db = new PGlite(dbPath);

async function migrate() {
  console.log('Applying native PostgreSQL 16 DDL schema with JSONB and ENUM types...');

  await db.exec(`
    -- Drop existing tables if present
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

    -- Create Tables with native JSONB columns
    CREATE TABLE "users" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT UNIQUE NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "firstName" TEXT NOT NULL,
      "lastName" TEXT NOT NULL,
      "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
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
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "token" TEXT UNIQUE NOT NULL,
      "revoked" BOOLEAN NOT NULL DEFAULT false,
      "expiresAt" TIMESTAMP NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "audit_logs" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
      "action" TEXT NOT NULL,
      "resource" TEXT NOT NULL,
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
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "courses" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "code" TEXT UNIQUE NOT NULL,
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
      "type" "SyllabusNodeType" NOT NULL DEFAULT 'UNIT',
      "orderIndex" INT NOT NULL DEFAULT 0,
      "depth" INT NOT NULL DEFAULT 0,
      "description" TEXT,
      "learningObjectives" JSONB,
      "estimatedMinutes" INT NOT NULL DEFAULT 60,
      "status" "CourseStatus" NOT NULL DEFAULT 'PUBLISHED',
      "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "enrollments" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "courseId" TEXT NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
      "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
      "enrolledAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt" TIMESTAMP,
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
      "changedById" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "tags" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT UNIQUE NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "translation_keys" (
      "id" TEXT PRIMARY KEY,
      "key" TEXT UNIQUE NOT NULL,
      "description" TEXT,
      "module" TEXT NOT NULL DEFAULT 'common',
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
      UNIQUE("sectionId", "topicId")
    );

    CREATE TABLE "exam_pattern_section_difficulties" (
      "id" TEXT PRIMARY KEY,
      "sectionId" TEXT NOT NULL REFERENCES "exam_pattern_sections"("id") ON DELETE CASCADE,
      "difficultyLevel" "QuestionDifficulty" NOT NULL,
      "distributionType" "DistributionType" NOT NULL DEFAULT 'COUNT',
      "value" DOUBLE PRECISION NOT NULL,
      "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("sectionId", "difficultyLevel")
    );
  `);

  console.log('PostgreSQL 16 Schema Migration Completed Successfully!');
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
