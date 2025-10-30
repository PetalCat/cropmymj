import { watch } from 'fs';
import { readdir, copyFile, stat } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';

const UNFILTERED_DIR = join(process.cwd(), '..', 'set-unfiltered-uncropped');
const NORMAL_DIR = join(process.cwd(), '..', 'normal-set');
const PYTHON_SCRIPT = join(process.cwd(), '..', 'normalize_image.py');
const PYTHON_VENV = join(process.cwd(), '..', '.venv', 'bin', 'python');

// Track processed files to avoid re-processing
const processedFiles = new Set<string>();

/**
 * Normalize a single image using the Python script
 */
async function normalizeImage(filename: string): Promise<boolean> {
	return new Promise((resolve) => {
		console.log(`🔄 Normalizing: ${filename}`);

		const proc = spawn(PYTHON_VENV, [
			PYTHON_SCRIPT,
			join(UNFILTERED_DIR, filename),
			join(NORMAL_DIR, filename)
		]);

		let output = '';
		proc.stdout.on('data', (data) => {
			output += data.toString();
		});

		proc.stderr.on('data', (data) => {
			console.error(`Python error: ${data}`);
		});

		proc.on('close', (code) => {
			if (code === 0) {
				console.log(`✓ Normalized: ${filename}`);
				processedFiles.add(filename);
				resolve(true);
			} else {
				console.error(`❌ Failed to normalize: ${filename} (exit code ${code})`);
				resolve(false);
			}
		});
	});
}

/**
 * Check if file already exists in normal-set
 */
async function isAlreadyNormalized(filename: string): Promise<boolean> {
	try {
		await stat(join(NORMAL_DIR, filename));
		return true;
	} catch {
		return false;
	}
}

/**
 * Process all existing files in unfiltered directory
 */
async function processExistingFiles() {
	try {
		const files = await readdir(UNFILTERED_DIR);
		const imageFiles = files.filter(
			(f) =>
				f.toLowerCase().endsWith('.jpg') ||
				f.toLowerCase().endsWith('.jpeg') ||
				f.toLowerCase().endsWith('.png')
		);

		console.log(`📂 Found ${imageFiles.length} images in ${UNFILTERED_DIR}`);

		for (const file of imageFiles) {
			if (processedFiles.has(file)) continue;

			// Check if already normalized
			if (await isAlreadyNormalized(file)) {
				console.log(`⏭️  Already normalized: ${file}`);
				processedFiles.add(file);
				continue;
			}

			await normalizeImage(file);
		}
	} catch (err) {
		console.error('Error processing existing files:', err);
	}
}

/**
 * Start watching the unfiltered directory for new files
 */
export function startNormalizer() {
	console.log(`👁️  Watching: ${UNFILTERED_DIR}`);
	console.log(`📤 Output to: ${NORMAL_DIR}`);

	// Process existing files first
	processExistingFiles();

	// Watch for new files
	const watcher = watch(UNFILTERED_DIR, async (eventType, filename) => {
		if (!filename) return;

		// Only process image files
		if (!filename.toLowerCase().match(/\.(jpg|jpeg|png)$/)) return;

		// Skip if already processed
		if (processedFiles.has(filename)) return;

		// Check if already normalized
		if (await isAlreadyNormalized(filename)) {
			processedFiles.add(filename);
			return;
		}

		// Small delay to ensure file is fully written
		setTimeout(async () => {
			await normalizeImage(filename);
		}, 1000);
	});

	// Cleanup on process exit
	process.on('exit', () => {
		watcher.close();
	});

	console.log('✓ Normalizer service started');
}
