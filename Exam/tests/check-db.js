const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

function getDbPath() {
  const workspaceRootData = path.resolve(__dirname, '../../postgres-data');
  if (fs.existsSync(workspaceRootData)) {
    return workspaceRootData;
  }
  const cwdData = path.resolve(process.cwd(), 'postgres-data');
  if (fs.existsSync(cwdData)) {
    return cwdData;
  }
  return path.resolve(__dirname, '../packages/database/prisma/postgres-data');
}

const pgDb = new PGlite(getDbPath());

async function checkDb() {
  const q = await pgDb.query('SELECT count(*) FROM questions');
  console.log('Total questions:', q.rows[0].count);

  const courses = await pgDb.query('SELECT id, name, code FROM courses');
  console.log('Courses:', courses.rows);

  const subjects = await pgDb.query('SELECT id, name, "courseId" FROM subjects');
  console.log('Subjects:', subjects.rows);

  const topics = await pgDb.query('SELECT id, title, "subjectId" FROM syllabus_nodes');
  console.log('Topics:', topics.rows);

  const breakdown = await pgDb.query(`
    SELECT "subjectId", "syllabusNodeId", difficulty, status, count(*) as count 
    FROM questions 
    GROUP BY "subjectId", "syllabusNodeId", difficulty, status
    ORDER BY "subjectId", "syllabusNodeId", difficulty
  `);
  console.log('Question breakdown:');
  console.table(breakdown.rows);

  const patterns = await pgDb.query(`
    SELECT id, name, status, "totalMarks" FROM exam_patterns
  `);
  console.log('Exam patterns:', patterns.rows);

  const sections = await pgDb.query(`
    SELECT id, "examPatternId", name, "subjectId", "numQuestions" FROM exam_pattern_sections
  `);
  console.log('Exam pattern sections:', sections.rows);

  process.exit(0);
}

checkDb().catch(e => { console.error(e); process.exit(1); });
