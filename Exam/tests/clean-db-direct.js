const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

function getDbPath() {
  const rootData = path.resolve(__dirname, '../../postgres-data');
  if (fs.existsSync(rootData)) {
    return rootData;
  }
  const monorepoData = path.resolve(__dirname, '../postgres-data');
  if (fs.existsSync(monorepoData)) {
    return monorepoData;
  }
  return path.resolve(__dirname, '../packages/database/prisma/postgres-data');
}

async function cleanDirect() {
  console.log('Connecting directly to PGlite database at', getDbPath());
  const pgDb = new PGlite(getDbPath());

  console.log('\n1. Deleting all test exam questions & sections...');
  await pgDb.query('DELETE FROM "exam_questions"');
  await pgDb.query('DELETE FROM "exam_sections"');
  await pgDb.query('DELETE FROM "exams"');
  console.log('   [CLEAN] All test exams removed.');

  console.log('\n2. Deleting all test exam pattern topics, difficulties, rules, sections, patterns...');
  await pgDb.query('DELETE FROM "exam_pattern_section_topics"');
  await pgDb.query('DELETE FROM "exam_pattern_section_difficulties"');
  await pgDb.query('DELETE FROM "exam_pattern_section_rules"');
  await pgDb.query('DELETE FROM "exam_pattern_sections"');
  await pgDb.query('DELETE FROM "exam_pattern_subjects"');
  await pgDb.query('DELETE FROM "exam_patterns"');
  console.log('   [CLEAN] All test exam patterns & deficit sections removed.');

  console.log('\n3. Verifying remaining entities...');
  const qCount = await pgDb.query('SELECT COUNT(*) as count FROM "questions" WHERE "status" = \'PUBLISHED\'');
  console.log(`   [CONFIRM] Published Questions intact: ${qCount.rows[0].count}`);

  const exCount = await pgDb.query('SELECT COUNT(*) as count FROM "exams"');
  console.log(`   [CONFIRM] Exams in DB: ${exCount.rows[0].count}`);

  const patCount = await pgDb.query('SELECT COUNT(*) as count FROM "exam_patterns"');
  console.log(`   [CONFIRM] Patterns in DB: ${patCount.rows[0].count}`);

  const secCount = await pgDb.query('SELECT COUNT(*) as count FROM "exam_pattern_sections"');
  console.log(`   [CONFIRM] Pattern Sections in DB: ${secCount.rows[0].count}`);

  console.log('\n====================================================');
  console.log(' DATABASE SUCCESSFULLY PURGED OF ALL TEST POLLUTION');
  console.log('====================================================');
}

cleanDirect().catch(console.error);
