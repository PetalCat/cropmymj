import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateApiToken } from '$lib/server/auth';
import db from '$lib/server/db';

interface ImageRow {
	id: number;
	filename: string;
	width: number;
	height: number;
	created_at: string;
}

interface CropRow {
	x: number;
	y: number;
	width: number;
	height: number;
	user_id: string;
}

interface OrientationRow {
	orientation: string;
	user_id: string;
}

interface UnfitRow {
	user_id: string;
}

/**
 * GET /api/v1/images/data?filename=image.jpg
 * Returns data for a specific image
 */
export const GET: RequestHandler = async (event) => {
	const authError = validateApiToken(event);
	if (authError) return authError;

	const filename = event.url.searchParams.get('filename');

	if (!filename) {
		return json({ error: 'Filename parameter required' }, { status: 400 });
	}

	try {
		const getImage = db.prepare(
			'SELECT id, filename, width, height, created_at FROM images WHERE filename = ?'
		);
		const image = getImage.get(filename) as ImageRow | undefined;

		if (!image) {
			return json({ error: 'Image not found' }, { status: 404 });
		}

		const getCrops = db.prepare(
			'SELECT x, y, width, height, user_id FROM crops WHERE image_id = ?'
		);
		const crops = getCrops.all(image.id) as CropRow[];

		const getOrientations = db.prepare(
			'SELECT orientation, user_id FROM orientations WHERE image_id = ?'
		);
		const orientations = getOrientations.all(image.id) as OrientationRow[];

		const getUnfits = db.prepare('SELECT user_id FROM unfits WHERE image_id = ?');
		const unfits = getUnfits.all(image.id) as UnfitRow[];

		// Calculate consensus
		let consensusCrop = null;
		if (crops.length > 0) {
			consensusCrop = {
				x: Math.round(crops.reduce((sum, c) => sum + c.x, 0) / crops.length),
				y: Math.round(crops.reduce((sum, c) => sum + c.y, 0) / crops.length),
				width: Math.round(crops.reduce((sum, c) => sum + c.width, 0) / crops.length),
				height: Math.round(crops.reduce((sum, c) => sum + c.height, 0) / crops.length)
			};
		}

		const orientationCounts = orientations.reduce(
			(acc, o) => {
				acc[o.orientation] = (acc[o.orientation] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		const consensusOrientation =
			Object.entries(orientationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

		return json({
			...image,
			crops,
			orientations,
			unfits,
			consensusCrop,
			consensusOrientation,
			submissionCount: crops.length
		});
	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Failed to fetch image data' }, { status: 500 });
	}
};
