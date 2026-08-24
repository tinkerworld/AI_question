import { PGlite } from '@electric-sql/pglite';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

function getDbPath(): string {
  if (process.env.PG_DATA_DIR) {
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

const dbPath = getDbPath();
const pidFile = path.join(dbPath, 'postmaster.pid');
if (fs.existsSync(pidFile)) {
  try {
    fs.unlinkSync(pidFile);
  } catch {}
}

// Primary in-process PostgreSQL 16 engine for all runtime services and routes
export const pgDb = new PGlite(dbPath);
