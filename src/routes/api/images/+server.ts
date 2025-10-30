import { json } from '@sveltejs/kit';
import { readdir } from 'fs/promises';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const IMAGES_PATH = env.IMAGES_PATH || './data/images';

export const GET: RequestHandler = async () => {
	try {
		const files = await readdir(IMAGES_PATH);
		const imageFiles = files.filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
		return json({ images: imageFiles });
	} catch (error) {
		console.error('Error reading images directory:', error);
		return json({ error: 'Failed to load images' }, { status: 500 });
	}
};
