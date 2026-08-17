const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

function getDbPath() {
  const rootData = path.resolve(__dirname, '../../postgres-data');
  if (fs.existsSync(rootData)) return rootData;
  const monorepoData = path.resolve(__dirname, '../postgres-data');
  if (fs.existsSync(monorepoData)) return monorepoData;
  return path.resolve(__dirname, '../packages/database/prisma/postgres-data');
}

async function seedBaselinePattern() {
  const pgDb = new PGlite(getDbPath());

  console.log('Seeding baseline clean pattern: JEE Main Grand Blueprint (PCM)...');
  
  // Insert pattern
  await pgDb.query(`
    INSERT INTO "exam_patterns" (
      "id", "name", "courseId", "durationMinutes", "description", "status", "type", "totalMarks", "version", "createdById", "createdAt", "updatedAt"
    ) VALUES (
      'pat_jee_main_standard',
      'JEE Main Grand Blueprint (PCM)',
      'c1',
      180,
      'Standard 3-hour examination covering Physics, Chemistry, and Mathematics (30 questions each, +4 / -1)',
      'PUBLISHED',
      'MULTI',
      300.0,
      1,
      'usr_admin_test',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    ) ON CONFLICT ("id") DO UPDATE SET
      "name" = EXCLUDED."name",
      "status" = 'PUBLISHED',
      "totalMarks" = 300.0
  `);

  // Multi-subject targets
  for (const sub of [{ id: 'sub_phy', marks: 100 }, { id: 'sub_chem', marks: 100 }, { id: 'sub_math', marks: 100 }]) {
    await pgDb.query(`
      INSERT INTO "exam_pattern_subjects" ("examPatternId", "subjectId", "targetMarks")
      VALUES ('pat_jee_main_standard', $1, $2)
      ON CONFLICT ("examPatternId", "subjectId") DO UPDATE SET "targetMarks" = EXCLUDED."targetMarks"
    `, [sub.id, sub.marks]);
  }

  // Sections
  const sections = [
    { id: 'sec_jee_phy', name: 'Section A: Physics', subjectId: 'sub_phy', numQ: 10, marks: 4.0, wrong: -1.0, order: 1 },
    { id: 'sec_jee_chem', name: 'Section B: Chemistry', subjectId: 'sub_chem', numQ: 10, marks: 4.0, wrong: -1.0, order: 2 },
    { id: 'sec_jee_math', name: 'Section C: Mathematics', subjectId: 'sub_math', numQ: 10, marks: 4.0, wrong: -1.0, order: 3 },
  ];

  for (const s of sections) {
    await pgDb.query(`
      INSERT INTO "exam_pattern_sections" (
        "id", "examPatternId", "subjectId", "name", "sequenceOrder", "numQuestions", "marksPerQuestion", "totalMarks", "marksCorrect", "marksWrong", "marksUnattempted", "createdAt", "updatedAt"
      ) VALUES ($1, 'pat_jee_main_standard', $2, $3, $4, $5, $6, $7, $8, $9, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "numQuestions" = EXCLUDED."numQuestions",
        "marksPerQuestion" = EXCLUDED."marksPerQuestion",
        "totalMarks" = EXCLUDED."totalMarks"
    `, [s.id, s.subjectId, s.name, s.order, s.numQ, s.marks, s.numQ * s.marks, s.marks, s.wrong]);
  }

  console.log('✅ Baseline pattern pat_jee_main_standard seeded cleanly with 3 sections.');
}

seedBaselinePattern().catch(console.error);
