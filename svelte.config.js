import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/integrations
		// for more information about preprocessors
		adapter: adapter({
			// Increase body size limit for bulk image uploads
			// Default is 512KB, we need more for base64 encoded images
			out: 'build',
			// Set body size limit to 100MB for bulk uploads
			bodySizeLimit: 100 * 1024 * 1024 // 100MB in bytes
		})
	}
};

export default config;
