<script lang="ts">
	import { t, type Lang } from '$lib/i18n';
	import { authStore } from '$lib/stores/authStore';
	import { LogOut } from '@lucide/svelte';

	let { firstName, isHead, lang }: { firstName: string; isHead: boolean; lang: Lang | undefined } =
		$props();
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
</header>
