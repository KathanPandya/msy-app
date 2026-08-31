<script lang="ts">
	import { fade } from 'svelte/transition';
	import { X } from '@lucide/svelte';
	import { t, type Lang } from '$lib/i18n';
	import { UPI_APPS } from '$lib/utilities/upiPayment';

	let {
		lang = undefined,
		onselect,
		onclose
	}: {
		lang?: Lang;
		onselect: (appKey: string) => void;
		onclose: () => void;
	} = $props();

	const mainApps = UPI_APPS.filter((a) => a.key !== 'other');
	const otherApp = UPI_APPS.find((a) => a.key === 'other');
</script>

<div
	transition:fade={{ duration: 150 }}
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
	role="dialog"
	aria-modal="true"
	aria-label={t(lang, 'chooseUpiApp')}
	tabindex="-1"
	onclick={(e) => e.target === e.currentTarget && onclose()}
	onkeydown={(e) => e.key === 'Escape' && onclose()}
>
	<div
		class="w-full max-w-sm rounded-t-xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg sm:rounded-xl sm:pb-4"
	>
		<div class="mb-3 flex items-center justify-between">
			<p class="text-sm font-semibold text-gray-900">{t(lang, 'chooseUpiApp')}</p>
			<button
				type="button"
				onclick={onclose}
				class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
				aria-label={t(lang, 'close')}
			>
				<X class="h-4 w-4" />
			</button>
		</div>
		<div class="grid grid-cols-4 gap-3">
			{#each mainApps as app (app.key)}
				<button
					type="button"
					onclick={() => onselect(app.key)}
					class="flex flex-col items-center gap-1.5 text-center"
				>
					{#if app.logo}
						<span
							class="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-100 bg-white p-2 shadow-sm"
						>
							<img src={app.logo} alt={app.name} class="h-full w-full object-contain" />
						</span>
					{:else}
						<span
							class="flex h-14 w-14 items-center justify-center rounded-2xl text-base font-bold text-white"
							style={`background-color:${app.color}`}
						>
							{app.letter}
						</span>
					{/if}
					<span class="text-[11px] leading-tight text-gray-600">{app.name}</span>
				</button>
			{/each}
		</div>

		{#if otherApp}
			<button
				type="button"
				onclick={() => onselect(otherApp.key)}
				class="mt-3 block w-full text-right text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
			>
				{t(lang, 'useAnotherApp')}
			</button>
		{/if}
	</div>
</div>
