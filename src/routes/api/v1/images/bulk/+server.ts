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
				filename: {
					in: filenames
				}
			},
			include: {
				crops: true,
				orientations: true
			}
		});

		const imagesWithData = images.map((image) => {
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

			return {
				id: image.id,
				filename: image.filename,
				width: image.width,
				height: image.height,
				created_at: image.created_at,
				consensusCrop,
				consensusOrientation,
				submissionCount: image.crops.length
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
