<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import ImageViewer from '$lib/components/ui/ImageViewer.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import paymentApi from '$lib/endpoints/paymentApi';
	import type { Payment } from '$lib/types/payment';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { formatString } from '$lib/utilities/stringUtils';
	import { LayoutGrid, Rows3 } from '@lucide/svelte';
	import { onMount } from 'svelte';

	const backendMapping: Record<string, string> = APP_CONSTANTS.BACKEND_MAPPING;

	let screenshots = $state<Payment.ScreenshotList>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let voidFilter = $state<'' | 'active' | 'voided'>('');
	let density = $state<'comfortable' | 'compact'>(
		(typeof localStorage !== 'undefined' &&
			(localStorage.getItem('app_table_density') as 'comfortable' | 'compact')) ||
			'compact'
	);

	function toggleDensity() {
		density = density === 'comfortable' ? 'compact' : 'comfortable';
		localStorage.setItem('app_table_density', density);
	}

	function uploaderName(user: Payment.ScreenshotUser): string {
		const fullName = [user.first_name, user.middle_name, user.surname].filter(Boolean).join(' ');
		return fullName || user.username || '-';
	}

	function escapeHtml(value: string): string {
		return value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	async function loadScreenshots() {
		isLoading = true;
		errorMessage = '';
		try {
			const params: { void?: boolean } = {};
			if (voidFilter === 'active') params.void = false;
			else if (voidFilter === 'voided') params.void = true;
			const res = await paymentApi.getScreenshots(params);
			screenshots = res.data;
		} catch (err: any) {
			errorMessage = err.response?.data?.message || 'Failed to load screenshots.';
			screenshots = [];
		} finally {
			isLoading = false;
		}
	}

	onMount(loadScreenshots);

	// Lightbox for the screenshot image
	let lightboxUrl = $state('');
	let lightboxOpen = $state(false);
	function openLightbox(url: string) {
		lightboxUrl = url;
		lightboxOpen = true;
	}
	if (typeof window !== 'undefined') {
		(window as any).openScreenshotImage = (url: string) => openLightbox(decodeURIComponent(url));
	}

	function statusBadge(s: Payment.Screenshot): string {
		if (s.void) {
			return `<span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800" title="${escapeHtml(s.voidReason || '')}">Voided</span>`;
		}
		if (s.hasPayments) {
			return `<span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Payments (${s.paymentsGeneratedCount})</span>`;
		}
		return `<span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">Pending</span>`;
	}

	const columns = [
		{
			key: 'thumbnail',
			label: 'Screenshot',
			width: 72,
			render: (_value: any, row: any) => `
				<img
					src="${escapeHtml(row.raw.url)}"
					alt="Payment screenshot"
					class="h-9 w-9 cursor-pointer rounded-md object-cover"
					onclick="window.openScreenshotImage('${encodeURIComponent(row.raw.url)}')"
				/>
			`
		},
		{ key: 'uploader', label: 'Uploaded By' },
		{ key: 'date', label: 'Uploaded On' },
		{
			key: 'status',
			label: 'Status',
			render: (_value: any, row: any) => statusBadge(row.raw)
		}
	];

	const tableData = $derived(
		screenshots.map((s) => ({
			_id: s._id,
			thumbnail: '',
			uploader: uploaderName(s.userId),
			date: formatDate(s.createdAt),
			status: '',
			raw: s
		}))
	);

	function screenshotActions(s: Payment.Screenshot) {
		const actions: { label: string; onclick: () => void; danger?: boolean }[] = [];
		if (s.hasPayments) {
			actions.push({
				label: `View Payments (${s.paymentsGeneratedCount})`,
				onclick: () => openPayments(s)
			});
		}
		if (!s.void && !s.hasPayments) {
			actions.push({ label: 'Generate', onclick: () => goToGenerate(s) });
		}
		if (s.void) {
			actions.push({ label: 'Unvoid', onclick: () => unvoid(s) });
		} else if (!s.hasPayments) {
			actions.push({ label: 'Void', onclick: () => openVoid(s), danger: true });
		}
		return actions;
	}

	// Generate lives on its own page (not a modal) so the screenshot stays
	// visible next to the payment forms the admin fills in.
	function goToGenerate(row: Payment.Screenshot) {
		// history.pushState can't structured-clone a $state proxy — snapshot it
		// to a plain object first.
		goto(`/payment-screenshots/${row._id}/generate`, {
			state: { screenshot: $state.snapshot(row) }
		});
	}

	// ---------- Void flow ----------
	let voidingRow = $state<Payment.Screenshot | null>(null);
	let voidReason = $state('');
	let voidLoading = $state(false);
	let voidError = $state('');

	function openVoid(row: Payment.Screenshot) {
		voidingRow = row;
		voidReason = '';
		voidError = '';
	}

	function closeVoid() {
		voidingRow = null;
	}

	async function confirmVoid() {
		if (!voidingRow) return;
		if (!voidReason.trim()) {
			voidError = 'Reason is required';
			return;
		}
		voidLoading = true;
		voidError = '';
		try {
			await paymentApi.voidScreenshot({ screenshotId: voidingRow._id, reason: voidReason.trim() });
			voidingRow.void = true;
			voidingRow.voidReason = voidReason.trim();
			closeVoid();
		} catch (err: any) {
			voidError = err.response?.data?.message || 'Failed to void screenshot.';
		} finally {
			voidLoading = false;
		}
	}

	async function unvoid(row: Payment.Screenshot) {
		errorMessage = '';
		try {
			await paymentApi.unvoidScreenshot(row._id);
			row.void = false;
			row.voidReason = '';
			row.voidedAt = null;
			row.voidedBy = null;
		} catch (err: any) {
			errorMessage = err.response?.data?.message || 'Failed to unvoid screenshot.';
		}
	}

	// ---------- View linked payments ----------
	let viewingPaymentsRow = $state<Payment.Screenshot | null>(null);
	let viewingPaymentsList = $state<Payment.ScreenshotPaymentList>([]);
	let viewingPaymentsLoading = $state(false);
	let viewingPaymentsError = $state('');

	async function openPayments(row: Payment.Screenshot) {
		viewingPaymentsRow = row;
		viewingPaymentsList = [];
		viewingPaymentsError = '';
		viewingPaymentsLoading = true;
		try {
			const res = await paymentApi.getScreenshotPayments(row._id);
			viewingPaymentsList = res.data;
		} catch {
			viewingPaymentsError = 'Failed to load payments for this screenshot.';
		} finally {
			viewingPaymentsLoading = false;
		}
	}

	function closePayments() {
		viewingPaymentsRow = null;
	}

	// ---------- View a single payment's full details ----------
	let viewingPaymentOpen = $state(false);
	let viewingPayment = $state<Payment.Get | null>(null);
	let viewingPaymentLoading = $state(false);
	let viewingPaymentError = $state('');

	async function openPaymentDetail(payment: Payment.ScreenshotPayment) {
		viewingPaymentOpen = true;
		viewingPayment = null;
		viewingPaymentError = '';
		viewingPaymentLoading = true;
		try {
			const res = await paymentApi.getPaymentById(payment.paymentId);
			viewingPayment = res.data;
		} catch {
			viewingPaymentError = 'Failed to load payment details.';
		} finally {
			viewingPaymentLoading = false;
		}
	}

	function closePaymentDetail() {
		viewingPaymentOpen = false;
		viewingPayment = null;
		viewingPaymentError = '';
	}

	function editPaymentDetail() {
		if (!viewingPayment) return;
		goto(`/payins/update/${viewingPayment._id}`, {
			state: {
				returnTo: page.url.pathname + page.url.search
			}
		});
		closePaymentDetail();
	}
</script>

<div class="flex h-full flex-col">
	<div class="mb-1.5 flex-shrink-0 space-y-1.5">
		<div class="flex items-center gap-2">
			<select
				bind:value={voidFilter}
				onchange={loadScreenshots}
				class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
			>
				<option value="">All screenshots</option>
				<option value="active">Active</option>
				<option value="voided">Voided</option>
			</select>
		</div>

		{#if !isLoading && screenshots.length > 0}
			<div class="flex items-center justify-between px-1">
				<p class="text-sm text-gray-700">
					{screenshots.length} screenshot{screenshots.length === 1 ? '' : 's'}
				</p>
				<button
					type="button"
					onclick={toggleDensity}
					title={density === 'comfortable'
						? 'Switch to compact view'
						: 'Switch to comfortable view'}
					class="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
				>
					{#if density === 'comfortable'}
						<Rows3 class="h-3.5 w-3.5" />
						<span class="hidden sm:inline">Compact</span>
					{:else}
						<LayoutGrid class="h-3.5 w-3.5" />
						<span class="hidden sm:inline">Comfortable</span>
					{/if}
				</button>
			</div>
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
					<p class="mt-2 text-sm text-gray-600">Loading screenshots...</p>
				</div>
			</div>
		{:else if tableData.length === 0}
			<div
				class="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
			>
				<svg class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No screenshots found</h3>
				<p class="mt-1 text-center text-sm text-gray-500">
					{voidFilter
						? 'Try a different filter'
						: 'Member-uploaded payment screenshots will appear here'}
				</p>
				{#if errorMessage}
					<div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
						<p class="text-sm text-red-800">{errorMessage}</p>
					</div>
				{/if}
			</div>
		{:else}
			<Table {columns} data={tableData} rowMenu={(row) => screenshotActions(row.raw)} {density} />
		{/if}
	</div>
</div>

<!-- Screenshot lightbox -->
<ImageViewer src={lightboxUrl} thumbnail={false} bind:open={lightboxOpen} />

<!-- Void confirmation modal -->
<Modal open={!!voidingRow} onClose={closeVoid} title="Void Screenshot">
	<div class="space-y-3 text-sm">
		<p class="text-gray-700">
			This marks the screenshot as void and hides it from active work. Already-created payments, if
			any, are not affected.
		</p>
		<Input
			id="void-reason"
			label="Reason"
			bind:value={voidReason}
			required
			disabled={voidLoading}
		/>
		{#if voidError}
			<p class="text-xs text-red-600">{voidError}</p>
		{/if}
		<div class="flex justify-end gap-2 border-t border-gray-200 pt-3">
			<Button variant="secondary" size="sm" onclick={closeVoid} disabled={voidLoading}
				>Cancel</Button
			>
			<Button variant="danger" size="sm" onclick={confirmVoid} disabled={voidLoading}>
				{voidLoading ? 'Voiding...' : 'Void'}
			</Button>
		</div>
	</div>
</Modal>

<!-- Linked payments modal -->
<Modal open={!!viewingPaymentsRow} onClose={closePayments} title="Payments Generated">
	{#if viewingPaymentsLoading}
		<div class="flex items-center justify-center py-8">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
			></div>
		</div>
	{:else if viewingPaymentsError}
		<p class="text-sm text-red-600">{viewingPaymentsError}</p>
	{:else if viewingPaymentsList.length === 0}
		<p class="text-sm text-gray-500">No payments found.</p>
	{:else}
		<div class="space-y-2 text-sm">
			{#each viewingPaymentsList as payment}
				<div
					class="flex items-center justify-between gap-2 rounded-md border border-gray-200 p-2.5"
				>
					<div class="min-w-0">
						<p class="truncate font-medium text-gray-900">{payment.name}</p>
						<p class="text-xs text-gray-500">{payment.username}</p>
					</div>
					<div class="flex flex-shrink-0 items-center gap-3">
						<div class="text-right">
							<p class="font-medium text-gray-900">₹{payment.amount.toLocaleString()}</p>
							<p class="text-xs text-gray-500">{formatDate(payment.date)}</p>
						</div>
						<button
							type="button"
							onclick={() => openPaymentDetail(payment)}
							class="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
						>
							View
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</Modal>

<!-- Full payment detail — same modal as /members/view/[id]/payments (Payments.svelte) -->
<Modal open={viewingPaymentOpen} onClose={closePaymentDetail} title="Payment Details">
	{#if viewingPaymentLoading}
		<div class="flex items-center justify-center py-8">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
			></div>
		</div>
	{:else if viewingPaymentError}
		<p class="text-sm text-red-600">{viewingPaymentError}</p>
	{:else if viewingPayment}
		<div class="space-y-4 text-sm">
			<div class="grid grid-cols-2 gap-3">
				<div>
					<p class="text-xs text-gray-500">Amount</p>
					<p class="font-medium text-gray-900">₹{viewingPayment.amount}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Date</p>
					<p class="font-medium text-gray-900">{formatDate(viewingPayment.date)}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Payment Mode</p>
					<p class="font-medium text-gray-900">
						{formatString(viewingPayment.payment_mode, ['capitalize-first']) || '-'}
					</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Payment Type</p>
					<p class="font-medium text-gray-900">
						{backendMapping[viewingPayment.payment_type] || '-'}
					</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Reference Number</p>
					<p class="font-medium text-gray-900">{viewingPayment.payment_reference || '-'}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Receipt Number</p>
					<p class="font-medium text-gray-900">{viewingPayment.reciept_number || '-'}</p>
				</div>
			</div>

			{#if viewingPayment.remarks}
				<div>
					<p class="text-xs text-gray-500">Description</p>
					<p class="font-medium text-gray-900">{viewingPayment.remarks}</p>
				</div>
			{/if}

			{#if viewingPayment.photo}
				<div>
					<p class="mb-1 text-xs text-gray-500">Receipt</p>
					<ImageViewer src={viewingPayment.photo} alt="Payment Receipt" thumbnailSize="medium" />
				</div>
			{/if}
		</div>

		<div class="mt-4 flex justify-end border-t border-gray-200 pt-3">
			<Button variant="primary" size="sm" onclick={editPaymentDetail}>Edit</Button>
		</div>
	{/if}
</Modal>
