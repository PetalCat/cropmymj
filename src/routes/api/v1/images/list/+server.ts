import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateApiToken } from '$lib/server/auth';
import prisma from '$lib/server/db';

/**
 * GET /api/v1/images/list
 * Returns list of all images with their data
 * Query params:
 *   - limit: number of images to return (default: all)
 *   - offset: pagination offset (default: 0)
 *   - include_data: whether to include crop/orientation data (default: false)
 */
export const GET: RequestHandler = async (event) => {
	const authError = validateApiToken(event);
	if (authError) return authError;

	const { url } = event;
	const limit = parseInt(url.searchParams.get('limit') || '0');
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const includeData = url.searchParams.get('include_data') === 'true';

	try {
		if (!includeData) {
			const images = await prisma.image.findMany({
				...(limit > 0 && { take: limit, skip: offset })
			});
			return json({ images, total: images.length });
		}

		// Include crop and orientation data
		const images = await prisma.image.findMany({
			...(limit > 0 && { take: limit, skip: offset }),
			include: {
				crops: { select: { x: true, y: true, width: true, height: true, user_id: true } },
				orientations: { select: { orientation: true, user_id: true } },
				unfits: { select: { user_id: true } }
			}
		});

		// Calculate consensus for each image
		const imagesWithData = images.map((image) => {
			const { crops, orientations, unfits, ...imageData } = image;

			// Calculate consensus crop
			let consensusCrop = null;
			if (crops.length > 0) {
				consensusCrop = {
					x: Math.round(crops.reduce((sum, c) => sum + c.x, 0) / crops.length),
					y: Math.round(crops.reduce((sum, c) => sum + c.y, 0) / crops.length),
					width: Math.round(crops.reduce((sum, c) => sum + c.width, 0) / crops.length),
					height: Math.round(crops.reduce((sum, c) => sum + c.height, 0) / crops.length)
				};
			}

			// Calculate consensus orientation
			const orientationCounts: Record<string, number> = {};
			orientations.forEach((o) => {
				orientationCounts[o.orientation] = (orientationCounts[o.orientation] || 0) + 1;
			});

			const consensusOrientation =
				Object.entries(orientationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

			return {
				...imageData,
				crops,
				orientations,
				unfits,
				consensusCrop,
				consensusOrientation,
				submissionCount: crops.length
			};
		});

		return json({
			images: imagesWithData,
			total: imagesWithData.length,
			limit,
			offset
		});
	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Failed to fetch images' }, { status: 500 });
	}
};
