<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { formatString } from '$lib/utilities/stringUtils';
	import { Search } from '@lucide/svelte';
	import SearchInput from '../ui/SearchInput.svelte';
	import Table from '../ui/Table.svelte';

	let { outstandingTableData } = $props();
	let searchQuery = $state('');

	const totalAmount = outstandingTableData.outstandingAmount;
	const amountPaid = outstandingTableData.totalPayment;
	const remainingAmount = totalAmount - amountPaid;
	const completionPercentage =
		Number(((amountPaid / totalAmount) * 100).toFixed(1)) > 100
			? 100
			: ((amountPaid / totalAmount) * 100).toFixed(1);

	let tableColumns = $state([
		{ key: 'date', label: 'Date' },
		{ key: 'amount', label: 'Amount' }
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
				{ key: 'payment_type', label: 'Payment Type' }
			];
			tableData =
				sortRecords(outstandingTableData?.paymentRecords)?.map((payment: any) => {
					return {
						_id: payment._id,
						date: formatDate(payment.date) || '-',
						amount: payment.amount || '-',
						payment_mode: formatString(payment.payment_mode, ['capitalize-first']) || '-',
						payment_type: formatString(payment.payment_type, ['capitalize-first']) || '-'
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
				{ key: 'amount', label: 'Amount' }
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

<div class="min-h-screen bg-gray-50">
	<div class="mx-auto max-w-6xl">
		<!-- Content -->
		<div class="rounded-b-lg bg-white p-6 shadow-sm">
			<!-- Payment Summary Card -->
			<div
				class="mb-6 rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6"
			>
				<h3 class="mb-4 text-lg font-semibold text-gray-800">Payment Summary</h3>

				<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<p class="mb-1 text-sm text-gray-600">લેવાના</p>
						<p class="text-2xl font-bold text-gray-800">₹{totalAmount}</p>
					</div>

					<div class="rounded-lg bg-white p-4 shadow-sm">
						<p class="mb-1 text-sm text-gray-600">આપેલા</p>
						<p class="text-2xl font-bold text-blue-600">₹{amountPaid}</p>
					</div>

					<div class="rounded-lg bg-white p-4 shadow-sm">
						<p class="mb-1 text-sm text-gray-600">Balance</p>
						<p
							class={`text-2xl font-bold ${remainingAmount < 0 ? 'text-green-600' : 'text-red-600'}`}
						>
							₹{Math.abs(remainingAmount)}
							{remainingAmount < 0 ? 'જમા' : 'બાકી'}
						</p>
					</div>
				</div>

				<!-- Calculation Breakdown -->
				<div class="rounded-lg bg-white p-4 shadow-sm">
					<p class="mb-2 text-sm font-medium text-gray-700">Calculation:</p>
					<div class="flex items-center gap-2 text-sm text-gray-600">
						<span class="font-medium">Collection: ₹{totalAmount}</span>
						<span>−</span>
						<span class="font-medium">Paid: ₹{amountPaid}</span>
						<span>=</span>
						<span class={`font-semibold ${remainingAmount < 0 ? 'text-green-600' : 'text-red-600'}`}
							>Balance: ₹{remainingAmount}</span
						>
					</div>
					<div class="mt-2 text-xs text-gray-500">
						Payment completion: {completionPercentage}%
					</div>
				</div>
			</div>

			<div class="animate-fadeIn">
				<!-- <h2 class="mb-4 text-xl font-semibold text-gray-800"></h2> -->

				<!-- Search and Filter -->
				<div class="mb-6 flex flex-col gap-4 sm:flex-row">
					<div class="relative flex-1">
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
					</div>
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
					</div>
				</div>

				<Card title={`Payment History (${tableData.length})`}>
					<div class="space-y-4">
						<Table columns={tableColumns} data={tableData} {getRowBgColor} />
					</div>
				</Card>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.3s ease-out;
	}
</style>
