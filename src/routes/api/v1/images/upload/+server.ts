import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateApiToken } from '$lib/server/auth';
import prisma from '$lib/server/db';
import { env } from '$env/dynamic/private';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const IMAGES_PATH = env.IMAGES_PATH || './static/images';

/**
 * POST /api/v1/images/upload
 * Upload image with optional metadata
 * Body: multipart/form-data or JSON with base64
 *
 * JSON format:
 * {
 *   filename: string,
 *   imageData: string (base64),
 *   width: number,
 *   height: number,
 *   crop?: { x, y, width, height },
 *   orientation?: 'side' | 'front',
 *   userId?: string
 * }
 */
export const POST: RequestHandler = async (event) => {
	const authError = validateApiToken(event);
	if (authError) return authError;

	try {
		const contentType = event.request.headers.get('content-type') || '';

		if (contentType.includes('application/json')) {
			// Handle JSON with base64 image
			const { filename, imageData, width, height, crop, orientation, userId } =
				await event.request.json();

			if (!filename || !imageData || !width || !height) {
				return json(
					{ error: 'Missing required fields: filename, imageData, width, height' },
					{ status: 400 }
				);
			}

			// Security: prevent directory traversal
			if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
				return json({ error: 'Invalid filename' }, { status: 400 });
			}

			// Ensure images directory exists
			if (!existsSync(IMAGES_PATH)) {
				await mkdir(IMAGES_PATH, { recursive: true });
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

			// If crop and orientation provided, save them
			if (crop && orientation && userId) {
				if (!['side', 'front'].includes(orientation)) {
					return json({ error: 'Invalid orientation. Must be "side" or "front"' }, { status: 400 });
				}

				await prisma.$transaction([
					prisma.crop.create({
						data: {
							image_id: image.id,
							user_id: userId,
							x: crop.x,
							y: crop.y,
							width: crop.width,
							height: crop.height
						}
					}),
					prisma.orientation.create({
						data: {
							image_id: image.id,
							user_id: userId,
							orientation
						}
					})
				]);
			}

			return json({
				success: true,
				imageId: image.id,
				filename
			});
		} else if (contentType.includes('multipart/form-data')) {
			// Handle multipart form data
			const formData = await event.request.formData();
			const file = formData.get('file') as File;
			const width = parseInt(formData.get('width') as string);
			const height = parseInt(formData.get('height') as string);
			const filename = (formData.get('filename') as string) || file.name;

			if (!file || !width || !height) {
				return json({ error: 'Missing required fields: file, width, height' }, { status: 400 });
			}

			// Security: prevent directory traversal
			if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
				return json({ error: 'Invalid filename' }, { status: 400 });
			}

			// Ensure images directory exists
			if (!existsSync(IMAGES_PATH)) {
				await mkdir(IMAGES_PATH, { recursive: true });
			}

			// Save file
			const buffer = Buffer.from(await file.arrayBuffer());
			const filePath = join(IMAGES_PATH, filename);
			await writeFile(filePath, buffer);

			// Upsert image in database
			const image = await prisma.image.upsert({
				where: { filename },
				update: {},
				create: { filename, width, height }
			});

			return json({
				success: true,
				imageId: image.id,
				filename
			});
		} else {
			return json(
				{ error: 'Unsupported content type. Use application/json or multipart/form-data' },
				{ status: 400 }
			);
		}
	} catch (error) {
		console.error('Upload error:', error);
		return json({ error: 'Failed to upload image' }, { status: 500 });
	}
};
