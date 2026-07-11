<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { formatString } from '$lib/utilities/stringUtils';
	import { Search } from '@lucide/svelte';
	import SearchInput from '../ui/SearchInput.svelte';
	import Table from '../ui/Table.svelte';

	let { outstandingTableData, fitHeight = false } = $props();
	let searchQuery = $state('');

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
		class={`mx-auto w-full max-w-6xl p-3 lg:p-4 ${fitHeight ? 'flex min-h-0 flex-1 flex-col gap-3' : 'space-y-3'}`}
	>
		<!-- Payment Summary -->
		<div
			class="flex-shrink-0 rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 lg:p-4"
		>
			<h3 class="mb-3 text-base font-semibold text-gray-800">Payment Summary</h3>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div class="rounded-lg bg-white p-3 shadow-sm">
					<p class="mb-0.5 text-xs text-gray-600">લેવાના</p>
					<p class="text-xl font-bold text-gray-800">₹{totalAmount}</p>
				</div>

				<div class="rounded-lg bg-white p-3 shadow-sm">
					<p class="mb-0.5 text-xs text-gray-600">આપેલા</p>
					<p class="text-xl font-bold text-blue-600">₹{amountPaid}</p>
				</div>

				<div class="rounded-lg bg-white p-3 shadow-sm">
					<p class="mb-0.5 text-xs text-gray-600">Balance</p>
					<p class={`text-xl font-bold ${remainingAmount < 0 ? 'text-green-600' : 'text-red-600'}`}>
						₹{Math.abs(remainingAmount)}
						{remainingAmount < 0 ? 'જમા' : 'બાકી'}
					</p>
				</div>
			</div>

			<!-- Calculation -->
			<div class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
				<span class="font-medium">Collection: ₹{totalAmount}</span>
				<span>−</span>
				<span class="font-medium">Paid: ₹{amountPaid}</span>
				<span>=</span>
				<span class={`font-semibold ${remainingAmount < 0 ? 'text-green-600' : 'text-red-600'}`}>
					Balance: {remainingAmount < 0 ? `+₹${Math.abs(remainingAmount)}` : `₹${remainingAmount}`}
				</span>
				<span class="text-gray-400">· {completionPercentage}% complete</span>
			</div>
		</div>

		<!-- Search and Filter -->
		<div class="flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
			<div class="relative max-w-md flex-1">
				<div class="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
					<Search class="h-5 w-5 text-gray-400" />
				</div>
				<SearchInput
					id="member-search"
					bind:value={searchQuery}
					placeholder="Search members by name or mobile..."
				/>
			</div>
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

		<!-- Payment History -->
		<div
			class={`flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ${fitHeight ? 'min-h-0 flex-1' : 'h-[60vh]'}`}
		>
			<div class="flex-shrink-0 border-b border-gray-200 px-4 py-3">
				<h2 class="text-base font-semibold text-gray-900">Payment History ({tableData.length})</h2>
			</div>
			<div class="min-h-0 flex-1">
				<Table columns={tableColumns} data={tableData} {getRowBgColor} />
			</div>
		</div>
	</div>
</div>
