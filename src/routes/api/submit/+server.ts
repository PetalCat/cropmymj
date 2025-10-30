import { json } from '@sveltejs/kit';
import prisma from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { filename, width, height, crop, orientation, userId } = await request.json();

	// Validate required fields
	if (!filename || !width || !height || !crop || !orientation || !userId) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	if (!['side', 'front'].includes(orientation)) {
		return json({ error: 'Invalid orientation. Must be "side" or "front"' }, { status: 400 });
	}

	try {
		// Upsert image (create if doesn't exist, or get existing)
		const image = await prisma.image.upsert({
			where: { filename },
			update: {},
			create: { filename, width, height }
		});

		// Create crop and orientation in a transaction
		await prisma.$transaction([
			prisma.crop.create({
				data: {
					image_id: image.id,
					user_id: userId,
					x: crop.x,
					y: crop.y,
					width: crop.width,
					height: crop.height
				}
			}),
			prisma.orientation.create({
				data: {
					image_id: image.id,
					user_id: userId,
					orientation
				}
			})
		]);

		return json({ success: true, imageId: image.id });
	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Failed to save data' }, { status: 500 });
	}
};
