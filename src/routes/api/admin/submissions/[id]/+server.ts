import { json } from '@sveltejs/kit';
import prisma from '$lib/server/db';
import { validateApiToken } from '$lib/server/auth';
import type { RequestHandler } from './$types';

// Delete a specific crop submission
export const DELETE: RequestHandler = async (event) => {
	// Validate API token
	const authError = validateApiToken(event);
	if (authError) return authError;

	const { params } = event;
	const cropId = parseInt(params.id);

	if (isNaN(cropId)) {
		return json({ error: 'Invalid crop ID' }, { status: 400 });
	}

	try {
		await prisma.crop.delete({
			where: { id: cropId }
		});

		return json({ success: true, message: 'Crop deleted successfully' });
	} catch (error) {
		console.error('Error deleting crop:', error);
		return json({ error: 'Failed to delete crop' }, { status: 500 });
	}
};
