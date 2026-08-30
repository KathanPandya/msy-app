<script lang="ts">
	import { page } from '$app/state';
	import { t, type Lang } from '$lib/i18n';
	import { authStore } from '$lib/stores/authStore';
	import { LogOut } from '@lucide/svelte';

	let { firstName, isHead, lang }: { firstName: string; isHead: boolean; lang: Lang | undefined } =
		$props();

	// English → offer Gujarati (label itself in Gujarati, since that's the
	// language being offered); Gujarati → offer English, label in English.
	// Preserves whichever /me/* page the member is currently on.
	const langSwitchHref = $derived(
		lang === 'guj' ? page.url.pathname.replace(/^\/guj/, '') || '/' : `/guj${page.url.pathname}`
	);
	const langSwitchLabel = $derived(
		lang === 'guj' ? 'Use this website in English' : 'આ વેબસાઇટ ગુજરાતીમાં વાપરો'
	);
</script>

<header class="flex-shrink-0 border-b border-gray-200 bg-white px-3 py-1.5">
	<div class="mx-auto flex max-w-3xl items-center justify-between">
		<div class="flex items-center gap-1.5">
			<p class="text-sm font-semibold text-gray-900">
				{t(lang, 'greeting').replace('{name}', firstName)}
			</p>
			{#if isHead}
				<span
					class="inline-flex rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
					>{t(lang, 'head')}</span
				>
			{/if}
		</div>
		<div class="flex flex-shrink-0 items-center gap-2">
			<a href={langSwitchHref} class="text-xs font-medium text-blue-600 hover:underline">
				{langSwitchLabel}
			</a>
			<button
				type="button"
				onclick={() => authStore.logout()}
				aria-label={t(lang, 'logOut')}
				title={t(lang, 'logOut')}
				class="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
			>
				<LogOut class="h-4 w-4" />
			</button>
		</div>
	</div>
</header>
