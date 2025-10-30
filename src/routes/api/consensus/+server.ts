import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

interface CropRow {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface OrientationRow {
	orientation: string;
}

export const GET: RequestHandler = async ({ url }) => {
	const filename = url.searchParams.get('filename');

	if (!filename) {
		return json({ error: 'Filename parameter required' }, { status: 400 });
	}

	try {
		// Get image ID
		const getImage = db.prepare('SELECT id, width, height FROM images WHERE filename = ?');
		const image = getImage.get(filename) as
			| { id: number; width: number; height: number }
			| undefined;

		if (!image) {
			return json({ error: 'Image not found' }, { status: 404 });
		}

		// Get all crops for this image
		const getCrops = db.prepare('SELECT x, y, width, height FROM crops WHERE image_id = ?');
		const crops = getCrops.all(image.id) as CropRow[];

		if (crops.length === 0) {
			return json({ error: 'No crops found for this image' }, { status: 404 });
		}

		// Calculate average crop
		const avgCrop = {
			x: Math.round(crops.reduce((sum, c) => sum + c.x, 0) / crops.length),
			y: Math.round(crops.reduce((sum, c) => sum + c.y, 0) / crops.length),
			width: Math.round(crops.reduce((sum, c) => sum + c.width, 0) / crops.length),
			height: Math.round(crops.reduce((sum, c) => sum + c.height, 0) / crops.length)
		};

		// Get all orientations for this image
		const getOrientations = db.prepare('SELECT orientation FROM orientations WHERE image_id = ?');
		const orientations = getOrientations.all(image.id) as OrientationRow[];

		// Find most common orientation
		const orientationCounts = orientations.reduce(
			(acc, o) => {
				acc[o.orientation] = (acc[o.orientation] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		const mostCommonOrientation =
			Object.entries(orientationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'side';

		return json({
			filename,
			imageWidth: image.width,
			imageHeight: image.height,
			consensusCrop: avgCrop,
			consensusOrientation: mostCommonOrientation,
			submissionCount: crops.length,
			orientationCounts
		});
	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Failed to fetch consensus data' }, { status: 500 });
	}
};
