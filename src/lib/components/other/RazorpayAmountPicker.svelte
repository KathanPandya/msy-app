<script lang="ts">
	import { fade } from 'svelte/transition';
	import { X } from '@lucide/svelte';
	import { t, type Lang } from '$lib/i18n';

	let {
		lang = undefined,
		dueAmount,
		onpay,
		onclose
	}: {
		lang?: Lang;
		// Family due in rupees; 0 when in credit / settled.
		dueAmount: number;
		onpay: (amount: number) => void;
		onclose: () => void;
	} = $props();

	// Captured once so the due pill keeps offering the original amount.
	const due = Math.max(0, Math.round(dueAmount));

	let amountInput = $state(due > 0 ? String(due) : '');
	const amount = $derived(Math.max(0, Math.floor(Number(amountInput) || 0)));

	// Partial-payment pills scale with the due; small dues are expected in full.
	function partialAmounts(d: number): number[] {
		if (d <= 0) return [500, 1000, 2000];
		if (d > 2000) return [1000, 1500];
		if (d > 1000) return [500, 750];
		if (d > 500) return [100, 200, 500];
		return [];
	}

	const pills = $derived.by(() => {
		const partials = partialAmounts(due).map((v) => ({ label: `₹${v}`, value: v }));
		if (due > 0 && partials.length)
			return [{ label: `${t(lang, 'due')} ₹${due}`, value: due }, ...partials];
		return partials;
	});
</script>

<div
	transition:fade={{ duration: 150 }}
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
	role="dialog"
	aria-modal="true"
	aria-label={t(lang, 'amountToPay')}
	tabindex="-1"
	onclick={(e) => e.target === e.currentTarget && onclose()}
	onkeydown={(e) => e.key === 'Escape' && onclose()}
>
	<div
		class="w-full max-w-sm rounded-t-xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg sm:rounded-xl sm:pb-4"
	>
		<div class="mb-3 flex items-center justify-between">
			<p class="text-sm font-semibold text-gray-900">{t(lang, 'amountToPay')}</p>
			<button
				type="button"
				onclick={onclose}
				class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
				aria-label={t(lang, 'close')}
			>
				<X class="h-4 w-4" />
			</button>
		</div>

		<label class="relative block">
			<span
				class="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-gray-500"
				>₹</span
			>
			<input
				type="number"
				min="1"
				step="1"
				inputmode="numeric"
				value={amountInput}
				oninput={(e) => (amountInput = (e.target as HTMLInputElement).value)}
				placeholder={t(lang, 'amountToPay')}
				class="h-11 w-full rounded-md border border-gray-300 py-0 pr-2 pl-6 text-base font-medium sm:h-10 sm:text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
		</label>
		{#if due > 0}
			<p class="mt-1 text-[11px] text-gray-500">{t(lang, 'changeAmountHint')}</p>
		{/if}

		{#if pills.length}
			<p class="mt-2 text-[11px] font-medium text-gray-500">{t(lang, 'quickSelectAmount')}</p>
			<div class="mt-1 flex flex-wrap gap-1.5">
				{#each pills as pill (pill.label)}
					<button
						type="button"
						onclick={() => (amountInput = String(pill.value))}
						class={`rounded-full border px-3 py-1 text-xs font-medium ${
							amount === pill.value
								? 'border-blue-600 bg-blue-50 text-blue-700'
								: 'border-gray-300 text-gray-600 hover:bg-gray-50'
						}`}
					>
						{pill.label}
					</button>
				{/each}
			</div>
		{/if}

		<button
			type="button"
			onclick={() => onpay(amount)}
			disabled={amount < 1}
			class="mt-3 flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{t(lang, 'pay')}{amount > 0 ? ` ₹${amount}` : ''}
		</button>
	</div>
</div>
