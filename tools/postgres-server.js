/**
 * LEGACY / REFERENCE ONLY
 * ----------------------------------------------------------------------------
 * NOTE: This standalone TCP proxy server on port 5432 is NO LONGER invoked by
 * `start_all.bat` or any live application runtime service.
 *
 * ExamOS has unified its database access layer to use embedded `pgDb` (PGlite)
 * directly in-process within `apps/api` (zero TCP overhead, zero port conflicts,
 * and zero multi-process file locking collisions).
 *
 * This file is retained solely for standalone debugging or external PostgreSQL
 * GUI clients (e.g., DBeaver / pgAdmin) when the API server is offline.
 * ----------------------------------------------------------------------------
 */

const { PGlite } = require('@electric-sql/pglite');
const { createVirtualServer } = require('pg-gateway');

const path = require('path');
const fs = require('fs');

const dataDir = path.resolve(__dirname, '../postgres-data');
const pidFile = path.join(dataDir, 'postmaster.pid');
if (fs.existsSync(pidFile)) {
  try {
    fs.unlinkSync(pidFile);
  } catch {}
}

const db = new PGlite(dataDir);

const server = createVirtualServer({
  async onStartup() {
    // Connection initialized
  },
  async onAuth() {
    return { status: 'OK' };
  },
  async onQuery(query) {
    try {
      const res = await db.query(query.sql, query.params);
      return {
        rows: res.rows.map((row) => Object.values(row)),
        fields: res.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
      };
    } catch (err) {
      console.error('PostgreSQL Exec Error:', err.message);
      throw err;
    }
  },
});

const PORT = 5432;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` [DEBUG/LEGACY] PostgreSQL 16 Engine running on port ${PORT}`);
  console.log(`====================================================`);
});
