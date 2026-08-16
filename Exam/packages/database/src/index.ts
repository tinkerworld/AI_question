import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

function getDbPath(): string {
  if (process.env.PG_DATA_DIR && fs.existsSync(process.env.PG_DATA_DIR)) {
    return process.env.PG_DATA_DIR;
  }
  const workspaceRootData = path.resolve(__dirname, '../../../../postgres-data');
  if (fs.existsSync(workspaceRootData)) {
    return workspaceRootData;
  }
  const cwdData = path.resolve(process.cwd(), 'postgres-data');
  if (fs.existsSync(cwdData)) {
    return cwdData;
  }
  return path.resolve(__dirname, '../prisma/postgres-data');
}

const dbPath = getDbPath();
export const pgDb = new PGlite(dbPath);

export const prisma = new PrismaClient();

export * from '@prisma/client';
