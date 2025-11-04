import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateApiToken } from '$lib/server/auth';
import prisma from '$lib/server/db';
import fs from 'fs/promises';
import path from 'path';

export const DELETE: RequestHandler = async (event) => {
	// Check authentication
	const authError = validateApiToken(event);
	if (authError) return authError;

	try {
		const { filename } = await event.request.json();

		if (!filename) {
			throw error(400, 'Filename is required');
		}

		// Find the image
		const image = await prisma.image.findUnique({
			where: { filename },
			include: {
				crops: true,
				orientations: true,
				unfits: true
			}
		});

		if (!image) {
			throw error(404, 'Image not found');
		}

		// Delete the image and all related data (cascading)
		// Prisma will handle deleting related crops, orientations, and unfits
		await prisma.image.delete({
			where: { id: image.id }
		});

		// Try to delete the actual file from static/uploads
		const uploadPath = path.join(process.cwd(), 'static', 'uploads', filename);
		try {
			await fs.unlink(uploadPath);
		} catch (fileError) {
			// File might not exist, that's ok
			console.warn(`Could not delete file ${uploadPath}:`, fileError);
		}

		return json({
			success: true,
			message: `Deleted image ${filename}`,
			deleted: {
				image: 1,
				crops: image.crops.length,
				orientations: image.orientations.length,
				unfits: image.unfits.length
			}
		});
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		console.error('Delete error:', err);
		throw error(500, 'Failed to delete image');
	}
};
