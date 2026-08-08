<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import userApi from '$lib/endpoints/userApi';
	// import { memberListStore } from '$lib/stores/memberListStore';
	import type { User } from '$lib/types/user';
	import { debounce } from '$lib/utilities/helperFunc';
	import { GenericSort } from '$lib/utilities/sortingUtil';
	import { formatString, truncateString } from '$lib/utilities/stringUtils';
	import { ChevronDown, ChevronUp, Download, Filter, Plus, X } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { slide } from 'svelte/transition';

	const validLimits = APP_CONSTANTS.PAGINATION_OPTIONS.map((o) => Number(o.key));

	// The single source of truth for loading is the URL. This effect tracks
	// `page.url` and (re)syncs the controls + reloads whenever it changes:
	//   • initial mount / hard refresh — effects always run on mount, so the list
	//     always loads (with the ?filter=… params applied);
	//   • browser back/forward (popstate) — e.g. returning from a member's
	//     view/edit page. Effects run *after* navigation commits, so `page.url` is
	//     the destination URL here, not the stale value a $state initializer reads.
	// `lastLoadedSearch` de-dupes: our own syncUrl() writes (and any no-op URL
	// change) don't trigger a second fetch. syncUrl sets it before replaceState.
	let lastLoadedSearch: string | null = null;
	$effect(() => {
		const search = page.url.searchParams.toString(); // the only tracked dependency
		untrack(() => {
			if (search === lastLoadedSearch) return;
			lastLoadedSearch = search;
			applyStateFromUrl(page.url);
			loadInitial(page.url);
		});
	});

	function applyStateFromUrl(url: URL) {
		const sp = url.searchParams;

		searchQuery = sp.get('q') ?? '';

		const s = sp.get('sort');
		sortType = s === 'asc' || s === 'desc' ? s : '';
		sortBasedOn = s === 'asc' || s === 'desc' ? 'outstanding_amount' : 'member_id';

		const lim = Number(sp.get('limit'));
		limitPerPage = validLimits.includes(lim) ? lim : 50;

		filters = {
			status: sp.get('filter') ?? '',
			gender: sp.get('gender') ?? '',
			maritalStatus: '',
			gotra: '',
			balanceType: sp.get('balance') ?? '',
			amountOperator: sp.get('op') ?? '',
			amountValue: sp.get('amt') ?? ''
		};
	}

	async function loadInitial(url: URL = page.url) {
		const targetPage = Math.max(1, Number(url.searchParams.get('page')) || 1);

		// Reconstruct every page up to targetPage in one request so the paginated
		// window (and Prev/Next) behaves as if the user had paged there manually.
		currentPage = 0;
		memberList = [];
		const res = await getMembers(0, targetPage * limitPerPage);
		if (res) {
			memberList = res.users;
			totalUsers = res.total;
			currentPage = targetPage;
		}
	}

	function syncUrl() {
		const p = new URLSearchParams();
		if (searchQuery) p.set('q', searchQuery);
		if (filters.status) p.set('filter', filters.status);
		if (filters.gender) p.set('gender', filters.gender);
		if (filters.balanceType) p.set('balance', filters.balanceType);
		if (filters.amountOperator) p.set('op', filters.amountOperator);
		if (filters.amountValue !== '' && filters.amountValue != null)
			p.set('amt', String(filters.amountValue));
		if (sortType) p.set('sort', sortType);
		if (currentPage > 1) p.set('page', String(currentPage));
		if (limitPerPage !== 50) p.set('limit', String(limitPerPage));

		const qs = p.toString();
		if (qs === page.url.searchParams.toString()) return;
		// Record what we're about to write so the URL effect doesn't re-fetch for
		// our own change (user interactions already fetched via refreshMemberList).
		lastLoadedSearch = qs;
		// Use goto() (a real navigation), NOT replaceState() from $app/navigation.
		// replaceState is a shallow-routing primitive: it changes the address bar
		// but does not update page.url, and it persists the stale (params-less)
		// page.url.href into the history entry — so returning here via browser back
		// restores page.url WITHOUT our filters (the address bar keeps them, but the
		// controls + API refetch would reset). goto keeps page.url in sync and lets
		// popstate restore from the real URL. keepFocus/noScroll avoid the select
		// losing focus / the list jumping while the user is still filtering.
		goto(qs ? `${page.url.pathname}?${qs}` : page.url.pathname, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	const initialSort = page.url.searchParams.get('sort');
	const initialLimit = Number(page.url.searchParams.get('limit'));

	let searchQuery = $state(page.url.searchParams.get('q') ?? '');
	// let amountOperator = $state('');
	// let amountValue = $state<any>(null);
	let sortType = $state<'asc' | 'desc' | ''>(
		initialSort === 'asc' || initialSort === 'desc' ? initialSort : ''
	);
	let sortBasedOn = $state<string>(
		initialSort === 'asc' || initialSort === 'desc' ? 'outstanding_amount' : 'member_id'
	);
	let showFilters = $state(false);
	let errors = $state<null | string>(null);
	let isLoading = $state(false);
	let memberList = $state<User.List>([]);
	let currentPage = $state(0);
	let limitPerPage = $state(validLimits.includes(initialLimit) ? initialLimit : 50);
	let totalUsers = $state<number>(0);
	const totalPages = $derived(Math.ceil(totalUsers / limitPerPage));
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
	const amountOperatorOptions = [
		{ label: 'Sort Outstanding Amount', key: '' },
		{ label: 'Greater than (>)', key: '>' },
		{ label: 'Less than (<)', key: '<' },
		{ label: 'Equal to (=)', key: '=' }
	];

	if (typeof window !== 'undefined') {
		(window as any).navigateToMember = (id: string) => {
			goto(`/members/view/${id}`);
		};
	}

	// async function handlePagination(type: 'next' | 'previous') {
	// 	if (type === 'next') {
	// 		isLoading = true;
	// 		const skip = currentPage * limitPerPage;
	// 		try {
	// 			const res = await userApi.getAllUsers({
	// 				limit: limitPerPage,
	// 				skip: skip,
	// 				query: searchQuery || undefined
	// 			});
	// 			memberList = [...memberList, ...res.users];
	// 			totalUsers = res.total;
	// 			currentPage = currentPage + 1;
	// 			isLoading = false;
	// 		} catch (err: any) {
	// 			errors = err.message || 'Error while fetching members';
	// 			isLoading = false;
	// 		}
	// 	} else {
	// 		currentPage = currentPage - 1;
	// 	}

	// 	if (currentPage === 1) {
	// 		paginationConfig.previous.disabled = true;
	// 	} else {
	// 		paginationConfig.previous.disabled = false;
	// 	}

	// 	if (Math.ceil(totalUsers / limitPerPage) === currentPage) {
	// 		paginationConfig.next.disabled = true;
	// 	} else {
	// 		paginationConfig.next.disabled = false;
	// 	}
	// }

	function changeLimit(v: string) {
		limitPerPage = Number(v);
		currentPage = 0;
		memberList = [];
		goNext();
	}

	async function goNext(force: boolean = false) {
		if (!force) {
			if (isLoading || !canGoNext) return;
		}

		const res = await getMembers();

		if (res) {
			memberList = [...memberList, ...res.users];
			totalUsers = res.total;
			currentPage += 1;
			syncUrl();
		}
	}

	async function refreshMemberList() {
		currentPage = 0;
		memberList = [];
		const res = await getMembers();
		if (res) {
			memberList = res.users;
			totalUsers = res.total;
			currentPage = currentPage + 1;
		}
		syncUrl();
	}

	function goPrevious() {
		if (!canGoPrevious) return;
		currentPage -= 1;
		syncUrl();
	}

	function handleAmountInput(event: Event) {
		// const target = event.target as HTMLInputElement;
		// amountValue = target.value;
		// tableData = tableData.filter((t) => {
		// 	if (!amountOperator || !amountValue) return true;
		// 	const amount = parseFloat(amountValue);
		// 	switch (amountOperator) {
		// 		case '>':
		// 			return t.heesab > amount;
		// 		case '<':
		// 			return t.heesab < amount;
		// 		case '=':
		// 			return t.heesab === amount;
		// 		case '>=':
		// 			return t.heesab >= amount;
		// 		case '<=':
		// 			return t.heesab <= amount;
		// 		default:
		// 			return true;
		// 	}
		// });
	}

	// Table columns configuration
	const columns = $derived([
		{ key: 'memberId', label: 'Member Id' },
		{
			key: 'modifiedName',
			label: 'Name',
			tooltip: (_: any, row: any) => {
				return row.name;
			},
			tooltipPosition: 'right' as const
		},
		{
			key: 'heesab',
			label: 'Balance',
			render: (value: any) => {
				const n = Number(value) || 0;
				// Negative outstanding = credit (surplus) → +amount pill; positive = debit (owes) → red pill.
				// Pills use OKLCH (uniform lightness across hues) per the modern-css skill.
				const pill =
					'display:inline-block;min-width:2.5rem;text-align:center;padding:0.125rem 0.5rem;border-radius:999px;font-weight:600;font-size:0.75rem;';
				if (n < 0)
					return `<span style="${pill}color:oklch(45% 0.13 150);background:oklch(95% 0.05 150)">+${Math.abs(n)}</span>`;
				if (n > 0)
					return `<span style="${pill}color:oklch(50% 0.2 27);background:oklch(95% 0.045 27)">${n}</span>`;
				return `<span style="color:oklch(65% 0.01 264)">—</span>`;
			},
			sorting: (row: any) => {
				sortType = sortType === '' ? 'desc' : sortType === 'desc' ? 'asc' : '';
				if (sortType == 'asc' || sortType == 'desc') {
					sortBasedOn = 'outstanding_amount';
					refreshMemberList();
					// tableData = [...GenericSort(row, 'heesab', sortType)];
				} else {
					sortBasedOn = 'member_id';
					refreshMemberList();
					// tableData = [...GenericSort(row, 'memberIdInNumber', 'asc')];
				}
			},
			icon: sortType === 'asc' ? 'arrowUp' : sortType === 'desc' ? 'arrowDown' : 'rupee'
		},
		{ key: 'mobile', label: 'Mobile' },
		// { key: 'email', label: 'Email' },
		{ key: 'gender', label: 'Gender' },
		{
			key: 'actions',
			label: 'Actions',
			align: 'right' as const,
			render: (_: any, row: any) => {
				// const user = $memberListStore.members.find((u) => u._id === row._id);
				const isDeceased = false;
				return `
				<div class='flex justify-content-start'>
					<button class="px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
						isDeceased
							? 'bg-white text-gray-400 border border-gray-200 cursor-not-allowed opacity-50'
							: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500'
					}"
				${isDeceased ? 'disabled' : ''}
				onclick="window.navigateToMember('${row._id}')"
			>
				View/Edit
			</button>
			</div>
		`;
			}
		}
	]);

	// Transform user data for table
	let tableData = $derived(
		GenericSort(
			// $memberListStore.members
			// .filter((user) => {
			// 	// Status filter
			// 	if (filters.status && user.status !== filters.status) {
			// 		return false;
			// 	}

			// 	// Gender filter
			// 	if (filters.gender && user.gender !== filters.gender) {
			// 		return false;
			// 	}

			// 	// Search query filter
			// 	if (searchQuery) {
			// 		const searchLower = searchQuery.toLowerCase();
			// 		const fullName = `${user.first_name} ${user.surname}`.toLowerCase();
			// 		const mobile = user.mobile || '';

			// 		const matchesSearch = fullName.includes(searchLower) || mobile.includes(searchLower);

			// 		if (!matchesSearch) {
			// 			return false;
			// 		}
			// 	}

			// 	if (!amountOperator || !amountValue) return true;
			// 	const amount = parseFloat(amountValue);
			// 	switch (amountOperator) {
			// 		case '>':
			// 			return user.outstanding_amount > amount;
			// 		case '<':
			// 			return user.outstanding_amount < amount;
			// 		case '=':
			// 			return user.outstanding_amount === amount;
			// 		case '>=':
			// 			return user.outstanding_amount >= amount;
			// 		case '<=':
			// 			return user.outstanding_amount <= amount;
			// 	}

			// 	return true;
			// })

			memberList
				.slice((currentPage - 1) * limitPerPage, limitPerPage * currentPage)
				.map((user) => ({
					memberId: user.member_id,
					memberIdInNumber: Number(user.member_id.replace('MSY_', '')),
					_id: user._id,
					name: `${user.first_name} ${user.surname}${user.status === 'dead' ? ' 🔴' : ''}`,
					modifiedName:
						truncateString(`${user.first_name} ${user.surname}`, 20) +
						`${user.status === 'dead' ? ' 🔴' : ''}`,
					mobile: user.mobile || '-',
					gender: user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '-',
					status: user.status,
					actions: '',
					heesab: user.outstanding_amount
				})),
			sortType == '' ? 'memberIdInNumber' : 'heesab',
			sortType == '' ? 'asc' : sortType
		)
	);

	// let searchQuery = $state('');
	let filters = $state({
		status: page.url.searchParams.get('filter') ?? '',
		gender: page.url.searchParams.get('gender') ?? '',
		maritalStatus: '',
		gotra: '',
		balanceType: page.url.searchParams.get('balance') ?? '',
		amountOperator: page.url.searchParams.get('op') ?? '',
		amountValue: page.url.searchParams.get('amt') ?? ''
	});

	// Balance filter: debit = owes money (outstanding > 0), credit = surplus (outstanding < 0)
	const balanceTypeOptions = [
		{ key: '', label: 'Any balance' },
		{ key: 'debit', label: 'In debit' },
		{ key: 'credit', label: 'In credit' }
	];

	// Filter options
	const statusOptions = [
		{ key: '', label: 'All Status' },
		{ key: 'active', label: 'Active' },
		{ key: 'dead', label: 'Deceased' },
		{ key: 'removed', label: 'Removed' },
		{ key: 'voluntary-retired', label: 'Voluntary Retired' }
	];

	const genderOptions = [
		{ key: '', label: 'All Genders' },
		{ key: 'male', label: 'Male' },
		{ key: 'female', label: 'Female' },
		{ key: 'other', label: 'Other' }
	];

	const maritalStatusOptions = [
		{ key: '', label: 'All Marital Status' },
		{ key: 'single', label: 'Single' },
		{ key: 'married', label: 'Married' },
		{ key: 'divorced', label: 'Divorced' },
		{ key: 'widowed', label: 'Widowed' }
	];

	const gotraOptions = [
		{ key: '', label: 'All Gotras' },
		{ key: 'gotra1', label: 'Gotra 1' },
		{ key: 'gotra2', label: 'Gotra 2' }
		// Add your actual gotras
	];

	// Check if any filters are active
	const hasActiveFilters = $derived(Object.values(filters).some((value) => value !== ''));

	//   function handleInputChange(event: Event) {
	//     const target = event.target as HTMLInputElement;
	//     searchQuery = target.value;
	//     // Your search logic
	//   }

	function clearAllFilters() {
		filters = {
			status: '',
			gender: '',
			maritalStatus: '',
			gotra: '',
			balanceType: '',
			amountOperator: '',
			amountValue: ''
		};
		refreshMemberList();
	}

	function toggleFilters() {
		showFilters = !showFilters;
	}

	function downloadTableData() {
		const copyOfTableData = tableData.map((tD) => {
			return {
				MemberID: tD.memberId,
				Name: tD.name,
				Status: formatString(tD.status, ['capitalize-first']),
				Balance: tD.heesab < 0 ? `+${Math.abs(tD.heesab)}` : `${tD.heesab ?? 0}`,
				Mobile: tD.mobile,
				Gender: tD.gender
			};
		});

		const titleKeys = Object.keys(copyOfTableData[0]);

		const refinedData = [];
		refinedData.push(titleKeys);

		copyOfTableData.forEach((item) => {
			refinedData.push(Object.values(item));
		});

		let csvContent = '';

		refinedData.forEach((row) => {
			csvContent += row.join(',') + '\n';
		});

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8,' });
		const objUrl = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', objUrl);
		link.setAttribute('download', 'Member-List.csv');
		link.textContent = 'Click to Download';

		link.click();
	}

	const debouncedSearch = debounce(refreshMemberList, 300);

	async function getMembers(skipOverride?: number, limitOverride?: number) {
		errors = '';
		isLoading = true;
		try {
			const skip = skipOverride ?? currentPage * limitPerPage;
			const limit = limitOverride ?? limitPerPage;

			// Manual amount filter (operation + amount). Don't treat 0 as "empty" —
			// an explicit 0 is a valid amount to filter on.
			const operation = (APP_CONSTANTS.OPERATOR_MAPPING as any)[filters.amountOperator];
			const rawAmount = filters.amountValue;
			const hasAmount =
				rawAmount !== '' &&
				rawAmount !== null &&
				rawAmount !== undefined &&
				!Number.isNaN(Number(rawAmount));
			const amount = hasAmount ? Number(rawAmount) : undefined;

			// Balance dropdown: backend handles debit (> 0) / credit (< 0) via balance_type.
			const balanceType =
				filters.balanceType === 'debit' || filters.balanceType === 'credit'
					? filters.balanceType
					: undefined;

			const res = await userApi.getAllUsers({
				limit: limit,
				skip: skip,
				query: searchQuery || undefined,
				sortOnKey: sortBasedOn,
				sortType: sortType ? sortType : undefined,
				member_status: filters.status ? filters.status : undefined,
				operation: operation,
				amount: amount,
				balance_type: balanceType
			});
			return res;
		} catch (err: any) {
			errors = err?.message || 'Error while fetching members';
			memberList = [];
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="members-page flex h-full flex-col">
	<!-- Compact toolbar - stays at top -->
	<div class="mb-3 flex-shrink-0 space-y-2">
		<!-- Single toolbar row: search + count + filters + download + add -->
		<div class="flex flex-wrap items-center gap-2 sm:gap-3">
			<!-- Search (SearchInput ships its own icon — no duplicate needed) -->
			<div class="min-w-0 flex-1">
				<SearchInput
					id="member-search"
					bind:value={searchQuery}
					placeholder="Search members by name or mobile…"
					oninput={() => debouncedSearch()}
				/>
			</div>

			<!-- Filters toggle -->
			<button
				onclick={toggleFilters}
				aria-expanded={showFilters}
				class="btn-ghost inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium"
			>
				<Filter class="h-4 w-4" />
				<span class="hidden sm:inline">Filters</span>
				{#if showFilters}
					<ChevronUp class="h-4 w-4" />
				{:else}
					<ChevronDown class="h-4 w-4" />
				{/if}
			</button>

			<!-- Add Member Button -->
			<Button variant="primary" onclick={() => goto('/members/create')}>
				<div class="flex items-center gap-2">
					<Plus class="h-4 w-4" />
					<span class="hidden sm:inline">Add Member</span>
					<span class="sm:hidden">Add</span>
				</div>
			</Button>
		</div>

		<!-- Collapsible filters — horizontal row -->
		{#if showFilters}
			<div class="flex flex-wrap items-center gap-2" transition:slide={{ duration: 150 }}>
				<select bind:value={filters.status} onchange={refreshMemberList} class="field field-sm">
					{#each statusOptions as option}
						<option value={option.key}>{option.label}</option>
					{/each}
				</select>
				<select bind:value={filters.gender} onchange={refreshMemberList} class="field field-sm">
					{#each genderOptions as option}
						<option value={option.key}>{option.label}</option>
					{/each}
				</select>
				<select bind:value={filters.balanceType} onchange={refreshMemberList} class="field field-sm">
					{#each balanceTypeOptions as option}
						<option value={option.key}>{option.label}</option>
					{/each}
				</select>
				<select
					id="amount-operator"
					bind:value={filters.amountOperator}
					onchange={() => {
						if (filters.amountValue !== null && filters.amountValue !== '') {
							refreshMemberList();
						}
					}}
					class="field field-sm"
				>
					{#each amountOperatorOptions as option}
						<option value={option.key}>{option.label}</option>
					{/each}
				</select>
				{#if filters.amountOperator}
					<div class="w-full sm:w-40">
						<Input
							id="amount-value"
							type="number"
							bind:value={filters.amountValue}
							placeholder="Amount"
							onChange={() => {
								if (filters.amountValue !== null && filters.amountValue !== '') {
									debouncedSearch();
								}
							}}
						/>
					</div>
				{/if}
				{#if hasActiveFilters}
					<button
						type="button"
						onclick={clearAllFilters}
						class="btn-ghost inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium"
					>
						<X class="h-4 w-4" />
						Clear
					</button>
				{/if}
			</div>
		{/if}

		<!-- Active filter tags (only when filters are applied) -->
		{#if hasActiveFilters}
			<div class="flex flex-wrap items-center gap-2">
				{#if filters.status}
					<span class="chip inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium">
						Status: {statusOptions.find((o) => o.key === filters.status)?.label}
						<button
							type="button"
							onclick={() => {
								filters.status = '';
								refreshMemberList();
							}}
						>
							<X class="h-3 w-3" />
						</button>
					</span>
				{/if}
				{#if filters.gender}
					<span class="chip inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium">
						Gender: {genderOptions.find((o) => o.key === filters.gender)?.label}
						<button
							type="button"
							onclick={() => {
								filters.gender = '';
								refreshMemberList();
							}}
						>
							<X class="h-3 w-3" />
						</button>
					</span>
				{/if}
				{#if filters.balanceType}
					<span class="chip inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium">
						Balance: {balanceTypeOptions.find((o) => o.key === filters.balanceType)?.label}
						<button
							type="button"
							onclick={() => {
								filters.balanceType = '';
								refreshMemberList();
							}}
						>
							<X class="h-3 w-3" />
						</button>
					</span>
				{/if}
				{#if filters.amountOperator || filters.amountValue}
					<span class="chip inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium">
						Amount: {filters.amountOperator}
						{filters.amountValue}
						<button
							type="button"
							onclick={() => {
								filters.amountOperator = '';
								filters.amountValue = '';
								refreshMemberList();
							}}
						>
							<X class="h-3 w-3" />
						</button>
					</span>
				{/if}
			</div>
		{/if}

		<!-- Directly above the table: result range (left) + download (right) -->
		{#if !isLoading && memberList.length > 0}
			<div class="flex items-center justify-between">
				<span class="t-muted text-xs whitespace-nowrap">
					{tableData.length ? (currentPage - 1) * limitPerPage + 1 : 0}–{(currentPage - 1) *
						limitPerPage +
						tableData.length} of {totalUsers.toLocaleString()}
				</span>
				<!-- Web-platform tooltip (native title) instead of a JS tooltip script -->
				<button
					type="button"
					class="btn-ghost inline-flex items-center rounded-md p-2"
					title="Download CSV"
					aria-label="Download"
					onclick={downloadTableData}
				>
					<Download class="h-4 w-4" />
				</button>
			</div>
		{/if}
	</div>

	<!-- Scrollable Table Area - takes remaining space -->
	<div class="min-h-0 flex-1">
		{#if isLoading}
			<div class="surface flex h-full items-center justify-center rounded-lg border shadow-sm">
				<div class="text-center">
					<div
						class="spinner inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid motion-reduce:animate-none"
					></div>
					<p class="t-2 mt-2 text-sm">Loading members...</p>
				</div>
			</div>
		{:else if errors}
			<div class="surface-error mt-4 rounded-md p-4">
				<p class="text-sm">{errors}</p>
			</div>
		{:else if memberList.length === 0}
			<div
				class="surface flex h-full flex-col items-center justify-center rounded-lg border shadow-sm"
			>
				<svg class="t-muted h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
					/>
				</svg>
				<h3 class="t-1 mt-2 text-sm font-medium text-balance">No members found</h3>
				<p class="t-muted mt-1 text-sm text-pretty">Try changing your search or filters</p>
			</div>
		{:else}
			<!-- Table container with border, rounded corners, and scroll -->
			<div class="surface h-full overflow-hidden rounded-lg border shadow-sm">
				<div class="scroll-area h-full overflow-y-auto" id="tableContainer">
					<Table
						pagination={paginationConfig}
						{columns}
						data={tableData}
						onNext={goNext}
						onPrevious={goPrevious}
						onLimitChange={changeLimit}
					/>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/*
	 * Modern-CSS design tokens for the members page.
	 * Colors are authored in OKLCH (uniform lightness across hues) and wrapped in
	 * light-dark() so dark values are ready. `color-scheme` is pinned to `light`
	 * for now to stay consistent with the rest of the (light-only) app — switch it
	 * to `light dark` to light up dark mode once the app-wide chrome supports it.
	 */
	.members-page {
		color-scheme: light;

		--brand: oklch(54% 0.22 264);

		--surface-1: light-dark(oklch(100% 0 0), oklch(21% 0.02 264));
		--surface-2: light-dark(oklch(97% 0.004 264), oklch(26% 0.02 264));
		--border-1: light-dark(oklch(91% 0.006 264), oklch(35% 0.02 264));

		--text-1: light-dark(oklch(27% 0.02 264), oklch(96% 0.01 264));
		--text-2: light-dark(oklch(44% 0.02 264), oklch(80% 0.01 264));
		--text-muted: light-dark(oklch(60% 0.015 264), oklch(66% 0.01 264));

		--accent-bg: light-dark(oklch(93% 0.05 264), oklch(36% 0.09 264));
		--accent-fg: light-dark(oklch(45% 0.17 264), oklch(86% 0.07 264));

		--neg: light-dark(oklch(56% 0.21 27), oklch(72% 0.2 27));
		--neg-bg: light-dark(oklch(96% 0.03 27), oklch(30% 0.09 27));

		/* Tints native form controls (checkboxes, number spinners, focus) */
		accent-color: var(--brand);
		color: var(--text-1);
	}

	/* Surfaces & text tokens */
	.surface {
		background: var(--surface-1);
		border-color: var(--border-1);
		color: var(--text-1);
	}
	.surface-error {
		background: var(--neg-bg);
		color: var(--neg);
	}
	.t-1 {
		color: var(--text-1);
	}
	.t-2 {
		color: var(--text-2);
	}
	.t-muted {
		color: var(--text-muted);
	}

	.badge,
	.chip {
		background: var(--accent-bg);
		color: var(--accent-fg);
	}
	.chip button {
		opacity: 0.7;
	}
	.chip button:hover {
		opacity: 1;
	}

	.btn-ghost {
		background: var(--surface-2);
		color: var(--text-2);
	}
	/* Relative color syntax: derive the hover shade from the base color */
	.btn-ghost:hover {
		background: oklch(from var(--surface-2) calc(l - 0.04) c h);
	}

	/* Native, themeable selects — logical padding, progressive enhancement */
	.field {
		inline-size: 100%;
		padding-block: 0.5rem;
		padding-inline: 0.75rem;
		border: 1px solid var(--border-1);
		border-radius: 0.375rem;
		background: var(--surface-1);
		color: var(--text-1);
		font-size: 0.875rem;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}
	/* Compact variant for the inline filter toolbar — sized to content on all
	 * screens so the selects sit inline like compact pills. */
	.field-sm {
		inline-size: auto;
		padding-block: 0.375rem;
		font-size: 0.8125rem;
	}
	.field:focus-visible {
		outline: none;
		border-color: transparent;
		box-shadow: 0 0 0 2px var(--brand);
	}
	/* Surface validity only after the user has interacted */
	.field:user-invalid {
		border-color: var(--neg);
		box-shadow: 0 0 0 2px var(--neg);
	}
	/* Fully stylable <select> where the engine supports it */
	@supports (appearance: base-select) {
		.field {
			appearance: base-select;
		}
	}

	.spinner {
		border-color: var(--brand);
		border-inline-end-color: transparent;
	}

	/* Balanced / pretty text wrapping */
	.members-page h3 {
		text-wrap: balance;
	}
	.members-page p {
		text-wrap: pretty;
	}

	/* Modern scrollbar styling */
	.scroll-area {
		scrollbar-color: var(--border-1) transparent;
		scrollbar-width: thin;
	}

	/*
	 * Restyle the shared <Table> for this page only (scoped :global so the
	 * component itself is untouched and other pages keep their look).
	 */
	.members-page :global(table thead th) {
		background: var(--surface-2);
		color: var(--text-muted);
		border-block-end: 1px solid var(--border-1);
		letter-spacing: 0.06em;
	}
	.members-page :global(table tbody td) {
		color: var(--text-1);
		border-color: var(--border-1);
	}
	.members-page :global(table tbody tr) {
		transition: background-color 0.12s ease;
	}
	.members-page :global(table tbody tr:hover) {
		background: color-mix(in oklab, var(--brand) 7%, transparent);
	}

	/* Subtle staggered entrance; disabled for reduced-motion users */
	@media (prefers-reduced-motion: no-preference) {
		.members-page > * {
			animation: rise 0.35s ease both;
		}
		.members-page > *:nth-child(2) {
			animation-delay: 0.05s;
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	/* Respect user preferences */
	@media (prefers-contrast: more) {
		.surface,
		.field {
			border-width: 2px;
		}
	}
</style>
