import { PrismaClient } from '@prisma/client';

declare global {
  var prismaSingleton: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaSingleton ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaSingleton = prisma;
}

export * from '@prisma/client';
