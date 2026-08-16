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

async function seedQuestions() {
  console.log('Seeding Question Bank items for Physics & Chemistry across topics and difficulties...');

  // Ensure course & subjects exist
  await pgDb.query(
    `INSERT INTO "courses" ("id", "name", "code", "description", "status", "durationMonths")
     VALUES ('c1', 'Engineering Entrance Course', 'ENG-101', 'JEE & Engineering Foundation Course', 'PUBLISHED', 12)
     ON CONFLICT ("code") DO NOTHING`
  );

  await pgDb.query(
    `INSERT INTO "subjects" ("id", "courseId", "name", "code", "description", "credits", "order")
     VALUES ('sub_phy', 'c1', 'Physics', 'PHY-101', 'General Physics', 4, 1)
     ON CONFLICT ("courseId", "code") DO NOTHING`
  );

  await pgDb.query(
    `INSERT INTO "subjects" ("id", "courseId", "name", "code", "description", "credits", "order")
     VALUES ('sub_chem', 'c1', 'Chemistry', 'CHEM-101', 'General Chemistry', 4, 2)
     ON CONFLICT ("courseId", "code") DO NOTHING`
  );

  await pgDb.query(
    `INSERT INTO "syllabus_nodes" ("id", "subjectId", "title", "type", "orderIndex", "depth")
     VALUES ('top_mech', 'sub_phy', 'Mechanics', 'TOPIC', 1, 1)
     ON CONFLICT ("id") DO NOTHING`
  );

  await pgDb.query(
    `INSERT INTO "syllabus_nodes" ("id", "subjectId", "title", "type", "orderIndex", "depth")
     VALUES ('top_optics', 'sub_phy', 'Optics', 'TOPIC', 2, 1)
     ON CONFLICT ("id") DO NOTHING`
  );

  await pgDb.query(
    `INSERT INTO "syllabus_nodes" ("id", "subjectId", "title", "type", "orderIndex", "depth")
     VALUES ('top_thermo', 'sub_chem', 'Thermodynamics', 'TOPIC', 1, 1)
     ON CONFLICT ("id") DO NOTHING`
  );

  // Generate 40 questions across Physics & Chemistry
  const difficulties = ['EASY', 'MEDIUM', 'HARD'];
  const topics = [
    { id: 'top_mech', subjectId: 'sub_phy', name: 'Mechanics' },
    { id: 'top_optics', subjectId: 'sub_phy', name: 'Optics' },
    { id: 'top_thermo', subjectId: 'sub_chem', name: 'Thermodynamics' },
  ];

  let count = 0;
  for (let i = 1; i <= 30; i++) {
    const topic = topics[(i - 1) % topics.length];
    const diff = difficulties[(i - 1) % difficulties.length];
    const qId = `q_seed_gen_${i}`;
    const content = `[${topic.name} / ${diff}] Question #${i}: What is the correct physical formula or law associated with ${topic.name}?`;
    const data = JSON.stringify({
      options: [
        { id: 'opt_1', text: `Option A for Q${i}`, isCorrect: true },
        { id: 'opt_2', text: `Option B for Q${i}`, isCorrect: false },
        { id: 'opt_3', text: `Option C for Q${i}`, isCorrect: false },
        { id: 'opt_4', text: `Option D for Q${i}`, isCorrect: false },
      ],
      explanation: `Detailed scientific explanation for Question ${i}.`,
    });

    await pgDb.query(
      `INSERT INTO "questions" (
        "id", "type", "content", "data", "difficulty", "marks", "status", "version",
        "courseId", "subjectId", "syllabusNodeId", "createdAt", "updatedAt"
      ) VALUES ($1, 'MCQ_SINGLE', $2, $3, $4, 4.0, 'PUBLISHED', 1, 'c1', $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO UPDATE SET
        "status" = 'PUBLISHED',
        "difficulty" = EXCLUDED."difficulty",
        "syllabusNodeId" = EXCLUDED."syllabusNodeId"`,
      [qId, content, data, diff, topic.subjectId, topic.id]
    );
    count++;
  }

  console.log(`Seeded ${count} published questions in Question Bank.`);
  process.exit(0);
}

seedQuestions().catch((e) => {
  console.error(e);
  process.exit(1);
});
