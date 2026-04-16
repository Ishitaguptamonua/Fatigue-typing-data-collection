import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Lazy-loaded prisma instance
// On Vercel build time, this file will be imported, but since it's just a function,
// it won't try to instantiate the client and connect to the database.
export const getPrisma = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Prisma cannot be used on the client side.');
  }

  if (process.env.NODE_ENV === 'production') {
    return prismaClientSingleton();
  } else {
    if (!globalThis.prisma) {
      globalThis.prisma = prismaClientSingleton();
    }
    return globalThis.prisma;
  }
};
