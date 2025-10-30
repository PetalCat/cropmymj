import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { filename, width, height, userId } = await request.json();

	// Validate required fields
	if (!filename || !width || !height || !userId) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	try {
		// Insert or get image
		const insertImage = db.prepare(
			'INSERT OR IGNORE INTO images (filename, width, height) VALUES (?, ?, ?)'
		);
		insertImage.run(filename, width, height);

		const getImage = db.prepare('SELECT id FROM images WHERE filename = ?');
		const image = getImage.get(filename) as { id: number };

		// Insert unfit marking
		const insertUnfit = db.prepare('INSERT INTO unfits (image_id, user_id) VALUES (?, ?)');
		insertUnfit.run(image.id, userId);

		return json({ success: true, imageId: image.id });
	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Failed to save unfit marking' }, { status: 500 });
	}
};
