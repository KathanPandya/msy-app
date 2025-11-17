<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import paymentApi from '$lib/endpoints/paymentApi';
	import { memberListStore } from '$lib/stores/memberListStore';
	import type { Payment } from '$lib/types/payment';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { formatString } from '$lib/utilities/stringUtils';
	import { Plus, Search } from '@lucide/svelte';
	import { onMount } from 'svelte';

	// Convert to $state (Svelte 5)
	let paymentList = $state<Payment.List>([]);
	let isLoading = $state(true);
	let searchQuery = $state('');

	async function fetchMemberAndPaymentList() {
		isLoading = true;
		try {
			const promises = [];

			// Only fetch members if not already loaded
			if ($memberListStore.members.length === 0) {
				promises.push(memberListStore.fetchAllMembers());
			}

			// Always fetch payments
			promises.push(
				paymentApi.getAllPayments({
					limit: 100,
					page: 1
				})
			);

			// Execute in parallel
			const results = await Promise.all(promises);

			// Payments will be last item in results
			paymentList = (results[results.length - 1] as { data: Payment.List; success: boolean }).data;
		} catch (error) {
			console.error('Error fetching user data:', error);
			throw error;
		} finally {
			isLoading = false;
		}
	}

	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		searchQuery = target.value;
		// debouncedSearchHandler(searchQuery);
	}

	// const debouncedSearchHandler = debounce(fetchMemberList, 500);

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
		fetchMemberAndPaymentList();
	});

	function goToUpdate(row: any) {
		const matchedPayment = paymentList.find((payment) => payment._id == row._id);
		// console.log('matchedPayment', matchedPayment);
		// console.log({...row, ...matchedPayment})
		// debugger;

		goto(`/payins/update/${row._id}`, {
			state: {
				paymentData: { ...row, ...matchedPayment }
			}
		});
	}

	if (typeof window !== 'undefined') {
		(window as any).goToUpdate = goToUpdate;
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
			class="px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
				bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500"
			onclick="window.goToUpdate(JSON.parse(decodeURIComponent('${rowDataJson}')))"
		>
			View/Edit
		</button>
		</div>
	`;
			}
		}
	];

	// Transform user data for table
	const tableData = $derived(
		paymentList.map((payment) => {
			const member = $memberListStore.members.find((user) => user._id === payment.userId);
			return {
				userId: member?._id,
				memberId: member?.member_id,
				_id: payment._id,
				memberName: member ? `${member.first_name} ${member.surname}` : '-',
				amount: payment.amount,
				date: formatDate(payment.date),
				paymentMode: formatString(payment.payment_mode, ['capitalize-first']) || '-',
				paymentType: formatString(payment.payment_type, ['capitalize-first']),
				actions: '' // Placeholder, actual rendering handled by column.render
			};
		})
	);
</script>

<div class="flex h-full flex-col">
	<!-- Fixed Header - stays at top -->
	<div class="mb-4 flex-shrink-0">
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
			<Button variant="primary" onclick={() => goto('/payins/create')}>
				<div class="flex items-center gap-2">
					<Plus class="h-4 w-4" />
					<span>Add Payment</span>
				</div>
			</Button>
		</div>

		{#if !isLoading && $memberListStore.members.length > 0}
			<p class="mt-4 text-sm text-gray-700">
				Showing <span class="font-medium">{$memberListStore.members.length}</span>
				{$memberListStore.members.length === 1 ? 'member' : 'members'}
			</p>
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
