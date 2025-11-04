import { PrismaClient } from '@prisma/client';
import { env } from '$env/dynamic/private';

// Ensure DATABASE_URL is set from environment
const databaseUrl = env.DATABASE_URL || process.env.DATABASE_URL;
console.log('DATABASE_URL from env:', databaseUrl);

const prisma = new PrismaClient({
	log: ['error', 'warn'],
	datasources: {
		db: {
			url: databaseUrl
		}
	}
});

export default prisma;
