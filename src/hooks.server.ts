import type { Handle } from '@sveltejs/kit';
import { startNormalizer } from '$lib/server/normalizer';
import crypto from 'crypto';

const SITE_PASSWORD = process.env.SITE_PASSWORD || '';
const DB_PATH = process.env.DB_PATH || './data/crops.db';
const API_TOKENS = process.env.API_TOKENS || '';
const IMAGES_DIR = process.env.IMAGES_PATH || './static/images';

// Start the image normalizer service when server starts
if (typeof window === 'undefined') {
	startNormalizer();
}

const PASSWORD_ENABLED = SITE_PASSWORD && SITE_PASSWORD.length > 0;

// Debug logging at startup
console.log('=== Environment Variables Debug ===');
console.log('SITE_PASSWORD exists:', !!SITE_PASSWORD);
console.log('PASSWORD_ENABLED:', PASSWORD_ENABLED);
console.log('DB_PATH:', DB_PATH || '[NOT SET]');
console.log('===================================');

// Hash password for comparison
function hashPassword(password: string): string {
	return crypto.createHash('sha256').update(password).digest('hex');
}

// Check if request has valid password session
function isAuthenticated(event: any): boolean {
	if (!PASSWORD_ENABLED) return true; // No password set, allow access

	const sessionPassword = event.cookies.get('session_auth');
	if (!sessionPassword) return false;

	return sessionPassword === hashPassword(SITE_PASSWORD);
}

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/login', '/api/logout', '/api/v1/', '/api/debug-env'];

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	// Allow public paths (v1 API endpoints handle their own authentication)
	if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
		return resolve(event);
	}

	// Check authentication for protected paths
	if (PASSWORD_ENABLED && !isAuthenticated(event)) {
		// Redirect to login page
		if (path.startsWith('/api/')) {
			// For API requests, return 401
			return new Response(JSON.stringify({ error: 'Authentication required' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		} else {
			// For page requests, redirect to login
			return new Response(null, {
				status: 302,
				headers: { Location: '/login' }
			});
		}
	}

	return resolve(event);
};
