<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import axios from '$lib/config/axios';
	import { Plus, Search } from '@lucide/svelte';
	import { onMount } from 'svelte';

	// Convert to $state (Svelte 5)
	let userList = $state<any[]>([]);
	let isLoading = $state(true);
	let searchQuery = $state('');

	const fetchMemberList = async (query?: string) => {
		isLoading = true;
		userList = [];

		try {
			const response = await axios.get(
				'api/user',
				query
					? {
							params: {
								first_name: query
							}
						}
					: {}
			);
			userList = response.data.users || [];
			return response.data;
		} catch (error) {
			userList = [];
			console.error('Error while fetching user list', error);
		} finally {
			isLoading = false;
		}
	};

	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		searchQuery = target.value;
		debouncedSearchHandler(searchQuery);
	}

	const debouncedSearchHandler = debounce(fetchMemberList, 500);

	function debounce<T extends (...args: any[]) => any>(
		callbackFunc: T,
		delay: number
	): (...args: Parameters<T>) => void {
		let timer: ReturnType<typeof setTimeout>;
		return (...args: Parameters<T>) => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				callbackFunc(...args);
			}, delay);
		};
	}

	onMount(() => {
		fetchMemberList();
	});

	function goToUpdate(user: any) {
		if (user.status === 'dead') {
			return;
		}
		goto(`/members/update/${user._id}`);
	}

	// Table columns configuration
	const columns = [
		{ key: 'name', label: 'Name' },
		{ key: 'mobile', label: 'Mobile' },
		{ key: 'email', label: 'Email' },
		{ key: 'gender', label: 'Gender' },
		{
			key: 'actions',
			label: 'Actions',
			align: 'right' as const,
			render: (value: any, row: any) => {
				const user = userList.find((u) => u._id === row._id);
				const isDeceased = row.status === 'dead';
				return `
					<button 
						class="px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
							isDeceased
								? 'bg-white text-gray-400 border border-gray-200 cursor-not-allowed opacity-50'
								: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500'
						}"
						${isDeceased ? 'disabled' : ''}
						onclick="window.location.href='/members/update/${row._id}'"
					>
						View/Edit
					</button>
				`;
			}
		}
	];

	// Transform user data for table
	const tableData = $derived(
		userList.map((user) => ({
			_id: user._id,
			name: `${user.first_name} ${user.surname}${user.status === 'dead' ? ' 🔴' : ''}`,
			mobile: user.mobile || '-',
			email: user.email || '-',
			gender: user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '-',
			status: user.status,
			actions: '' // Placeholder, actual rendering handled by column.render
		}))
	);
</script>

<div class="h-full flex flex-col">
  <!-- Fixed Header - stays at top -->
  <div class="flex-shrink-0 mb-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <!-- Search Input -->
      <div class="relative max-w-md flex-1">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search class="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="search"
          oninput={handleInputChange}
          value={searchQuery}
          placeholder="Search members..."
          class="w-full rounded-md border border-gray-300 py-2 pr-3 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

    {#if !isLoading && userList.length > 0}
      <p class="mt-4 text-sm text-gray-700">
        Showing <span class="font-medium">{userList.length}</span>
        {userList.length === 1 ? 'member' : 'members'}
      </p>
    {/if}
  </div>

  <!-- Scrollable Table Area - takes remaining space -->
  <div class="flex-1 min-h-0">
    {#if isLoading}
      <div class="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm">
        <div class="text-center">
          <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p class="mt-2 text-sm text-gray-600">Loading members...</p>
        </div>
      </div>
    {:else if userList.length === 0}
      <div class="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm">
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
