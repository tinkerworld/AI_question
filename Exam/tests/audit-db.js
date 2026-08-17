const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

function getDbPath() {
  const workspaceRootData = path.resolve(__dirname, '../../../postgres-data');
  if (fs.existsSync(workspaceRootData)) {
    return workspaceRootData;
  }
  const cwdData = path.resolve(process.cwd(), 'postgres-data');
  if (fs.existsSync(cwdData)) {
    return cwdData;
  }
  return path.resolve(__dirname, '../packages/database/prisma/postgres-data');
}

async function audit() {
  const pgDb = new PGlite(getDbPath());
  
  const p = await pgDb.query('SELECT id, name, status, "totalMarks" FROM exam_patterns');
  console.log(`\n====================================================`);
  console.log(`--- EXAM PATTERNS IN DATABASE (${p.rows.length}) ---`);
  console.log(`====================================================`);
  console.table(p.rows);

  const s = await pgDb.query('SELECT id, "examPatternId", name, "numQuestions" FROM exam_pattern_sections');
  console.log(`\n====================================================`);
  console.log(`--- EXAM PATTERN SECTIONS IN DATABASE (${s.rows.length}) ---`);
  console.log(`====================================================`);
  console.table(s.rows);

  const e = await pgDb.query('SELECT id, name, status, "totalMarks" FROM exams');
  console.log(`\n====================================================`);
  console.log(`--- EXAMS IN DATABASE (${e.rows.length}) ---`);
  console.log(`====================================================`);
  console.table(e.rows);

  const u = await pgDb.query('SELECT id, email, "firstName", "lastName" FROM users');
  console.log(`\n====================================================`);
  console.log(`--- USERS IN DATABASE (${u.rows.length}) ---`);
  console.log(`====================================================`);
  console.table(u.rows);

  const c = await pgDb.query('SELECT id, code, name FROM courses');
  console.log(`\n====================================================`);
  console.log(`--- COURSES IN DATABASE (${c.rows.length}) ---`);
  console.log(`====================================================`);
  console.table(c.rows);
}

audit().catch(console.error);
