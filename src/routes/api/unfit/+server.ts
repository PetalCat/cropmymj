import { json } from '@sveltejs/kit';
import prisma from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { filename, width, height, userId } = await request.json();

	// Validate required fields
	if (!filename || !width || !height || !userId) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	try {
		// Upsert image (create if doesn't exist, or get existing)
		const image = await prisma.image.upsert({
			where: { filename },
			update: {},
			create: { filename, width, height }
		});

		// Create unfit marking
		await prisma.unfit.create({
			data: {
				image_id: image.id,
				user_id: userId
			}
		});

		return json({ success: true, imageId: image.id });
	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Failed to save unfit marking' }, { status: 500 });
	}
};
