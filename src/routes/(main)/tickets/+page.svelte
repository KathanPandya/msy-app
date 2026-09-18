<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import ticketApi from '$lib/endpoints/ticketApi';
	import { authStore } from '$lib/stores/authStore';
	import type { Ticket } from '$lib/types/ticket';
	import {
		TICKET_STATUSES,
		TICKET_TYPES,
		adminId,
		adminName,
		escapeHtml,
		formatTicketDate,
		parseTicketError,
		resolveCurrentAdminId,
		statusLabel,
		statusPillClass,
		typeLabel,
		typePillClass
	} from '$lib/utilities/ticketUtils';
	import {
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		ChevronUp,
		LayoutGrid,
		Plus,
		Rows3
	} from '@lucide/svelte';
	import { untrack } from 'svelte';

	const validLimits = APP_CONSTANTS.PAGINATION_OPTIONS.map((o: { key: string }) => Number(o.key));
	const DEFAULT_LIMIT = 30;

	let tickets = $state<Ticket.Data[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let showFilters = $state(false);

	let statusFilter = $state('');
	let typeFilter = $state('');
	let mineOnly = $state(false);
	let includeDeleted = $state(false);

	let currentPage = $state(1);
	let limitPerPage = $state(DEFAULT_LIMIT);
	let totalTickets = $state(0);
	let totalPages = $state(1);

	// Shared with the members/payins tables so density is one app-wide choice.
	let density = $state<'comfortable' | 'compact'>(
		(typeof localStorage !== 'undefined' &&
			(localStorage.getItem('app_table_density') as 'comfortable' | 'compact')) ||
			'compact'
	);

	const currentUserId = $derived(resolveCurrentAdminId($authStore.userAllInfo?.user));
	const activeFilterCount = $derived(
		[statusFilter, typeFilter, mineOnly ? 'mine' : '', includeDeleted ? 'deleted' : ''].filter(
			Boolean
		).length
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

	// The URL is the single source of truth — same pattern as the payins and
	// members lists, so browser back/forward reload the right page. The
	// lastLoadedSearch guard de-dupes our own syncUrl() writes.
	let lastLoadedSearch: string | null = null;
	$effect(() => {
		const search = page.url.searchParams.toString();
		untrack(() => {
			if (search === lastLoadedSearch) return;
			lastLoadedSearch = search;
			applyStateFromUrl(page.url);
			loadTickets();
		});
	});

	function applyStateFromUrl(url: URL) {
		const sp = url.searchParams;
		statusFilter = sp.get('status') ?? '';
		typeFilter = sp.get('type') ?? '';
		mineOnly = sp.get('mine') === 'true';
		includeDeleted = sp.get('includeDeleted') === 'true';
		currentPage = Math.max(1, Number(sp.get('page')) || 1);
		const lim = Number(sp.get('limit'));
		limitPerPage = validLimits.includes(lim) ? lim : DEFAULT_LIMIT;
	}

	function syncUrl() {
		const sp = new URLSearchParams();
		if (statusFilter) sp.set('status', statusFilter);
		if (typeFilter) sp.set('type', typeFilter);
		if (mineOnly) sp.set('mine', 'true');
		if (includeDeleted) sp.set('includeDeleted', 'true');
		if (currentPage > 1) sp.set('page', String(currentPage));
		if (limitPerPage !== DEFAULT_LIMIT) sp.set('limit', String(limitPerPage));

		const search = sp.toString();
		lastLoadedSearch = search;
		goto(search ? '?' + search : page.url.pathname, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
		loadTickets();
	}

	async function loadTickets() {
		isLoading = true;
		errorMessage = '';
		try {
			const res = await ticketApi.fetchTickets({
				params: {
					page: currentPage,
					limit: limitPerPage,
					status: statusFilter as Ticket.Status | '',
					type: typeFilter as Ticket.Type | '',
					createdBy: mineOnly && currentUserId ? currentUserId : undefined,
					includeDeleted
				}
			});
			tickets = res.data ?? [];
			totalTickets = res.pagination?.total ?? tickets.length;
			totalPages = Math.max(1, res.pagination?.totalPages ?? 1);
		} catch (err) {
			tickets = [];
			totalTickets = 0;
			totalPages = 1;
			errorMessage = parseTicketError(err, 'Could not load tickets');
		} finally {
			isLoading = false;
		}
	}

	// Any filter change resets to page 1 — page 3 of the old filter is
	// meaningless under the new one.
	function applyFilters() {
		currentPage = 1;
		syncUrl();
	}

	function clearFilters() {
		statusFilter = '';
		typeFilter = '';
		mineOnly = false;
		includeDeleted = false;
		applyFilters();
	}

	function goToPage(next: number) {
		if (next < 1 || next > totalPages) return;
		currentPage = next;
		syncUrl();
	}

	function onLimitChange(value: string) {
		limitPerPage = Number(value);
		currentPage = 1;
		syncUrl();
	}

	function openCreate() {
		goto('/tickets/create', { state: { returnTo: page.url.pathname + page.url.search } });
	}

	function openTicket(id: string) {
		goto('/tickets/' + id, { state: { returnTo: page.url.pathname + page.url.search } });
	}

	// ---------- Quick status toggle from the row menu ----------
	let togglingId = $state<string | null>(null);

	async function toggleStatus(ticket: Ticket.Data) {
		if (ticket.is_deleted || togglingId) return;
		const next: Ticket.Status = ticket.status === 'open' ? 'solved' : 'open';
		togglingId = ticket._id;
		try {
			await ticketApi.updateStatus({ id: ticket._id, status: next });
			tickets = tickets.map((t) => (t._id === ticket._id ? { ...t, status: next } : t));
		} catch (err: any) {
			// 400 "already <status>" just means our copy was stale — refetch
			// rather than showing the user an error they can't act on.
			if (err?.response?.status === 400) loadTickets();
			else errorMessage = parseTicketError(err, 'Could not change status');
		} finally {
			togglingId = null;
		}
	}

	// ---------- Delete (soft, creator only) ----------
	let deletingTicket = $state<Ticket.Data | null>(null);
	let deleteLoading = $state(false);
	let deleteError = $state('');

	function openDelete(ticket: Ticket.Data) {
		deletingTicket = ticket;
		deleteError = '';
	}

	async function confirmDelete() {
		if (!deletingTicket) return;
		deleteLoading = true;
		deleteError = '';
		try {
			await ticketApi.deleteTicket({ id: deletingTicket._id });
			deletingTicket = null;
			loadTickets();
		} catch (err) {
			deleteError = parseTicketError(err, 'Could not delete ticket');
		} finally {
			deleteLoading = false;
		}
	}

	// ---------- Table ----------
	const columns = [
		{
			key: 'title',
			label: 'Title',
			width: 300,
			render: (value: string, row: any) =>
				row.isDeleted
					? '<span class="flex min-w-0 items-center gap-1.5"><span class="truncate text-gray-400 line-through">' +
						escapeHtml(value) +
						'</span><span class="shrink-0 rounded bg-gray-100 px-1 py-[1px] text-[10px] font-medium text-gray-500">Deleted</span></span>'
					: '<span class="block truncate">' + escapeHtml(value) + '</span>'
		},
		{
			key: 'type',
			label: 'Type',
			width: 110,
			render: (value: Ticket.Type) =>
				'<span class="' + typePillClass(value) + '">' + escapeHtml(typeLabel(value)) + '</span>'
		},
		{
			key: 'status',
			label: 'Status',
			width: 110,
			render: (value: Ticket.Status) =>
				'<span class="' + statusPillClass(value) + '">' + escapeHtml(statusLabel(value)) + '</span>'
		},
		{ key: 'raisedBy', label: 'Raised by', width: 140 },
		{ key: 'created', label: 'Created', width: 130 }
	];

	const tableData = $derived(
		tickets.map((ticket) => ({
			_id: ticket._id,
			title: ticket.title,
			type: ticket.type,
			status: ticket.status,
			raisedBy: adminName(ticket.createdBy),
			created: formatTicketDate(ticket.createdAt),
			isDeleted: ticket.is_deleted,
			raw: ticket
		}))
	);

	function rowMenu(row: any) {
		const ticket: Ticket.Data = row.raw;
		const mine = !!currentUserId && adminId(ticket.createdBy) === currentUserId;

		const actions: { label: string; onclick: () => void; danger?: boolean }[] = [
			{ label: 'View', onclick: () => openTicket(ticket._id) }
		];
		// Every mutation 404s on a soft-deleted ticket (§10.4) — only View stays.
		if (!ticket.is_deleted) {
			actions.push({
				label: ticket.status === 'open' ? 'Mark solved' : 'Reopen',
				onclick: () => toggleStatus(ticket)
			});
			if (mine) {
				actions.push({ label: 'Delete', onclick: () => openDelete(ticket), danger: true });
			}
		}
		return actions;
	}

	const rangeStart = $derived(tickets.length ? (currentPage - 1) * limitPerPage + 1 : 0);
	const rangeEnd = $derived((currentPage - 1) * limitPerPage + tickets.length);
</script>

<div class="flex h-full flex-col">
	<!-- Fixed header -->
	<div class="mb-1.5 flex-shrink-0 space-y-1.5">
		<!-- Below 640px: filters collapse behind one button, Add stays right-aligned -->
		<div class="sm:hidden">
			<div class="flex items-center gap-3">
				<button
					onclick={() => (showFilters = !showFilters)}
					class="flex w-auto shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
				>
					<span>Filters{activeFilterCount ? ' (' + activeFilterCount + ')' : ''}</span>
					{#if showFilters}
						<ChevronUp class="h-3.5 w-3.5 flex-shrink-0" />
					{:else}
						<ChevronDown class="h-3.5 w-3.5 flex-shrink-0" />
					{/if}
				</button>

				<div class="ml-auto">
					<Button variant="primary" size="sm" onclick={openCreate}>
						<div class="flex items-center justify-center gap-1.5">
							<Plus class="h-3.5 w-3.5" />
							<span>New</span>
						</div>
					</Button>
				</div>
			</div>

			{#if showFilters}
				<div class="mt-1.5 space-y-2 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
					<div class="flex gap-1.5">
						<select
							bind:value={statusFilter}
							onchange={applyFilters}
							class="h-11 min-w-0 flex-1 rounded-md border border-gray-300 bg-white py-0 pr-10 pl-3 text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
						>
							<option value="">All statuses</option>
							{#each TICKET_STATUSES as option}
								<option value={option.key}>{option.label}</option>
							{/each}
						</select>
						<select
							bind:value={typeFilter}
							onchange={applyFilters}
							class="h-11 min-w-0 flex-1 rounded-md border border-gray-300 bg-white py-0 pr-10 pl-3 text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
						>
							<option value="">All types</option>
							{#each TICKET_TYPES as option}
								<option value={option.key}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="flex items-center gap-4">
						<label class="flex items-center gap-1.5 text-xs text-gray-700">
							<input
								type="checkbox"
								bind:checked={mineOnly}
								onchange={applyFilters}
								class="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:size-4"
							/>
							Mine
						</label>
						<label class="flex items-center gap-1.5 text-xs text-gray-700">
							<input
								type="checkbox"
								bind:checked={includeDeleted}
								onchange={applyFilters}
								class="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:size-4"
							/>
							Deleted
						</label>
						{#if activeFilterCount}
							<button
								onclick={clearFilters}
								class="ml-auto text-xs font-medium text-blue-600 hover:text-blue-700">Clear</button
							>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- 640px and up: one row of content-hugging controls -->
		<div class="hidden w-full flex-nowrap items-center gap-3 sm:flex">
			<select
				bind:value={statusFilter}
				onchange={applyFilters}
				class="h-8 w-[150px] shrink-0 rounded-md border border-gray-300 bg-white py-0 pr-10 pl-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			>
				<option value="">All statuses</option>
				{#each TICKET_STATUSES as option}
					<option value={option.key}>{option.label}</option>
				{/each}
			</select>

			<select
				bind:value={typeFilter}
				onchange={applyFilters}
				class="h-8 w-[150px] shrink-0 rounded-md border border-gray-300 bg-white py-0 pr-10 pl-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			>
				<option value="">All types</option>
				{#each TICKET_TYPES as option}
					<option value={option.key}>{option.label}</option>
				{/each}
			</select>

			<label class="flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-700">
				<input
					type="checkbox"
					bind:checked={mineOnly}
					onchange={applyFilters}
					class="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:size-4"
				/>
				Mine
			</label>

			<label class="flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-700">
				<input
					type="checkbox"
					bind:checked={includeDeleted}
					onchange={applyFilters}
					class="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:size-4"
				/>
				Deleted
			</label>

			{#if activeFilterCount}
				<button
					onclick={clearFilters}
					class="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700">Clear</button
				>
			{/if}

			<div class="ml-auto shrink-0 grow-0">
				<Button variant="primary" size="sm" onclick={openCreate}>
					<div class="flex items-center justify-center gap-1.5">
						<Plus class="h-3.5 w-3.5" />
						<span>New Ticket</span>
					</div>
				</Button>
			</div>
		</div>

		<!-- Count + density, same strip as the other list pages -->
		{#if !isLoading && tickets.length > 0}
			<div class="flex items-center justify-between px-1">
				<p class="text-xs text-gray-700 sm:text-sm">
					{rangeStart}–{rangeEnd} of {totalTickets.toLocaleString()}
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

	<!-- Scrollable list area -->
	<div class="min-h-0 flex-1">
		{#if isLoading}
			<div
				class="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm"
			>
				<div class="text-center">
					<div
						class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<p class="mt-2 text-sm text-gray-600">Loading tickets...</p>
				</div>
			</div>
		{:else if tickets.length === 0}
			<div
				class="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
			>
				<h3 class="text-sm font-medium text-gray-900">No tickets found</h3>
				<p class="mt-1 text-center text-sm text-gray-500">
					{activeFilterCount ? 'Try clearing the filters' : 'Raise the first ticket to get started'}
				</p>
				<div class="mt-4">
					<Button variant="primary" size="sm" onclick={openCreate}>
						<div class="flex items-center justify-center gap-1.5">
							<Plus class="h-3.5 w-3.5" />
							<span>New Ticket</span>
						</div>
					</Button>
				</div>
			</div>
		{:else}
			<!-- Mobile: dense rows. A 5-column table on a phone is all horizontal
				 scrolling, so the same data stacks into two lines per ticket. -->
			<div class="flex h-full flex-col sm:hidden">
				<!-- The scroll box fills the screen, the bordered list inside only
					 grows to its rows — otherwise a single ticket renders as a
					 full-height empty card. -->
				<div class="min-h-0 flex-1 overflow-y-auto">
					<div
						class="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm"
					>
						{#each tickets as ticket (ticket._id)}
							<button
								type="button"
								onclick={() => openTicket(ticket._id)}
								class="block w-full px-2.5 py-1.5 text-left hover:bg-gray-50 active:bg-gray-100"
							>
								<div class="flex items-center gap-1.5">
									<span
										class="min-w-0 flex-1 truncate text-xs font-medium {ticket.is_deleted
											? 'text-gray-400 line-through'
											: 'text-gray-900'}">{ticket.title}</span
									>
									<span class={statusPillClass(ticket.status)}>{statusLabel(ticket.status)}</span>
								</div>
								<div class="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
									<span class={typePillClass(ticket.type)}>{typeLabel(ticket.type)}</span>
									<span class="truncate">{adminName(ticket.createdBy)}</span>
									<span class="ml-auto shrink-0">{formatTicketDate(ticket.createdAt)}</span>
								</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Only worth the row when there's somewhere to page to. -->
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

			<!-- Desktop / tablet -->
			<div class="hidden h-full sm:block">
				<Table
					{columns}
					data={tableData}
					{density}
					{rowMenu}
					pagination={paginationConfig}
					onRowClick={(row) => openTicket(row._id)}
					onNext={() => goToPage(currentPage + 1)}
					onPrevious={() => goToPage(currentPage - 1)}
					{onLimitChange}
				/>
			</div>
		{/if}
	</div>
</div>

<Modal open={!!deletingTicket} onClose={() => (deletingTicket = null)} title="Delete ticket">
	<p class="text-sm text-gray-700">
		Delete <span class="font-medium">{deletingTicket?.title}</span>? It stays in the records and can
		still be opened from the Deleted filter, but it can no longer be edited or commented on.
	</p>
	{#if deleteError}
		<p class="mt-2 text-xs text-red-600">{deleteError}</p>
	{/if}
	<div class="mt-3 flex justify-end gap-2">
		<Button variant="secondary" size="sm" onclick={() => (deletingTicket = null)}>Cancel</Button>
		<Button variant="danger" size="sm" onclick={confirmDelete} disabled={deleteLoading}>
			{deleteLoading ? 'Deleting...' : 'Delete'}
		</Button>
	</div>
</Modal>
