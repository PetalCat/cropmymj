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
		const queryOptions: any = {};
		
		if (limit > 0) {
			queryOptions.take = limit;
			queryOptions.skip = offset;
		}

		if (!includeData) {
			const images = await prisma.image.findMany(queryOptions);
			return json({ images, total: images.length });
		}

		// Include crop and orientation data
		const images = await prisma.image.findMany({
			...queryOptions,
			include: {
				crops: true,
				orientations: true
			}
		});

		const imagesWithData = images.map((image) => {
			// Calculate consensus crop
			let consensusCrop = null;
			if (image.crops.length > 0) {
				consensusCrop = {
					x: Math.round(image.crops.reduce((sum, c) => sum + c.x, 0) / image.crops.length),
					y: Math.round(image.crops.reduce((sum, c) => sum + c.y, 0) / image.crops.length),
					width: Math.round(image.crops.reduce((sum, c) => sum + c.width, 0) / image.crops.length),
					height: Math.round(image.crops.reduce((sum, c) => sum + c.height, 0) / image.crops.length)
				};
			}

			// Calculate consensus orientation
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
				crops: image.crops,
				orientations: image.orientations,
				consensusCrop,
				consensusOrientation,
				submissionCount: image.crops.length
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
