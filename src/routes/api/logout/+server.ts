import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	// Clear the session cookie
	cookies.delete('session_auth', { path: '/' });

	return new Response(null, {
		status: 302,
		headers: { Location: '/login' }
	});
};
