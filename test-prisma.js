require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
const ws = require('ws');
const { neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

prisma.$connect()
  .then(() => console.log('Connected!'))
  .catch(e => console.error('Failed to connect:', e))
  .finally(() => prisma.$disconnect());
