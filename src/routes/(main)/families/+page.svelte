<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { familyListStore } from '$lib/stores/familyListStore';
	import type { Family } from '$lib/types/family';
	import { debounce } from '$lib/utilities/helperFunc';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';

	let searchQuery = $state(get(familyListStore).search);

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

	onMount(() => {
		// Uses the cached list if we already have one (e.g. returning from a family view).
		familyListStore.init();
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

	const debouncedSearch = debounce(() => familyListStore.setSearch(searchQuery.trim()), 300);

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
					<button class="px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500"
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
					headName: `${head?.name || 'Unknown'}${head && head.status !== 'active' ? ' ⚠' : ''}`,
					memberCount: `${f.memberCount} member${f.memberCount === 1 ? '' : 's'}`,
					due: dueLabel(netDue(f)),
					actions: ''
				};
			})
	);

</script>

<div class="flex h-full flex-col">
	<div class="mb-4 flex-shrink-0 space-y-4">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-xl font-semibold text-gray-900">Families</h2>
			<p class="text-sm text-gray-500">{totalFamilies} total families</p>
		</div>
		<Button variant="primary" onclick={() => goto('/families/create')}>＋ New family</Button>
	</div>

	{#if $familyListStore.error}
		<div class="rounded-md bg-red-50 p-4 text-sm text-red-800">{$familyListStore.error}</div>
	{/if}

	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<input
			type="search"
			bind:value={searchQuery}
			oninput={() => debouncedSearch()}
			placeholder="Search families by member name or MSY id…"
			class="w-full max-w-md rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		/>
	</div>
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
					/>
				</div>
			</div>
		{/if}
	</div>
</div>
