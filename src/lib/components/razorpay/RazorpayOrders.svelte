<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import RowActionsMenu from '$lib/components/ui/RowActionsMenu.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import ordersApi from '$lib/endpoints/ordersApi';
	import { memberListStore } from '$lib/stores/memberListStore';
	import type { Order } from '$lib/types/order';
	import { formatDate, formatToYYYYMMDD } from '$lib/utilities/helperFunc';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import { LayoutGrid, RefreshCw, Rows3 } from '@lucide/svelte';
	import { onMount } from 'svelte';

	// A `settling` order this old means the server died mid-recording
	// (payment-flow.md §6.1) — it needs the same manual handling as `unsettled`.
	const STALE_SETTLING_MS = 10 * 60 * 1000;

	type View = 'action' | 'failed' | 'settled' | 'all';
	const VIEWS: { key: View; label: string }[] = [
		{ key: 'action', label: 'Needs action' },
		{ key: 'failed', label: 'Failed' },
		{ key: 'settled', label: 'Settled' },
		{ key: 'all', label: 'All orders' }
	];

	let view = $state<View>('action');
	let openMenuId = $state<string | null>(null);
	let orders = $state<Order.Data[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let density = $state<'comfortable' | 'compact'>(
		(typeof localStorage !== 'undefined' &&
			(localStorage.getItem('app_table_density') as 'comfortable' | 'compact')) ||
			'compact'
	);

	function toggleDensity() {
		density = density === 'comfortable' ? 'compact' : 'comfortable';
		localStorage.setItem('app_table_density', density);
	}

	function isStaleSettling(o: Order.Data) {
		return o.status === 'settling' && Date.now() - new Date(o.updatedAt).getTime() > STALE_SETTLING_MS;
	}

	function needsAction(o: Order.Data) {
		return o.status === 'unsettled' || isStaleSettling(o);
	}

	async function loadOrders() {
		isLoading = true;
		errorMessage = '';
		try {
			if (view === 'action') {
				const [unsettled, settling] = await Promise.all([
					ordersApi.fetchOrders({ status: 'unsettled' }),
					ordersApi.fetchOrders({ status: 'settling' })
				]);
				orders = [...unsettled.data, ...settling.data.filter(isStaleSettling)].sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
			} else {
				const res = await ordersApi.fetchOrders(view === 'all' ? {} : { status: view });
				orders = res.data ?? [];
			}
		} catch (err: any) {
			orders = [];
			errorMessage = err?.response?.data?.message || 'Failed to load orders.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadOrders();
		if ($memberListStore.members.length === 0) memberListStore.fetchAllMembers().catch(() => {});
	});

	// ---------- Member lookup ----------
	// Orders carry a bare `userId`; resolve names from the cached member list.
	const membersById = $derived(new Map($memberListStore.members.map((m) => [m._id, m])));

	function orderUserId(o: Order.Data): string {
		const u = o.userId as any;
		return typeof u === 'object' && u ? u._id : u;
	}

	function memberLabel(o: Order.Data): string {
		const m = membersById.get(orderUserId(o));
		return m ? formatMemberDisplay(m.name, m.member_id) : orderUserId(o);
	}

	// ---------- Table ----------
	const pill =
		'display:inline-block;text-align:center;padding:0.125rem 0.5rem;border-radius:999px;font-weight:600;font-size:0.75rem;';

	function statusPill(o: Order.Data): string {
		const stale = isStaleSettling(o);
		const label = stale ? 'Stuck settling' : o.status.charAt(0).toUpperCase() + o.status.slice(1);
		if (o.status === 'settled')
			return `<span style="${pill}color:oklch(45% 0.13 150);background:oklch(95% 0.05 150)">${label}</span>`;
		if (o.status === 'unsettled' || o.status === 'failed' || stale)
			return `<span style="${pill}color:oklch(50% 0.2 27);background:oklch(95% 0.045 27)">${label}</span>`;
		if (o.status === 'paid' || o.status === 'settling')
			return `<span style="${pill}color:oklch(50% 0.12 75);background:oklch(95% 0.05 85)">${label}</span>`;
		return `<span style="${pill}color:oklch(45% 0.01 264);background:oklch(95% 0.005 264)">${label}</span>`;
	}

	const typeLabel = (key: string) =>
		APP_CONSTANTS.PAYMENT_TYPES.find((t) => t.key === key)?.label || key;

	const columns = $derived.by(() => {
		const base: any[] = [
			{ key: 'member', label: 'Member', width: 200 },
			{ key: 'amount', label: 'Amount', width: 100 },
			{ key: 'type', label: 'Type', width: 120 },
			{
				key: 'status',
				label: 'Status',
				width: 120,
				render: (_v: any, row: any) => statusPill(row.raw)
			}
		];
		if (view === 'failed')
			return [
				...base,
				{ key: 'reason', label: 'Failure reason', width: 240, tooltip: true },
				{ key: 'created', label: 'Created', width: 110 }
			];
		if (view === 'settled')
			return [
				...base,
				{ key: 'paymentId', label: 'Payment ID', width: 190 },
				{ key: 'settledAt', label: 'Settled on', width: 110 },
				{ key: 'settledBy', label: 'Settled by', width: 140 }
			];
		if (view === 'action')
			return [
				...base,
				{ key: 'paymentId', label: 'Payment ID', width: 190 },
				{ key: 'paidAt', label: 'Paid on', width: 110 },
				{ key: 'error', label: 'Settlement error', width: 240, tooltip: true }
			];
		return [
			...base,
			{ key: 'paymentId', label: 'Payment ID', width: 190 },
			{ key: 'created', label: 'Created', width: 110 },
			{ key: 'error', label: 'Reason / error', width: 240, tooltip: true }
		];
	});

	const tableData = $derived(
		orders.map((o) => ({
			_id: o._id,
			member: memberLabel(o),
			amount: `₹${(o.amount / 100).toLocaleString()}`,
			type: typeLabel(o.payment_type),
			status: '',
			paymentId: o.razorpay_payment_id || '-',
			paidAt: formatDate(o.paid_at),
			created: formatDate(o.createdAt),
			settledAt: formatDate(o.settled_at),
			settledBy: o.settled_by || '-',
			reason: o.failure_reason || '-',
			error: o.settlement_error || o.failure_reason || '-',
			raw: o
		}))
	);

	function rowActions(o: Order.Data) {
		const actions: { label: string; onclick: () => void }[] = [];
		if (needsAction(o)) {
			actions.push({ label: 'Create payment', onclick: () => createPaymentFor(o) });
			actions.push({ label: 'Mark settled', onclick: () => openMarkSettled(o) });
		}
		actions.push({
			label: 'View member',
			onclick: () => goto(`/members/view/${orderUserId(o)}`)
		});
		return actions;
	}

	// ---------- Manual settle, step 1: create the payment record(s) ----------
	function createPaymentFor(o: Order.Data) {
		const m = membersById.get(orderUserId(o));
		goto('/payins/create', {
			state: {
				prefill: {
					memberId: orderUserId(o),
					memberSearchQuery: m ? formatMemberDisplay(m.name, m.member_id) : '',
					amount: o.amount / 100,
					referenceNumber: o.razorpay_payment_id ?? '',
					paymentMode: o.payment_method ?? 'upi',
					paymentType: o.payment_type,
					paymentDate: formatToYYYYMMDD(o.paid_at ?? o.createdAt),
					description: `Razorpay order ${o.razorpay_order_id}`,
					returnTo: '/razorpay'
				}
			}
		});
	}

	// ---------- Manual settle, step 2: mark the order settled ----------
	let settlingOrder = $state<Order.Data | null>(null);
	let settleRemarks = $state('');
	let settleLoading = $state(false);
	let settleError = $state('');

	function openMarkSettled(o: Order.Data) {
		settlingOrder = o;
		settleRemarks = '';
		settleError = '';
	}

	async function confirmMarkSettled() {
		if (!settlingOrder) return;
		settleLoading = true;
		settleError = '';
		try {
			await ordersApi.markSettled({ id: settlingOrder._id, remarks: settleRemarks.trim() });
			settlingOrder = null;
			loadOrders();
		} catch (err: any) {
			settleError = err?.response?.data?.message || 'Failed to mark order settled.';
		} finally {
			settleLoading = false;
		}
	}
</script>

<div class="flex h-full flex-col">
	<div class="mb-1.5 flex-shrink-0 space-y-1.5">
		<div class="flex items-center gap-2">
			<select
				bind:value={view}
				onchange={loadOrders}
				class="w-[140px] shrink-0 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
			>
				{#each VIEWS as v (v.key)}
					<option value={v.key}>{v.label}</option>
				{/each}
			</select>
			<button
				type="button"
				onclick={loadOrders}
				disabled={isLoading}
				title="Refresh"
				class="rounded-md border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
			>
				<RefreshCw class={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
			</button>
		</div>

		{#if !isLoading && orders.length > 0}
			<div class="flex items-center justify-between px-1">
				<p class="text-xs text-gray-700 sm:text-sm">
					{orders.length} order{orders.length === 1 ? '' : 's'}
				</p>
				<button
					type="button"
					onclick={toggleDensity}
					title={density === 'comfortable'
						? 'Switch to compact view'
						: 'Switch to comfortable view'}
					class="hidden items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:flex"
				>
					{#if density === 'comfortable'}
						<Rows3 class="h-3.5 w-3.5" />
						<span>Compact</span>
					{:else}
						<LayoutGrid class="h-3.5 w-3.5" />
						<span>Comfortable</span>
					{/if}
				</button>
			</div>
		{/if}

		{#if errorMessage}
			<p class="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
				{errorMessage}
			</p>
		{/if}
	</div>

	<div class="min-h-0 flex-1">
		{#if isLoading}
			<div
				class="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm"
			>
				<div class="text-center">
					<div
						class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<p class="mt-2 text-sm text-gray-600">Loading orders...</p>
				</div>
			</div>
		{:else if tableData.length === 0}
			<div
				class="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
			>
				<h3 class="text-sm font-medium text-gray-900">No orders found</h3>
				<p class="mt-1 text-center text-sm text-gray-500">
					{view === 'action'
						? 'Nothing needs manual settlement right now'
						: 'Razorpay orders will appear here'}
				</p>
			</div>
		{:else}
			<!-- Mobile: dense rows -->
			<div class="h-full overflow-y-auto sm:hidden">
				<div class="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
					{#each orders as o (o._id)}
						<div class="flex items-start gap-2 px-2.5 py-1.5">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="min-w-0 flex-1 truncate text-xs font-medium text-gray-900"
										>{memberLabel(o)}</span
									>
									<span class="shrink-0 text-xs font-semibold text-gray-900"
										>₹{(o.amount / 100).toLocaleString()}</span
									>
								</div>
								<div class="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
									{@html statusPill(o)}
									<span class="truncate">{typeLabel(o.payment_type)}</span>
									<span class="ml-auto shrink-0"
										>{formatDate(o.status === 'settled' ? o.settled_at : (o.paid_at ?? o.createdAt))}</span
									>
								</div>
								{#if o.settlement_error || o.failure_reason}
									<p class="mt-0.5 truncate text-[11px] text-red-600">
										{o.settlement_error || o.failure_reason}
									</p>
								{/if}
							</div>
							<RowActionsMenu
								actions={rowActions(o)}
								open={openMenuId === o._id}
								onToggle={() => (openMenuId = openMenuId === o._id ? null : o._id)}
								onClose={() => (openMenuId = null)}
							/>
						</div>
					{/each}
				</div>
			</div>

			<!-- Desktop / tablet -->
			<div class="hidden h-full sm:block">
				<Table {columns} data={tableData} rowMenu={(row) => rowActions(row.raw)} {density} />
			</div>
		{/if}
	</div>
</div>

<Modal open={!!settlingOrder} onClose={() => (settlingOrder = null)} title="Mark order settled">
	{#if settlingOrder}
		<div class="space-y-3 text-sm">
			<div class="grid grid-cols-2 gap-3 rounded-md border border-gray-200 p-2.5">
				<div>
					<p class="text-xs text-gray-500">Member</p>
					<p class="font-medium text-gray-900">{memberLabel(settlingOrder)}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Amount</p>
					<p class="font-medium text-gray-900">
						₹{(settlingOrder.amount / 100).toLocaleString()}
					</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Payment ID</p>
					<p class="font-medium break-all text-gray-900">
						{settlingOrder.razorpay_payment_id || '-'}
					</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Paid on</p>
					<p class="font-medium text-gray-900">{formatDate(settlingOrder.paid_at)}</p>
				</div>
			</div>
			<p class="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
				Marking settled does not create payments. Create the payment record(s) totalling ₹{(
					settlingOrder.amount / 100
				).toLocaleString()} first.
			</p>
			<Input
				id="settle-remarks"
				label="Remarks"
				bind:value={settleRemarks}
				disabled={settleLoading}
			/>
			{#if settleError}
				<p class="text-xs text-red-600">{settleError}</p>
			{/if}
			<div class="flex justify-end gap-2 border-t border-gray-200 pt-3">
				<Button
					variant="secondary"
					size="sm"
					onclick={() => (settlingOrder = null)}
					disabled={settleLoading}>Cancel</Button
				>
				<Button variant="primary" size="sm" onclick={confirmMarkSettled} disabled={settleLoading}>
					{settleLoading ? 'Saving...' : 'Mark settled'}
				</Button>
			</div>
		</div>
	{/if}
</Modal>
