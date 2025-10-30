<script lang="ts">
	import { onMount, tick } from 'svelte';

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
	let guidelinesExpanded = true;
	let userSubmissionCount = 0;
	let totalImages = 0;

	// Image preloading cache
	const imageCache = new Map<string, HTMLImageElement>();
	const PRELOAD_COUNT = 3; // Number of images to preload ahead

	$: currentImage = images[currentImageIndex];
	$: progressPercentage =
		totalImages > 0 ? Math.round((userSubmissionCount / totalImages) * 100) : 0;

	async function fetchUserProgress() {
		try {
			const res = await fetch(`/api/user-progress?userId=${userId}`);
			if (res.ok) {
				const data = await res.json();
				userSubmissionCount = data.submissionCount || 0;
			}
		} catch (error) {
			console.error('Failed to fetch user progress:', error);
		}
	}

	function preloadImages(centerIndex: number) {
		// Preload the next PRELOAD_COUNT images
		for (let i = 1; i <= PRELOAD_COUNT; i++) {
			const index = (centerIndex + i) % images.length;
			const filename = images[index];

			if (filename && !imageCache.has(filename)) {
				const preloadImg = new Image();
				preloadImg.src = `/api/images/${filename}`;
				preloadImg.onload = () => {
					imageCache.set(filename, preloadImg);
					console.log(`Preloaded: ${filename} (cache size: ${imageCache.size})`);
				};
				preloadImg.onerror = () => {
					console.warn(`Failed to preload: ${filename}`);
				};
			}
		}

		// Clean up old cached images (keep only 10 most recent)
		if (imageCache.size > 10) {
			const toDelete = Array.from(imageCache.keys()).slice(0, imageCache.size - 10);
			toDelete.forEach((key) => {
				imageCache.delete(key);
				console.log(`Removed from cache: ${key}`);
			});
		}
	}

	onMount(() => {
		// Generate or retrieve user ID
		userId = localStorage.getItem('userId') || crypto.randomUUID();
		localStorage.setItem('userId', userId);

		// Attach global mouse handlers for dragging
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);

		// Load images
		(async () => {
			console.log('Fetching images from /api/images...');
			const res = await fetch('/api/images');
			const data = await res.json();
			console.log('Received data:', data);
			images = data.images || [];
			totalImages = images.length;
			console.log('Number of images:', images.length);

			// Fetch user progress
			await fetchUserProgress();

			if (images.length > 0) {
				// Start with a random image
				currentImageIndex = Math.floor(Math.random() * images.length);
				console.log('Starting with random image index:', currentImageIndex);

				// Wait for DOM to update
				await tick();
				console.log('About to load first image, canvas bound:', !!canvas);
				if (canvas) {
					loadImage();
				} else {
					console.error('Canvas still not available after tick!');
				}
			} else {
				console.warn('No images found to load');
			}
		})();

		// Cleanup function
		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
		};
	});

	function loadImage() {
		if (!currentImage) return;

		console.log('Loading image:', currentImage);
		message = ''; // Clear previous messages

		// Check if image is already cached
		if (imageCache.has(currentImage)) {
			console.log('Using cached image:', currentImage);
			img = imageCache.get(currentImage)!;
			if (!canvas) {
				console.error('Canvas element not found!');
				return;
			}
			canvas.width = img.width;
			canvas.height = img.height;
			console.log('Canvas sized to:', canvas.width, 'x', canvas.height);
			ctx = canvas.getContext('2d');
			drawCanvas();

			// Preload next images
			preloadImages(currentImageIndex);
		} else {
			// Load image normally
			img = new Image();
			img.onload = () => {
				console.log('Image loaded successfully:', currentImage);
				console.log('Image dimensions:', img.width, 'x', img.height);

				// Cache the loaded image
				imageCache.set(currentImage, img);

				if (!canvas) {
					console.error('Canvas element not found!');
					return;
				}

				canvas.width = img.width;
				canvas.height = img.height;
				console.log('Canvas sized to:', canvas.width, 'x', canvas.height);
				ctx = canvas.getContext('2d');
				drawCanvas();

				// Preload next images
				preloadImages(currentImageIndex);
			};
			img.onerror = (error) => {
				console.error('Failed to load image:', currentImage, error);
				message = 'Failed to load image. Please try the next one.';
			};
			img.src = `/api/images/${currentImage}`;
			console.log('Image src set to:', img.src);
		}

		selectedOrientation = null;
		currentRect = { x: 0, y: 0, width: 0, height: 0 };
	}

	function drawCanvas() {
		if (!ctx || !img) {
			console.error('Cannot draw - ctx:', !!ctx, 'img:', !!img);
			return;
		}
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
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		startX = (e.clientX - rect.left) * scaleX;
		startY = (e.clientY - rect.top) * scaleY;
		isDrawing = true;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDrawing) return;
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		// Clamp coordinates to canvas bounds
		const x = Math.max(0, Math.min((e.clientX - rect.left) * scaleX, canvas.width));
		const y = Math.max(0, Math.min((e.clientY - rect.top) * scaleY, canvas.height));

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
				userSubmissionCount++; // Increment progress counter
				console.log('Submit successful, moving to random image in 1 second...');
				// Move to random image after a brief delay
				setTimeout(async () => {
					const newIndex = Math.floor(Math.random() * images.length);
					console.log('Changing from image', currentImageIndex, 'to', newIndex);
					currentImageIndex = newIndex;
					await tick(); // Wait for reactive statement to update
					loadImage();
				}, 1000);
			} else {
				const error = await res.json();
				console.error('Submit failed:', error);
				message = `Error: ${error.error || 'Unknown error'}`;
			}
		} catch (error) {
			message = 'Failed to submit';
			console.error(error);
		} finally {
			loading = false;
		}
	}

	async function handleSkip() {
		// Go to a random image
		currentImageIndex = Math.floor(Math.random() * images.length);
		await tick(); // Wait for reactive statement to update
		loadImage();
	}

	async function handleSkipUnfit() {
		if (!currentImage || !canvas) return;

		loading = true;
		try {
			const response = await fetch('/api/unfit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filename: currentImage,
					width: canvas.width,
					height: canvas.height,
					userId
				})
			});

			if (response.ok) {
				message = 'Marked as unfit - showing next image';
				userSubmissionCount++; // Increment progress counter for unfit marks too
				setTimeout(() => {
					message = '';
				}, 2000);

				// Go to a random image after a short delay
				setTimeout(async () => {
					currentImageIndex = Math.floor(Math.random() * images.length);
					await tick(); // Wait for reactive statement to update
					loadImage();
				}, 300);
			} else {
				message = 'Failed to mark as unfit';
			}
		} catch (error) {
			message = 'Failed to mark as unfit';
			console.error(error);
		} finally {
			loading = false;
		}
	}

	async function handleLogout() {
		await fetch('/api/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<main>
	<!-- Compact Header with Progress Bar -->
	<div class="top-bar">
		<h1>🎯 Crop My MJ</h1>

		<div class="image-counter">#{currentImageIndex + 1}</div>

		<div class="user-progress-compact">
			<span class="progress-text-compact"
				>{userSubmissionCount}/{totalImages} ({progressPercentage}%)</span
			>
			<div class="user-progress-bar-compact">
				<div class="user-progress-fill" style="width: {progressPercentage}%"></div>
			</div>
		</div>

		<button on:click={handleLogout} class="logout-btn-compact" title="Logout"> 🚪 </button>
	</div>

	{#if images.length === 0}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading images...</p>
		</div>
	{:else}
		<div class="progress-bar">
			<div class="progress-text">Image {currentImageIndex + 1} of {images.length}</div>
		</div>

		<div class="main-layout">
			<div class="left-panel">
				<div class="canvas-container">
					<canvas
						bind:this={canvas}
						on:mousedown={handleMouseDown}
						on:dragstart={(e) => e.preventDefault()}
					></canvas>
				</div>
			</div>

			<div class="right-panel">
				<div class="guidelines">
					<button
						class="guidelines-header"
						on:click={() => (guidelinesExpanded = !guidelinesExpanded)}
					>
						<div class="header-content">
							<span class="check-icon" class:checked={!guidelinesExpanded}>
								{#if guidelinesExpanded}
									📋
								{:else}
									✓
								{/if}
							</span>
							<span>Guidelines</span>
						</div>
						<span class="toggle-icon">{guidelinesExpanded ? '▼' : '▶'}</span>
					</button>

					{#if guidelinesExpanded}
						<div class="guidelines-content">
							<div class="guideline-item">
								<strong>1. Draw the Crop Box</strong>
								<p>Click and drag to draw a box around Matthew's shoulders and head</p>
							</div>
							<div class="guideline-item">
								<strong>2. Select Orientation</strong>
								<p>👈 Side: Matthew's shoulders sideways | 👤 Front: Matthew's shoulders forward</p>
							</div>
							<div class="guideline-item">
								<strong>3. Submit or Skip</strong>
								<p>Submit your crop or mark as Unfit if Matthew's shoulders/head are unclear</p>
							</div>
							<div class="examples-section">
								<strong>Examples:</strong>
								<div class="example-grid">
									<div class="example-item">
										<div class="example-placeholder good">
											<img
												src="/images/good.png"
												alt="Good crop example"
												on:error={(e) =>
													((e.currentTarget as HTMLImageElement).style.display = 'none')}
											/>
										</div>
										<span class="example-label">Good!</span>
									</div>
									<div class="example-item">
										<div class="example-placeholder warning">
											<img
												src="/images/needmoreshoulder.png"
												alt="Need more shoulder example"
												on:error={(e) =>
													((e.currentTarget as HTMLImageElement).style.display = 'none')}
											/>
										</div>
										<span class="example-label">Need More Shoulder</span>
									</div>
									<div class="example-item">
										<div class="example-placeholder bad">
											<img
												src="/images/toomanypeople.png"
												alt="Too many people example"
												on:error={(e) =>
													((e.currentTarget as HTMLImageElement).style.display = 'none')}
											/>
										</div>
										<span class="example-label">Too Many People</span>
									</div>
									<div class="example-item">
										<div class="example-placeholder unfit">
											<img
												src="/images/unfit.png"
												alt="Unfit image example"
												on:error={(e) =>
													((e.currentTarget as HTMLImageElement).style.display = 'none')}
											/>
										</div>
										<span class="example-label">Unfit Image</span>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<div class="controls-section">
					<h4>Select Orientation</h4>
					<div class="orientation-buttons">
						<button
							class="orientation-btn"
							class:selected={selectedOrientation === 'side'}
							on:click={() => (selectedOrientation = 'side')}
						>
							<span class="icon">👈</span>
							<span>Side View</span>
						</button>
						<button
							class="orientation-btn"
							class:selected={selectedOrientation === 'front'}
							on:click={() => (selectedOrientation = 'front')}
						>
							<span class="icon">👤</span>
							<span>Front View</span>
						</button>
					</div>
				</div>

				<div class="action-section">
					<div class="action-directions">
						<p><strong>✓ Submit</strong> after cropping Matthew and selecting orientation</p>
						<p><strong>🚫 Unfit</strong> if Matthew's shoulders/head are not clearly visible</p>
					</div>
					<div class="action-buttons">
						<button class="btn btn-skip" on:click={handleSkip} disabled={loading}> ⏭ Skip </button>
						<button class="btn btn-unfit" on:click={handleSkipUnfit} disabled={loading}>
							🚫 Unfit
						</button>
						<button class="btn btn-submit" on:click={handleSubmit} disabled={loading}>
							{#if loading}
								<span class="spinner-small"></span>
							{:else}
								✓ Submit
							{/if}
						</button>
					</div>
				</div>

				{#if message}
					<div class="message" class:success={message.includes('success')}>
						{message}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		min-height: 100vh;
		overflow-x: hidden;
	}

	main {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1rem;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		text-align: center;
		margin-bottom: 0.5rem;
		color: white;
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		margin-bottom: 0.5rem;
		animation: fadeInDown 0.5s ease-out;
	}

	.logout-btn-compact {
		background: rgba(255, 255, 255, 0.2);
		border: 2px solid rgba(255, 255, 255, 0.5);
		color: white;
		padding: 0.4rem 0.6rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1.1rem;
		transition: all 0.3s ease;
		backdrop-filter: blur(10px);
		flex-shrink: 0;
	}

	.logout-btn-compact:hover {
		background: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.8);
		transform: translateY(-2px);
	}

	h1 {
		font-size: 1.3rem;
		margin: 0;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
		color: white;
		flex-shrink: 0;
		white-space: nowrap;
	}

	.image-counter {
		color: white;
		font-size: 0.9rem;
		font-weight: 600;
		padding: 0.3rem 0.7rem;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.3);
		flex-shrink: 0;
	}

	.user-progress-compact {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
		min-width: 0;
	}

	.progress-text-compact {
		color: white;
		font-size: 0.85rem;
		font-weight: 500;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.user-progress-bar-compact {
		flex: 1;
		height: 16px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		overflow: hidden;
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
		min-width: 100px;
	}

	.user-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
		transition: width 0.5s ease;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(79, 172, 254, 0.5);
		position: relative;
		overflow: hidden;
	}

	.user-progress-fill::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		right: 0;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
		animation: shimmer 2s infinite;
	}

	@keyframes shimmer {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}

	/* Old styles - can be removed */
	.user-progress-container {
		display: none;
	}

	.user-progress-text {
		display: none;
	}

	.user-progress-bar {
		display: none;
	}

	.subtitle {
		font-size: 1rem;
		opacity: 0.9;
		margin-top: 0.25rem;
	}

	.loading {
		text-align: center;
		padding: 4rem;
		color: white;
	}

	.spinner {
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top: 4px solid white;
		border-radius: 50%;
		width: 50px;
		height: 50px;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}

	.spinner-small {
		display: inline-block;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		width: 14px;
		height: 14px;
		animation: spin 1s linear infinite;
		margin-right: 0.5rem;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	@keyframes fadeInDown {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.progress-bar {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 20px;
		padding: 0.35rem 1rem;
		text-align: center;
		color: white;
		font-weight: 600;
		margin-bottom: 0.5rem;
		backdrop-filter: blur(10px);
		font-size: 0.85rem;
	}

	.main-layout {
		display: flex;
		gap: 1.5rem;
		flex: 1;
		align-items: stretch;
		overflow: hidden;
		min-height: 0;
	}

	.left-panel {
		flex: 2;
		display: flex;
		flex-direction: column;
	}

	.right-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 300px;
	}

	.canvas-container {
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
		border-radius: 12px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
		background: white;
		flex: 1;
		min-height: 0;
	}

	canvas {
		cursor: crosshair;
		display: block;
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
		user-select: none;
		-webkit-user-drag: none;
	}

	.guidelines {
		background: rgba(255, 255, 255, 0.95);
		border-radius: 12px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.guidelines-header {
		width: 100%;
		background: none;
		border: none;
		padding: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
		transition: background 0.2s;
		font-family: inherit;
	}

	.guidelines-header:hover {
		background: rgba(102, 126, 234, 0.05);
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		color: #667eea;
	}

	.check-icon {
		font-size: 1.2rem;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
	}

	.check-icon.checked {
		background: #28a745;
		color: white;
		border-radius: 50%;
		font-size: 0.9rem;
	}

	.toggle-icon {
		color: #667eea;
		font-size: 0.8rem;
		transition: transform 0.3s ease;
	}

	.guidelines-content {
		padding: 0 0.75rem 0.75rem 0.75rem;
		animation: slideDown 0.3s ease-out;
		max-height: 350px;
		overflow-y: auto;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.guideline-item {
		margin-bottom: 0.5rem;
		font-size: 0.85rem;
	}

	.guideline-item {
		margin-bottom: 0.75rem;
	}

	.guideline-item strong {
		display: block;
		color: #333;
		margin-bottom: 0.25rem;
		font-size: 0.9rem;
	}

	.guideline-item p {
		margin: 0.15rem 0;
		color: #666;
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.examples-section {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(102, 126, 234, 0.2);
	}

	.examples-section strong {
		display: block;
		color: #333;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	.example-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.example-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.example-placeholder {
		width: 100%;
		aspect-ratio: 3/4;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		border: 2px solid #ccc;
		background: #f5f5f5;
		overflow: hidden;
	}

	.example-placeholder img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.example-placeholder.good {
		border-color: #28a745;
		background: #e8f5e9;
		color: #28a745;
	}

	.example-placeholder.warning {
		border-color: #ffc107;
		background: #fff9e6;
		color: #ffc107;
	}

	.example-placeholder.bad {
		border-color: #dc3545;
		background: #ffebee;
		color: #dc3545;
	}

	.example-placeholder.unfit {
		border-color: #6c757d;
		background: #f0f0f0;
		color: #6c757d;
	}

	.example-label {
		font-size: 0.7rem;
		color: #666;
		text-align: center;
		line-height: 1.2;
	}

	.controls-section {
		background: rgba(255, 255, 255, 0.95);
		border-radius: 12px;
		padding: 0.75rem;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
	}

	.controls-section h4 {
		margin: 0 0 0.5rem 0;
		color: #667eea;
		font-size: 0.9rem;
	}

	.orientation-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.orientation-btn {
		flex: 1;
		padding: 0.6rem;
		font-size: 0.85rem;
		font-weight: 600;
		border: 3px solid #667eea;
		background: white;
		color: #667eea;
		cursor: pointer;
		border-radius: 8px;
		transition: all 0.3s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.orientation-btn:hover {
		background: #f0f0f0;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.orientation-btn.selected {
		background: #667eea;
		color: white;
		border-color: #667eea;
		transform: scale(1.05);
		box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
	}

	.orientation-btn .icon {
		font-size: 1.5rem;
	}

	.action-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: auto;
	}

	.action-directions {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 0.5rem 0.65rem;
		backdrop-filter: blur(10px);
	}

	.action-directions p {
		margin: 0.25rem 0;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.95);
		line-height: 1.3;
	}

	.action-directions p:first-child {
		margin-top: 0;
	}

	.action-directions p:last-child {
		margin-bottom: 0;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.btn {
		padding: 0.65rem 0.75rem;
		font-size: 0.8rem;
		font-weight: 600;
		border: none;
		cursor: pointer;
		border-radius: 12px;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		white-space: nowrap;
		flex: 1;
	}

	.btn-primary {
		background: white;
		color: #667eea;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
	}

	.btn-primary:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border: 2px solid white;
		backdrop-filter: blur(10px);
	}

	.btn-secondary:hover {
		background: rgba(255, 255, 255, 0.3);
		transform: translateY(-2px);
	}

	.btn-skip {
		background: #6c757d;
		color: white;
	}

	.btn-skip:hover:not(:disabled) {
		background: #5a6268;
		transform: translateY(-2px);
	}

	.btn-skip:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-unfit {
		background: #dc3545;
		color: white;
	}

	.btn-unfit:hover:not(:disabled) {
		background: #c82333;
		transform: translateY(-2px);
	}

	.btn-unfit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-submit {
		background: #667eea;
		color: white;
	}

	.btn-submit:hover:not(:disabled) {
		background: #5568d3;
		transform: translateY(-2px);
	}

	.btn-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.message {
		text-align: center;
		margin-top: 0.75rem;
		padding: 0.75rem;
		border-radius: 12px;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.2);
		color: white;
		backdrop-filter: blur(10px);
		animation: fadeInDown 0.3s ease-out;
		font-size: 0.9rem;
	}

	.message.success {
		background: rgba(76, 175, 80, 0.9);
	}
</style>
