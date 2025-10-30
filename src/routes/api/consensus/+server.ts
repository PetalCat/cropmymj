import { json } from '@sveltejs/kit';
import prisma from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const filename = url.searchParams.get('filename');

	if (!filename) {
		return json({ error: 'Filename parameter required' }, { status: 400 });
	}

	try {
		// Get image with crops and orientations
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

		if (image.crops.length === 0) {
			return json({ error: 'No crops found for this image' }, { status: 404 });
		}

		// Calculate average crop
		const avgCrop = {
			x: Math.round(image.crops.reduce((sum, c) => sum + c.x, 0) / image.crops.length),
			y: Math.round(image.crops.reduce((sum, c) => sum + c.y, 0) / image.crops.length),
			width: Math.round(image.crops.reduce((sum, c) => sum + c.width, 0) / image.crops.length),
			height: Math.round(image.crops.reduce((sum, c) => sum + c.height, 0) / image.crops.length)
		};

		// Find most common orientation
		const orientationCounts = image.orientations.reduce(
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
			submissionCount: image.crops.length,
			orientationCounts
		});
	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Failed to fetch consensus data' }, { status: 500 });
	}
};
