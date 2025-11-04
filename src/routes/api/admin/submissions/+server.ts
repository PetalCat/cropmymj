import { json } from '@sveltejs/kit';
import prisma from '$lib/server/db';
import { validateApiToken } from '$lib/server/auth';
import type { RequestHandler } from './$types';

interface CropStats {
	avg_x: number;
	avg_y: number;
	avg_width: number;
	avg_height: number;
	std_x: number;
	std_y: number;
	std_width: number;
	std_height: number;
	count: number;
}

function calculateStats(values: number[]): { avg: number; std: number } {
	if (values.length === 0) return { avg: 0, std: 0 };
	const avg = values.reduce((a, b) => a + b, 0) / values.length;
	const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
	const std = Math.sqrt(variance);
	return { avg, std };
}

function isOutlier(value: number, avg: number, std: number, threshold = 2): boolean {
	if (std === 0) return false;
	return Math.abs(value - avg) > threshold * std;
}

export const GET: RequestHandler = async (event) => {
	// Validate API token
	const authError = validateApiToken(event);
	if (authError) return authError;

	const { url } = event;
	const imageId = url.searchParams.get('imageId');
	const outlierThreshold = parseFloat(url.searchParams.get('threshold') || '2');

	try {
		// Get all images with their crops
		const images = await prisma.image.findMany({
			where: imageId ? { id: parseInt(imageId) } : undefined,
			include: {
				crops: true,
				orientations: true,
				unfits: true
			},
			orderBy: {
				filename: 'asc'
			}
		});

		const results = images.map((image) => {
			const crops = image.crops;
			const orientations = image.orientations;
			const unfits = image.unfits;

			// Calculate statistics for crops
			let stats: CropStats | null = null;
			let outliers: Array<{
				id: number;
				user_id: string;
				x: number;
				y: number;
				width: number;
				height: number;
				outlier_fields: string[];
				deviation_score: number;
			}> = [];
			let allCrops: Array<{
				id: number;
				user_id: string;
				x: number;
				y: number;
				width: number;
				height: number;
			}> = [];

			if (crops.length > 0) {
				const xs = crops.map((c) => c.x);
				const ys = crops.map((c) => c.y);
				const widths = crops.map((c) => c.width);
				const heights = crops.map((c) => c.height);

				const xStats = calculateStats(xs);
				const yStats = calculateStats(ys);
				const widthStats = calculateStats(widths);
				const heightStats = calculateStats(heights);

				stats = {
					avg_x: Math.round(xStats.avg),
					avg_y: Math.round(yStats.avg),
					avg_width: Math.round(widthStats.avg),
					avg_height: Math.round(heightStats.avg),
					std_x: Math.round(xStats.std),
					std_y: Math.round(yStats.std),
					std_width: Math.round(widthStats.std),
					std_height: Math.round(heightStats.std),
					count: crops.length
				};

				// Store all crops
				allCrops = crops.map((crop) => ({
					id: crop.id,
					user_id: crop.user_id,
					x: crop.x,
					y: crop.y,
					width: crop.width,
					height: crop.height
				}));

				// Find outliers
				outliers = crops
					.map((crop) => {
						const outlier_fields: string[] = [];
						let deviationSum = 0;

						if (isOutlier(crop.x, xStats.avg, xStats.std, outlierThreshold)) {
							outlier_fields.push('x');
							deviationSum += Math.abs(crop.x - xStats.avg) / (xStats.std || 1);
						}
						if (isOutlier(crop.y, yStats.avg, yStats.std, outlierThreshold)) {
							outlier_fields.push('y');
							deviationSum += Math.abs(crop.y - yStats.avg) / (yStats.std || 1);
						}
						if (isOutlier(crop.width, widthStats.avg, widthStats.std, outlierThreshold)) {
							outlier_fields.push('width');
							deviationSum += Math.abs(crop.width - widthStats.avg) / (widthStats.std || 1);
						}
						if (isOutlier(crop.height, heightStats.avg, heightStats.std, outlierThreshold)) {
							outlier_fields.push('height');
							deviationSum += Math.abs(crop.height - heightStats.avg) / (heightStats.std || 1);
						}

						return {
							id: crop.id,
							user_id: crop.user_id,
							x: crop.x,
							y: crop.y,
							width: crop.width,
							height: crop.height,
							outlier_fields,
							deviation_score: Math.round(deviationSum * 100) / 100
						};
					})
					.filter((crop) => crop.outlier_fields.length > 0)
					.sort((a, b) => b.deviation_score - a.deviation_score);
			}

			// Count orientations
			const orientationCounts = orientations.reduce(
				(acc, o) => {
					acc[o.orientation] = (acc[o.orientation] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			);

			const mostCommonOrientation =
				Object.keys(orientationCounts).length > 0
					? Object.entries(orientationCounts).sort((a, b) => b[1] - a[1])[0]
					: null;

			return {
				image_id: image.id,
				filename: image.filename,
				width: image.width,
				height: image.height,
				total_submissions: crops.length,
				total_unfits: unfits.length,
				crop_stats: stats,
				all_crops: allCrops,
				outliers: outliers,
				orientations: orientationCounts,
				most_common_orientation: mostCommonOrientation
					? {
							orientation: mostCommonOrientation[0],
							count: mostCommonOrientation[1],
							percentage: Math.round((mostCommonOrientation[1] / orientations.length) * 100)
						}
					: null
			};
		});

		return json({
			total_images: results.length,
			images: results
		});
	} catch (error) {
		console.error('Error fetching admin submissions:', error);
		return json({ error: 'Failed to fetch submissions' }, { status: 500 });
	}
};
