<script lang="ts">
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import userApi from '$lib/endpoints/userApi';
	// import { memberListStore } from '$lib/stores/memberListStore';
	import type { User } from '$lib/types/user';
	import { debounce } from '$lib/utilities/helperFunc';
	import { GenericSort } from '$lib/utilities/sortingUtil';
	import { formatString, truncateString } from '$lib/utilities/stringUtils';
	import { ChevronDown, ChevronUp, Download, Filter, Plus, Search, X } from '@lucide/svelte';
	import { onMount } from 'svelte';

	const validLimits = APP_CONSTANTS.PAGINATION_OPTIONS.map((o) => Number(o.key));

	// Initial state is read from the URL (see the $state initializers below) so the
	// controls render already in sync. On mount we only need to load the data.
	onMount(() => {
		loadInitial();
	});

	async function loadInitial() {
		const targetPage = Math.max(1, Number(page.url.searchParams.get('page')) || 1);

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
		replaceState(qs ? `${page.url.pathname}?${qs}` : page.url.pathname, {});
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
				// Negative outstanding = credit (surplus) → show +amount; positive = debit (owes) → plain number.
				if (n < 0) return `<span class="font-medium text-green-600">+${Math.abs(n)}</span>`;
				if (n > 0) return `<span class="font-medium text-red-600">${n}</span>`;
				return `<span class="text-gray-500">0</span>`;
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

	// Count active filters
	const activeFilterCount = $derived(Object.values(filters).filter((value) => value !== '').length);

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

<div class="flex h-full flex-col">
	<!-- Fixed Header - stays at top -->
	<div class="mb-4 flex-shrink-0 space-y-4">
		<!-- Search and Actions Row -->
		<div class="flex items-center gap-3">
			<!-- Search Input -->
			<div class="relative flex-1">
				<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
					<Search class="h-5 w-5 text-gray-400" />
				</div>
				<SearchInput
					id="member-search"
					bind:value={searchQuery}
					placeholder="Search members..."
					oninput={() => debouncedSearch()}
				/>
			</div>

			<!-- Add Member Button -->
			<Button variant="primary" onclick={() => goto('/members/create')}>
				<div class="flex items-center gap-2">
					<Plus class="h-4 w-4" />
					<span class="hidden sm:inline">Add Member</span>
					<span class="sm:hidden">Add</span>
				</div>
			</Button>
		</div>

		<!-- Filters Section -->
		<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
			<!-- Filter Header - Always Visible -->
			<button
				onclick={toggleFilters}
				class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 lg:cursor-default lg:hover:bg-white"
			>
				<div class="flex items-center gap-2">
					<Filter class="h-4 w-4 text-gray-700" />
					<span class="text-sm font-medium text-gray-700">Filters</span>
					{#if activeFilterCount > 0}
						<span
							class="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
						>
							{activeFilterCount}
						</span>
					{/if}
				</div>

				<!-- Toggle Icon - Only visible on mobile/tablet -->
				<div class="lg:hidden">
					{#if showFilters}
						<ChevronUp class="h-5 w-5 text-gray-500" />
					{:else}
						<ChevronDown class="h-5 w-5 text-gray-500" />
					{/if}
				</div>
			</button>

			<!-- Collapsible Filter Content -->
			<div class="lg:block {showFilters ? 'block' : 'hidden'}">
				<div class="border-t border-gray-200 p-4">
					<div class="flex flex-wrap items-center gap-3">
						<!-- Filter Dropdowns -->
						<div class="flex flex-1 flex-wrap items-center gap-3">
							<!-- Status Filter -->
							<div class="w-full sm:w-40">
								<select
									bind:value={filters.status}
									onchange={refreshMemberList}
									class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
								>
									{#each statusOptions as option}
										<option value={option.key}>{option.label}</option>
									{/each}
								</select>
							</div>

							<!-- Gender Filter -->
							<div class="w-full sm:w-40">
								<select
									bind:value={filters.gender}
									onchange={refreshMemberList}
									class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
								>
									{#each genderOptions as option}
										<option value={option.key}>{option.label}</option>
									{/each}
								</select>
							</div>

							<!-- Balance Filter -->
							<div class="w-full sm:w-40">
								<select
									bind:value={filters.balanceType}
									onchange={refreshMemberList}
									class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
								>
									{#each balanceTypeOptions as option}
										<option value={option.key}>{option.label}</option>
									{/each}
								</select>
							</div>

							<!-- Amount Operator Filter -->
							<div class="w-full sm:w-56">
								<Select
									id="amount-operator"
									bind:value={filters.amountOperator}
									options={amountOperatorOptions}
									onchange={() => {
										console.log('filters.amountValue', filters.amountValue);
										if (filters.amountValue !== null && filters.amountValue !== '') {
											refreshMemberList();
										}
									}}
								/>
							</div>

							<!-- Amount Value Input -->
							{#if filters.amountOperator}
								<div class="w-full sm:w-48">
									<Input
										id="amount-value"
										type="number"
										bind:value={filters.amountValue}
										placeholder="Enter amount"
										onChange={() => {
											if (filters.amountValue !== null && filters.amountValue !== '') {
												debouncedSearch();
											}
										}}
									/>
								</div>
							{/if}
						</div>

						<!-- Clear Filters Button -->
						{#if hasActiveFilters}
							<button
								type="button"
								onclick={clearAllFilters}
								class="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:w-auto"
							>
								<X class="h-4 w-4" />
								Clear
							</button>
						{/if}
					</div>

					<!-- Active Filter Tags -->
					{#if hasActiveFilters}
						<div class="mt-3 border-t border-gray-200 pt-3">
							<div class="flex flex-wrap items-center gap-2">
								<span class="text-xs font-medium text-gray-500">Active:</span>

								{#if filters.status}
									<span
										class="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
									>
										Status: {statusOptions.find((o) => o.key === filters.status)?.label}
										<button
											type="button"
											onclick={() => {
												filters.status = '';
												refreshMemberList();
											}}
											class="hover:text-blue-900"
										>
											<X class="h-3 w-3" />
										</button>
									</span>
								{/if}

								{#if filters.gender}
									<span
										class="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
									>
										Gender: {genderOptions.find((o) => o.key === filters.gender)?.label}
										<button
											type="button"
											onclick={() => {
												filters.gender = '';
												refreshMemberList();
											}}
											class="hover:text-blue-900"
										>
											<X class="h-3 w-3" />
										</button>
									</span>
								{/if}

								{#if filters.balanceType}
									<span
										class="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
									>
										Balance: {balanceTypeOptions.find((o) => o.key === filters.balanceType)?.label}
										<button
											type="button"
											onclick={() => {
												filters.balanceType = '';
												refreshMemberList();
											}}
											class="hover:text-blue-900"
										>
											<X class="h-3 w-3" />
										</button>
									</span>
								{/if}

								{#if filters.amountOperator || filters.amountValue}
									<span
										class="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
									>
										Amount: {filters.amountOperator}
										{filters.amountValue}
										<button
											type="button"
											onclick={() => {
												filters.amountOperator = '';
												filters.amountValue = '';
												refreshMemberList();
											}}
											class="hover:text-blue-900"
										>
											<X class="h-3 w-3" />
										</button>
									</span>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Results Count and Download -->
		{#if !isLoading && memberList.length > 0}
			<div class="flex w-full items-center justify-between">
				<p class="text-sm text-gray-700">
					Showing
					<span class="font-medium">
						{tableData.length ? (currentPage - 1) * limitPerPage + 1 : 0}–{(currentPage - 1) *
							limitPerPage +
							tableData.length}
					</span>
					of <span class="font-medium">{totalUsers}</span>
					{totalUsers === 1 ? 'member' : 'members'}
				</p>

				<Tooltip text="Download" position={'left'}>
					<span class="cursor-help">
						<Download
							size={'20px'}
							onclick={downloadTableData}
							class="cursor-pointer text-sm text-gray-700"
						/>
					</span>
				</Tooltip>
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
					<p class="mt-2 text-sm text-gray-600">Loading members...</p>
				</div>
			</div>
		{:else if errors}
			<div class="mt-4 rounded-md bg-red-50 p-4">
				<p class="text-sm text-red-800">{errors}</p>
			</div>
		{:else if memberList.length === 0}
			<div
				class="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm"
			>
				<svg class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No members found</h3>
				<p class="mt-1 text-sm text-gray-500">Try changing your search or filters</p>
			</div>
		{:else}
			<!-- Table container with border, rounded corners, and scroll -->
			<div class="h-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
				<div class="h-full overflow-y-auto" id="tableContainer">
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
