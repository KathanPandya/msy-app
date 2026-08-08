<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { familyListStore } from '$lib/stores/familyListStore';
	import type { Family } from '$lib/types/family';
	import { debounce } from '$lib/utilities/helperFunc';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import { LayoutGrid, Rows3 } from '@lucide/svelte';
	import { get } from 'svelte/store';
	import { untrack } from 'svelte';

	let searchQuery = $state(page.url.searchParams.get('search') ?? '');
	let density = $state<'comfortable' | 'compact'>(
		(typeof localStorage !== 'undefined' &&
			(localStorage.getItem('app_table_density') as 'comfortable' | 'compact')) ||
			'compact'
	);

	function toggleDensity() {
		density = density === 'comfortable' ? 'compact' : 'comfortable';
		localStorage.setItem('app_table_density', density);
	}

	// The URL is the source of truth for the active search — same pattern as
	// /members. Keeps the query in the address bar so returning from a family
	// view (or a direct link with ?search=…) restores/applies the right list.
	let lastLoadedSearch: string | null = null;
	$effect(() => {
		const search = page.url.searchParams.get('search') ?? ''; // the only tracked dependency
		untrack(() => {
			if (search === lastLoadedSearch) return;
			lastLoadedSearch = search;
			searchQuery = search;
			if (search !== get(familyListStore).search) {
				familyListStore.setSearch(search);
			} else {
				// Uses the cached list if we already have one (e.g. returning from a family view).
				familyListStore.init();
			}
		});
	});

	function syncUrl(search: string) {
		const target = search ? `/families?search=${encodeURIComponent(search)}` : '/families';
		const current = `${page.url.pathname}${page.url.search}`;
		if (target === current) return;
		// Record what we're about to write so the URL effect above doesn't
		// re-fetch for our own change (setSearch already fetched it).
		lastLoadedSearch = search;
		goto(target, { replaceState: true, keepFocus: true, noScroll: true });
	}

	const families = $derived($familyListStore.families);
	const totalFamilies = $derived($familyListStore.total);
	const currentPage = $derived($familyListStore.currentPage);
	const limitPerPage = $derived($familyListStore.limit);
	const totalPages = $derived(Math.ceil(totalFamilies / limitPerPage));
	const canGoPrevious = $derived(currentPage > 1);
	const canGoNext = $derived(currentPage < totalPages);
	let paginationConfig = $state({
		get limit() {
			return String($familyListStore.limit);
		},
		set limit(_val) {
			// change handled by onLimitChange
		},
		get canGoNext() {
			return canGoNext;
		},
		get canGoPrevious() {
			return canGoPrevious;
		}
	});

	function goNext() {
		familyListStore.next();
	}

	function goPrevious() {
		familyListStore.previous();
	}

	function changeLimit(v: string) {
		familyListStore.setLimit(Number(v));
	}

	const debouncedSearch = debounce(() => {
		const trimmed = searchQuery.trim();
		familyListStore.setSearch(trimmed);
		syncUrl(trimmed);
	}, 300);

	function headOf(f: Family.ListItem) {
		return f.members.find((m) => m.id === f.managerId) || f.members[0];
	}

	function netDue(f: Family.ListItem) {
		return f.members.reduce((s, m) => s + (m.outstanding_amount ?? 0), 0);
	}

	function dueLabel(n: number) {
		if (n > 0) return `₹${n} due`;
		if (n < 0) return `₹${Math.abs(n)} credit`;
		return 'settled';
	}

	if (typeof window !== 'undefined') {
		(window as any).navigateToFamily = (id: string) => {
			goto(`/families/${id}`);
		};
	}

	const columns = [
		{ key: 'headName', label: 'Head' },
		{ key: 'memberCount', label: 'Members' },
		{ key: 'due', label: 'Heesab' },
		{
			key: 'actions',
			label: 'Actions',
			align: 'right' as const,
			render: (_: any, row: any) => `
				<div class='flex justify-end'>
					<button class="px-3 py-1.5 text-xs rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500"
						onclick="window.navigateToFamily('${row.clubId}')"
					>
						View
					</button>
				</div>
			`
		}
	];

	const tableData = $derived(
		families
			.slice((currentPage - 1) * limitPerPage, limitPerPage * currentPage)
			.map((f) => {
				const head = headOf(f);
				return {
					clubId: f.clubId,
					headName: `${head ? formatMemberDisplay(head.name, head.member_id) : 'Unknown'}${head && head.status !== 'active' ? ' ⚠' : ''}`,
					memberCount: `${f.memberCount} member${f.memberCount === 1 ? '' : 's'}`,
					due: dueLabel(netDue(f)),
					actions: ''
				};
			})
	);

</script>

<div class="flex h-full flex-col">
	<div class="mb-1.5 flex-shrink-0 space-y-1.5">
	<div class="flex items-center gap-3">
		<input
			type="search"
			bind:value={searchQuery}
			oninput={() => debouncedSearch()}
			placeholder="Search families by member name or MSY id…"
			class="w-full min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:max-w-md"
		/>
		<div class="ml-auto shrink-0">
			<Button variant="primary" size="sm" onclick={() => goto('/families/create')}>
				<span class="sm:hidden">＋ Add</span>
				<span class="hidden sm:inline">＋ Add Family</span>
			</Button>
		</div>
	</div>

	{#if $familyListStore.error}
		<div class="rounded-md bg-red-50 p-4 text-sm text-red-800">{$familyListStore.error}</div>
	{/if}

	{#if !$familyListStore.isLoading && families.length > 0}
		<div class="flex items-center justify-between">
			<span class="text-xs whitespace-nowrap text-gray-500">
				{tableData.length ? (currentPage - 1) * limitPerPage + 1 : 0}–{(currentPage - 1) *
					limitPerPage +
					tableData.length} of {totalFamilies.toLocaleString()}
			</span>
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

	<div class="min-h-0 flex-1">
		{#if $familyListStore.isLoading && families.length === 0}
			<p class="text-sm text-gray-500">Loading families…</p>
		{:else}
			<div class="h-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
				<div class="h-full overflow-y-auto">
					<Table
						pagination={paginationConfig}
						{columns}
						data={tableData}
						onRowClick={(row) => goto(`/families/${row.clubId}`)}
						onNext={goNext}
						onPrevious={goPrevious}
						onLimitChange={changeLimit}
						{density}
					/>
				</div>
			</div>
		{/if}
	</div>
</div>
