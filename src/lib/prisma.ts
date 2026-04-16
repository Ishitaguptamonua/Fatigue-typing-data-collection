
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Node 22+ has a stable global WebSocket. Prefer it over 'ws' to avoid native module errors.
neonConfig.webSocketConstructor = globalThis.WebSocket || ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof prismaClientSingleton> | undefined;
};

export const getPrisma = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Prisma cannot be used on the client side.');
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prismaClientSingleton();
  }
  
  return globalForPrisma.prisma;
};
