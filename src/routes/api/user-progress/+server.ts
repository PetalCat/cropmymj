import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import prisma from '$lib/server/db';

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
		const cropCount = await prisma.crop.count({
			where: { user_id: userId }
		});

		// Count how many unfit marks this user has submitted
		const unfitCount = await prisma.unfit.count({
			where: { user_id: userId }
		});

		// Total submissions = crops + unfits
		const totalSubmissions = cropCount + unfitCount;

		return json({
			userId,
			submissionCount: totalSubmissions,
			cropCount,
			unfitCount
		});
	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Failed to fetch user progress' }, { status: 500 });
	}
};
