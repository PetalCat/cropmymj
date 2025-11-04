<script lang="ts">
	import { onMount } from 'svelte';

	interface CropStats {
		avg_x: number;
		avg_y: number;
		avg_width: number;
		avg_height: number;
		std_x: number;
		std_y: number;
		std_width: number;
		std_height: number;
		count: number;
	}

	interface Outlier {
		id: number;
		user_id: string;
		x: number;
		y: number;
		width: number;
		height: number;
		outlier_fields: string[];
		deviation_score: number;
	}

	interface ImageData {
		image_id: number;
		filename: string;
		width: number;
		height: number;
		total_submissions: number;
		total_unfits: number;
		crop_stats: CropStats | null;
		all_crops: Array<{
			id: number;
			user_id: string;
			x: number;
			y: number;
			width: number;
			height: number;
		}>;
		outliers: Outlier[];
		orientations: Record<string, number>;
		most_common_orientation: {
			orientation: string;
			count: number;
			percentage: number;
		} | null;
	}

	let apiKey = $state('');
	let isAuthenticated = $state(false);
	let loading = $state(false);
	let error = $state('');
	let images: ImageData[] = $state([]);
	let outlierThreshold = $state(1.5);
	let expandedImages = $state(new Set<number>());
	let sortBy: 'filename' | 'outliers' | 'submissions' = $state('filename');
	let showAllSubmissions = $state(false);
	let currentImageIndex = $state(0);

	onMount(() => {
		// Try to load API key from localStorage
		const savedKey = localStorage.getItem('adminApiKey');
		if (savedKey) {
			apiKey = savedKey;
			loadData();
		}

		// Add keyboard navigation
		function handleKeyPress(e: KeyboardEvent) {
			if (!isAuthenticated || sortedImages.length === 0) return;

			if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'n' || e.key === 'N') {
				// Next image
				e.preventDefault();
				navigateToImage(currentImageIndex + 1);
			} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'p' || e.key === 'P') {
				// Previous image
				e.preventDefault();
				navigateToImage(currentImageIndex - 1);
			} else if (e.key === 'Enter' || e.key === ' ') {
				// Toggle current image
				e.preventDefault();
				if (sortedImages[currentImageIndex]) {
					toggleImage(sortedImages[currentImageIndex].image_id);
				}
			}
		}

		window.addEventListener('keydown', handleKeyPress);
		return () => window.removeEventListener('keydown', handleKeyPress);
	});

	function navigateToImage(index: number) {
		if (index < 0 || index >= sortedImages.length) return;

		// Close current image
		if (sortedImages[currentImageIndex]) {
			expandedImages.delete(sortedImages[currentImageIndex].image_id);
		}

		// Update index and open new image
		currentImageIndex = index;
		if (sortedImages[currentImageIndex]) {
			expandedImages.add(sortedImages[currentImageIndex].image_id);
			expandedImages = new Set(expandedImages);

			// Scroll to the image
			setTimeout(() => {
				const element = document.querySelector(
					`[data-image-id="${sortedImages[currentImageIndex].image_id}"]`
				);
				if (element) {
					element.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}, 50);
		}
	}

	async function handleAuth() {
		if (!apiKey.trim()) {
			error = 'Please enter an API key';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/admin/submissions?threshold=${outlierThreshold}`, {
				headers: {
					Authorization: `Bearer ${apiKey}`
				}
			});

			if (response.ok) {
				const data = await response.json();
				images = data.images;
				isAuthenticated = true;
				localStorage.setItem('adminApiKey', apiKey);
			} else {
				const errorData = await response.json();
				error = errorData.error || 'Invalid API key';
				isAuthenticated = false;
			}
		} catch (err) {
			error = 'Failed to connect to server';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function loadData() {
		if (!apiKey) return;

		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/admin/submissions?threshold=${outlierThreshold}`, {
				headers: {
					Authorization: `Bearer ${apiKey}`
				}
			});

			if (response.ok) {
				const data = await response.json();
				images = data.images;
				isAuthenticated = true;
			} else {
				error = 'Session expired or invalid API key';
				isAuthenticated = false;
				localStorage.removeItem('adminApiKey');
			}
		} catch (err) {
			error = 'Failed to load data';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function deleteOutlier(cropId: number) {
		if (!confirm('Are you sure you want to delete this submission?')) return;

		try {
			const response = await fetch(`/api/admin/submissions/${cropId}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${apiKey}`
				}
			});

			if (response.ok) {
				// Reload data
				await loadData();
			} else {
				error = 'Failed to delete submission';
			}
		} catch (err) {
			error = 'Failed to delete submission';
			console.error(err);
		}
	}

	function logout() {
		apiKey = '';
		isAuthenticated = false;
		localStorage.removeItem('adminApiKey');
		images = [];
	}

	function toggleImage(imageId: number) {
		if (expandedImages.has(imageId)) {
			expandedImages.delete(imageId);
		} else {
			expandedImages.add(imageId);
		}
		expandedImages = new Set(expandedImages);

		// Update current index if we're toggling manually
		const index = sortedImages.findIndex((img) => img.image_id === imageId);
		if (index !== -1) {
			currentImageIndex = index;
		}
	}

	let sortedImages = $derived.by(() => {
		const sorted = [...images];
		if (sortBy === 'outliers') {
			sorted.sort((a, b) => b.outliers.length - a.outliers.length);
		} else if (sortBy === 'submissions') {
			sorted.sort((a, b) => b.total_submissions - a.total_submissions);
		} else {
			sorted.sort((a, b) => a.filename.localeCompare(b.filename));
		}
		return sorted;
	});

	let totalOutliers = $derived.by(() => images.reduce((sum, img) => sum + img.outliers.length, 0));
	let totalSubmissions = $derived.by(() =>
		images.reduce((sum, img) => sum + img.total_submissions, 0)
	);
	let processedImages = $derived.by(() => images.filter((img) => img.total_submissions > 0).length);
	let processingPercentage = $derived.by(() =>
		images.length > 0 ? Math.round((processedImages / images.length) * 100) : 0
	);
</script>

<main>
	<div class="header">
		<h1>🔐 Admin Dashboard</h1>
		{#if isAuthenticated}
			<button class="btn-logout" onclick={logout}>Logout</button>
		{/if}
	</div>

	{#if !isAuthenticated}
		<div class="auth-container">
			<div class="auth-card">
				<h2>Enter API Key</h2>
				<input
					type="password"
					bind:value={apiKey}
					placeholder="Enter your API key"
					onkeydown={(e) => e.key === 'Enter' && handleAuth()}
				/>
				<button class="btn-primary" onclick={handleAuth} disabled={loading}>
					{#if loading}
						<span class="spinner"></span>
					{:else}
						Authenticate
					{/if}
				</button>
				{#if error}
					<div class="error">{error}</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="progress-section">
			<div class="progress-header">
				<h2>Processing Progress</h2>
				<span class="progress-text"
					>{processedImages} / {images.length} images ({processingPercentage}%)</span
				>
			</div>
			<div class="progress-bar-container">
				<div class="progress-bar-fill" style="width: {processingPercentage}%"></div>
			</div>
		</div>

		<div class="controls">
			<div class="stats-summary">
				<div class="stat-card">
					<div class="stat-value">{images.length}</div>
					<div class="stat-label">Total Images</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{totalSubmissions}</div>
					<div class="stat-label">Total Submissions</div>
				</div>
				<div class="stat-card warning">
					<div class="stat-value">{totalOutliers}</div>
					<div class="stat-label">Total Outliers</div>
				</div>
			</div>

			<div class="control-row">
				<div class="control-group">
					<label for="threshold">Outlier Threshold (Std Dev):</label>
					<input
						id="threshold"
						type="number"
						bind:value={outlierThreshold}
						min="1"
						max="5"
						step="0.5"
					/>
					<button class="btn-secondary" onclick={loadData}>Refresh</button>
				</div>

				<div class="control-group">
					<label for="sort">Sort By:</label>
					<select id="sort" bind:value={sortBy}>
						<option value="filename">Filename</option>
						<option value="outliers">Most Outliers</option>
						<option value="submissions">Most Submissions</option>
					</select>
				</div>

				<div class="control-group">
					<label>
						<input type="checkbox" bind:checked={showAllSubmissions} />
						Show all submissions
					</label>
				</div>
			</div>
		</div>

		{#if loading}
			<div class="loading">
				<div class="spinner-large"></div>
				<p>Loading data...</p>
			</div>
		{:else if error}
			<div class="error">{error}</div>
		{:else}
			<div class="images-list">
				{#each sortedImages as image, index (image.image_id)}
					<div
						class="image-card"
						class:current={index === currentImageIndex}
						data-image-id={image.image_id}
					>
						<button
							class="image-header"
							class:has-outliers={image.outliers.length > 0}
							onclick={() => toggleImage(image.image_id)}
						>
							<div class="image-info">
								<span class="expand-icon">{expandedImages.has(image.image_id) ? '▼' : '▶'}</span>
								<strong>{image.filename}</strong>
								<span class="image-meta"
									>{image.width}x{image.height} • {image.total_submissions} submissions</span
								>
							</div>
							<div class="image-badges">
								{#if image.outliers.length > 0}
									<span class="badge badge-warning">{image.outliers.length} outliers</span>
								{/if}
								{#if image.total_unfits > 0}
									<span class="badge badge-unfit">{image.total_unfits} unfit</span>
								{/if}
							</div>
						</button>

						{#if expandedImages.has(image.image_id)}
							<div class="image-details">
								<!-- Visual representation of image with avg crop and outliers -->
								<div class="visual-section">
									<h3>Visual Analysis</h3>
									<div class="image-canvas-container">
										<img
											src="/images/{image.filename}"
											alt={image.filename}
											class="preview-image"
										/>
										{#if image.crop_stats}
											<!-- Average crop overlay -->
											<div
												class="crop-overlay avg-crop"
												style="
													left: {(image.crop_stats.avg_x / image.width) * 100}%;
													top: {(image.crop_stats.avg_y / image.height) * 100}%;
													width: {(image.crop_stats.avg_width / image.width) * 100}%;
													height: {(image.crop_stats.avg_height / image.height) * 100}%;
												"
											>
												<span class="crop-label">AVG</span>
											</div>

											<!-- Show all submissions if toggle is on -->
											{#if showAllSubmissions}
												{#each image.all_crops as crop}
													<div
														class="crop-overlay all-crop"
														style="
															left: {(crop.x / image.width) * 100}%;
															top: {(crop.y / image.height) * 100}%;
															width: {(crop.width / image.width) * 100}%;
															height: {(crop.height / image.height) * 100}%;
														"
													></div>
												{/each}
											{/if}

											<!-- Outlier crops (always shown) -->
											{#each image.outliers as outlier}
												<button
													class="crop-overlay outlier-crop clickable"
													style="
														left: {(outlier.x / image.width) * 100}%;
														top: {(outlier.y / image.height) * 100}%;
														width: {(outlier.width / image.width) * 100}%;
														height: {(outlier.height / image.height) * 100}%;
														border-color: hsl({Math.max(0, 120 - outlier.deviation_score * 30)}, 80%, 50%);
													"
													title="Click to delete - Deviation: {outlier.deviation_score}σ"
													onclick={(e) => {
														e.stopPropagation();
														deleteOutlier(outlier.id);
													}}
												>
													<span class="crop-label outlier-label"
														>{outlier.deviation_score.toFixed(1)}σ</span
													>
													<span class="delete-icon">🗑️</span>
												</button>
											{/each}
										{/if}
									</div>
									<div class="legend">
										<div class="legend-item">
											<span class="legend-box avg-box"></span>
											<span>Average Crop</span>
										</div>
										{#if showAllSubmissions}
											<div class="legend-item">
												<span class="legend-box all-box"></span>
												<span>All Submissions</span>
											</div>
										{/if}
										<div class="legend-item">
											<span class="legend-box outlier-box"></span>
											<span>Outlier Submissions (click to delete)</span>
										</div>
									</div>
								</div>

								{#if image.crop_stats}
									<div class="stats-section">
										<h3>Crop Statistics</h3>
										<div class="stats-grid">
											<div class="stat-item">
												<span class="stat-name">Position X</span>
												<span class="stat-value"
													>{image.crop_stats.avg_x} ± {image.crop_stats.std_x}</span
												>
											</div>
											<div class="stat-item">
												<span class="stat-name">Position Y</span>
												<span class="stat-value"
													>{image.crop_stats.avg_y} ± {image.crop_stats.std_y}</span
												>
											</div>
											<div class="stat-item">
												<span class="stat-name">Width</span>
												<span class="stat-value"
													>{image.crop_stats.avg_width} ± {image.crop_stats.std_width}</span
												>
											</div>
											<div class="stat-item">
												<span class="stat-name">Height</span>
												<span class="stat-value"
													>{image.crop_stats.avg_height} ± {image.crop_stats.std_height}</span
												>
											</div>
										</div>
									</div>
								{/if}

								{#if image.most_common_orientation}
									<div class="orientation-section">
										<h3>Orientation</h3>
										<p>
											Most common: <strong>{image.most_common_orientation.orientation}</strong>
											({image.most_common_orientation.percentage}% - {image.most_common_orientation
												.count}/{Object.values(image.orientations).reduce((a, b) => a + b, 0)} votes)
										</p>
									</div>
								{/if}

								{#if image.outliers.length > 0}
									<div class="outliers-section">
										<h3>Outlier Submissions</h3>
										<div class="outliers-list">
											{#each image.outliers as outlier (outlier.id)}
												<div class="outlier-card">
													<div class="outlier-header">
														<div>
															<strong>User:</strong>
															{outlier.user_id.substring(0, 8)}...
															<span class="deviation-badge"
																>Deviation: {outlier.deviation_score}σ</span
															>
														</div>
														<button class="btn-delete" onclick={() => deleteOutlier(outlier.id)}>
															🗑️ Delete
														</button>
													</div>
													<div class="outlier-details">
														<div
															class="outlier-field"
															class:outlier={outlier.outlier_fields.includes('x')}
														>
															<span>X:</span>
															{outlier.x}
														</div>
														<div
															class="outlier-field"
															class:outlier={outlier.outlier_fields.includes('y')}
														>
															<span>Y:</span>
															{outlier.y}
														</div>
														<div
															class="outlier-field"
															class:outlier={outlier.outlier_fields.includes('width')}
														>
															<span>W:</span>
															{outlier.width}
														</div>
														<div
															class="outlier-field"
															class:outlier={outlier.outlier_fields.includes('height')}
														>
															<span>H:</span>
															{outlier.height}
														</div>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		min-height: 100vh;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
	}

	main {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
		min-height: 100vh;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		color: white;
	}

	h1 {
		margin: 0;
		font-size: 2rem;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
	}

	.auth-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
	}

	.auth-card {
		background: white;
		padding: 2rem;
		border-radius: 16px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
		width: 100%;
		max-width: 400px;
	}

	.auth-card h2 {
		margin: 0 0 1.5rem 0;
		color: #667eea;
	}

	input[type='password'],
	input[type='number'],
	select {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		font-size: 1rem;
		margin-bottom: 1rem;
		transition: border-color 0.3s;
	}

	input:focus {
		outline: none;
		border-color: #667eea;
	}

	.btn-primary,
	.btn-secondary,
	.btn-logout,
	.btn-delete {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s;
	}

	.btn-primary {
		background: #667eea;
		color: white;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.btn-primary:hover:not(:disabled) {
		background: #5568d3;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: white;
		color: #667eea;
		border: 2px solid #667eea;
	}

	.btn-secondary:hover {
		background: #f0f0f0;
	}

	.btn-logout {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border: 2px solid white;
		backdrop-filter: blur(10px);
	}

	.btn-logout:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.btn-delete {
		background: #dc3545;
		color: white;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.btn-delete:hover {
		background: #c82333;
	}

	.progress-section {
		background: rgba(255, 255, 255, 0.95);
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		backdrop-filter: blur(10px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.progress-header h2 {
		margin: 0;
		color: #667eea;
		font-size: 1.25rem;
	}

	.progress-text {
		font-size: 1rem;
		font-weight: 600;
		color: #333;
	}

	.progress-bar-container {
		width: 100%;
		height: 32px;
		background: #e0e0e0;
		border-radius: 16px;
		overflow: hidden;
		position: relative;
	}

	.progress-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
		border-radius: 16px;
		transition: width 0.5s ease;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-right: 1rem;
		color: white;
		font-weight: 600;
		font-size: 0.875rem;
		box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
	}

	.controls {
		background: rgba(255, 255, 255, 0.95);
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
	}

	.stats-summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 1.5rem;
		border-radius: 12px;
		text-align: center;
	}

	.stat-card.warning {
		background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
	}

	.stat-value {
		font-size: 2.5rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: white;
	}

	.stat-label {
		font-size: 0.875rem;
		opacity: 0.9;
		color: white;
	}

	.control-row {
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
		align-items: flex-end;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
		min-width: 200px;
	}

	.control-group label {
		font-weight: 600;
		color: #333;
		font-size: 0.875rem;
	}

	.control-group input[type='number'] {
		max-width: 100px;
	}

	.loading {
		text-align: center;
		padding: 4rem;
		color: white;
	}

	.spinner,
	.spinner-large {
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top: 4px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border-width: 3px;
	}

	.spinner-large {
		width: 50px;
		height: 50px;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.error {
		background: #dc3545;
		color: white;
		padding: 1rem;
		border-radius: 8px;
		margin-top: 1rem;
		text-align: center;
	}

	.images-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.image-card {
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.image-header {
		padding: 1rem 1.5rem;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: background 0.2s;
		width: 100%;
		border: none;
		background: white;
		text-align: left;
		font-family: inherit;
		font-size: inherit;
	}

	.image-header:hover {
		background: #f8f9fa;
	}

	.image-header.has-outliers {
		background: #fff3cd;
	}

	.image-header.has-outliers:hover {
		background: #ffe8a1;
	}

	.image-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
	}

	.expand-icon {
		color: #667eea;
		font-size: 0.875rem;
	}

	.image-meta {
		color: #666;
		font-size: 0.875rem;
	}

	.image-badges {
		display: flex;
		gap: 0.5rem;
	}

	.badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.badge-warning {
		background: #ff6b6b;
		color: white;
	}

	.badge-unfit {
		background: #6c757d;
		color: white;
	}

	.image-details {
		padding: 1.5rem;
		border-top: 1px solid #e0e0e0;
		background: #f8f9fa;
	}

	.visual-section {
		margin-bottom: 1.5rem;
	}

	.image-canvas-container {
		position: relative;
		width: 100%;
		max-width: 800px;
		margin: 0 auto 1rem;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.preview-image {
		width: 100%;
		height: auto;
		display: block;
	}

	.crop-overlay {
		position: absolute;
		border: 3px solid;
		box-sizing: border-box;
	}

	.crop-overlay.clickable {
		pointer-events: auto;
		cursor: pointer;
		transition: all 0.2s;
		background: none;
		padding: 0;
	}

	.crop-overlay.clickable:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 12px rgba(255, 107, 107, 0.5);
		z-index: 20 !important;
	}

	.avg-crop {
		border-color: #4caf50;
		background: rgba(76, 175, 80, 0.1);
		z-index: 10;
		pointer-events: none;
	}

	.all-crop {
		border-width: 1px;
		border-style: solid;
		border-color: rgba(100, 100, 255, 0.4);
		background: rgba(100, 100, 255, 0.05);
		z-index: 3;
		pointer-events: none;
	}

	.outlier-crop {
		border-style: dashed;
		background: rgba(255, 107, 107, 0.1);
		z-index: 5;
	}

	.outlier-crop:hover {
		background: rgba(255, 107, 107, 0.3);
	}

	.crop-label {
		position: absolute;
		top: -24px;
		left: 0;
		background: rgba(0, 0, 0, 0.8);
		color: white;
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.outlier-label {
		background: rgba(255, 107, 107, 0.9);
	}

	.delete-icon {
		position: absolute;
		bottom: -24px;
		right: 0;
		background: rgba(220, 53, 69, 0.9);
		color: white;
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 0.75rem;
		opacity: 0;
		transition: opacity 0.2s;
		pointer-events: none;
	}

	.crop-overlay.clickable:hover .delete-icon {
		opacity: 1;
	}

	.legend {
		display: flex;
		gap: 2rem;
		justify-content: center;
		padding: 1rem;
		background: white;
		border-radius: 8px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.legend-box {
		width: 30px;
		height: 20px;
		border: 3px solid;
		border-radius: 4px;
	}

	.avg-box {
		border-color: #4caf50;
		background: rgba(76, 175, 80, 0.1);
	}

	.all-box {
		border-width: 1px;
		border-color: rgba(100, 100, 255, 0.4);
		background: rgba(100, 100, 255, 0.05);
	}

	.outlier-box {
		border-style: dashed;
		border-color: #ff6b6b;
		background: rgba(255, 107, 107, 0.1);
	}

	.stats-section,
	.orientation-section,
	.outliers-section {
		margin-bottom: 1.5rem;
	}

	.stats-section:last-child,
	.orientation-section:last-child,
	.outliers-section:last-child {
		margin-bottom: 0;
	}

	h3 {
		margin: 0 0 1rem 0;
		color: #667eea;
		font-size: 1.125rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.stat-item {
		background: white;
		padding: 1rem;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.stat-name {
		color: #666;
		font-size: 0.875rem;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: #ffffff;
	}

	.orientation-section p {
		margin: 0;
		padding: 1rem;
		background: white;
		border-radius: 8px;
	}

	.outliers-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.outlier-card {
		background: white;
		border: 2px solid #ff6b6b;
		border-radius: 8px;
		padding: 1rem;
	}

	.outlier-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.deviation-badge {
		background: #ff6b6b;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		margin-left: 0.5rem;
	}

	.outlier-details {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}

	.outlier-field {
		background: #f8f9fa;
		padding: 0.5rem;
		border-radius: 4px;
		text-align: center;
		font-size: 0.875rem;
	}

	.outlier-field.outlier {
		background: #ffebee;
		border: 2px solid #ff6b6b;
		font-weight: 600;
	}

	.outlier-field span {
		color: #666;
		display: block;
		font-size: 0.75rem;
		margin-bottom: 0.25rem;
	}
</style>
