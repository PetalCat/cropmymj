import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import prisma from '$lib/server/db';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { env } from '$env/dynamic/private';
import sharp from 'sharp';

const IMAGES_PATH = env.IMAGES_PATH || './data/images';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { filename, rotation } = await request.json();

		if (!filename || typeof rotation !== 'number') {
			return json({ error: 'Missing filename or rotation' }, { status: 400 });
		}

		if (![0, 90, 180, 270].includes(rotation)) {
			return json({ error: 'Rotation must be 0, 90, 180, or 270' }, { status: 400 });
		}

		// Get the image from database
		const image = await prisma.image.findUnique({
			where: { filename },
			include: {
				crops: true
			}
		});

		if (!image) {
			return json({ error: 'Image not found' }, { status: 404 });
		}

		const filepath = join(IMAGES_PATH, filename);

		// Calculate the rotation difference from current rotation
		const currentRotation = image.rotation || 0;
		const rotationDiff = (rotation - currentRotation + 360) % 360;

		if (rotationDiff === 0) {
			return json({ message: 'No rotation needed', rotation: currentRotation });
		}

		// Read and rotate the actual image file
		const imageBuffer = await readFile(filepath);
		const rotatedBuffer = await sharp(imageBuffer).rotate(rotationDiff).toBuffer();
		await writeFile(filepath, rotatedBuffer);

		// Get new dimensions after rotation
		const metadata = await sharp(rotatedBuffer).metadata();
		const newWidth = metadata.width || image.width;
		const newHeight = metadata.height || image.height;

		// Transform all crop coordinates
		const updatedCrops = image.crops.map((crop) => {
			let newX = crop.x;
			let newY = crop.y;
			let newW = crop.width;
			let newH = crop.height;

			// Apply rotation transformation
			switch (rotationDiff) {
				case 90:
					// Rotate 90° clockwise
					newX = image.height - crop.y - crop.height;
					newY = crop.x;
					newW = crop.height;
					newH = crop.width;
					break;
				case 180:
					// Rotate 180°
					newX = image.width - crop.x - crop.width;
					newY = image.height - crop.y - crop.height;
					break;
				case 270:
					// Rotate 270° clockwise (90° counter-clockwise)
					newX = crop.y;
					newY = image.width - crop.x - crop.width;
					newW = crop.height;
					newH = crop.width;
					break;
			}

			return {
				id: crop.id,
				x: Math.round(newX),
				y: Math.round(newY),
				width: Math.round(newW),
				height: Math.round(newH)
			};
		});

		// Update image dimensions and rotation in database
		await prisma.image.update({
			where: { id: image.id },
			data: {
				width: newWidth,
				height: newHeight,
				rotation: rotation
			}
		});

		// Update all crop coordinates
		for (const crop of updatedCrops) {
			await prisma.crop.update({
				where: { id: crop.id },
				data: {
					x: crop.x,
					y: crop.y,
					width: crop.width,
					height: crop.height
				}
			});
		}

		return json({
			message: 'Image rotated successfully',
			rotation: rotation,
			newWidth,
			newHeight,
			cropsUpdated: updatedCrops.length
		});
	} catch (error) {
		console.error('Error rotating image:', error);
		return json({ error: 'Failed to rotate image' }, { status: 500 });
	}
};
