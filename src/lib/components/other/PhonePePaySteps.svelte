<script lang="ts">
	import { page } from '$app/state';
	import { ChevronDown } from '@lucide/svelte';
	import { t, type Lang } from '$lib/i18n';
	import step1 from '$lib/assets/payment-steps/phonepe/1.png';
	import step2 from '$lib/assets/payment-steps/phonepe/2.png';
	import step3 from '$lib/assets/payment-steps/phonepe/3.png';
	import step4 from '$lib/assets/payment-steps/phonepe/4.png';
	import step5 from '$lib/assets/payment-steps/phonepe/5.png';

	let { lang = undefined }: { lang?: Lang } = $props();

	const steps = [
		{ image: step1, captionKey: 'payStep1' },
		{ image: step2, captionKey: 'payStep2' },
		{ image: step3, captionKey: 'payStep3' },
		{ image: step4, captionKey: 'payStep4' },
		{ image: step5, captionKey: 'payStep5' }
	] as const;

	let expanded = $state(true);

	// Same pattern as MemberHeader's language link — placed here (not just in
	// the header) since this step-by-step guide is exactly where non-tech-savvy
	// members most need to read in their own language.
	const langSwitchHref = $derived(
		(lang === 'guj' ? page.url.pathname.replace(/^\/guj/, '') || '/' : `/guj${page.url.pathname}`) +
			page.url.search
	);
	const langSwitchLabel = $derived(lang === 'guj' ? 'English' : 'ગુજરાતી');
</script>

<section class="rounded-lg border border-gray-200 bg-white shadow-sm">
	<div class="flex items-center justify-between gap-2 px-3 py-2.5">
		<button
			type="button"
			onclick={() => (expanded = !expanded)}
			class="flex min-w-0 flex-1 items-center gap-2 text-left"
		>
			<span class="truncate text-xs font-semibold text-gray-700"
				>{t(lang, 'howToPayVia').replace('{app}', 'PhonePe')}</span
			>
			<ChevronDown
				class={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
			/>
		</button>
		<a
			href={langSwitchHref}
			class="flex-shrink-0 rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
		>
			{langSwitchLabel}
		</a>
	</div>

	{#if expanded}
		<div class="space-y-4 border-t border-gray-100 px-3 pt-3 pb-3">
			{#each steps as step, index (step.captionKey)}
				<div class="flex gap-2">
					<span
						class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white"
					>
						{index + 1}
					</span>
					<div class="min-w-0 flex-1">
						<p class="text-xs text-gray-700">{t(lang, step.captionKey)}</p>
						<img src={step.image} alt="" class="mt-1.5 w-full max-w-[220px] rounded-md" />
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
