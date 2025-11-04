import { PrismaClient } from '@prisma/client';
import { env } from '$env/dynamic/private';
import path from 'path';

// Ensure DATABASE_URL is set from environment
let databaseUrl = env.DATABASE_URL || process.env.DATABASE_URL;

// If it's a relative path, make it absolute from the project root
if (databaseUrl && databaseUrl.startsWith('file:./')) {
  const relativePath = databaseUrl.replace('file:./', '');
  const absolutePath = path.join(process.cwd(), relativePath);
  databaseUrl = `file:${absolutePath}`;
}

console.log('DATABASE_URL from env:', env.DATABASE_URL || process.env.DATABASE_URL);
console.log('DATABASE_URL resolved:', databaseUrl);
console.log('Current working directory:', process.cwd());

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

export default prisma;
