import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { validateApiToken } from '$lib/server/auth';
import { readFile } from 'fs/promises';
import { join } from 'path';

const IMAGES_DIR = process.env.IMAGES_PATH || './static/images';

/**
 * GET /api/v1/images/download/[filename]
 * Download original image file
 */
export const GET: RequestHandler = async (event) => {
	const authError = validateApiToken(event);
	if (authError) return authError;

	const { filename } = event.params;

	if (!filename) {
		throw error(400, 'Filename required');
	}

	// Security: prevent directory traversal
	if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
		throw error(400, 'Invalid filename');
	}

	try {
		const filePath = join(IMAGES_DIR, filename);
		const fileBuffer = await readFile(filePath);

		// Determine content type
		const ext = filename.toLowerCase().split('.').pop();
		let contentType = 'image/jpeg';
		if (ext === 'png') contentType = 'image/png';
		else if (ext === 'gif') contentType = 'image/gif';
		else if (ext === 'webp') contentType = 'image/webp';

		return new Response(fileBuffer, {
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'public, max-age=31536000'
			}
		});
	} catch (err) {
		console.error('Error reading image:', err);
		throw error(404, 'Image not found');
	}
};
