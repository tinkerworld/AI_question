import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = path.resolve(__dirname, '../prisma/postgres-data');
export const pgDb = new PGlite(dbPath);

export const prisma = new PrismaClient();

export * from '@prisma/client';
