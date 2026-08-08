<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { formatString } from '$lib/utilities/stringUtils';
	import { ChevronDown, LayoutGrid, Rows3, Search } from '@lucide/svelte';
	import SearchInput from '../ui/SearchInput.svelte';
	import Table from '../ui/Table.svelte';

	let { outstandingTableData, fitHeight = false } = $props();
	let searchQuery = $state('');

	let isSummaryOpen = $state(
		typeof localStorage !== 'undefined' ? localStorage.getItem('payments_summary_open') !== '0' : true
	);
	let density = $state<'comfortable' | 'compact'>(
		(typeof localStorage !== 'undefined' &&
			(localStorage.getItem('app_table_density') as 'comfortable' | 'compact')) ||
			'comfortable'
	);

	function toggleSummary() {
		isSummaryOpen = !isSummaryOpen;
		localStorage.setItem('payments_summary_open', isSummaryOpen ? '1' : '0');
	}

	function toggleDensity() {
		density = density === 'comfortable' ? 'compact' : 'comfortable';
		localStorage.setItem('app_table_density', density);
	}

	// Which rows are actual payments (dead-member rows aren't).
	const paymentIds = new Set((outstandingTableData?.paymentRecords ?? []).map((p: any) => p._id));

	// The "View" button opens that payment's page (data passed via navigation state).
	if (typeof window !== 'undefined') {
		(window as any).viewPayment = (id: string) => {
			const record = (outstandingTableData?.paymentRecords ?? []).find((p: any) => p._id === id);
			if (!record) return;
			goto(`/payins/update/${record._id}`, {
				state: { paymentData: { ...record, memberId: record.userId } }
			});
		};
	}

	const actionsColumn = {
		key: 'actions',
		label: 'Actions',
		align: 'right' as const,
		render: (_: any, row: any) => {
			if (!paymentIds.has(row._id)) return '';
			return `
				<div class='flex justify-end'>
					<button
						class="px-3 py-1.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
						onclick="window.viewPayment('${row._id}')"
					>
						View
					</button>
				</div>
			`;
		}
	};

	const totalAmount = outstandingTableData.outstandingAmount + outstandingTableData.totalPayment;
	const amountPaid = outstandingTableData.totalPayment;
	const remainingAmount = totalAmount - amountPaid;
	const completionPercentage =
		Number(((amountPaid / totalAmount) * 100).toFixed(1)) > 100
			? 100
			: ((amountPaid / totalAmount) * 100).toFixed(1);

	let tableColumns = $state<any[]>([
		{ key: 'date', label: 'Date' },
		{ key: 'amount', label: 'Amount' },
		{ key: 'remarks', label: 'Remarks' },
		actionsColumn
	]);

	const statusOptions = [
		{ key: '', label: 'All Entries' },
		{ key: 'payments', label: 'Payments' },
		{ key: 'deadMembers', label: 'Dead Members' }
	];

	let filters = $state({
		status: '',
		gender: '',
		maritalStatus: '',
		gotra: ''
	});

	let tableData = $state(
		sortRecords([
			...(outstandingTableData?.paymentRecords ?? []),
			...(outstandingTableData?.deadMemberRecords ?? [])
		])?.map((payment: any) => {
			let date: any;
			let type: string;
			if (payment.date) {
				date = payment.date;
				type = 'credit';
			} else {
				date = payment?.deadMember?.date_of_death;
				type = 'debit';
			}
			return {
				_id: payment._id,
				date: formatDate(payment.date ?? payment.deadMember.date_of_death) || '-',
				amount: payment.amount || -100,
					remarks: payment.remarks || '-',
				type: type
			};
		}) ?? []
	);

	function applyFilters() {
		if (filters.status === 'payments') {
			tableColumns = [
				{ key: 'date', label: 'Date' },
				{ key: 'amount', label: 'Amount' },
				{ key: 'payment_mode', label: 'Payment Mode' },
				{ key: 'payment_type', label: 'Payment Type' },
				{ key: 'remarks', label: 'Remarks' },
				actionsColumn
			];
			tableData =
				sortRecords(outstandingTableData?.paymentRecords)?.map((payment: any) => {
					return {
						_id: payment._id,
						date: formatDate(payment.date) || '-',
						amount: payment.amount || '-',
						payment_mode: formatString(payment.payment_mode, ['capitalize-first']) || '-',
						payment_type: formatString(payment.payment_type, ['capitalize-first']) || '-',
						remarks: payment.remarks || '-'
					};
				}) ?? [];
		} else if (filters.status === 'deadMembers') {
			tableColumns = [
				{ key: 'date', label: 'Date of Death' },
				{ key: 'name', label: 'Name' }
			];
			tableData =
				sortRecords(outstandingTableData?.deadMemberRecords)?.map((payment: any) => {
					const memberName = `${payment.user.first_name} ${payment.user.middle_name} ${payment.user.surname}`;
					return {
						_id: payment._id,
						date: formatDate(`${payment.deadMember.date_of_death}`) || '-',
						amount: payment.amount || '-',
						name: memberName || '-'
					};
				}) ?? [];
		} else {
			tableColumns = [
				{ key: 'date', label: 'Date' },
				{ key: 'amount', label: 'Amount' },
				{ key: 'remarks', label: 'Remarks' },
				actionsColumn
			];

			const mergedRecords = [
				...(outstandingTableData?.paymentRecords ?? []),
				...(outstandingTableData?.deadMemberRecords ?? [])
			];

			tableData = sortRecords(mergedRecords).map((payment: any) => {
				let date: any;
				let type: string;
				if (payment.date) {
					date = payment.date;
					type = 'credit';
				} else {
					date = payment?.deadMember?.date_of_death;
					type = 'debit';
				}
				// const date = payment.date || payment?.deadMember?.date_of_death;

				return {
					_id: payment._id,
					date: date ? formatDate(date) : '-',
					amount: payment.amount ?? -100,
					remarks: payment.remarks || '-',
					type: type
				};
			});
		}
	}

	function sortRecords(records: any) {
		return records.sort((a: any, b: any) => {
			const date1 = a.date || a?.deadMember?.date_of_death;
			const date2 = b.date || b?.deadMember?.date_of_death;

			const dateA = date1 && date1 !== '-' ? new Date(date1).getTime() : 0;
			const dateB = date2 && date2 !== '-' ? new Date(date2).getTime() : 0;

			return dateB - dateA;
		});
	}

	function getRowBgColor(row: any) {
		if (row.type === 'credit') return 'bg-green-100';
		if (row.type === 'debit') return 'bg-red-50';
		return '';
	}
</script>

<div class={`bg-gray-50 ${fitHeight ? 'flex h-full flex-col' : ''}`}>
	<div
		class={`w-full max-w-none ${fitHeight ? 'flex min-h-0 flex-1 flex-col gap-1.5 sm:gap-2' : 'space-y-1.5 sm:space-y-2'}`}
	>
		<!-- Summary + Search + Filter -->
		<div class="flex w-full flex-shrink-0 flex-wrap items-start justify-start gap-2 sm:flex-nowrap sm:gap-3">
			<!-- Payment Summary -->
			<div
				class="w-full min-w-0 flex-none rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 sm:max-w-[400px] sm:shrink sm:basis-[400px] sm:grow-0"
			>
				<button
					type="button"
					onclick={toggleSummary}
					class="flex w-full items-center justify-between gap-2 px-3 py-2 lg:px-4"
				>
					<h3 class="flex-shrink-0 text-sm font-semibold text-gray-800">Payment Summary</h3>
					{#if !isSummaryOpen}
						<span class="min-w-0 flex-1 truncate text-right text-xs text-gray-500">
							₹{totalAmount} · Paid ₹{amountPaid} ·
							<span class={remainingAmount < 0 ? 'text-green-600' : 'text-red-600'}>
								Bal ₹{Math.abs(remainingAmount)}
							</span>
						</span>
					{/if}
					<ChevronDown
						class={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform ${isSummaryOpen ? 'rotate-180' : ''}`}
					/>
				</button>

				{#if isSummaryOpen}
					<div class="px-3 pb-2 lg:px-4 lg:pb-3">
						<div class="grid grid-cols-3 gap-1.5 sm:gap-2">
							<div class="rounded-lg bg-white px-2 py-1.5 shadow-sm sm:px-3 sm:py-2">
								<p class="mb-0.5 text-[11px] text-gray-600 sm:text-xs">લેવાના</p>
								<p class="text-sm font-bold text-gray-800 sm:text-lg">₹{totalAmount}</p>
							</div>

							<div class="rounded-lg bg-white px-2 py-1.5 shadow-sm sm:px-3 sm:py-2">
								<p class="mb-0.5 text-[11px] text-gray-600 sm:text-xs">આપેલા</p>
								<p class="text-sm font-bold text-blue-600 sm:text-lg">₹{amountPaid}</p>
							</div>

							<div class="rounded-lg bg-white px-2 py-1.5 shadow-sm sm:px-3 sm:py-2">
								<p class="mb-0.5 text-[11px] text-gray-600 sm:text-xs">Balance</p>
								<p
									class={`text-sm font-bold sm:text-lg ${remainingAmount < 0 ? 'text-green-600' : 'text-red-600'}`}
								>
									₹{Math.abs(remainingAmount)}
									{remainingAmount < 0 ? 'જમા' : 'બાકી'}
								</p>
							</div>
						</div>

						<!-- Calculation -->
						<div
							class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600 sm:mt-2"
						>
							<span class="font-medium">Collection: ₹{totalAmount}</span>
							<span>−</span>
							<span class="font-medium">Paid: ₹{amountPaid}</span>
							<span>=</span>
							<span
								class={`font-semibold ${remainingAmount < 0 ? 'text-green-600' : 'text-red-600'}`}
							>
								Balance: {remainingAmount < 0
									? `+₹${Math.abs(remainingAmount)}`
									: `₹${remainingAmount}`}
							</span>
							<span class="text-gray-400">· {completionPercentage}% complete</span>
						</div>
					</div>
				{/if}
			</div>

			<!-- Filter -->
			<div
				class="w-28 min-w-0 flex-shrink-0 sm:max-w-[160px] sm:shrink sm:basis-[160px] sm:grow-0"
			>
				<select
					bind:value={filters.status}
					onchange={applyFilters}
					class="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none sm:px-3"
				>
					{#each statusOptions as option}
						<option value={option.key}>{option.label}</option>
					{/each}
				</select>
			</div>

			<!-- Search -->
			<div
				class="relative min-w-0 flex-1 sm:ml-auto sm:max-w-[315px] sm:shrink sm:basis-[315px] sm:grow-0"
			>
				<div class="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
					<Search class="h-5 w-5 text-gray-400" />
				</div>
				<SearchInput
					id="member-search"
					bind:value={searchQuery}
					placeholder="Search members by name or mobile..."
				/>
			</div>
		</div>

		<!-- Payment History -->
		<div
			class={`flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ${fitHeight ? 'min-h-0 flex-1' : 'h-[60vh]'}`}
		>
			<div class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-3 py-1.5 sm:px-4 sm:py-2">
				<h2 class="text-xs font-semibold text-gray-900 sm:text-sm">
					Payment History ({tableData.length})
				</h2>
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
			<div class="min-h-0 flex-1">
				<Table columns={tableColumns} data={tableData} {getRowBgColor} {density} />
			</div>
		</div>
	</div>
</div>
