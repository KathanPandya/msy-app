<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import paymentApi from '$lib/endpoints/paymentApi';
	import { memberListStore } from '$lib/stores/memberListStore';
	import type { Payment } from '$lib/types/payment';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { formatString } from '$lib/utilities/stringUtils';
	import { Calendar, ChevronDown, ChevronUp, Filter, Plus } from '@lucide/svelte';
	import { onMount } from 'svelte';
	const backendMapping: Record<string, string> = APP_CONSTANTS.BACKEND_MAPPING;

	// Convert to $state (Svelte 5)
	let paymentList = $state<Payment.List>([]);
	let isLoading = $state(true);
	let searchQuery = $state('');
	let showFilters = $state(false);
	let errors = $state({ startDate: '', endDate: '' });
	let errorMessage = $state('');

	let today = new Date();
	let yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	let startDate = $state(yesterday.toISOString().split('T')[0]);
	let endDate = $state(today.toISOString().split('T')[0]);

	async function fetchMemberAndPaymentList() {
		isLoading = true;
		try {
			const promises = [];

			// Only fetch members if not already loaded
			if ($memberListStore.members.length === 0) {
				promises.push(memberListStore.fetchAllMembers());
			}

			applyDateFilter();

			// Always fetch payments
			// promises.push(
			// paymentApi.getAllPayments({
			// 	limit: 100,
			// 	page: 1
			// })
			// );

			// Execute in parallel
			// const results = await Promise.all(promises);

			// Payments will be last item in results
			// paymentList = (results[results.length - 1] as { data: Payment.List; success: boolean }).data;
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
				paymentData: { ...row, ...matchedPayment }
			}
		});
	}

	if (typeof window !== 'undefined') {
		(window as any).goToUpdate = goToUpdate;
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

	async function applyDateFilter() {
		if (!validateDates()) return;
		errorMessage = '';
		isLoading = true;
		try {
			const response = await paymentApi.getAllPayments({
				startDate,
				endDate
			});

			if (response.success) {
				paymentList = response.data;
			} else {
			}
		} catch (error: any) {
			console.error('Error:', error);
			errorMessage = error.response?.data?.message || 'Failed to fetch payments. Please try again.';
		} finally {
			isLoading = false;
		}
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
				paymentType: backendMapping[payment.payment_type],
				actions: '' // Placeholder, actual rendering handled by column.render
			};
		})
	);
</script>

<div class="flex h-full flex-col">
	<!-- Fixed Header - stays at top -->
	<div class="mb-4 flex-shrink-0 space-y-4">
		<!-- Mobile: Collapsible Filter + Add Button -->
		<div class="lg:hidden">
			<div class="flex gap-3">
				<!-- Filter Toggle Button -->
				<button
					onclick={toggleFilters}
					class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
				>
					<Filter class="h-4 w-4" />
					<span>Filters</span>
					{#if showFilters}
						<ChevronUp class="h-4 w-4" />
					{:else}
						<ChevronDown class="h-4 w-4" />
					{/if}
				</button>

				<!-- Add Payment Button -->
				<button
					onclick={() => goto('/payins/create')}
					class="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
				>
					<Plus class="h-4 w-4" />
					<span>Add</span>
				</button>
			</div>

			<!-- Collapsible Filter Content -->
			{#if showFilters}
				<div class="mt-3 space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
					<!-- Start Date -->
					<div>
						<Input
							id="startDate-mobile"
							label="Start Date"
							type="date"
							bind:value={startDate}
							error={errors.startDate}
							placeholder="Select start date"
							required
							disabled={isLoading}
						/>
					</div>

					<!-- End Date -->
					<div>
						<Input
							id="endDate-mobile"
							label="End Date"
							type="date"
							bind:value={endDate}
							error={errors.endDate}
							placeholder="Select end date"
							required
							disabled={isLoading}
						/>
					</div>

					<!-- Apply Button -->
					<Button variant="primary" onclick={applyDateFilter} disabled={isLoading}>
						{#if isLoading}
							<div class="flex items-center justify-center gap-2">
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
								></div>
								<span>Loading...</span>
							</div>
						{:else}
							<div class="flex items-center justify-center gap-2">
								<Calendar class="h-4 w-4" />
								<span>Apply Filter</span>
							</div>
						{/if}
					</Button>

					<!-- Selected Range Display -->
					{#if startDate && endDate}
						<div class="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
							<p class="text-xs text-blue-800">
								<span class="font-medium">Range:</span>
								{new Date(startDate).toLocaleDateString('en-IN', {
									day: 'numeric',
									month: 'short'
								})}
								-
								{new Date(endDate).toLocaleDateString('en-IN', {
									day: 'numeric',
									month: 'short',
									year: 'numeric'
								})}
							</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Desktop: Date Range Filter Card -->
		<div class="hidden lg:block">
			<Card title="Date Range Filter">
				<div class="space-y-4">
					<div class="flex flex-wrap items-end gap-4">
						<!-- Start Date -->
						<div class="w-full sm:w-auto sm:min-w-[200px] sm:flex-1">
							<Input
								id="startDate"
								label="Start Date"
								type="date"
								bind:value={startDate}
								error={errors.startDate}
								placeholder="Select start date"
								required
								disabled={isLoading}
							/>
						</div>

						<!-- End Date -->
						<div class="w-full sm:w-auto sm:min-w-[200px] sm:flex-1">
							<Input
								id="endDate"
								label="End Date"
								type="date"
								bind:value={endDate}
								error={errors.endDate}
								placeholder="Select end date"
								required
								disabled={isLoading}
							/>
						</div>

						<!-- Apply Button -->
						<div class="w-full sm:w-auto">
							<Button variant="primary" onclick={applyDateFilter} disabled={isLoading}>
								{#if isLoading}
									<div class="flex items-center justify-center gap-2">
										<div
											class="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
										></div>
										<span>Loading...</span>
									</div>
								{:else}
									<div class="flex items-center justify-center gap-2">
										<Calendar class="h-4 w-4" />
										<span>Apply Filter</span>
									</div>
								{/if}
							</Button>
						</div>

						<!-- Add Payment Button -->
						<div class="w-full sm:w-auto">
							<Button variant="primary" onclick={() => goto('/payins/create')}>
								<div class="flex items-center justify-center gap-2">
									<Plus class="h-4 w-4" />
									<span>Add Payment</span>
								</div>
							</Button>
						</div>
					</div>

					<!-- Date Range Display -->
					{#if startDate && endDate}
						<div class="rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
							<p class="text-sm text-blue-800">
								<span class="font-medium">Selected Range:</span>
								{new Date(startDate).toLocaleDateString('en-IN', {
									day: 'numeric',
									month: 'short',
									year: 'numeric'
								})}
								to
								{new Date(endDate).toLocaleDateString('en-IN', {
									day: 'numeric',
									month: 'short',
									year: 'numeric'
								})}
							</p>
						</div>
					{/if}
				</div>
			</Card>
		</div>

		<!-- Results Count -->
		{#if !isLoading && tableData.length > 0}
			<p class="px-1 text-sm text-gray-700">
				Showing <span class="font-medium">{tableData.length}</span>
				{tableData.length === 1 ? 'payment record' : 'payment records'}
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
			<!-- Table container with border, rounded corners, and scroll -->
			<div class="h-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
				<div class="h-full overflow-x-auto overflow-y-auto">
					<Table {columns} data={tableData} />
				</div>
			</div>
		{/if}
	</div>
</div>
