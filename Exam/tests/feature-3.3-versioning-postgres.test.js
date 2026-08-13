require('dotenv').config();
const assert = require('assert');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const dbPath = path.resolve(__dirname, '../packages/database/prisma/postgres-data');
const db = new PGlite(dbPath);

console.log('====================================================');
console.log(' EXAMOS FEATURE 3.3 — POSTGRESQL 16 NATIVE JSONB QUESTION VERSIONING');
console.log('====================================================\n');

async function run() {
  try {
    const qId = 'q_test_v1';
    const initialData = { options: [{ id: 'opt1', text: 'A' }, { id: 'opt2', text: 'B' }], correctOptionId: 'opt2' };

    console.log('1. Inserting Question with Native PostgreSQL JSONB payload...');
    await db.query(
      `INSERT INTO "questions" ("id", "type", "content", "data", "difficulty", "marks", "status", "version")
       VALUES ($1, $2, $3, $4::jsonb, $5::"QuestionDifficulty", $6, $7::"QuestionStatus", $8)`,
      [qId, 'MCQ', 'What is 2 + 2?', JSON.stringify(initialData), 'MEDIUM', 1.0, 'DRAFT', 1]
    );

    console.log('2. Inserting Question Version 1 into `question_versions` with Native JSONB...');
    await db.query(
      `INSERT INTO "question_versions" ("id", "questionId", "version", "content", "data", "difficulty", "marks")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::"QuestionDifficulty", $7)`,
      ['qv_1', qId, 1, 'What is 2 + 2?', JSON.stringify(initialData), 'MEDIUM', 1.0]
    );

    console.log('3. Updating Question to Version 2 with updated JSONB payload...');
    const updatedData = { options: [{ id: 'opt1', text: 'A' }, { id: 'opt2', text: 'B' }, { id: 'opt3', text: 'C' }], correctOptionId: 'opt3' };
    await db.query(
      `UPDATE "questions" SET "content" = $1, "data" = $2::jsonb, "version" = 2 WHERE "id" = $3`,
      ['What is 3 + 3?', JSON.stringify(updatedData), qId]
    );

    await db.query(
      `INSERT INTO "question_versions" ("id", "questionId", "version", "content", "data", "difficulty", "marks")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::"QuestionDifficulty", $7)`,
      ['qv_2', qId, 2, 'What is 3 + 3?', JSON.stringify(updatedData), 'MEDIUM', 1.0]
    );

    console.log('4. Querying Question Version History from PostgreSQL...');
    const versionsRes = await db.query(`SELECT * FROM "question_versions" WHERE "questionId" = $1 ORDER BY "version" DESC`, [qId]);
    assert.strictEqual(versionsRes.rows.length, 2, 'Must have 2 version records');
    console.log(`   Found ${versionsRes.rows.length} version history records in PostgreSQL.`);

    console.log('5. Performing Version 1 Rollback in PostgreSQL...');
    const v1Record = versionsRes.rows.find((v) => v.version === 1);
    await db.query(
      `UPDATE "questions" SET "content" = $1, "data" = $2::jsonb, "version" = 3 WHERE "id" = $3`,
      [v1Record.content, JSON.stringify(v1Record.data), qId]
    );

    const rolledBack = await db.query(`SELECT * FROM "questions" WHERE "id" = $1`, [qId]);
    const currentQ = rolledBack.rows[0];

    assert.strictEqual(currentQ.version, 3);
    assert.strictEqual(currentQ.content, 'What is 2 + 2?');
    assert.strictEqual(typeof currentQ.data, 'object', 'Native PostgreSQL JSONB returned as object');
    assert.strictEqual(currentQ.data.correctOptionId, 'opt2');

    console.log('   [POSTGRESQL JSONB VERSIONING & ROLLBACK SUCCESSFUL]');
    console.log(`   Question ID: ${currentQ.id}`);
    console.log(`   Current Version: ${currentQ.version}`);
    console.log(`   Restored Native JSONB payload:`, currentQ.data);

    console.log('\n====================================================');
    console.log(' ALL POSTGRESQL NATIVE JSONB VERSIONING TESTS PASSED');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('VERSIONING TEST ERROR:', err);
    process.exit(1);
  }
}

run();
