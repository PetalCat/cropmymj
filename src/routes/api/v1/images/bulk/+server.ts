import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateApiToken } from '$lib/server/auth';
import prisma from '$lib/server/db';

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

		const images = await prisma.image.findMany({
			where: {
				filename: { in: filenames }
			},
			include: {
				crops: { select: { x: true, y: true, width: true, height: true } },
				orientations: { select: { orientation: true } }
			}
		});

		const imagesWithData = images.map((image) => {
			const { crops, orientations, ...imageData } = image;

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

			return {
				...imageData,
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
