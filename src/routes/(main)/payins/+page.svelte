<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import ImageViewer from '$lib/components/ui/ImageViewer.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { APP_CONSTANTS, MAX_PAGE_SIZE } from '$lib/constants/app-constants';
	import paymentApi from '$lib/endpoints/paymentApi';
	import { memberListStore } from '$lib/stores/memberListStore';
	import type { Payment } from '$lib/types/payment';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import { getCachedPayments, setCachedPayments } from '$lib/utilities/paymentsCache';
	import { formatString } from '$lib/utilities/stringUtils';
	import { Calendar, ChevronDown, ChevronUp, LayoutGrid, Plus, Rows3 } from '@lucide/svelte';
	import { onMount, untrack } from 'svelte';
	const backendMapping: Record<string, string> = APP_CONSTANTS.BACKEND_MAPPING;
	const validLimits = APP_CONSTANTS.PAGINATION_OPTIONS.map((o) => Number(o.key));

	let today = new Date();
	let weekAgo = new Date(today);
	weekAgo.setDate(weekAgo.getDate() - 7);
	const defaultStartDate = weekAgo.toISOString().split('T')[0];
	const defaultEndDate = today.toISOString().split('T')[0];

	// Convert to $state (Svelte 5)
	let paymentList = $state<Payment.List>([]);
	let isLoading = $state(true);
	let showFilters = $state(false);
	let errors = $state({ startDate: '', endDate: '' });
	let errorMessage = $state('');
	let density = $state<'comfortable' | 'compact'>(
		(typeof localStorage !== 'undefined' &&
			(localStorage.getItem('app_table_density') as 'comfortable' | 'compact')) ||
			'compact'
	);

	let startDate = $state(page.url.searchParams.get('start') || defaultStartDate);
	let endDate = $state(page.url.searchParams.get('end') || defaultEndDate);

	const initialLimit = Number(page.url.searchParams.get('limit'));
	let currentPage = $state(0);
	let limitPerPage = $state(validLimits.includes(initialLimit) ? initialLimit : 50);
	let totalPayments = $state(0);
	const totalPages = $derived(Math.ceil(totalPayments / limitPerPage));
	// totalPayments can be Infinity when the backend doesn't report a count
	// (see resolveTotal) — show "50+" rather than "∞".
	const totalDisplay = $derived(
		Number.isFinite(totalPayments) ? totalPayments.toLocaleString() : `${((currentPage || 1) * limitPerPage).toLocaleString()}+`
	);
	const canGoPrevious = $derived(currentPage > 1);
	const canGoNext = $derived(currentPage < totalPages);
	let paginationConfig = $state({
		get limit() {
			return String(limitPerPage);
		},
		set limit(val) {
			limitPerPage = Number(val);
		},
		get canGoNext() {
			return canGoNext;
		},
		get canGoPrevious() {
			return canGoPrevious;
		}
	});

	function toggleDensity() {
		density = density === 'comfortable' ? 'compact' : 'comfortable';
		localStorage.setItem('app_table_density', density);
	}

	// The single source of truth for loading is the URL — same pattern as the
	// members list. Tracks page.url so mount / popstate (browser back/forward)
	// both reload correctly. lastLoadedSearch de-dupes our own syncUrl() writes.
	let lastLoadedSearch: string | null = null;
	$effect(() => {
		const search = page.url.searchParams.toString();
		untrack(() => {
			if (search === lastLoadedSearch) return;
			lastLoadedSearch = search;
			applyStateFromUrl(page.url);
			loadInitial(page.url);
		});
	});

	function applyStateFromUrl(url: URL) {
		const sp = url.searchParams;
		startDate = sp.get('start') || defaultStartDate;
		endDate = sp.get('end') || defaultEndDate;
		const lim = Number(sp.get('limit'));
		limitPerPage = validLimits.includes(lim) ? lim : 50;
	}

	async function loadInitial(url: URL = page.url) {
		if (!validateDates()) return;

		const targetPage = Math.max(1, Number(url.searchParams.get('page')) || 1);

		// Reconstruct every page up to targetPage so the paginated window
		// (and Prev/Next) behaves as if the user had paged there manually.
		// Fetched in chunks capped at MAX_PAGE_SIZE — never ask the API for
		// more rows than the largest step size the UI itself offers.
		currentPage = 0;
		paymentList = [];
		const rowsNeeded = targetPage * limitPerPage;

		isLoading = true;
		let skip = 0;
		let total = 0;
		let ok = true;
		try {
			while (skip < rowsNeeded) {
				const chunkLimit = Math.min(MAX_PAGE_SIZE, rowsNeeded - skip);
				const res = await getPayments(skip, chunkLimit);
				if (!res) {
					ok = false;
					break;
				}
				paymentList = [...paymentList, ...res.data];
				total = resolveTotal(res, skip, chunkLimit);
				skip += chunkLimit;
				if (res.data.length < chunkLimit) break; // ran out of data early
			}
			if (ok) {
				totalPayments = total;
				currentPage = targetPage;
			}
		} finally {
			isLoading = false;
		}
	}

	// Keep the date range + pagination state in the URL so it survives
	// navigating away (e.g. to View/Edit a payment) and coming back, and so
	// browser back/forward moves through pages correctly.
	function syncUrl() {
		const p = new URLSearchParams();
		if (startDate) p.set('start', startDate);
		if (endDate) p.set('end', endDate);
		if (currentPage > 1) p.set('page', String(currentPage));
		if (limitPerPage !== 50) p.set('limit', String(limitPerPage));

		const qs = p.toString();
		if (qs === page.url.searchParams.toString()) return;
		lastLoadedSearch = qs;
		goto(qs ? `${page.url.pathname}?${qs}` : page.url.pathname, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	// Some backends don't send a `total` count for this endpoint. Fall back
	// defensively: if the last chunk came back short, we've hit the end and
	// know the exact count; otherwise assume there may be more (Infinity —
	// renders as "∞"/"…+" rather than crashing on undefined).
	function resolveTotal(res: { data: unknown[]; total?: number }, skip: number, limit: number) {
		if (typeof res.total === 'number') return res.total;
		return res.data.length < limit ? skip + res.data.length : Infinity;
	}

	async function getPayments(skipOverride?: number, limitOverride?: number) {
		errorMessage = '';
		try {
			const skip = skipOverride ?? currentPage * limitPerPage;
			// Never ask the API for more rows than the largest step size the
			// pagination UI itself offers, regardless of what the caller passed.
			const limit = Math.min(limitOverride ?? limitPerPage, MAX_PAGE_SIZE);
			const params = { startDate, endDate, skip, limit };

			// Query-keyed cache: same params (e.g. paging back to a page we've
			// already fetched) return the cached result instead of hitting the API.
			const cacheKey = JSON.stringify(params);
			const cached = getCachedPayments(cacheKey);
			if (cached) return cached;

			isLoading = true;
			const res = await paymentApi.getAllPayments(params);
			setCachedPayments(cacheKey, res);
			return res;
		} catch (err: any) {
			const rawMessage: string = err.response?.data?.message || '';
			errorMessage = /cast to date|invalid date/i.test(rawMessage)
				? 'Please enter a valid start and end date.'
				: rawMessage || 'Failed to fetch payments. Please try again.';
			paymentList = [];
		} finally {
			isLoading = false;
		}
	}

	async function goNext(force: boolean = false) {
		if (!force) {
			if (isLoading || !canGoNext) return;
		}

		// We already hold this page's rows from an earlier fetch (e.g. the user
		// paged forward, then back, then forward again) — just slide the window
		// instead of refetching/re-appending it.
		if (!force && paymentList.length >= (currentPage + 1) * limitPerPage) {
			currentPage += 1;
			syncUrl();
			return;
		}

		const skip = currentPage * limitPerPage;
		const res = await getPayments(skip, limitPerPage);
		if (res) {
			paymentList = [...paymentList, ...res.data];
			totalPayments = resolveTotal(res, skip, limitPerPage);
			currentPage += 1;
			syncUrl();
		}
	}

	function goPrevious() {
		if (!canGoPrevious) return;
		currentPage -= 1;
		syncUrl();
	}

	function changeLimit(v: string) {
		limitPerPage = Number(v);
		currentPage = 0;
		paymentList = [];
		goNext(true);
	}

	async function applyDateFilter() {
		if (!validateDates()) return;
		currentPage = 0;
		paymentList = [];
		const res = await getPayments(0, limitPerPage);
		if (res) {
			paymentList = res.data;
			totalPayments = resolveTotal(res, 0, limitPerPage);
			currentPage = 1;
		}
		syncUrl();
	}

	onMount(() => {
		if ($memberListStore.members.length === 0) {
			memberListStore.fetchAllMembers();
		}
	});

	function toggleFilters() {
		showFilters = !showFilters;
	}

	function goToUpdate(row: any) {
		const matchedPayment = paymentList.find((payment) => payment._id == row._id);
		// console.log('matchedPayment', matchedPayment);
		// console.log({...row, ...matchedPayment})
		// debugger;

		goto(`/payins/update/${row._id}`, {
			state: {
				paymentData: { ...row, ...matchedPayment },
				returnTo: page.url.pathname + page.url.search
			}
		});
	}

	// View modal: shows the payment's details, with an Edit button that
	// navigates to the update page (reuses goToUpdate's row+payment merge).
	let viewingRow = $state<any | null>(null);
	const viewingDetails = $derived.by(() => {
		if (!viewingRow) return null;
		const matchedPayment = paymentList.find((payment) => payment._id == viewingRow._id);
		return { ...viewingRow, ...matchedPayment };
	});

	function openView(row: any) {
		viewingRow = row;
	}

	function closeView() {
		viewingRow = null;
	}

	function editFromView() {
		if (!viewingRow) return;
		goToUpdate(viewingRow);
		closeView();
	}

	if (typeof window !== 'undefined') {
		(window as any).openPaymentView = openView;
	}

	function validateDates() {
		errors = { startDate: '', endDate: '' };
		let isValid = true;

		if (!startDate) {
			errors.startDate = 'Start date is required';
			isValid = false;
		}

		if (!endDate) {
			errors.endDate = 'End date is required';
			isValid = false;
		}

		if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
			errors.endDate = 'End date must be after start date';
			isValid = false;
		}

		return isValid;
	}

	// Table columns configuration
	const columns = [
		{ key: 'memberName', label: 'Member Name' },
		{ key: 'amount', label: 'Amount' },
		{ key: 'date', label: 'Date' },
		{ key: 'paymentMode', label: 'Mode' },
		{ key: 'paymentType', label: 'Type' },
		{
			key: 'actions',
			label: 'Actions',
			align: 'right' as const,
			render: (value: any, row: any) => {
				const rowDataJson = encodeURIComponent(JSON.stringify(row));

				return `
				<div class='flex justify-content-start'>
		<button
			class="px-3 py-1.5 text-xs rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
				bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500"
			onclick="window.openPaymentView(JSON.parse(decodeURIComponent('${rowDataJson}')))"
		>
			View
		</button>
		</div>
	`;
			}
		}
	];

	// Transform user data for table — sliced to the current page's window,
	// same as the members list (paymentList accumulates every page fetched
	// so Prev/Next don't need to refetch already-loaded pages).
	const tableData = $derived(
		paymentList.slice((currentPage - 1) * limitPerPage, limitPerPage * currentPage).map((payment) => {
			const member = $memberListStore.members.find((user) => user._id === payment.userId);
			return {
				userId: member?._id,
				memberId: member?.member_id,
				_id: payment._id,
				memberName: member
					? formatMemberDisplay(member.name, member.member_id)
					: '-',
				amount: payment.amount,
				date: formatDate(payment.date),
				paymentMode: formatString(payment.payment_mode, ['capitalize-first']) || '-',
				paymentType: backendMapping[payment.payment_type],
				actions: '' // Placeholder, actual rendering handled by column.render
			};
		})
	);
</script>

<div class="flex h-full flex-col">
	<!-- Fixed Header - stays at top -->
	<div class="mb-1.5 flex-shrink-0 space-y-1.5">
		<!-- Below 576px: Collapsible Filter + Add Button -->
		<div class="min-[576px]:hidden">
			<div class="flex items-center gap-3">
				<!-- Filter Toggle Button — shows the selected date range, sized to content -->
				<button
					onclick={toggleFilters}
					class="flex w-auto shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
				>
					<span>{formatDate(startDate)} – {formatDate(endDate)}</span>
					{#if showFilters}
						<ChevronUp class="h-3.5 w-3.5 flex-shrink-0" />
					{:else}
						<ChevronDown class="h-3.5 w-3.5 flex-shrink-0" />
					{/if}
				</button>

				<!-- Add Payment Button (right-aligned) -->
				<div class="ml-auto">
					<Button variant="primary" size="sm" onclick={() => goto('/payins/create')}>
						<div class="flex items-center justify-center gap-1.5">
							<Plus class="h-3.5 w-3.5" />
							<span>Add</span>
						</div>
					</Button>
				</div>
			</div>

			<!-- Collapsible Filter Content -->
			{#if showFilters}
				<div class="mt-1.5 space-y-1.5 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
					<!-- Start Date + End Date (test: same row, revert to stacked if it doesn't work) -->
					<div class="flex gap-1.5">
						<div class="min-w-0 flex-1">
							<Input
								id="startDate-mobile"
								label="Start Date"
								labelStyle="border"
								type="date"
								bind:value={startDate}
								error={errors.startDate}
								placeholder="Select start date"
								required
								disabled={isLoading}
							/>
						</div>

						<div class="min-w-0 flex-1">
							<Input
								id="endDate-mobile"
								label="End Date"
								labelStyle="border"
								type="date"
								bind:value={endDate}
								error={errors.endDate}
								placeholder="Select end date"
								required
								disabled={isLoading}
							/>
						</div>
					</div>

					<!-- Apply Button -->
					<Button variant="primary" size="sm" onclick={applyDateFilter} disabled={isLoading}>
						{#if isLoading}
							<div class="flex items-center justify-center gap-1.5">
								<div
									class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
								></div>
								<span>Loading...</span>
							</div>
						{:else}
							<div class="flex items-center justify-center gap-1.5">
								<Calendar class="h-3.5 w-3.5" />
								<span>Apply</span>
							</div>
						{/if}
					</Button>
				</div>
			{/if}
		</div>

		<!-- 576px and up: Date Range Filter -->
		<div class="hidden w-full flex-nowrap items-center gap-3 min-[576px]:flex">
			<!-- Start Date -->
			<div class="min-w-0 max-w-[215px] shrink grow-0 basis-[215px]">
				<Input
					id="startDate"
					label="Start Date"
					labelStyle="border"
					type="date"
					bind:value={startDate}
					error={errors.startDate}
					placeholder="Select start date"
					required
					disabled={isLoading}
				/>
			</div>

			<!-- End Date -->
			<div class="min-w-0 max-w-[215px] shrink grow-0 basis-[215px]">
				<Input
					id="endDate"
					label="End Date"
					labelStyle="border"
					type="date"
					bind:value={endDate}
					error={errors.endDate}
					placeholder="Select end date"
					required
					disabled={isLoading}
				/>
			</div>

			<!-- Apply Button -->
			<div class="shrink-0 grow-0">
				<Button variant="primary" size="sm" onclick={applyDateFilter} disabled={isLoading}>
					{#if isLoading}
						<div class="flex items-center justify-center gap-1.5">
							<div
								class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
							></div>
							<span>Loading...</span>
						</div>
					{:else}
						<div class="flex items-center justify-center gap-1.5">
							<Calendar class="h-3.5 w-3.5" />
							<span>Apply</span>
						</div>
					{/if}
				</Button>
			</div>

			<!-- Add Payment Button (right-aligned) -->
			<div class="ml-auto shrink-0 grow-0">
				<Button variant="primary" size="sm" onclick={() => goto('/payins/create')}>
					<div class="flex items-center justify-center gap-1.5">
						<Plus class="h-3.5 w-3.5" />
						<span>Add Payment</span>
					</div>
				</Button>
			</div>
		</div>

		<!-- Results Count -->
		{#if !isLoading && paymentList.length > 0}
			<div class="flex items-center justify-between px-1">
				<p class="text-sm text-gray-700">
					{tableData.length ? (currentPage - 1) * limitPerPage + 1 : 0}–{(currentPage - 1) *
						limitPerPage +
						tableData.length} of {totalDisplay}
				</p>
				<button
					type="button"
					onclick={toggleDensity}
					title={density === 'comfortable' ? 'Switch to compact view' : 'Switch to comfortable view'}
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

	<!-- Scrollable Table Area - takes remaining space -->
	<div class="min-h-0 flex-1">
		{#if isLoading}
			<div
				class="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm"
			>
				<div class="text-center">
					<div
						class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<p class="mt-2 text-sm text-gray-600">Loading payments...</p>
				</div>
			</div>
		{:else if tableData.length === 0}
			<div
				class="p-lg flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
			>
				<svg class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
				<p class="mt-1 text-center text-sm text-gray-500">
					{startDate && endDate
						? 'Try a different date range'
						: 'Get started by adding a new payment'}
				</p>
				{#if !startDate && !endDate}
					<div class="mt-6">
						<Button variant="primary" onclick={() => goto('/payins/create')}>
							<Plus class="mr-2 h-4 w-4" />
							Add Payment
						</Button>
					</div>
				{/if}
				{#if errorMessage}
					<div class="rounded-lg border border-red-200 bg-red-50 p-4">
						<div class="flex items-start">
							<svg class="mt-0.5 h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clip-rule="evenodd"
								/>
							</svg>
							<p class="ml-3 text-sm text-red-800">{errorMessage}</p>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<Table
				pagination={paginationConfig}
				{columns}
				data={tableData}
				onNext={goNext}
				onPrevious={goPrevious}
				onLimitChange={changeLimit}
				{density}
			/>
		{/if}
	</div>
</div>

<!-- Payment Details Modal -->
<Modal open={!!viewingRow} onClose={closeView} title="Payment Details">
	{#if viewingDetails}
		<div class="space-y-4 text-sm">
			<div class="grid grid-cols-2 gap-3">
				<div>
					<p class="text-xs text-gray-500">Member</p>
					<p class="font-medium text-gray-900">{viewingDetails.memberName}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Amount</p>
					<p class="font-medium text-gray-900">₹{viewingDetails.amount}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Date</p>
					<p class="font-medium text-gray-900">{formatDate(viewingDetails.date)}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Payment Mode</p>
					<p class="font-medium text-gray-900">
						{formatString(viewingDetails.payment_mode, ['capitalize-first']) || '-'}
					</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Payment Type</p>
					<p class="font-medium text-gray-900">
						{backendMapping[viewingDetails.payment_type] || '-'}
					</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Reference Number</p>
					<p class="font-medium text-gray-900">{viewingDetails.payment_reference || '-'}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Receipt Number</p>
					<p class="font-medium text-gray-900">{viewingDetails.reciept_number || '-'}</p>
				</div>
			</div>

			{#if viewingDetails.remarks}
				<div>
					<p class="text-xs text-gray-500">Description</p>
					<p class="font-medium text-gray-900">{viewingDetails.remarks}</p>
				</div>
			{/if}

			{#if viewingDetails.photo}
				<div>
					<p class="mb-1 text-xs text-gray-500">Receipt</p>
					<ImageViewer src={viewingDetails.photo} alt="Payment Receipt" thumbnailSize="medium" />
				</div>
			{/if}
		</div>

		<div class="mt-4 flex justify-end border-t border-gray-200 pt-3">
			<Button variant="primary" size="sm" onclick={editFromView}>Edit</Button>
		</div>
	{/if}
</Modal>
