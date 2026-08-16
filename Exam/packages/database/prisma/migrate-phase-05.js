const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

function getDbPath() {
  const workspaceRootData = path.resolve(__dirname, '../../../../postgres-data');
  if (fs.existsSync(workspaceRootData)) {
    return workspaceRootData;
  }
  const cwdData = path.resolve(process.cwd(), 'postgres-data');
  if (fs.existsSync(cwdData)) {
    return cwdData;
  }
  return path.resolve(__dirname, '../postgres-data');
}

const pgDb = new PGlite(getDbPath());

async function applyMigration() {
  console.log('Applying Phase 5 PostgreSQL DDL migration to PGlite database:', getDbPath());
  await pgDb.query(`
    DO $$ BEGIN
      CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'ARCHIVED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pgDb.query(`
    CREATE TABLE IF NOT EXISTS "exams" (
      "id" VARCHAR(64) PRIMARY KEY,
      "patternId" VARCHAR(64) REFERENCES "exam_patterns"("id") ON DELETE SET NULL,
      "courseId" VARCHAR(64) REFERENCES "courses"("id") ON DELETE SET NULL,
      "name" VARCHAR(255) NOT NULL,
      "instructions" TEXT,
      "durationMinutes" INTEGER NOT NULL DEFAULT 60,
      "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "startTime" TIMESTAMP,
      "endTime" TIMESTAMP,
      "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
      "createdById" VARCHAR(64) REFERENCES "users"("id") ON DELETE SET NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pgDb.query(`
    CREATE TABLE IF NOT EXISTS "exam_sections" (
      "id" VARCHAR(64) PRIMARY KEY,
      "examId" VARCHAR(64) NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
      "name" VARCHAR(255) NOT NULL,
      "sequenceOrder" INTEGER NOT NULL DEFAULT 0,
      "subjectId" VARCHAR(64) REFERENCES "subjects"("id") ON DELETE SET NULL,
      "numQuestions" INTEGER NOT NULL DEFAULT 0,
      "marksPerQuestion" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "marksCorrect" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "marksWrong" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "marksUnattempted" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pgDb.query(`
    CREATE TABLE IF NOT EXISTS "exam_questions" (
      "id" VARCHAR(64) PRIMARY KEY,
      "examId" VARCHAR(64) NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
      "examSectionId" VARCHAR(64) NOT NULL REFERENCES "exam_sections"("id") ON DELETE CASCADE,
      "questionId" VARCHAR(64) NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
      "sequenceOrder" INTEGER NOT NULL DEFAULT 0,
      "marksCorrect" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "marksWrong" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "exam_questions_examId_questionId_unique" UNIQUE ("examId", "questionId")
    );
  `);

  console.log('Phase 5 tables created successfully in PostgreSQL!');
  process.exit(0);
}

applyMigration().catch((e) => {
  console.error(e);
  process.exit(1);
});
