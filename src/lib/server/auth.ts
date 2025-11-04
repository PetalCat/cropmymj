import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import crypto from 'crypto';
import { env } from '$env/dynamic/private';

const API_TOKENS_ENV = env.API_TOKENS || process.env.API_TOKENS || '';
const SITE_PASSWORD = env.SITE_PASSWORD || process.env.SITE_PASSWORD || '';
const API_TOKENS = API_TOKENS_ENV.split(',').filter((t) => t.trim());
const PASSWORD_ENABLED = SITE_PASSWORD && SITE_PASSWORD.length > 0;

console.log('API_TOKENS loaded:', API_TOKENS.length > 0 ? `${API_TOKENS.length} token(s)` : 'NONE');
console.log('API_TOKENS value:', API_TOKENS);

function hashPassword(password: string): string {
	return crypto.createHash('sha256').update(password).digest('hex');
}

export function validateApiToken(event: RequestEvent<any, any>) {
	const authHeader = event.request.headers.get('authorization');

	if (!authHeader) {
		return json({ error: 'Missing authorization header' }, { status: 401 });
	}

	const token = authHeader.replace('Bearer ', '');

	// Check if it's a valid API token (only API tokens work, not site password)
	if (API_TOKENS.includes(token)) {
		return null; // Valid API token
	}

	return json({ error: 'Invalid API token' }, { status: 403 });
}
