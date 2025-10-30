import { readFile } from 'fs/promises';
import { join } from 'path';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import sharp from 'sharp';

const IMAGES_PATH = env.IMAGES_PATH || './data/images';
const COMPRESSION_QUALITY = 70; // 70% quality for faster loading
const MAX_DIMENSION = 2048; // Max width/height to reduce size

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const filename = params.filename;
		const filepath = join(IMAGES_PATH, filename);

		// Check if client wants original quality (for downloads, etc)
		const original = url.searchParams.get('original') === 'true';

		// Read the image file
		const file = await readFile(filepath);

		// Determine content type
		const ext = filename.split('.').pop()?.toLowerCase();
		
		// If original is requested or it's a PNG (preserve transparency), serve as-is
		if (original || ext === 'png') {
			const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
			return new Response(file, {
				headers: {
					'Content-Type': contentType,
					'Cache-Control': 'public, max-age=3600'
				}
			});
		}

		// Compress JPEG images for faster loading
		const compressed = await sharp(file)
			.resize(MAX_DIMENSION, MAX_DIMENSION, {
				fit: 'inside',
				withoutEnlargement: true
			})
			.jpeg({ quality: COMPRESSION_QUALITY, mozjpeg: true })
			.toBuffer();

		return new Response(compressed, {
			headers: {
				'Content-Type': 'image/jpeg',
				'Cache-Control': 'public, max-age=3600',
				'X-Compressed': 'true'
			}
		});
	} catch (error) {
		console.error('Error serving image:', error);
		return new Response('Image not found', { status: 404 });
	}
};
