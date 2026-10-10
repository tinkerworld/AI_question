import { PGlite } from '@electric-sql/pglite';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

export function getDbPath(): string {
  if (process.env.PG_DATA_DIR) {
    if (process.env.PG_DATA_DIR === 'memory://' || process.env.PG_DATA_DIR === ':memory:') {
      return process.env.PG_DATA_DIR;
    }
    return path.resolve(process.env.PG_DATA_DIR);
  }
  // Default to in-memory for unit and integration tests if no explicit PG_DATA_DIR is provided
  if (process.env.NODE_ENV === 'test') {
    return 'memory://';
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
let _initPromise: Promise<PGlite> | null = null;

export function setTestDb(db: PGlite | null) {
  _pgDbInstance = db;
  _initPromise = db ? Promise.resolve(db) : null;
}

async function getOrInitReadyDb(): Promise<PGlite> {
  if (_pgDbInstance) {
    if (_pgDbInstance.waitReady) {
      await _pgDbInstance.waitReady;
    }
    return _pgDbInstance;
  }
  if (_initPromise) {
    return _initPromise;
  }

  _initPromise = (async () => {
    const dbPath = getDbPath();
    if (dbPath === 'memory://' || dbPath === ':memory:') {
      const memDb = new PGlite();
      await memDb.waitReady;
      _pgDbInstance = memDb;
      return memDb;
    }

    const pidFile = path.join(dbPath, 'postmaster.pid');
    if (fs.existsSync(pidFile)) {
      try {
        fs.unlinkSync(pidFile);
      } catch {}
    }

    try {
      const diskDb = new PGlite(dbPath);
      // Attach noop catch to suppress raw unhandled rejection from Node.js
      diskDb.waitReady.catch(() => {});
      await diskDb.waitReady;
      _pgDbInstance = diskDb;
      return diskDb;
    } catch (err: any) {
      _initPromise = null;
      const isAbort = String(err?.message || err).includes('Aborted') || err?.name === 'RuntimeError';
      if (isAbort) {
        if (process.env.NODE_ENV === 'test' || process.env.PG_ALLOW_MEMORY_FALLBACK === 'true') {
          console.warn(
            `[ExamOS Database] Warning: Database directory at "${dbPath}" is locked by another running ExamOS process. Falling back to isolated in-memory database.`
          );
          const fallbackDb = new PGlite();
          await fallbackDb.waitReady;
          _pgDbInstance = fallbackDb;
          return fallbackDb;
        }
        throw new Error(
          `[ExamOS Database Lock Error] Could not open database directory "${dbPath}" because it is currently locked by another active ExamOS process (likely the API server on port 4043). Please stop existing processes using "stop_all.bat", or set PG_DATA_DIR=memory:// for an isolated instance.`
        );
      }
      throw err;
    }
  })();

  return _initPromise;
}

export interface ExamDatabaseClient extends Omit<PGlite, 'query'> {
  query: <T = any>(query: string, params?: any[]) => Promise<{ rows: T[]; fields: any[]; affectedRows?: number; rowCount?: number }>;
  close: () => Promise<void>;
  waitReady: Promise<void>;
  [key: string]: any;
}

// Primary in-process PostgreSQL 16 engine for all runtime services and routes
// Uses lazy Proxy so importing @repo/database in unit tests without queries does not lock postgres-data
export const pgDb: ExamDatabaseClient = new Proxy({} as any, {
  set(target, prop, value) {
    target[prop] = value;
    return true;
  },
  deleteProperty(target, prop) {
    delete target[prop];
    return true;
  },
  get(target, prop) {
    if (prop in target) {
      return (target as any)[prop];
    }
    if (prop === 'close') {
      return async () => {
        if (_pgDbInstance) {
          try {
            await _pgDbInstance.close();
          } catch {}
          _pgDbInstance = null;
          _initPromise = null;
        }
      };
    }
    if (prop === 'waitReady') {
      if (!_initPromise) {
        _initPromise = getOrInitReadyDb();
      }
      return _initPromise.then((db) => db.waitReady);
    }
    return async (...args: any[]) => {
      if (!_initPromise) {
        _initPromise = getOrInitReadyDb();
      }
      const db = await _initPromise;
      const val = (db as any)[prop];
      if (typeof val === 'function') {
        return val.apply(db, args);
      }
      return val;
    };
  },
});
