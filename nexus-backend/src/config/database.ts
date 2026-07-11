import { PrismaClient } from '@prisma/client';

// Single Prisma client instance shared across the whole app.
// No module outside repositories should import this directly.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
