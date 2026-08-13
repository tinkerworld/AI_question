import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import path from 'path';

// Instantiate genuine PostgreSQL 16 WASM database engine
const dbPath = path.resolve(__dirname, '../prisma/postgres-data');
export const pgDb = new PGlite(dbPath);

// Prisma Client Instance
export const prisma = new PrismaClient();

export * from '@prisma/client';
