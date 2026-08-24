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

async function migratePhase06() {
  console.log('Applying Phase 6 (Exam System & Attempts) Migration to:', dbPath);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS "exam_attempts" (
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

    CREATE TABLE IF NOT EXISTS "question_attempts" (
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
  `);

  console.log('Phase 6 Migration Completed Successfully!');
  process.exit(0);
}

migratePhase06().catch((err) => {
  console.error('Phase 6 Migration Failed:', err);
  process.exit(1);
});
