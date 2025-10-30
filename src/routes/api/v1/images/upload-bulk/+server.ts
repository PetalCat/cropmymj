import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateApiToken } from '$lib/server/auth';
import prisma from '$lib/server/db';
import { IMAGES_PATH } from '$env/static/private';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface BulkImageUpload {
	filename: string;
	imageData: string; // base64
	width: number;
	height: number;
	crops?: Array<{
		user_id: string;
		x: number;
		y: number;
		width: number;
		height: number;
	}>;
	orientations?: Array<{
		user_id: string;
		orientation: 'side' | 'front';
	}>;
}

/**
 * POST /api/v1/images/upload-bulk
 * Upload multiple images with optional metadata in a single request
 * Body: {
 *   images: BulkImageUpload[]
 * }
 */
export const POST: RequestHandler = async (event) => {
	const authError = validateApiToken(event);
	if (authError) return authError;

	try {
		const { images } = await event.request.json();

		if (!Array.isArray(images) || images.length === 0) {
			return json({ error: 'images array is required and must not be empty' }, { status: 400 });
		}

		// No upper limit - handle any number of images
		console.log(`Processing bulk upload of ${images.length} images`);

		// Ensure images directory exists
		if (!existsSync(IMAGES_PATH)) {
			await mkdir(IMAGES_PATH, { recursive: true });
		}

		const results = {
			successful: [] as string[],
			failed: [] as { filename: string; error: string }[]
		};

		// Process images in chunks to manage memory for very large batches
		const CHUNK_SIZE = 50;
		const totalChunks = Math.ceil(images.length / CHUNK_SIZE);

		for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
			const start = chunkIndex * CHUNK_SIZE;
			const end = Math.min(start + CHUNK_SIZE, images.length);
			const chunk = images.slice(start, end);

			console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} (${chunk.length} images)...`);

			// Process each image in the chunk
			for (const img of chunk) {
				try {
					const { filename, imageData, width, height, crops, orientations } = img;

					// Validate required fields
					if (!filename || !imageData || !width || !height) {
						results.failed.push({
							filename: filename || 'unknown',
							error: 'Missing required fields'
						});
						continue;
					}

					// Security: prevent directory traversal
					if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
						results.failed.push({ filename, error: 'Invalid filename' });
						continue;
					}

					// Validate orientations if provided
					if (orientations && orientations.length > 0) {
						const invalidOrientations = orientations.filter(
							(o: { orientation: string }) => !['side', 'front'].includes(o.orientation)
						);
						if (invalidOrientations.length > 0) {
							results.failed.push({ filename, error: 'Invalid orientation value' });
							continue;
						}
					}

					// Convert base64 to buffer and save
					const imageBuffer = Buffer.from(imageData, 'base64');
					const filePath = join(IMAGES_PATH, filename);
					await writeFile(filePath, imageBuffer);

					// Upsert image in database
					const image = await prisma.image.upsert({
						where: { filename },
						update: {},
						create: { filename, width, height }
					});

					// Save crops and orientations in transaction if provided
					if ((crops && crops.length > 0) || (orientations && orientations.length > 0)) {
						const operations = [];

						if (crops) {
							for (const crop of crops) {
								operations.push(
									prisma.crop.create({
										data: {
											image_id: image.id,
											user_id: crop.user_id,
											x: crop.x,
											y: crop.y,
											width: crop.width,
											height: crop.height
										}
									})
								);
							}
						}

						if (orientations) {
							for (const orientation of orientations) {
								operations.push(
									prisma.orientation.create({
										data: {
											image_id: image.id,
											user_id: orientation.user_id,
											orientation: orientation.orientation
										}
									})
								);
							}
						}

						await prisma.$transaction(operations);
					}

					results.successful.push(filename);
				} catch (error) {
					console.error(`Error uploading ${img.filename}:`, error);
					results.failed.push({
						filename: img.filename,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}
			}

			// Log progress after each chunk
			console.log(
				`Chunk ${chunkIndex + 1} complete: ${results.successful.length} successful, ${results.failed.length} failed`
			);
		}

		const statusCode = results.failed.length === images.length ? 500 : 200;

		return json(
			{
				success: results.failed.length === 0,
				total: images.length,
				successful: results.successful.length,
				failed: results.failed.length,
				results
			},
			{ status: statusCode }
		);
	} catch (error) {
		console.error('Bulk upload error:', error);
		return json({ error: 'Failed to process bulk upload' }, { status: 500 });
	}
};
