import { PGlite } from '@electric-sql/pglite';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

function getDbPath(): string {
  if (process.env.PG_DATA_DIR) {
    if (process.env.PG_DATA_DIR === 'memory://' || process.env.PG_DATA_DIR === ':memory:') {
      return process.env.PG_DATA_DIR;
    }
    return path.resolve(process.env.PG_DATA_DIR);
  }
  let cur = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, 'start_all.bat')) || fs.existsSync(path.join(cur, 'ExamOS-Build-Directive.md'))) {
      const targetDir = path.join(cur, 'postgres-data');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      return targetDir;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  const fallback = path.resolve(process.cwd(), 'postgres-data');
  if (!fs.existsSync(fallback)) {
    fs.mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

let _pgDbInstance: PGlite | null = null;

export function setTestDb(db: PGlite | null) {
  _pgDbInstance = db;
}

function getOrInitDb(): PGlite {
  if (!_pgDbInstance) {
    const dbPath = getDbPath();
    if (dbPath === 'memory://' || dbPath === ':memory:') {
      _pgDbInstance = new PGlite();
    } else {
      const pidFile = path.join(dbPath, 'postmaster.pid');
      if (fs.existsSync(pidFile)) {
        try {
          fs.unlinkSync(pidFile);
        } catch {}
      }
      _pgDbInstance = new PGlite(dbPath);
    }
  }
  return _pgDbInstance;
}

// Primary in-process PostgreSQL 16 engine for all runtime services and routes
// Uses lazy Proxy so importing @repo/database in unit tests without queries does not lock postgres-data
export const pgDb: PGlite = new Proxy({} as PGlite, {
  get(_target, prop) {
    if (prop === 'close') {
      return async () => {
        if (_pgDbInstance) {
          await _pgDbInstance.close();
          _pgDbInstance = null;
        }
      };
    }
    const db = getOrInitDb();
    if (prop === 'waitReady') {
      return db.waitReady;
    }
    const val = (db as any)[prop];
    if (typeof val === 'function') {
      return async (...args: any[]) => {
        if (db.waitReady) {
          await db.waitReady;
        }
        return val.apply(db, args);
      };
    }
    return val;
  },
});
