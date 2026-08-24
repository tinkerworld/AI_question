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
const db = new PGlite(dbPath);

async function migratePhase12() {
  console.log('Applying Phase 12 Schema Migration (AI Interview System) to:', dbPath);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS "interview_sessions" (
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

    CREATE TABLE IF NOT EXISTS "interview_turns" (
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

    CREATE INDEX IF NOT EXISTS "idx_interview_sessions_user" ON "interview_sessions"("userId");
    CREATE INDEX IF NOT EXISTS "idx_interview_sessions_question" ON "interview_sessions"("questionId");
    CREATE INDEX IF NOT EXISTS "idx_interview_turns_session" ON "interview_turns"("sessionId");
  `);

  console.log('Phase 12 Schema Migration Completed Successfully!');
}

migratePhase12().catch((e) => {
  console.error('Phase 12 Migration failed:', e);
  process.exit(1);
});
