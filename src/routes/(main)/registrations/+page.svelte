<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import registrationApi from '$lib/endpoints/registrationApi';
	import termsApi from '$lib/endpoints/termsApi';
	import type { Registration } from '$lib/types/registration';
	import { debounce, formatDate } from '$lib/utilities/helperFunc';
	import {
		REGISTRATION_STATUSES,
		formatRupees,
		parseRegistrationError,
		registrationStatusLabel,
		registrationStatusPill
	} from '$lib/utilities/registrationUtils';
	import { escapeHtml } from '$lib/utilities/ticketUtils';
	import { ChevronLeft, ChevronRight, LayoutGrid, Rows3 } from '@lucide/svelte';
	import { onMount, untrack } from 'svelte';

	const validLimits = APP_CONSTANTS.PAGINATION_OPTIONS.map((o) => Number(o.key)).filter(
		// Server caps limit at 100.
		(n) => n <= 100
	);
	const DEFAULT_LIMIT = 30;
	const DEFAULT_STATUS: Registration.Status = 'in-review';

	let rows = $state<Registration.ListRow[]>([]);
	let counts = $state<Partial<Record<Registration.Status, number>>>({});
	let isLoading = $state(true);
	let errorMessage = $state('');
	let noticeMessage = $state('');
	let termsMissing = $state(false);

	onMount(async () => {
		try {
			await termsApi.current();
		} catch (err: any) {
			termsMissing = err?.response?.status === 404;
		}
	});

	let activeTab = $state<string>(DEFAULT_STATUS);
	let searchTerm = $state('');
	let currentPage = $state(1);
	let limitPerPage = $state(DEFAULT_LIMIT);
	let totalRows = $state(0);

	const totalPages = $derived(Math.max(1, Math.ceil(totalRows / limitPerPage)));
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

	let density = $state<'comfortable' | 'compact'>(
		(typeof localStorage !== 'undefined' &&
			(localStorage.getItem('app_table_density') as 'comfortable' | 'compact')) ||
			'compact'
	);

	function toggleDensity() {
		density = density === 'comfortable' ? 'compact' : 'comfortable';
		localStorage.setItem('app_table_density', density);
	}

	let lastLoadedSearch: string | null = null;
	$effect(() => {
		const search = page.url.searchParams.toString();
		untrack(() => {
			if (search === lastLoadedSearch) return;
			lastLoadedSearch = search;
			applyStateFromUrl(page.url);
			loadRows();
		});
	});

	function applyStateFromUrl(url: URL) {
		const sp = url.searchParams;
		const status = sp.get('status');
		activeTab = REGISTRATION_STATUSES.some((s) => s.key === status)
			? (status as string)
			: DEFAULT_STATUS;
		searchTerm = sp.get('search') ?? '';
		currentPage = Math.max(1, Number(sp.get('page')) || 1);
		const lim = Number(sp.get('limit'));
		limitPerPage = validLimits.includes(lim) ? lim : DEFAULT_LIMIT;
	}

	function syncUrl() {
		const sp = new URLSearchParams();
		if (activeTab !== DEFAULT_STATUS) sp.set('status', activeTab);
		if (searchTerm.trim()) sp.set('search', searchTerm.trim());
		if (currentPage > 1) sp.set('page', String(currentPage));
		if (limitPerPage !== DEFAULT_LIMIT) sp.set('limit', String(limitPerPage));

		const search = sp.toString();
		lastLoadedSearch = search;
		goto(search ? '?' + search : page.url.pathname, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
		loadRows();
	}

	let requestSeq = 0;

	async function loadRows() {
		const seq = ++requestSeq;
		isLoading = true;
		errorMessage = '';
		try {
			const res = await registrationApi.adminList({
				params: {
					status: activeTab as Registration.Status,
					search: searchTerm.trim() || undefined,
					page: currentPage,
					limit: limitPerPage
				}
			});
			if (seq !== requestSeq) return;
			rows = res.data ?? [];
			counts = res.counts ?? {};
			totalRows = res.total ?? rows.length;
		} catch (err) {
			if (seq !== requestSeq) return;
			rows = [];
			totalRows = 0;
			errorMessage = parseRegistrationError(err, 'Could not load applications.');
		} finally {
			if (seq === requestSeq) isLoading = false;
		}
	}

	function applyFilters() {
		currentPage = 1;
		syncUrl();
	}

	const debouncedSearch = debounce(applyFilters, 300);

	function goToPage(next: number) {
		if (next < 1 || next > totalPages) return;
		currentPage = next;
		syncUrl();
	}

	function onLimitChange(value: string) {
		limitPerPage = Math.min(Number(value), 100);
		applyFilters();
	}

	function openApplication(id: string) {
		goto('/registrations/' + id, { state: { returnTo: page.url.pathname + page.url.search } });
	}

	async function resendLink(row: Registration.ListRow) {
		noticeMessage = '';
		errorMessage = '';
		try {
			const res = await registrationApi.resendLink({ id: row.id });
			noticeMessage = res.message;
		} catch (err) {
			errorMessage = parseRegistrationError(err, 'Could not send the link.');
		}
	}

	function rowMenu(row: { raw: Registration.ListRow }) {
		const actions: { label: string; onclick: () => void }[] = [
			{ label: 'View', onclick: () => openApplication(row.raw.id) }
		];
		if (row.raw.status === 'draft' || row.raw.status === 'payment_pending') {
			actions.push({ label: 'Resend link', onclick: () => resendLink(row.raw) });
		}
		return actions;
	}

	const tabs = $derived(
		REGISTRATION_STATUSES.map((s) => ({
			id: s.key,
			label: counts[s.key] ? `${s.label} (${counts[s.key]})` : s.label
		}))
	);

	const columns = [
		{ key: 'name', label: 'Applicant', width: 200 },
		{ key: 'mobile', label: 'Mobile', width: 120 },
		{ key: 'email', label: 'Email', width: 220 },
		{
			key: 'status',
			label: 'Status',
			width: 130,
			render: (value: Registration.Status) =>
				'<span class="' +
				registrationStatusPill(value) +
				'">' +
				escapeHtml(registrationStatusLabel(value)) +
				'</span>'
		},
		{ key: 'referrer', label: 'Invited by', width: 200 },
		{ key: 'amount', label: 'Amount', align: 'right' as const, width: 100 },
		{ key: 'date', label: 'Applied on', width: 110 }
	];

	const tableData = $derived(
		rows.map((r) => ({
			_id: r.id,
			name: r.name,
			mobile: r.mobile || '-',
			email: r.email,
			status: r.status,
			referrer: r.referrer ? `${r.referrer.name} (${r.referrer.member_id})` : '-',
			amount: r.total_amount ? formatRupees(r.total_amount) : '-',
			date: formatDate(r.created_at),
			raw: r
		}))
	);

	const rangeStart = $derived(rows.length ? (currentPage - 1) * limitPerPage + 1 : 0);
	const rangeEnd = $derived((currentPage - 1) * limitPerPage + rows.length);
</script>

<div class="flex h-full flex-col">
	<div class="mb-1.5 flex-shrink-0 space-y-1.5">
		<div class="overflow-x-auto">
			<Tabs {tabs} bind:activeTab onTabChange={applyFilters} />
		</div>

		<div class="min-w-0 sm:max-w-[315px]">
			<SearchInput
				id="registration-search"
				bind:value={searchTerm}
				placeholder="Search name, email or mobile…"
				oninput={() => debouncedSearch()}
			/>
		</div>

		{#if !isLoading && rows.length > 0}
			<div class="flex items-center justify-between px-1">
				<p class="text-xs text-gray-700 sm:text-sm">
					{rangeStart}–{rangeEnd} of {totalRows.toLocaleString()}
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

		{#if termsMissing}
			<p
				class="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800"
			>
				<span class="font-medium">No terms are published</span> — applicants cannot pay, so no
				registration can be completed.
				<a href="/registration-terms" class="font-medium text-blue-600 hover:underline"
					>Publish terms</a
				>
			</p>
		{/if}
		{#if noticeMessage}
			<p
				class="rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs text-green-700"
			>
				{noticeMessage}
			</p>
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
					<p class="mt-2 text-sm text-gray-600">Loading applications...</p>
				</div>
			</div>
		{:else if rows.length === 0}
			<div
				class="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
			>
				<h3 class="text-sm font-medium text-gray-900">No applications found</h3>
				<p class="mt-1 text-center text-sm text-gray-500">
					{searchTerm.trim()
						? 'Try a different search'
						: activeTab === 'in-review'
							? 'Nothing is waiting for approval'
							: 'Nothing in this tab yet'}
				</p>
			</div>
		{:else}
			<div class="flex h-full flex-col sm:hidden">
				<div class="min-h-0 flex-1 overflow-y-auto">
					<div
						class="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm"
					>
						{#each rows as row (row.id)}
							<button
								type="button"
								onclick={() => openApplication(row.id)}
								class="block w-full px-2.5 py-1.5 text-left hover:bg-gray-50 active:bg-gray-100"
							>
								<div class="flex items-center gap-1.5">
									<span class="min-w-0 flex-1 truncate text-xs font-medium text-gray-900"
										>{row.name}</span
									>
									<span class={registrationStatusPill(row.status)}
										>{registrationStatusLabel(row.status)}</span
									>
								</div>
								<div class="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
									<span class="truncate">{row.mobile || row.email}</span>
									{#if row.total_amount}
										<span class="shrink-0">· {formatRupees(row.total_amount)}</span>
									{/if}
									<span class="ml-auto shrink-0">{formatDate(row.created_at)}</span>
								</div>
							</button>
						{/each}
					</div>
				</div>

				{#if totalPages > 1}
					<div class="mt-1.5 flex flex-shrink-0 items-center justify-between gap-2">
						<button
							onclick={() => goToPage(currentPage - 1)}
							disabled={!canGoPrevious}
							class="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 disabled:opacity-40"
						>
							<ChevronLeft class="h-3.5 w-3.5" /> Prev
						</button>
						<span class="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
						<button
							onclick={() => goToPage(currentPage + 1)}
							disabled={!canGoNext}
							class="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 disabled:opacity-40"
						>
							Next <ChevronRight class="h-3.5 w-3.5" />
						</button>
					</div>
				{/if}
			</div>

			<div class="hidden h-full sm:block">
				<Table
					{columns}
					data={tableData}
					{density}
					{rowMenu}
					pagination={paginationConfig}
					onRowClick={(row) => openApplication(row._id)}
					onNext={() => goToPage(currentPage + 1)}
					onPrevious={() => goToPage(currentPage - 1)}
					{onLimitChange}
				/>
			</div>
		{/if}
	</div>
</div>
