<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/authStore';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	let { children } = $props();

	onMount(() => {
		// Initialize auth on app start
		authStore.initialize();
	});

	// Redirect to login if not authenticated (except for public routes)
	$effect(() => {
		const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/admin', '/unauthorized'];
		const currentPath = page.url.pathname;
		const isPublic =
			publicRoutes.includes(currentPath) || publicRoutes.some((r) => currentPath === r);

		if (!$authStore.isLoading && !$authStore.isAuthenticated) {
			if (!isPublic) {
				// Send browsers hitting /me to member login; everything else to admin
				// goto(currentPath.startsWith('/me') ? '/login' : '/admin');
				goto('/login');
			}
		}

		// After PIN login, don't leave members on admin shell landing by default
		if (
			!$authStore.isLoading &&
			$authStore.isAuthenticated &&
			$authStore.authType === 'pin' &&
			(currentPath === '/' || currentPath === '/admin')
		) {
			goto('/me');
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- {#if $authStore.isLoading}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="text-center">
			<div
				class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
			></div>
			<p class="mt-4 text-gray-600">Loading...</p>
		</div>
	</div>
{:else} -->
	<div class="bg-whit flex h-screen flex-col overflow-hidden">
		<main class="overflow-hiddens flex-1">
			{@render children?.()}
		</main>
	</div>
	<!-- <slot /> -->
<!-- {/if} -->
