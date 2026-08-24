const { pgDb } = require('../Exam/packages/database');

(async () => {
  try {
    console.log('Patching PostgreSQL tables for changeSummary and entity_versions...');
    await pgDb.query(`ALTER TABLE "question_versions" ADD COLUMN IF NOT EXISTS "changeSummary" TEXT;`);
    console.log('ALTER TABLE question_versions ADD COLUMN changeSummary TEXT -> OK');
    
    // Check entity_versions table exists
    const evRes = await pgDb.query(`
      CREATE TABLE IF NOT EXISTS "entity_versions" (
        "id" TEXT PRIMARY KEY,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "version" INT NOT NULL,
        "data" JSONB NOT NULL,
        "changeSummary" TEXT NOT NULL,
        "createdBy" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("entityType", "entityId", "version")
      );
    `);
    console.log('CREATE TABLE IF NOT EXISTS entity_versions -> OK');

    process.exit(0);
  } catch (err) {
    console.error('Migration patch failed:', err);
    process.exit(1);
  }
})();
