import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
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
		// Insert or get image
		const insertImage = db.prepare(
			'INSERT OR IGNORE INTO images (filename, width, height) VALUES (?, ?, ?)'
		);
		insertImage.run(filename, width, height);

		const getImage = db.prepare('SELECT id FROM images WHERE filename = ?');
		const image = getImage.get(filename) as { id: number };

		// Insert crop
		const insertCrop = db.prepare(
			'INSERT INTO crops (image_id, user_id, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?)'
		);
		insertCrop.run(image.id, userId, crop.x, crop.y, crop.width, crop.height);

		// Insert orientation
		const insertOrientation = db.prepare(
			'INSERT INTO orientations (image_id, user_id, orientation) VALUES (?, ?, ?)'
		);
		insertOrientation.run(image.id, userId, orientation);

		return json({ success: true, imageId: image.id });
	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Failed to save data' }, { status: 500 });
	}
};
