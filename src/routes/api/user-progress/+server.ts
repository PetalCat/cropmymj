import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';

/**
 * GET /api/user-progress?userId=xxx
 * Returns the number of submissions (crops) this user has made
 */
export const GET: RequestHandler = async ({ url }) => {
	const userId = url.searchParams.get('userId');

	if (!userId) {
		return json({ error: 'userId parameter required' }, { status: 400 });
	}

	try {
		// Count how many crops this user has submitted
		const cropCount = db.prepare('SELECT COUNT(*) as count FROM crops WHERE user_id = ?');
		const cropResult = cropCount.get(userId) as { count: number } | undefined;

		// Count how many unfit marks this user has submitted
		const unfitCount = db.prepare('SELECT COUNT(*) as count FROM unfits WHERE user_id = ?');
		const unfitResult = unfitCount.get(userId) as { count: number } | undefined;

		// Total submissions = crops + unfits
		const totalSubmissions = (cropResult?.count || 0) + (unfitResult?.count || 0);

		return json({
			userId,
			submissionCount: totalSubmissions,
			cropCount: cropResult?.count || 0,
			unfitCount: unfitResult?.count || 0
		});
	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Failed to fetch user progress' }, { status: 500 });
	}
};
