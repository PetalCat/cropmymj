import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { API_TOKENS as API_TOKENS_ENV, SITE_PASSWORD } from '$env/static/private';
import crypto from 'crypto';

const API_TOKENS = API_TOKENS_ENV.split(',').filter((t) => t.trim());
const PASSWORD_ENABLED = SITE_PASSWORD && SITE_PASSWORD.length > 0;

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
