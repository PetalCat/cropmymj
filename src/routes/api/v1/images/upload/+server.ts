import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateApiToken } from '$lib/server/auth';
import db from '$lib/server/db';
import { IMAGES_DIR } from '$env/static/private';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface ImageRow {
	id: number;
}

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
			if (!existsSync(IMAGES_DIR)) {
				await mkdir(IMAGES_DIR, { recursive: true });
			}

			// Convert base64 to buffer and save
			const imageBuffer = Buffer.from(imageData, 'base64');
			const filePath = join(IMAGES_DIR, filename);
			await writeFile(filePath, imageBuffer);

			// Insert into database
			const insertImage = db.prepare(
				'INSERT OR IGNORE INTO images (filename, width, height) VALUES (?, ?, ?)'
			);
			insertImage.run(filename, width, height);

			const getImage = db.prepare('SELECT id FROM images WHERE filename = ?');
			const image = getImage.get(filename) as ImageRow;

			// If crop and orientation provided, save them
			if (crop && orientation && userId) {
				if (!['side', 'front'].includes(orientation)) {
					return json({ error: 'Invalid orientation. Must be "side" or "front"' }, { status: 400 });
				}

				const insertCrop = db.prepare(
					'INSERT INTO crops (image_id, user_id, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?)'
				);
				insertCrop.run(image.id, userId, crop.x, crop.y, crop.width, crop.height);

				const insertOrientation = db.prepare(
					'INSERT INTO orientations (image_id, user_id, orientation) VALUES (?, ?, ?)'
				);
				insertOrientation.run(image.id, userId, orientation);
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
			if (!existsSync(IMAGES_DIR)) {
				await mkdir(IMAGES_DIR, { recursive: true });
			}

			// Save file
			const buffer = Buffer.from(await file.arrayBuffer());
			const filePath = join(IMAGES_DIR, filename);
			await writeFile(filePath, buffer);

			// Insert into database
			const insertImage = db.prepare(
				'INSERT OR IGNORE INTO images (filename, width, height) VALUES (?, ?, ?)'
			);
			insertImage.run(filename, width, height);

			const getImage = db.prepare('SELECT id FROM images WHERE filename = ?');
			const image = getImage.get(filename) as ImageRow;

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
