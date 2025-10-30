<script lang="ts">
	import { onMount } from 'svelte';

	let images: string[] = [];
	let currentImageIndex = 0;
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let img: HTMLImageElement;
	let isDrawing = false;
	let startX = 0;
	let startY = 0;
	let currentRect = { x: 0, y: 0, width: 0, height: 0 };
	let selectedOrientation: 'side' | 'front' | null = null;
	let userId = '';
	let loading = false;
	let message = '';

	$: currentImage = images[currentImageIndex];

	onMount(async () => {
		// Generate or retrieve user ID
		userId = localStorage.getItem('userId') || crypto.randomUUID();
		localStorage.setItem('userId', userId);

		// Load images
		const res = await fetch('/api/images');
		const data = await res.json();
		images = data.images || [];

		if (images.length > 0) {
			loadImage();
		}
	});

	function loadImage() {
		if (!currentImage) return;

		img = new Image();
		img.onload = () => {
			if (!canvas) return;

			canvas.width = img.width;
			canvas.height = img.height;
			ctx = canvas.getContext('2d');
			drawCanvas();
		};
		img.src = `/images/${currentImage}`;
		selectedOrientation = null;
		currentRect = { x: 0, y: 0, width: 0, height: 0 };
	}

	function drawCanvas() {
		if (!ctx || !img) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(img, 0, 0);

		if (currentRect.width > 0 && currentRect.height > 0) {
			ctx.strokeStyle = '#00ff00';
			ctx.lineWidth = 3;
			ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
		}
	}

	function handleMouseDown(e: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		startX = e.clientX - rect.left;
		startY = e.clientY - rect.top;
		isDrawing = true;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDrawing) return;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		currentRect = {
			x: Math.min(startX, x),
			y: Math.min(startY, y),
			width: Math.abs(x - startX),
			height: Math.abs(y - startY)
		};
		drawCanvas();
	}

	function handleMouseUp() {
		isDrawing = false;
	}

	async function handleSubmit() {
		if (currentRect.width === 0 || currentRect.height === 0) {
			message = 'Please draw a crop rectangle';
			return;
		}
		if (!selectedOrientation) {
			message = 'Please select an orientation';
			return;
		}

		loading = true;
		message = '';

		try {
			const res = await fetch('/api/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filename: currentImage,
					width: img.width,
					height: img.height,
					crop: currentRect,
					orientation: selectedOrientation,
					userId
				})
			});

			if (res.ok) {
				message = 'Submitted successfully!';
				// Move to next image after a brief delay
				setTimeout(() => {
					if (currentImageIndex < images.length - 1) {
						currentImageIndex++;
						loadImage();
					} else {
						message = 'All images completed!';
					}
				}, 1000);
			} else {
				const error = await res.json();
				message = `Error: ${error.error}`;
			}
		} catch (error) {
			message = 'Failed to submit';
			console.error(error);
		} finally {
			loading = false;
		}
	}

	function handleSkip() {
		if (currentImageIndex < images.length - 1) {
			currentImageIndex++;
			loadImage();
		}
	}
</script>

<main>
	<h1>Posture Image Cropping & Classification</h1>

	{#if images.length === 0}
		<p>Loading images...</p>
	{:else}
		<div class="controls">
			<p>
				Image {currentImageIndex + 1} of {images.length}: {currentImage}
			</p>
		</div>

		<div class="canvas-container">
			<canvas
				bind:this={canvas}
				on:mousedown={handleMouseDown}
				on:mousemove={handleMouseMove}
				on:mouseup={handleMouseUp}
				on:mouseleave={handleMouseUp}
			></canvas>
		</div>

		<div class="orientation-buttons">
			<button
				class:selected={selectedOrientation === 'side'}
				on:click={() => (selectedOrientation = 'side')}
			>
				Side View
			</button>
			<button
				class:selected={selectedOrientation === 'front'}
				on:click={() => (selectedOrientation = 'front')}
			>
				Front View
			</button>
		</div>

		<div class="action-buttons">
			<button on:click={handleSubmit} disabled={loading}>
				{loading ? 'Submitting...' : 'Submit'}
			</button>
			<button on:click={handleSkip}>Skip</button>
		</div>

		{#if message}
			<p class="message">{message}</p>
		{/if}
	{/if}
</main>

<style>
	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, sans-serif;
	}

	h1 {
		text-align: center;
		margin-bottom: 2rem;
	}

	.controls {
		text-align: center;
		margin-bottom: 1rem;
	}

	.canvas-container {
		display: flex;
		justify-content: center;
		margin-bottom: 2rem;
		overflow: auto;
		border: 2px solid #ccc;
		max-height: 70vh;
	}

	canvas {
		cursor: crosshair;
		display: block;
	}

	.orientation-buttons {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.orientation-buttons button {
		padding: 0.75rem 2rem;
		font-size: 1rem;
		border: 2px solid #333;
		background: white;
		cursor: pointer;
	}

	.orientation-buttons button.selected {
		background: #4caf50;
		color: white;
		border-color: #4caf50;
	}

	.action-buttons {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.action-buttons button {
		padding: 0.75rem 2rem;
		font-size: 1rem;
		border: none;
		background: #2196f3;
		color: white;
		cursor: pointer;
		border-radius: 4px;
	}

	.action-buttons button:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.action-buttons button:last-child {
		background: #757575;
	}

	.message {
		text-align: center;
		margin-top: 1rem;
		font-weight: bold;
		color: #4caf50;
	}
</style>
