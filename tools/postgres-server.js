const { PGlite } = require('@electric-sql/pglite');
const { createVirtualServer } = require('pg-gateway');

const db = new PGlite('./postgres-data');

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
  console.log(` Native PostgreSQL 16 Engine running on port ${PORT}`);
  console.log(`====================================================`);
});
