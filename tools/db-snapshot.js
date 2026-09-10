/**
 * ExamOS Read-Only Database State Snapshot
 * ==============================================================
 * Connects to the local PostgreSQL 16 (PGlite) database, executes
 * a fixed set of read-only diagnostic queries, and writes a
 * structure/counts snapshot to `db-state.txt` at the repo root.
 *
 * Designed to be invoked by Reviewzip.bat and Reviewzip.sh before
 * packaging. Contains NO user PII, passwords, translation content,
 * or API secrets.
 * ==============================================================
 */

const fs = require('fs');
const path = require('path');

// 1. Resolve repository root directory
function findRepoRoot() {
  let cur = process.cwd();
  for (let i = 0; i < 4; i++) {
    if (fs.existsSync(path.join(cur, 'Reviewzip.bat')) || fs.existsSync(path.join(cur, 'start_all.bat'))) {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return path.resolve(__dirname, '..');
}

const repoRoot = findRepoRoot();
const outputFile = path.join(repoRoot, 'db-state.txt');

// 2. Resolve database client
function getDbClient() {
  const dbPkgCandidates = [
    path.resolve(repoRoot, 'Exam/packages/database/src/index.js'),
    path.resolve(__dirname, '../Exam/packages/database/src/index.js'),
    path.resolve(process.cwd(), 'Exam/packages/database/src/index.js'),
    path.resolve(process.cwd(), 'packages/database/src/index.js'),
  ];

  for (const p of dbPkgCandidates) {
    if (fs.existsSync(p)) {
      try {
        const mod = require(p);
        if (mod && mod.pgDb) {
          return mod.pgDb;
        }
      } catch {}
    }
  }

  // Fallback: direct PGlite
  const pgliteCandidates = [
    '@electric-sql/pglite',
    path.resolve(repoRoot, 'node_modules/@electric-sql/pglite'),
    path.resolve(repoRoot, 'Exam/node_modules/@electric-sql/pglite'),
    path.resolve(repoRoot, 'Exam/packages/database/node_modules/@electric-sql/pglite'),
  ];

  let PGliteClass = null;
  for (const c of pgliteCandidates) {
    try {
      const mod = require(c);
      PGliteClass = mod.PGlite || mod;
      if (PGliteClass) break;
    } catch {}
  }

  if (!PGliteClass) {
    throw new Error('Could not resolve @repo/database or @electric-sql/pglite module');
  }

  const dbPath = process.env.PG_DATA_DIR || path.resolve(repoRoot, 'postgres-data');
  return new PGliteClass(dbPath);
}

// 3. Helper to safely run a query section with error catching
async function runSection(db, title, queryFn) {
  try {
    return await queryFn(db);
  } catch (err) {
    return `[${title}]\nN/A - table not found (${err.message || 'error'})\n`;
  }
}

async function generateSnapshot() {
  const lines = [];
  const timestamp = new Date().toISOString();

  lines.push('================================================================================');
  lines.push(' ExamOS Database State Snapshot');
  lines.push(` Generated at: ${timestamp}`);
  lines.push(` Target file:  db-state.txt`);
  lines.push(' Notice:       Read-only diagnostic snapshot. Contains no PII, secrets, or content.');
  lines.push('================================================================================\n');

  let db;
  try {
    db = getDbClient();
    // Verify connection is ready
    if (db.waitReady) {
      await db.waitReady;
    }
    await db.query('SELECT 1');
  } catch (initErr) {
    const errorMsg = `DB snapshot unavailable: ${initErr.message || initErr}`;
    fs.writeFileSync(outputFile, errorMsg + '\n', 'utf8');
    console.error(errorMsg);
    process.exit(0);
  }

  // Section 1: languages
  const sec1 = await runSection(db, 'LANGUAGES', async () => {
    const res = await db.query(
      `SELECT "code", "name", "isActive", "isDefault", "updatedAt" FROM "languages" ORDER BY "code" ASC`
    );
    let out = `[LANGUAGES] Total: ${res.rows.length}\n`;
    for (const r of res.rows) {
      const updated = r.updatedAt ? new Date(r.updatedAt).toISOString() : 'N/A';
      out += `  - ${r.code.padEnd(5)} | ${(r.name || '').padEnd(20)} | active: ${String(r.isActive).padEnd(5)} | default: ${String(r.isDefault).padEnd(5)} | updated: ${updated}\n`;
    }
    return out;
  });
  lines.push(sec1);

  // Section 2: translations count GROUP BY language
  const sec2 = await runSection(db, 'TRANSLATIONS BY LANGUAGE', async () => {
    const res = await db.query(
      `SELECT l."code", l."name", COUNT(t."id") as "transCount"
       FROM "languages" l
       LEFT JOIN "translations" t ON t."languageId" = l."id"
       GROUP BY l."code", l."name"
       ORDER BY l."code" ASC`
    );
    const totalRes = await db.query(`SELECT COUNT(*) as "total" FROM "translations"`);
    const totalCount = totalRes.rows[0]?.total || 0;
    let out = `[TRANSLATIONS BY LANGUAGE] Total rows: ${totalCount}\n`;
    for (const r of res.rows) {
      out += `  - ${r.code.padEnd(5)} | ${(r.name || '').padEnd(20)} : ${r.transCount} rows\n`;
    }
    return out;
  });
  lines.push(sec2);

  // Section 3: translation_keys count
  const sec3 = await runSection(db, 'TRANSLATION KEYS', async () => {
    const res = await db.query(`SELECT COUNT(*) as "total" FROM "translation_keys"`);
    const count = res.rows[0]?.total || 0;
    return `[TRANSLATION KEYS] Total registered keys: ${count} (baseline target: 172)\n`;
  });
  lines.push(sec3);

  // Section 4: permissions list
  const sec4 = await runSection(db, 'PERMISSIONS', async () => {
    const res = await db.query(`SELECT "key" FROM "permissions" ORDER BY "key" ASC`);
    let out = `[PERMISSIONS] Total defined: ${res.rows.length}\n`;
    for (const r of res.rows) {
      out += `  - ${r.key}\n`;
    }
    return out;
  });
  lines.push(sec4);

  // Section 5: role_permissions count GROUP BY role
  const sec5 = await runSection(db, 'ROLE PERMISSIONS', async () => {
    const res = await db.query(
      `SELECT r."id" as "roleId", r."name" as "roleName", COUNT(rp."permissionId") as "permCount"
       FROM "roles" r
       LEFT JOIN "role_permissions" rp ON r."id" = rp."roleId"
       GROUP BY r."id", r."name"
       ORDER BY r."name" ASC`
    );
    let out = `[ROLE PERMISSIONS] Total roles: ${res.rows.length}\n`;
    for (const r of res.rows) {
      out += `  - ${(r.roleName || '').padEnd(16)} (${r.roleId}): ${r.permCount} permissions granted\n`;
    }
    return out;
  });
  lines.push(sec5);

  // Section 6: ai_providers (scope, name, isActive, priority) - NO SECRETS
  const sec6 = await runSection(db, 'AI PROVIDERS', async () => {
    const res = await db.query(
      `SELECT "scope", "name", "isActive", "priority" FROM "ai_providers" ORDER BY "priority" ASC, "name" ASC`
    );
    let out = `[AI PROVIDERS] Total configured: ${res.rows.length}\n`;
    for (const r of res.rows) {
      out += `  - [${r.scope || 'GLOBAL'}] ${(r.name || '').padEnd(20)} | active: ${String(r.isActive).padEnd(5)} | priority: ${r.priority}\n`;
    }
    return out;
  });
  lines.push(sec6);

  // Section 7: interview_sessions COUNT GROUP BY interviewPhase
  const sec7 = await runSection(db, 'INTERVIEW SESSIONS BY PHASE', async () => {
    const res = await db.query(
      `SELECT COALESCE("interviewPhase", 'UNSET') as "phase", COUNT(*) as "count"
       FROM "interview_sessions"
       GROUP BY "interviewPhase"
       ORDER BY "interviewPhase" ASC`
    );
    const totalRes = await db.query(`SELECT COUNT(*) as "total" FROM "interview_sessions"`);
    const totalCount = totalRes.rows[0]?.total || 0;
    let out = `[INTERVIEW SESSIONS BY PHASE] Total sessions: ${totalCount}\n`;
    if (res.rows.length === 0) {
      out += `  (No interview sessions currently recorded)\n`;
    } else {
      for (const r of res.rows) {
        out += `  - ${r.phase.padEnd(20)} : ${r.count} sessions\n`;
      }
    }
    return out;
  });
  lines.push(sec7);

  // Section 8: Schema migration markers / recent phase table row counts
  const recentTables = [
    'plans',
    'entitlement_rules',
    'subscriptions',
    'ai_credit_packages',
    'audio_voice_profiles',
    'vocabulary_words',
    'interview_sessions',
    'candidate_interview_profiles',
    'languages',
    'translation_keys',
    'translations',
    'feature_registry',
    'maintenance_configs',
  ];

  const markerCounts = [];
  for (const tbl of recentTables) {
    try {
      const r = await db.query(`SELECT COUNT(*) as c FROM "${tbl}"`);
      markerCounts.push(`${tbl}: ${r.rows[0].c}`);
    } catch {
      markerCounts.push(`${tbl}: N/A`);
    }
  }

  lines.push('[SCHEMA MIGRATION MARKERS & RECENT PHASE TABLE COUNTS]');
  lines.push(markerCounts.join(' | '));
  lines.push('\n================================================================================\n');

  const content = lines.join('\n');
  fs.writeFileSync(outputFile, content, 'utf8');
  console.log(`[db-snapshot] Database state snapshot successfully written to ${outputFile}`);

  process.exit(0);
}

generateSnapshot().catch((err) => {
  try {
    const fallbackMsg = `DB snapshot unavailable: ${err.message || err}\n`;
    fs.writeFileSync(outputFile, fallbackMsg, 'utf8');
    console.error(`[db-snapshot] Failed to write snapshot: ${err.message || err}`);
  } catch {}
  process.exit(0);
});
