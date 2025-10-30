import type { Handle } from '@sveltejs/kit';
import { startNormalizer } from '$lib/server/normalizer';
import { SITE_PASSWORD, DB_PATH, API_TOKENS, IMAGES_PATH } from '$env/static/private';
import crypto from 'crypto';

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

// Paths that are always public (no auth required)
const ALWAYS_PUBLIC_PATHS = ['/login', '/api/login', '/api/logout'];

// Paths that require API token (v1 API endpoints)
const API_TOKEN_PATHS = ['/api/v1/'];

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	// Always allow these paths
	if (ALWAYS_PUBLIC_PATHS.some((p) => path === p || path.startsWith(p))) {
		return resolve(event);
	}

	// API token authentication for v1 endpoints
	if (API_TOKEN_PATHS.some((p) => path.startsWith(p))) {
		// These are handled by validateApiToken in each endpoint
		return resolve(event);
	}

	// Login-based authentication for main app and user-facing API endpoints
	if (PASSWORD_ENABLED && !isAuthenticated(event)) {
		// Redirect to login page
		if (path.startsWith('/api/')) {
			// For API requests, return 401
			return new Response(JSON.stringify({ error: 'Authentication required. Please log in.' }), {
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
