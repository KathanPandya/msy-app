<script lang="ts">
	import { t, type Lang } from '$lib/i18n';

	let {
		totalAmount = 0,
		amountPaid = 0,
		remainingAmount = 0,
		lang = undefined
	}: {
		totalAmount?: number;
		amountPaid?: number;
		remainingAmount?: number;
		lang?: Lang;
	} = $props();

	const isCredit = $derived(remainingAmount < 0);
	const isSettled = $derived(remainingAmount === 0 && totalAmount > 0);

	// Ring geometry — stroke-based donut, two segments (paid / balance).
	const size = 132;
	const stroke = 16;
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;

	const paidFraction = $derived(totalAmount === 0 ? 0 : Math.min(amountPaid / totalAmount, 1));
	const paidLength = $derived(circumference * paidFraction);

	const balanceColor = $derived(isCredit ? '#16a34a' : '#dc2626'); // green-600 / red-600
</script>

<div class="flex h-full items-center justify-center gap-6 rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
	<div class="relative flex-shrink-0" style={`width:${size}px;height:${size}px;`}>
		<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} class="-rotate-90">
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill="none"
				stroke="#e5e7eb"
				stroke-width={stroke}
			/>
			{#if amountPaid > 0}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke="#2563eb"
					stroke-width={stroke}
					stroke-linecap="round"
					stroke-dasharray={`${paidLength} ${circumference - paidLength}`}
				/>
			{/if}
		</svg>
		<div class="absolute inset-0 flex flex-col items-center justify-center">
			<span class="text-lg font-bold text-gray-900">
				{totalAmount === 0 ? 0 : Math.round(paidFraction * 100)}%
			</span>
			<span class="text-[10px] text-gray-500">{t(lang, 'paid')}</span>
		</div>
	</div>

	<div class="w-40 min-w-0 space-y-2 text-sm">
		<div class="flex items-center justify-between gap-2">
			<span class="flex items-center gap-1.5 text-gray-600">
				<span class="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
				{t(lang, 'total')}
			</span>
			<span class="font-semibold text-gray-900">₹{totalAmount}</span>
		</div>
		<div class="flex items-center justify-between gap-2">
			<span class="flex items-center gap-1.5 text-gray-600">
				<span class="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
				{t(lang, 'paid')}
			</span>
			<span class="font-semibold text-blue-600">₹{amountPaid}</span>
		</div>
		<div class="flex items-center justify-between gap-2">
			<span class="flex items-center gap-1.5 text-gray-600">
				<span class="h-2.5 w-2.5 rounded-full" style={`background:${balanceColor}`}></span>
				{isSettled ? t(lang, 'balance') : isCredit ? t(lang, 'credit') : t(lang, 'due')}
			</span>
			<span class="font-semibold" style={`color:${balanceColor}`}>
				₹{Math.abs(remainingAmount)}
			</span>
		</div>
	</div>
</div>
