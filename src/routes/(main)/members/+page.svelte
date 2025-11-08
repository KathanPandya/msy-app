<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { memberListStore } from '$lib/stores/memberListStore';
	import { truncateString } from '$lib/utilities/stringUtils';
	import { Filter, Plus, Search, X } from '@lucide/svelte';
	import { onMount } from 'svelte';

	// Load members on mount
	onMount(() => {
		console.log('memberListStore.members', $memberListStore.members);
		if ($memberListStore.members.length === 0) {
			memberListStore.fetchAllMembers();
		}
	});

	// Convert to $state (Svelte 5)
	// let userList = $state<any[]>([]);
	// let isLoading = $state(true);
	let searchQuery = $state('');

	// const fetchMemberList = async (query?: string) => {
	// 	isLoading = true;
	// 	userList = [];

	// 	try {
	// 		const response = await axios.get(
	// 			'api/user',
	// 			query
	// 				? {
	// 						params: {
	// 							first_name: query,
	// 							limit: 10
	// 						}
	// 					}
	// 				: {
	// 						params: {
	// 							limit: 10
	// 						}
	// 					}
	// 		);
	// 		userList = response.data.users || [];
	// 		return response.data;
	// 	} catch (error) {
	// 		userList = [];
	// 		console.error('Error while fetching user list', error);
	// 	} finally {
	// 		isLoading = false;
	// 	}
	// };

	// function handleInputChange(event: Event) {
	// 	const target = event.target as HTMLInputElement;
	// 	searchQuery = target.value;
	// 	debouncedSearchHandler(searchQuery);
	// }

	// const debouncedSearchHandler = debounce(memberListStore.searchMembers, 500);

	// function debounce<T extends (...args: any[]) => any>(
	// 	callbackFunc: T,
	// 	delay: number
	// ): (...args: Parameters<T>) => void {
	// 	let timer: ReturnType<typeof setTimeout>;
	// 	return (...args: Parameters<T>) => {
	// 		clearTimeout(timer);
	// 		timer = setTimeout(() => {
	// 			callbackFunc(...args);
	// 		}, delay);
	// 	};
	// }

	// function goToUpdate(user: any) {
	// 	if (user.status === 'dead') {
	// 		return;
	// 	}
	// 	goto(`/members/update/${user._id}`);
	// }

	if (typeof window !== 'undefined') {
		(window as any).navigateToMember = (id: string) => {
			goto(`/members/update/${id}`);
		};
	}

	// Table columns configuration
	const columns = [
		{ key: 'memberId', label: 'Member Id' },
		{
			key: 'modifiedName',
			label: 'Name',
			tooltip: (_: any, row: any) => {
				return row.name;
			},
			tooltipPosition: 'right' as const
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
				const isDeceased = row.status === 'dead';
				return `
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
    `;
			}
		}
	];

	// Transform user data for table
	const tableData = $derived(
		$memberListStore.members
			.filter((user) => {
				// Status filter
				if (filters.status && user.status !== filters.status) {
					return false;
				}

				// Gender filter
				if (filters.gender && user.gender !== filters.gender) {
					return false;
				}

				// Marital Status filter (if user has profile data)
				// if (filters.maritalStatus && user.marital_status !== filters.maritalStatus) {
				// 	return false;
				// }

				// Gotra filter (if user has profile data)
				// if (filters.gotra && user.profile?.gotra !== filters.gotra) {
				// 	return false;
				// }

				// Search query filter
				if (searchQuery) {
					const searchLower = searchQuery.toLowerCase();
					const fullName = `${user.first_name} ${user.surname}`.toLowerCase();
					const mobile = user.mobile || '';
					// const email = user.email || '';

					const matchesSearch = fullName.includes(searchLower) || mobile.includes(searchLower);
					// ||
					// email.includes(searchLower);

					if (!matchesSearch) {
						return false;
					}
				}

				return true;
			})
			.map((user) => ({
				memberId: user.member_id,
				_id: user._id,
				name: `${user.first_name} ${user.surname}${user.status === 'dead' ? ' 🔴' : ''}`,
				modifiedName:
					truncateString(`${user.first_name} ${user.surname}`, 20) +
					`${user.status === 'dead' ? ' 🔴' : ''}`,
				mobile: user.mobile || '-',
				// email: user.email || '-',
				gender: user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '-',
				status: user.status,
				actions: ''
			}))
	);

	// let searchQuery = $state('');
	let filters = $state({
		status: page.url.searchParams.get('filter') ?? '',
		gender: '',
		maritalStatus: '',
		gotra: ''
	});

	// Filter options
	const statusOptions = [
		{ key: '', label: 'All Status' },
		{ key: 'active', label: 'Active' },
		{ key: 'dead', label: 'Deceased' }
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
			gotra: ''
		};
	}

	function applyFilters() {
		console.log('Applying filters:', filters);
	}
</script>

<div class="flex h-full flex-col">
	<!-- Fixed Header - stays at top -->
	<div class="mb-4 flex-shrink-0">
		<!-- <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"> -->
		<!-- Search Input -->
		<!-- <div class="relative max-w-md flex-1"> -->
		<!-- <div class="relative max-w-md"> -->
		<!-- <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"> -->
		<!-- <Search class="h-5 w-5 text-gray-400" /> -->
		<!-- </div> -->
		<!-- <SearchInput -->
		<!-- id="member-search" -->
		<!-- bind:value={searchQuery} -->
		<!-- oninput={handleInputChange} -->
		<!-- placeholder="Search members..." -->
		<!-- /> -->
		<!-- </div> -->

		<!-- Add Member Button -->
		<!-- <Button variant="primary" onclick={() => goto('/members/create')}> -->
		<!-- <div class="flex items-center gap-2"> -->
		<!-- <Plus class="h-4 w-4" /> -->
		<!-- <span>Add Member</span> -->
		<!-- </div> -->
		<!-- </Button> -->
		<!-- </div> -->

		<div class="space-y-4">
			<!-- Search and Actions Row -->
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<!-- Search Input -->
				<div class="relative max-w-md flex-1">
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
						<Search class="h-5 w-5 text-gray-400" />
					</div>
					<SearchInput
						id="member-search"
						bind:value={searchQuery}
						placeholder="Search members by name or mobile..."
					/>
				</div>

				<!-- Add Member Button -->
				<Button variant="primary" onclick={() => goto('/members/create')}>
					<div class="flex items-center gap-2">
						<Plus class="h-4 w-4" />
						<span>Add Member</span>
					</div>
				</Button>
			</div>

			<!-- Filters Row -->
			<div class="rounded-lg border border-gray-200 bg-white p-4">
				<div class="flex flex-wrap items-center gap-3">
					<!-- Filter Icon and Label -->
					<div class="flex items-center gap-2 text-sm font-medium text-gray-700">
						<Filter class="h-4 w-4" />
						<span>Filters</span>
						{#if activeFilterCount > 0}
							<span
								class="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
							>
								{activeFilterCount}
							</span>
						{/if}
					</div>

					<!-- Filter Dropdowns -->
					<div class="flex flex-1 flex-wrap items-center gap-3">
						<!-- Status Filter -->
						<div class="w-40">
							<select
								bind:value={filters.status}
								onchange={applyFilters}
								class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
							>
								{#each statusOptions as option}
									<option value={option.key}>{option.label}</option>
								{/each}
							</select>
						</div>

						<!-- Gender Filter -->
						<div class="w-40">
							<select
								bind:value={filters.gender}
								onchange={applyFilters}
								class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
							>
								{#each genderOptions as option}
									<option value={option.key}>{option.label}</option>
								{/each}
							</select>
						</div>

						<!-- Marital Status Filter -->
						<!-- <div class="w-48">
							<select
								bind:value={filters.maritalStatus}
								onchange={applyFilters}
								class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
							>
								{#each maritalStatusOptions as option}
									<option value={option.key}>{option.label}</option>
								{/each}
							</select>
						</div> -->

						<!-- Gotra Filter -->
						<!-- <div class="w-40">
							<select
								bind:value={filters.gotra}
								onchange={applyFilters}
								class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
							>
								{#each gotraOptions as option}
									<option value={option.key}>{option.label}</option>
								{/each}
							</select>
						</div> -->
					</div>

					<!-- Clear Filters Button -->
					{#if hasActiveFilters}
						<button
							type="button"
							onclick={clearAllFilters}
							class="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
						>
							<X class="h-4 w-4" />
							Clear
						</button>
					{/if}
				</div>

				<!-- Active Filter Tags (Optional - shows what's filtered) -->
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
											applyFilters();
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
											applyFilters();
										}}
										class="hover:text-blue-900"
									>
										<X class="h-3 w-3" />
									</button>
								</span>
							{/if}

							{#if filters.maritalStatus}
								<span
									class="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
								>
									Marital: {maritalStatusOptions.find((o) => o.key === filters.maritalStatus)
										?.label}
									<button
										type="button"
										onclick={() => {
											filters.maritalStatus = '';
											applyFilters();
										}}
										class="hover:text-blue-900"
									>
										<X class="h-3 w-3" />
									</button>
								</span>
							{/if}

							{#if filters.gotra}
								<span
									class="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
								>
									Gotra: {gotraOptions.find((o) => o.key === filters.gotra)?.label}
									<button
										type="button"
										onclick={() => {
											filters.gotra = '';
											applyFilters();
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

		{#if !$memberListStore.isLoading && $memberListStore.members.length > 0}
			<p class="mt-4 text-sm text-gray-700">
				Showing <span class="font-medium">{tableData.length}</span>
				{tableData.length === 1 ? 'member' : 'members'}
			</p>
		{/if}
	</div>

	<!-- Scrollable Table Area - takes remaining space -->
	<div class="min-h-0 flex-1">
		{#if $memberListStore.isLoading}
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
		{:else if $memberListStore.members.length === 0}
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
				<p class="mt-1 text-sm text-gray-500">
					{searchQuery ? 'Try a different search term' : 'Get started by adding a new member'}
				</p>
				{#if !searchQuery}
					<div class="mt-6">
						<Button variant="primary" onclick={() => goto('/members/create')}>
							<Plus class="mr-2 h-4 w-4" />
							Add Member
						</Button>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Table container with border, rounded corners, and scroll -->
			<div class="h-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
				<div class="h-full overflow-y-auto">
					<Table {columns} data={tableData} />
				</div>
			</div>
		{/if}
	</div>
</div>
