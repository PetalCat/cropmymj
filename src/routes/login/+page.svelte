<script lang="ts">
	import { goto } from '$app/navigation';
	
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	
	async function handleLogin(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;
		
		try {
			const response = await fetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
			});
			
			const data = await response.json();
			
			if (response.ok) {
				// Redirect to home page
				goto('/');
			} else {
				error = data.error || 'Invalid password';
			}
		} catch (err) {
			error = 'Connection error';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - Pose Processing</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 px-4">
	<div class="max-w-md w-full">
		<div class="bg-white rounded-2xl shadow-xl p-8">
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Pose Processing</h1>
				<p class="text-gray-600">Enter password to continue</p>
			</div>
			
			<form onsubmit={handleLogin} class="space-y-6">
				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
						Password
					</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						disabled={loading}
						class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
						placeholder="Enter password"
						autocomplete="current-password"
					/>
				</div>
				
				{#if error}
					<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
						{error}
					</div>
				{/if}
				
				<button
					type="submit"
					disabled={loading || !password}
					class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					{loading ? 'Logging in...' : 'Login'}
				</button>
			</form>
		</div>
		
		<p class="text-center text-gray-600 text-sm mt-6">
			🔒 This site is password protected
		</p>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}
</style>
