import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Test database connection
 */
export async function testPrismaConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.info('Prisma connected to PostgreSQL successfully');
    return true;
  } catch (error) {
    console.error('Prisma connection failed:', error);
    return false;
  }
}

/**
 * Close Prisma connection
 */
export async function closePrismaConnection(): Promise<void> {
  await prisma.$disconnect();
  console.info('Prisma connection closed');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closePrismaConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePrismaConnection();
  process.exit(0);
});

export default prisma; 