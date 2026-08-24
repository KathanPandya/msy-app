<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import paymentApi from '$lib/endpoints/paymentApi';
	import type { Payment } from '$lib/types/payment';
	import { formatDate, formatToYYYYMMDD } from '$lib/utilities/helperFunc';
	import { formatMemberId } from '$lib/utilities/memberId';
	import { ArrowLeft, Check, Info, X } from '@lucide/svelte';
	import { onMount } from 'svelte';

	// One color per family member — reused across the bar, the timeline dots
	// and the legend so the same person is visually traceable everywhere.
	const MEMBER_COLORS = [
		'bg-blue-500',
		'bg-emerald-500',
		'bg-amber-500',
		'bg-purple-500',
		'bg-pink-500',
		'bg-cyan-500',
		'bg-rose-500',
		'bg-indigo-500'
	];

	const screenshotId = page.params.id ?? '';
	// The screenshot list is the only place with the row's data (image url,
	// uploader) — there's no GET-by-id endpoint. Carried via nav state, same
	// pattern as /payins/update/[id].
	const screenshot = $state<Payment.Screenshot | null>((page.state as any).screenshot || null);

	let isLoading = $state(true);
	let loadError = $state('');
	let preview = $state<Payment.GeneratePreview | null>(null);

	type RowForm = {
		userId: string;
		member_id_num: number;
		name: string;
		isPayer: boolean;
		from_outstanding: number;
		from_equal_split: number;
		amount: string;
		date: string;
		paymentMode: string;
		paymentReference: string;
		receiptNumber: string;
		remarks: string;
		isCreating: boolean;
		isCreated: boolean;
		error: string;
	};

	let rows = $state<RowForm[]>([]);

	async function loadPreview() {
		isLoading = true;
		loadError = '';
		try {
			const res = await paymentApi.generateScreenshotPayment(screenshotId);
			preview = res.data;
			rows = res.data.settlements.map((s) => ({
				userId: s.userId,
				member_id_num: s.member_id_num,
				name: s.name,
				isPayer: s.isPayer,
				from_outstanding: s.from_outstanding,
				from_equal_split: s.from_equal_split,
				amount: String(s.amount),
				date: formatToYYYYMMDD(new Date()),
				paymentMode: 'upi',
				paymentReference: res.data.extracted.transaction_id || '',
				receiptNumber: '',
				remarks: '-',
				isCreating: false,
				isCreated: false,
				error: ''
			}));
		} catch (err: any) {
			loadError = err.response?.data?.message || 'Failed to generate payment preview.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		if (!screenshot) {
			goto('/payment-screenshots');
			return;
		}
		loadPreview();
	});

	async function createPayment(row: RowForm) {
		if (row.isCreated || row.isCreating || !screenshot) return;
		row.error = '';

		if (!row.amount || Number(row.amount) <= 0) {
			row.error = 'Amount is required';
			return;
		}
		if (!row.paymentReference.trim()) {
			row.error = 'Payment reference is required';
			return;
		}
		if (!row.paymentMode) {
			row.error = 'Payment mode is required';
			return;
		}

		row.isCreating = true;
		try {
			const payload: Payment.Create = {
				userId: row.userId,
				amount: Number(row.amount),
				date: formatToYYYYMMDD(row.date),
				payment_reference: row.paymentReference,
				payment_mode: row.paymentMode,
				payment_type: 'msy_contribution',
				reciept_number: row.receiptNumber.trim() || null,
				photo: screenshot.url,
				remarks: row.remarks,
				paymentScreenshotId: screenshot._id
			};
			await paymentApi.addPayment({ payload });
			row.isCreated = true;
			screenshot.hasPayments = true;
			screenshot.paymentsGeneratedCount = (screenshot.paymentsGeneratedCount || 0) + 1;
		} catch (err: any) {
			row.error = err.response?.data?.message || 'Failed to create payment.';
		} finally {
			row.isCreating = false;
		}
	}

	function handlePaymentModeChange(row: RowForm) {
		if (row.paymentMode === 'cash') row.paymentReference = 'N/A';
	}

	// ---------- Visual breakdown ----------
	let showBreakdown = $state(false);

	function colorFor(memberIdNum: number): string {
		if (!preview) return 'bg-gray-400';
		const idx = preview.family.findIndex((m) => m.member_id_num === memberIdNum);
		return MEMBER_COLORS[idx % MEMBER_COLORS.length] ?? 'bg-gray-400';
	}

	// Step-by-step: received -> each family member's due cleared in order ->
	// leftover -> split equally. Built straight from settlementOrder + the
	// per-settlement from_outstanding/from_equal_split the backend computed.
	const dueSteps = $derived.by(() => {
		if (!preview) return [];
		let running = preview.summary.amountReceived;
		return preview.summary.settlementOrder.map((memberIdNum) => {
			const s = preview!.settlements.find((x) => x.member_id_num === memberIdNum);
			const amount = s?.from_outstanding ?? 0;
			running -= amount;
			return {
				member_id_num: memberIdNum,
				name: s?.name ?? String(memberIdNum),
				amount,
				runningAfter: running,
				color: colorFor(memberIdNum)
			};
		});
	});

	const splitSteps = $derived.by(() => {
		if (!preview) return [];
		return preview.settlements
			.filter((s) => s.from_equal_split > 0)
			.map((s) => ({
				member_id_num: s.member_id_num,
				name: s.name,
				amount: s.from_equal_split,
				color: colorFor(s.member_id_num)
			}));
	});

	// Single horizontal bar, width-proportional: dues-clearing segments first
	// (in the order they were paid off), then the equal-split segments.
	const barSegments = $derived.by(() => {
		if (!preview) return [];
		const total = preview.summary.amountReceived || 1;
		return [...dueSteps, ...splitSteps].map((s) => ({
			...s,
			pct: Math.max((s.amount / total) * 100, s.amount > 0 ? 0.5 : 0)
		}));
	});

	const finalTotals = $derived.by(() => {
		if (!preview) return [];
		return preview.settlements.map((s) => ({
			member_id_num: s.member_id_num,
			name: s.name,
			amount: s.amount,
			reason: s.reason,
			color: colorFor(s.member_id_num)
		}));
	});

	// ---------- Single submit ----------
	const allCreated = $derived(rows.length > 0 && rows.every((r) => r.isCreated));
	let isCreatingAll = $state(false);
	let showCreateAllModal = $state(false);

	async function createAllPayments() {
		if (isCreatingAll) return;
		showCreateAllModal = true;
		isCreatingAll = true;
		try {
			for (const row of rows) {
				if (row.isCreated) continue;
				// One failing row (bad payment mode, a rejected API call, ...)
				// doesn't stop the rest — every row gets its own attempt, and its
				// own tick/cross in the modal.
				await createPayment(row);
			}
		} finally {
			isCreatingAll = false;
			if (allCreated) {
				setTimeout(() => goto('/payment-screenshots'), 1200);
			}
		}
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key !== 'Escape') return;
		if (showBreakdown) showBreakdown = false;
		else if (showCreateAllModal && !isCreatingAll) showCreateAllModal = false;
	}}
/>

<div class="mx-auto flex h-full max-w-6xl flex-col p-4 lg:overflow-hidden">
	<div class="mb-3 flex flex-shrink-0 items-center gap-2">
		<button
			type="button"
			onclick={() => goto('/payment-screenshots')}
			class="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
		>
			<ArrowLeft class="h-3.5 w-3.5" />
			Back to Screenshots
		</button>
	</div>

	{#if isLoading}
		<div
			class="flex flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm"
		>
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-2 text-sm text-gray-600">Reading screenshot...</p>
			</div>
		</div>
	{:else if loadError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4">
			<p class="text-sm text-red-800">{loadError}</p>
		</div>
	{:else if screenshot && preview}
		<div class="min-h-0 flex-1 gap-4 lg:flex lg:items-stretch lg:overflow-hidden">
			<!-- Screenshot — a fixed, non-scrolling column on desktop (not
				 `sticky`: that needs one unambiguous scrolling ancestor, and this
				 page's overflow chain made that ambiguous, so it just scrolled away
				 with the page instead of staying pinned). Only the cards column to
				 the right scrolls, so this stays visible the whole time. -->
			<div class="mb-4 flex-shrink-0 lg:mb-0 lg:w-72 lg:overflow-y-auto">
				<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
					<img src={screenshot.url} alt="Payment screenshot" class="w-full object-contain" />
				</div>
				<div class="mt-2 rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm">
					<div class="flex items-center justify-between">
						<span class="text-xs text-gray-500">Extracted Amount</span>
						<span class="font-medium text-gray-900"
							>₹{preview.extracted.amount.toLocaleString()}</span
						>
					</div>
					<div class="mt-1 flex items-center justify-between">
						<span class="text-xs text-gray-500">Transaction ID</span>
						<span class="font-medium text-gray-900">{preview.extracted.transaction_id}</span>
					</div>
					<div class="mt-1 flex items-center justify-between">
						<span class="text-xs text-gray-500">Paid By</span>
						<span class="font-medium text-gray-900"
							>{preview.payer.name} ({formatMemberId(preview.payer.member_id_num)})</span
						>
					</div>
				</div>
				{#if preview.duplicateWarning && preview.duplicatePayment}
					<div class="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
						<p class="text-xs text-yellow-800">
							This transaction ID already has a payment recorded on {formatDate(
								preview.duplicatePayment.date
							)}.
						</p>
					</div>
				{/if}
			</div>

			<!-- One payment form per family member, same fields as /payins/create.
				 The only scroll container at desktop (lg:overflow-y-auto) — the
				 screenshot column beside it never scrolls, so it's always visible. -->
			<div class="min-w-0 flex-1 space-y-4 lg:h-full lg:overflow-y-auto lg:pr-1">
				<div
					class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-blue-50 p-3 text-sm text-blue-900"
				>
					<span>
						₹{preview.summary.amountReceived.toLocaleString()} received — ₹{preview.summary.amountUsedToClearDues.toLocaleString()}
						cleared existing dues, ₹{preview.summary.leftoverAmount.toLocaleString()} split equally across
						{preview.summary.leftoverSplitAcross} family member{preview.summary
							.leftoverSplitAcross === 1
							? ''
							: 's'}.
					</span>
					<button
						type="button"
						onclick={() => (showBreakdown = true)}
						class="flex-shrink-0 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
					>
						Show Breakdown
					</button>
				</div>

				{#each rows as row}
					<Card title="{row.name} ({formatMemberId(row.member_id_num)}){row.isPayer ? ' — Payer' : ''}">
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							<Input
								id="amount-{row.userId}"
								label="Amount"
								type="number"
								bind:value={row.amount}
								required
								disabled={row.isCreated}
							/>
							<Input
								id="date-{row.userId}"
								label="Payment Date"
								type="date"
								bind:value={row.date}
								required
								disabled={row.isCreated}
							/>
							<Select
								id="mode-{row.userId}"
								label="Payment Mode"
								bind:value={row.paymentMode}
								options={APP_CONSTANTS.PAYMENT_MODES}
								onchange={() => handlePaymentModeChange(row)}
								required
								disabled={row.isCreated}
							/>
							<Input
								id="reference-{row.userId}"
								label="Reference Number"
								bind:value={row.paymentReference}
								disabled={row.isCreated || row.paymentMode === 'cash'}
							/>
							<Input
								id="receipt-{row.userId}"
								label="Receipt Number"
								bind:value={row.receiptNumber}
								disabled={row.isCreated}
							/>
							<div class="md:col-span-2 lg:col-span-1">
								<Input
									id="remarks-{row.userId}"
									label="Remarks"
									bind:value={row.remarks}
									disabled={row.isCreated}
								/>
							</div>
						</div>

						{#if row.error}
							<div class="mt-4 rounded-md bg-red-50 p-3">
								<p class="text-sm text-red-800">{row.error}</p>
							</div>
						{/if}
						{#if row.isCreated}
							<div class="mt-4 rounded-md bg-green-50 p-3">
								<p class="text-sm text-green-800">Payment created.</p>
							</div>
						{/if}
					</Card>
				{/each}

				<!-- One submit for every row — no batch-create endpoint, so this
					 loops through them client-side, calling addPayment once each. -->
				<div class="flex justify-end">
					<Button
						variant="success"
						disabled={allCreated || isCreatingAll}
						onclick={createAllPayments}
					>
						{#if isCreatingAll}
							<div class="flex items-center gap-2">
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
								></div>
								<span>Creating Payments...</span>
							</div>
						{:else if allCreated}
							All Payments Created
						{:else}
							Create All Payments
						{/if}
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Visual breakdown: wider than the standard Modal (needs room for the bar
	 chart + timeline), built inline with the same overlay/panel language. -->
{#if showBreakdown && preview}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => e.target === e.currentTarget && (showBreakdown = false)}
		onkeydown={(e) => e.key === 'Escape' && (showBreakdown = false)}
		role="dialog"
		aria-modal="true"
		aria-label="Payment Breakdown"
		tabindex="-1"
	>
		<div class="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
			<div
				class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3"
			>
				<h2 class="text-sm font-semibold text-gray-900">Payment Breakdown</h2>
				<button
					type="button"
					onclick={() => (showBreakdown = false)}
					class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					aria-label="Close"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
				<!-- Single bar: proportional width per rupee, dues-clearing segments
					 followed by the equal-split segments, in the order they happened. -->
				<div>
					<div class="flex h-8 w-full overflow-hidden rounded-md border border-gray-200">
						{#each barSegments as seg (seg.member_id_num + '-' + seg.amount)}
							<div
								class="{seg.color} flex items-center justify-center border-r border-white text-[10px] font-medium text-white last:border-r-0"
								style="width: {seg.pct}%"
								title="{seg.name} — ₹{seg.amount.toLocaleString()}"
							>
								{#if seg.pct > 8}₹{seg.amount.toLocaleString()}{/if}
							</div>
						{/each}
					</div>
					<div class="mt-1 flex justify-between text-[10px] text-gray-400">
						<span>₹0</span>
						<span>₹{preview.summary.amountReceived.toLocaleString()} received</span>
					</div>
				</div>

				<!-- Sequential timeline -->
				<div class="relative space-y-4 border-l-2 border-gray-200 pl-4">
					<!-- Received -->
					<div class="relative">
						<span
							class="absolute top-0.5 -left-[21px] h-3 w-3 rounded-full border-2 border-white bg-gray-900 ring-2 ring-gray-200"
						></span>
						<p class="text-xs font-medium text-gray-500">Received</p>
						<p class="text-base font-semibold text-gray-900">
							₹{preview.summary.amountReceived.toLocaleString()}
						</p>
					</div>

					<!-- Each family member's due cleared, in order -->
					{#each dueSteps as step}
						<div class="relative">
							<span
								class="{step.color} absolute top-0.5 -left-[21px] h-3 w-3 rounded-full border-2 border-white ring-2 ring-gray-200"
							></span>
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm text-gray-900">{step.name}'s due cleared</p>
								<p class="text-sm font-semibold text-red-600">−₹{step.amount.toLocaleString()}</p>
							</div>
							<p class="text-[11px] text-gray-400">Balance ₹{step.runningAfter.toLocaleString()}</p>
						</div>
					{/each}

					<!-- Leftover -->
					<div class="relative">
						<span
							class="absolute top-0.5 -left-[21px] h-3 w-3 rounded-full border-2 border-white bg-gray-900 ring-2 ring-gray-200"
						></span>
						<p class="text-xs font-medium text-gray-500">
							Leftover — split equally across {preview.summary.leftoverSplitAcross}
						</p>
						<p class="text-base font-semibold text-gray-900">
							₹{preview.summary.leftoverAmount.toLocaleString()}
						</p>
					</div>

					<!-- Split among family members -->
					{#each splitSteps as step}
						<div class="relative">
							<span
								class="{step.color} absolute top-0.5 -left-[21px] h-3 w-3 rounded-full border-2 border-white ring-2 ring-gray-200"
							></span>
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm text-gray-900">{step.name} — equal share</p>
								<p class="text-sm font-semibold text-green-700">+₹{step.amount.toLocaleString()}</p>
							</div>
						</div>
					{/each}
				</div>

				<!-- Final total per member -->
				<div class="rounded-lg border border-gray-200">
					<div class="border-b border-gray-200 bg-gray-50 px-3 py-1.5">
						<p class="text-[10px] font-medium tracking-wide text-gray-500 uppercase">
							Final amount per member
						</p>
					</div>
					<div class="divide-y divide-gray-100">
						{#each finalTotals as total}
							<div class="flex items-center justify-between px-3 py-1.5 text-sm">
								<span class="flex items-center gap-1.5 text-gray-800">
									<span class="{total.color} h-2.5 w-2.5 flex-shrink-0 rounded-full"></span>
									{total.name}
									<Tooltip text={total.reason} position="right">
										<Info class="h-3.5 w-3.5 text-gray-400" />
									</Tooltip>
								</span>
								<span class="font-semibold text-gray-900">₹{total.amount.toLocaleString()}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Create-all progress: one row per member, ticking off as each API call
	 finishes — same overlay/panel language as the breakdown popup. -->
{#if showCreateAllModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => e.target === e.currentTarget && !isCreatingAll && (showCreateAllModal = false)}
		onkeydown={(e) => e.key === 'Escape' && !isCreatingAll && (showCreateAllModal = false)}
		role="dialog"
		aria-modal="true"
		aria-label="Creating Payments"
		tabindex="-1"
	>
		<div class="flex max-h-[85vh] w-full max-w-sm flex-col rounded-lg bg-white shadow-xl">
			<div
				class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3"
			>
				<h2 class="text-sm font-semibold text-gray-900">Creating Payments</h2>
				{#if !isCreatingAll}
					<button
						type="button"
						onclick={() => (showCreateAllModal = false)}
						class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
						aria-label="Close"
					>
						<X class="h-5 w-5" />
					</button>
				{/if}
			</div>

			<div class="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
				{#each rows as row}
					<div
						class="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm"
					>
						<span class="min-w-0 truncate text-gray-900"
							>{row.name} ({formatMemberId(row.member_id_num)})</span
						>
						{#if row.isCreated}
							<span
								class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100"
							>
								<Check class="h-3.5 w-3.5 text-green-700" />
							</span>
						{:else if row.isCreating}
							<div
								class="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"
							></div>
						{:else if row.error}
							<span
								class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100"
								title={row.error}
							>
								<X class="h-3.5 w-3.5 text-red-700" />
							</span>
						{:else}
							<span class="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-gray-200"></span>
						{/if}
					</div>
				{/each}
			</div>

			{#if !isCreatingAll}
				<div class="flex-shrink-0 border-t border-gray-200 p-4">
					{#if allCreated}
						<div
							class="flex items-center justify-center gap-2 rounded-md bg-green-50 p-3 text-sm font-medium text-green-800"
						>
							<Check class="h-4 w-4" />
							All payments created — returning to Screenshots...
						</div>
					{:else}
						<div class="rounded-md bg-red-50 p-3 text-sm text-red-800">
							Some payments failed. Fix the highlighted fields and try again.
						</div>
						<div class="mt-3 flex justify-end">
							<Button variant="secondary" size="sm" onclick={() => (showCreateAllModal = false)}>
								Close
							</Button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}
