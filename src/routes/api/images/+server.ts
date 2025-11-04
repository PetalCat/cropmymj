import { json } from '@sveltejs/kit';
import { readdir } from 'fs/promises';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';

const IMAGES_PATH = env.IMAGES_PATH || './data/images';
const SITE_PASSWORD = env.SITE_PASSWORD || '';
const PASSWORD_ENABLED = SITE_PASSWORD && SITE_PASSWORD.length > 0;

function hashPassword(password: string): string {
	return crypto.createHash('sha256').update(password).digest('hex');
}

function isAuthenticated(cookies: any): boolean {
	if (!PASSWORD_ENABLED) return true; // No password set, allow access

	const sessionPassword = cookies.get('session_auth');
	if (!sessionPassword) return false;

	return sessionPassword === hashPassword(SITE_PASSWORD);
}

export const GET: RequestHandler = async ({ cookies }) => {
	// Check authentication
	if (!isAuthenticated(cookies)) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		const files = await readdir(IMAGES_PATH);
		const imageFiles = files.filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
		return json({ images: imageFiles });
	} catch (error) {
		console.error('Error reading images directory:', error);
		return json({ error: 'Failed to load images' }, { status: 500 });
	}
};
