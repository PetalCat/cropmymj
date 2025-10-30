import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SITE_PASSWORD } from '$env/static/private';
import crypto from 'crypto';

function hashPassword(password: string): string {
	return crypto.createHash('sha256').update(password).digest('hex');
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { password } = await request.json();

	// Debug logging
	console.log('Login attempt - SITE_PASSWORD exists:', !!SITE_PASSWORD);
	console.log('Login attempt - SITE_PASSWORD value:', SITE_PASSWORD ? '[SET]' : '[NOT SET]');
	console.log('Login attempt - Received password:', password ? '[RECEIVED]' : '[MISSING]');

	if (!SITE_PASSWORD) {
		return json({ error: 'Password protection not enabled' }, { status: 400 });
	}

	if (password === SITE_PASSWORD) {
		// Set secure cookie with hashed password
		const hashedPassword = hashPassword(SITE_PASSWORD);
		cookies.set('session_auth', hashedPassword, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		return json({ success: true });
	}

	return json({ error: 'Invalid password' }, { status: 401 });
};
