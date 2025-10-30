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
				crops: { select: { x: true, y: true, width: true, height: true, user_id: true } },
				orientations: { select: { orientation: true, user_id: true } },
				unfits: { select: { user_id: true } }
			}
		});

		if (!image) {
			return json({ error: 'Image not found' }, { status: 404 });
		}

		const { crops, orientations, unfits, ...imageData } = image;

		// Calculate consensus
		let consensusCrop = null;
		if (crops.length > 0) {
			consensusCrop = {
				x: Math.round(crops.reduce((sum: number, c) => sum + c.x, 0) / crops.length),
				y: Math.round(crops.reduce((sum: number, c) => sum + c.y, 0) / crops.length),
				width: Math.round(crops.reduce((sum: number, c) => sum + c.width, 0) / crops.length),
				height: Math.round(crops.reduce((sum: number, c) => sum + c.height, 0) / crops.length)
			};
		}

		const orientationCounts: Record<string, number> = {};
		orientations.forEach((o) => {
			orientationCounts[o.orientation] = (orientationCounts[o.orientation] || 0) + 1;
		});

		const consensusOrientation =
			Object.entries(orientationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

		return json({
			...imageData,
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
