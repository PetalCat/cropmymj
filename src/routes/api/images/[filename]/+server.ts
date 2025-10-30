import { readFile } from 'fs/promises';
import { join } from 'path';
import type { RequestHandler } from './$types';

const NORMAL_SET_DIR = join(process.cwd(), '..', 'normal-set');

export const GET: RequestHandler = async ({ params }) => {
	try {
		const filename = params.filename;
		const filepath = join(NORMAL_SET_DIR, filename);

		// Read the image file
		const file = await readFile(filepath);

		// Determine content type
		const ext = filename.split('.').pop()?.toLowerCase();
		const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

		return new Response(file, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (error) {
		console.error('Error serving image:', error);
		return new Response('Image not found', { status: 404 });
	}
};
