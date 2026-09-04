<script lang="ts">
	import { formatDate } from '$lib/utilities/helperFunc';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import { t, type Lang } from '$lib/i18n';

	let {
		paymentRecords = [],
		deadMemberRecords = [],
		lang = undefined
	}: {
		paymentRecords?: Array<{ date: string; amount: number }>;
		deadMemberRecords?: Array<any>;
		lang?: Lang;
	} = $props();

	type YearBar = {
		year: number;
		paidTotal: number;
		contributionTotal: number;
		payments: Array<{ date: string; amount: number }>;
		deceased: Array<{ name: string; amount: number }>;
	};

	const years = $derived.by(() => {
		const byYear = new Map<number, YearBar>();

		function bucket(year: number) {
			if (!byYear.has(year)) {
				byYear.set(year, { year, paidTotal: 0, contributionTotal: 0, payments: [], deceased: [] });
			}
			return byYear.get(year)!;
		}

		for (const p of paymentRecords) {
			if (!p.date || !p.amount) continue;
			const year = new Date(p.date).getFullYear();
			const b = bucket(year);
			b.paidTotal += p.amount;
			b.payments.push({ date: p.date, amount: p.amount });
		}

		for (const d of deadMemberRecords) {
			const date = d?.deadMember?.date_of_death;
			const amount = d?.deadMember?.contribution_amount;
			if (!date || !amount) continue;
			const year = new Date(date).getFullYear();
			const b = bucket(year);
			b.contributionTotal += amount;
			b.deceased.push({
				name: formatMemberDisplay(d.userDetails?.name, d.userDetails?.member_id) || t(lang, 'member'),
				amount
			});
		}

		return [...byYear.values()].sort((a, b) => a.year - b.year);
	});

	const maxTotal = $derived(Math.max(1, ...years.flatMap((y) => [y.paidTotal, y.contributionTotal])));

	const barWidth = 20;
	const barGap = 4;
	const groupGap = 22;
	const height = 200;
	const padding = { top: 14, bottom: 26, left: 4, right: 4 };
	const plotHeight = height - padding.top - padding.bottom;

	const groupWidth = barWidth * 2 + barGap;
	const width = $derived(
		Math.max(280, padding.left + padding.right + years.length * (groupWidth + groupGap))
	);

	function barHeight(value: number) {
		return (value / maxTotal) * plotHeight;
	}

	function barX(i: number, type: 'paid' | 'contribution') {
		const gx = padding.left + groupGap / 2 + i * (groupWidth + groupGap);
		return type === 'paid' ? gx : gx + barWidth + barGap;
	}

	type Active = { year: number; type: 'paid' | 'contribution'; index: number };

	// Hover shows a preview (desktop); click/tap pins it open so it can be read
	// at leisure (and works on touch, which has no hover). Pinning wins.
	let hovered = $state<Active | null>(null);
	let pinned = $state<Active | null>(null);
	const active = $derived(pinned ?? hovered);

	// The bar and its floating tooltip aren't adjacent in the DOM, so leaving
	// the bar to move the mouse onto the tooltip (e.g. to read a long list)
	// fires the bar's mouseleave first. Debounce the clear so entering the
	// tooltip cancels it.
	let hoverClearTimer: ReturnType<typeof setTimeout> | null = null;

	function setHover(a: Active) {
		if (hoverClearTimer) clearTimeout(hoverClearTimer);
		hovered = a;
	}

	function clearHoverSoon() {
		if (hoverClearTimer) clearTimeout(hoverClearTimer);
		hoverClearTimer = setTimeout(() => (hovered = null), 150);
	}

	function cancelHoverClear() {
		if (hoverClearTimer) clearTimeout(hoverClearTimer);
	}

	function isSame(a: Active | null, year: number, type: string) {
		return a?.year === year && a?.type === type;
	}

	function togglePin(year: number, type: 'paid' | 'contribution', index: number) {
		pinned = isSame(pinned, year, type) ? null : { year, type, index };
	}

	function togglePinOnKey(e: KeyboardEvent, year: number, type: 'paid' | 'contribution', index: number) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			togglePin(year, type, index);
		}
	}

	// Desktop (mouse) relies on hover alone — clicking a bar there does
	// nothing. Touch has no hover, so tap is the only way in and must pin.
	let isTouchDevice = $state(false);
	$effect(() => {
		isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;
	});

	function handleBarClick(
		e: MouseEvent,
		year: number,
		type: 'paid' | 'contribution',
		index: number
	) {
		if (!isTouchDevice) return;
		togglePin(year, type, index);
		anchorTo(e.currentTarget as Element);
	}

	const activeYearData = $derived(years.find((y) => y.year === active?.year) ?? null);

	// The tooltip is portaled to <body> and positioned with `fixed`, anchored
	// to the hovered/tapped bar's real viewport rect — not to the SVG's own
	// coordinate space. That's what lets it float above the chart card's
	// clipping (a horizontally-scrolling container can't have "clip
	// horizontally, never vertically" via overflow-x alone) and sit above
	// everything else on the page regardless of z-index stacking contexts.
	let anchorEl = $state<Element | null>(null);
	let anchorRect = $state<{ left: number; top: number; width: number } | null>(null);

	function updateAnchorRect() {
		if (!anchorEl) {
			anchorRect = null;
			return;
		}
		const r = anchorEl.getBoundingClientRect();
		anchorRect = { left: r.left, top: r.top, width: r.width };
	}

	function anchorTo(el: Element) {
		anchorEl = el;
		updateAnchorRect();
	}

	// Keep the tooltip fully on-screen: on narrow phones, centering it on a
	// bar near either edge pushes half the box (and its text) off the
	// viewport. Clamp the box's own left edge, then slide the little pointer
	// triangle so it still lines up under the actual bar.
	const tooltipWidth = 208; // matches the w-52 class below
	const viewportMargin = 8;
	const tooltipBox = $derived.by(() => {
		if (!anchorRect) return null;
		const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : tooltipWidth;
		const center = anchorRect.left + anchorRect.width / 2;
		const maxLeft = Math.max(viewportMargin, viewportWidth - tooltipWidth - viewportMargin);
		const left = Math.min(Math.max(center - tooltipWidth / 2, viewportMargin), maxLeft);
		const arrowLeft = Math.min(Math.max(center - left, 12), tooltipWidth - 12);
		return { left, arrowLeft };
	});

	// Keep the tooltip glued to its bar while the page or the chart's own
	// horizontal scroller moves.
	$effect(() => {
		if (!active || !anchorEl) return;
		window.addEventListener('scroll', updateAnchorRect, true);
		window.addEventListener('resize', updateAnchorRect);
		return () => {
			window.removeEventListener('scroll', updateAnchorRect, true);
			window.removeEventListener('resize', updateAnchorRect);
		};
	});

	// Dismiss a pinned tooltip on an outside click/tap (the tooltip itself
	// lives outside rootEl once portaled, so it's checked separately).
	let rootEl = $state<HTMLDivElement | undefined>(undefined);
	let tooltipEl = $state<HTMLDivElement | undefined>(undefined);
	$effect(() => {
		if (!pinned) return;
		function onDocClick(e: MouseEvent) {
			const target = e.target as Node;
			if (rootEl?.contains(target) || tooltipEl?.contains(target)) return;
			pinned = null;
		}
		document.addEventListener('click', onDocClick, true);
		return () => document.removeEventListener('click', onDocClick, true);
	});

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}

	// Start scrolled to the most recent year, not the oldest.
	let scrollEl = $state<HTMLDivElement | undefined>(undefined);
	$effect(() => {
		if (years.length && scrollEl) {
			scrollEl.scrollLeft = scrollEl.scrollWidth;
		}
	});
</script>

<div class="rounded-lg border border-gray-200 bg-white p-3 sm:p-4" bind:this={rootEl}>
	<div class="mb-2 flex items-center justify-between">
		<h3 class="text-sm font-semibold text-gray-800">{t(lang, 'yearlyChartTitle')}</h3>
		<div class="flex items-center gap-3 text-[11px] text-gray-500">
			<span class="flex items-center gap-1"><span class="h-2 w-2 rounded-sm bg-blue-600"></span>{t(lang, 'paid')}</span>
			<span class="flex items-center gap-1"><span class="h-2 w-2 rounded-sm bg-red-600"></span>{t(lang, 'contributionLegend')}</span>
		</div>
	</div>

	{#if years.length === 0}
		<p class="py-8 text-center text-xs text-gray-500">{t(lang, 'noPaymentHistoryYet')}</p>
	{:else}
		<div class="overflow-x-auto" bind:this={scrollEl} onscroll={updateAnchorRect}>
			<svg viewBox={`0 0 ${width} ${height}`} {width} {height} class="block">
				<line
					x1={padding.left}
					y1={padding.top + plotHeight}
					x2={width - padding.right}
					y2={padding.top + plotHeight}
					stroke="#e5e7eb"
					stroke-width="1"
				/>

				{#each years as y, i}
					{@const paidH = barHeight(y.paidTotal)}
					{@const contribH = barHeight(y.contributionTotal)}
					{@const isPaidActive = isSame(active, y.year, 'paid')}
					{@const isContribActive = isSame(active, y.year, 'contribution')}

					<rect
						x={barX(i, 'paid')}
						y={padding.top + plotHeight - paidH}
						width={barWidth}
						height={Math.max(paidH, y.paidTotal > 0 ? 2 : 0)}
						rx="2"
						fill="#2563eb"
						opacity={isPaidActive ? 1 : 0.85}
						class="cursor-pointer"
						onmouseenter={(e) => {
							setHover({ year: y.year, type: 'paid', index: i });
							anchorTo(e.currentTarget as Element);
						}}
						onmouseleave={clearHoverSoon}
						onclick={(e) => handleBarClick(e, y.year, 'paid', i)}
						onkeydown={(e) => {
							togglePinOnKey(e, y.year, 'paid', i);
							anchorTo(e.currentTarget as Element);
						}}
						role="button"
						tabindex="0"
						aria-label={`${t(lang, 'paidInYear').replace('{year}', String(y.year))}: ₹${y.paidTotal}`}
					/>
					<rect
						x={barX(i, 'contribution')}
						y={padding.top + plotHeight - contribH}
						width={barWidth}
						height={Math.max(contribH, y.contributionTotal > 0 ? 2 : 0)}
						rx="2"
						fill="#dc2626"
						opacity={isContribActive ? 1 : 0.85}
						class="cursor-pointer"
						onmouseenter={(e) => {
							setHover({ year: y.year, type: 'contribution', index: i });
							anchorTo(e.currentTarget as Element);
						}}
						onmouseleave={clearHoverSoon}
						onclick={(e) => handleBarClick(e, y.year, 'contribution', i)}
						onkeydown={(e) => {
							togglePinOnKey(e, y.year, 'contribution', i);
							anchorTo(e.currentTarget as Element);
						}}
						role="button"
						tabindex="0"
						aria-label={`${t(lang, 'contributionAmountInYear').replace('{year}', String(y.year))}: ₹${y.contributionTotal}`}
					/>

					<text
						x={barX(i, 'paid') + barWidth + barGap / 2}
						y={height - padding.bottom + 14}
						font-size="10"
						fill="#6b7280"
						text-anchor="middle"
					>
						{y.year}
					</text>
				{/each}
			</svg>
		</div>
	{/if}
</div>

{#if active && activeYearData && anchorRect && tooltipBox}
	{@const isPaid = active.type === 'paid'}
	<div
		use:portal
		bind:this={tooltipEl}
		class="fixed z-[9999] w-52 rounded-md border border-gray-200 bg-white p-2 text-[11px] shadow-lg"
		style={`left:${tooltipBox.left}px; top:${anchorRect.top}px; transform:translateY(calc(-100% - 8px));`}
		onmouseenter={cancelHoverClear}
		onmouseleave={clearHoverSoon}
		role="tooltip"
	>
		{#if isPaid}
			<p class="mb-1 font-medium text-gray-900">
				{t(lang, 'paidInYear').replace('{year}', String(active.year))} · ₹{activeYearData.paidTotal}
			</p>
			{#if activeYearData.payments.length === 0}
				<p class="text-gray-500">{t(lang, 'noPayments')}</p>
			{:else}
				<ul class="space-y-0.5">
					{#each activeYearData.payments as p}
						<li class="flex justify-between gap-2 text-gray-600">
							<span>{formatDate(p.date)}</span>
							<span class="font-medium text-blue-600">₹{p.amount}</span>
						</li>
					{/each}
				</ul>
			{/if}
		{:else}
			<p class="mb-1 font-medium text-gray-900">
				{t(lang, 'contributionAmountInYear').replace('{year}', String(active.year))} · ₹{activeYearData.contributionTotal}
			</p>
			{#if activeYearData.deceased.length === 0}
				<p class="text-gray-500">{t(lang, 'noContributionsThisYear')}</p>
			{:else}
				<ul class="space-y-0.5">
					{#each activeYearData.deceased as d}
						<li class="flex justify-between gap-2 text-gray-600">
							<span class="truncate">{d.name}</span>
							<span class="flex-shrink-0 font-medium text-red-600">₹{d.amount}</span>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
		<div
			class="absolute top-full h-2 w-2 border-r border-b border-gray-200 bg-white"
			style={`left:${tooltipBox.arrowLeft}px; transform:translate(-50%, -50%) rotate(45deg);`}
		></div>
	</div>
{/if}

<style>
	/* Bars are tabindex="0" for keyboard access, which makes browsers draw a
	   focus ring on click too — only keyboard (Tab) focus should show one. */
	rect:focus {
		outline: none;
	}
	rect:focus-visible {
		outline: 2px solid #1d4ed8;
		outline-offset: 1px;
	}
</style>
