import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import prisma from '$lib/server/db';
import crypto from 'crypto';
import { env } from '$env/dynamic/private';

const SITE_PASSWORD = env.SITE_PASSWORD || '';
const PASSWORD_ENABLED = SITE_PASSWORD && SITE_PASSWORD.length > 0;

function hashPassword(password: string): string {
	return crypto.createHash('sha256').update(password).digest('hex');
}

function isAuthenticated(cookies: any): boolean {
	if (!PASSWORD_ENABLED) return true;
	const sessionPassword = cookies.get('session_auth');
	if (!sessionPassword) return false;
	return sessionPassword === hashPassword(SITE_PASSWORD);
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	// Check authentication
	if (!isAuthenticated(cookies)) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	const userId = url.searchParams.get('userId');

	if (!userId) {
		return json({ error: 'userId parameter is required' }, { status: 400 });
	}

	try {
		// Get all images with their submission counts and check if user has already classified them
		const images = await prisma.image.findMany({
			select: {
				id: true,
				filename: true,
				crops: {
					select: {
						user_id: true
					}
				},
				orientations: {
					select: {
						user_id: true
					}
				},
				unfits: {
					select: {
						user_id: true
					}
				}
			}
		});

		// Calculate submission counts and filter out images user has already classified
		const unclassifiedImages = images
			.map((image) => {
				// Check if user has submitted anything for this image
				const userHasClassified =
					image.crops.some((c) => c.user_id === userId) ||
					image.orientations.some((o) => o.user_id === userId) ||
					image.unfits.some((u) => u.user_id === userId);

				// Count total unique users who have submitted for this image
				const allUserIds = new Set([
					...image.crops.map((c) => c.user_id),
					...image.orientations.map((o) => o.user_id),
					...image.unfits.map((u) => u.user_id)
				]);

				return {
					filename: image.filename,
					submissionCount: allUserIds.size,
					userHasClassified
				};
			})
			.filter((img) => !img.userHasClassified);

		// If no unclassified images, return all images (user has classified everything)
		if (unclassifiedImages.length === 0) {
			// Get all images and sort by submission count
			const allImages = images.map((image) => {
				const allUserIds = new Set([
					...image.crops.map((c) => c.user_id),
					...image.orientations.map((o) => o.user_id),
					...image.unfits.map((u) => u.user_id)
				]);

				return {
					filename: image.filename,
					submissionCount: allUserIds.size
				};
			});

			allImages.sort((a, b) => a.submissionCount - b.submissionCount);

			// Return random image from bottom 20% (least classified)
			const bottomThird = allImages.slice(0, Math.max(1, Math.ceil(allImages.length * 0.2)));
			const selected = bottomThird[Math.floor(Math.random() * bottomThird.length)];

			return json({
				filename: selected.filename,
				reason: 'all_classified',
				submissionCount: selected.submissionCount
			});
		}

		// Sort by submission count (ascending - prioritize images with fewer submissions)
		unclassifiedImages.sort((a, b) => a.submissionCount - b.submissionCount);

		// Use weighted random selection favoring images with fewer submissions
		// Bottom 30% of images get higher weight
		const thirtyPercent = Math.max(1, Math.ceil(unclassifiedImages.length * 0.3));
		const bottomThird = unclassifiedImages.slice(0, thirtyPercent);

		// Pick random from the least-classified images
		const selectedImage = bottomThird[Math.floor(Math.random() * bottomThird.length)];

		return json({
			filename: selectedImage.filename,
			reason: 'prioritized',
			submissionCount: selectedImage.submissionCount,
			totalUnclassified: unclassifiedImages.length
		});
	} catch (error) {
		console.error('Error getting next image:', error);
		return json({ error: 'Failed to get next image' }, { status: 500 });
	}
};
