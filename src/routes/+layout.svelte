<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/authStore';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { withLang } from '$lib/i18n';
	import LoadingBar from '$lib/components/ui/LoadingBar.svelte';
	let { children } = $props();

	onMount(() => {
		// Initialize auth on app start
		authStore.initialize();
	});

	// Redirect to login if not authenticated (except for public routes)
	$effect(() => {
		const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/admin', '/unauthorized'];
		const lang = page.params.lang as 'guj' | undefined;
		const currentPath = page.url.pathname;
		// The /login route lives under the optional [[lang]] segment, so strip
		// it before comparing against publicRoutes (otherwise /guj/login never
		// matches '/login' and gets bounced straight back to it, losing the lang).
		const pathWithoutLang = lang ? currentPath.replace(new RegExp(`^/${lang}`), '') || '/' : currentPath;
		const isPublic = publicRoutes.includes(pathWithoutLang);

		if (!$authStore.isLoading && !$authStore.isAuthenticated) {
			if (!isPublic) {
				// Send browsers hitting /me to member login; everything else to admin
				// goto(currentPath.startsWith('/me') ? '/login' : '/admin');
				goto(withLang(lang, '/login'));
			}
		}

		// After PIN login, don't leave members on admin shell landing by default
		if (
			!$authStore.isLoading &&
			$authStore.isAuthenticated &&
			$authStore.authType === 'pin' &&
			(pathWithoutLang === '/' || pathWithoutLang === '/admin')
		) {
			goto(withLang(lang, '/me'));
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<LoadingBar />

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
	<div class="bg-whit flex h-dvh flex-col overflow-hidden">
		<main class="min-h-0 flex-1 overflow-y-auto">
			{@render children?.()}
		</main>
	</div>
	<!-- <slot /> -->
<!-- {/if} -->
