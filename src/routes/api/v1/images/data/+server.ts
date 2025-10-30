import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateApiToken } from '$lib/server/auth';
import prisma from '$lib/server/db';

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
		const image = await prisma.image.findUnique({
			where: { filename },
			include: {
				crops: true,
				orientations: true
			}
		});

		if (!image) {
			return json({ error: 'Image not found' }, { status: 404 });
		}

		// Calculate consensus
		let consensusCrop = null;
		if (image.crops.length > 0) {
			consensusCrop = {
				x: Math.round(image.crops.reduce((sum, c) => sum + c.x, 0) / image.crops.length),
				y: Math.round(image.crops.reduce((sum, c) => sum + c.y, 0) / image.crops.length),
				width: Math.round(image.crops.reduce((sum, c) => sum + c.width, 0) / image.crops.length),
				height: Math.round(image.crops.reduce((sum, c) => sum + c.height, 0) / image.crops.length)
			};
		}

		const orientationCounts = image.orientations.reduce(
			(acc, o) => {
				acc[o.orientation] = (acc[o.orientation] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		const consensusOrientation =
			Object.entries(orientationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

		return json({
			id: image.id,
			filename: image.filename,
			width: image.width,
			height: image.height,
			created_at: image.created_at,
			crops: image.crops,
			orientations: image.orientations,
			consensusCrop,
			consensusOrientation,
			submissionCount: image.crops.length
		});
	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Failed to fetch image data' }, { status: 500 });
	}
};
