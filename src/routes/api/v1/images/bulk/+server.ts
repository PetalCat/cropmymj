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
}

interface OrientationRow {
	orientation: string;
}

/**
 * POST /api/v1/images/bulk
 * Get data for multiple images by filenames
 * Body: { filenames: string[] }
 */
export const POST: RequestHandler = async (event) => {
	const authError = validateApiToken(event);
	if (authError) return authError;

	try {
		const { filenames } = await event.request.json();

		if (!Array.isArray(filenames) || filenames.length === 0) {
			return json({ error: 'filenames array required' }, { status: 400 });
		}

		const placeholders = filenames.map(() => '?').join(',');
		const query = `SELECT id, filename, width, height, created_at FROM images WHERE filename IN (${placeholders})`;

		const getImages = db.prepare(query);
		const images = getImages.all(...filenames) as ImageRow[];

		const imagesWithData = images.map((image) => {
			const getCrops = db.prepare('SELECT x, y, width, height FROM crops WHERE image_id = ?');
			const crops = getCrops.all(image.id) as CropRow[];

			const getOrientations = db.prepare('SELECT orientation FROM orientations WHERE image_id = ?');
			const orientations = getOrientations.all(image.id) as OrientationRow[];

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

			return {
				...image,
				consensusCrop,
				consensusOrientation,
				submissionCount: crops.length
			};
		});

		return json({
			images: imagesWithData,
			found: images.length,
			requested: filenames.length
		});
	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Failed to fetch bulk image data' }, { status: 500 });
	}
};
