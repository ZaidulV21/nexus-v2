import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

// Single shared transaction wrapper. Every service method that performs
// multi-step writes across tables must go through this, never call
// prisma.$transaction directly, so behavior (timeout, isolation level)
// stays consistent across all modules.
export async function runInTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: 5000,
    timeout: 15000,
  });
}
