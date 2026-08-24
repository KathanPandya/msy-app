<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import { t, type Lang } from '$lib/i18n';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import { formatString } from '$lib/utilities/stringUtils';
	import { ChevronDown, Download, LayoutGrid, Rows3, Search } from '@lucide/svelte';
	import Button from '../ui/Button.svelte';
	import ImageViewer from '../ui/ImageViewer.svelte';
	import Modal from '../ui/Modal.svelte';
	import SearchInput from '../ui/SearchInput.svelte';
	import Table from '../ui/Table.svelte';

	const backendMapping: Record<string, string> = APP_CONSTANTS.BACKEND_MAPPING;

	let {
		outstandingTableData,
		memberName = '',
		memberId = '',
		fitHeight = false,
		// When true, the table grows to its full row count instead of being boxed
		// into a fixed-height internal scroll area — used on pages (like /me) where
		// the whole page scrolls, so we don't stack two scroll containers.
		naturalHeight = false,
		readOnly = false,
		showSearch = true,
		lang = undefined
	}: {
		outstandingTableData: any;
		memberName?: string;
		memberId?: string;
		fitHeight?: boolean;
		naturalHeight?: boolean;
		readOnly?: boolean;
		showSearch?: boolean;
		lang?: Lang;
	} = $props();
	let searchQuery = $state('');

	let isSummaryOpen = $state(
		typeof localStorage !== 'undefined' ? localStorage.getItem('payments_summary_open') !== '0' : true
	);
	let density = $state<'comfortable' | 'compact'>(
		(typeof localStorage !== 'undefined' &&
			(localStorage.getItem('app_table_density') as 'comfortable' | 'compact')) ||
			'compact'
	);

	function toggleSummary() {
		isSummaryOpen = !isSummaryOpen;
		localStorage.setItem('payments_summary_open', isSummaryOpen ? '1' : '0');
	}

	function toggleDensity() {
		density = density === 'comfortable' ? 'compact' : 'comfortable';
		localStorage.setItem('app_table_density', density);
	}

	// CSV field quoting: wrap in quotes (doubling embedded quotes) whenever the
	// value could otherwise break the delimiter/row structure.
	function toCsvValue(value: any): string {
		const str = value === null || value === undefined ? '' : String(value);
		return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
	}

	const filterSuffix: Record<string, string> = {
		'': 'AllEntries',
		payments: 'Payments',
		deadMembers: 'DeadMembers'
	};

	function downloadCsv() {
		// Export exactly what's on screen: current columns (minus the Actions
		// button column, which has no data value) and the currently filtered rows.
		const exportColumns = tableColumns.filter((c) => c.key !== 'actions');
		const rows = [
			exportColumns.map((c) => toCsvValue(c.label)),
			...tableData.map((row: any) => exportColumns.map((c) => toCsvValue(row[c.key])))
		];
		const csvContent = rows.map((r) => r.join(',')).join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		const namePart = formatMemberDisplay(memberName, memberId) || 'Member';
		// Strip filesystem-illegal characters (parentheses from the display name are fine).
		const safeNamePart = namePart.replace(/[\\/:*?"<>|]/g, '');
		link.href = url;
		link.download = `${safeNamePart}_${filterSuffix[filters.status] ?? 'AllEntries'}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	}

	// Which rows are actual payments (dead-member rows aren't).
	const paymentIds = $derived(
		new Set((outstandingTableData?.paymentRecords ?? []).map((p: any) => p._id))
	);

	// View modal: shows the payment's details, with an Edit button that
	// navigates to the update page (mirrors the /payins list flow).
	let viewingRecord = $state<any | null>(null);

	function openView(id: string) {
		const record = (outstandingTableData?.paymentRecords ?? []).find((p: any) => p._id === id);
		if (!record) return;
		viewingRecord = record;
	}

	function closeView() {
		viewingRecord = null;
	}

	function editFromView() {
		if (!viewingRecord) return;
		goto(`/payins/update/${viewingRecord._id}`, {
			state: { returnTo: page.url.pathname + page.url.search }
		});
		closeView();
	}

	function editPayment(id: string) {
		goto(`/payins/update/${id}`, {
			state: { returnTo: page.url.pathname + page.url.search }
		});
	}

	// Dead-member rows aren't payments, so they get no row menu.
	// readOnly (member self-view) drops the Edit action — members can look but not change records.
	function getRowMenuActions(row: any) {
		if (!paymentIds.has(row._id)) return [];
		const actions = [{ label: t(lang, 'view'), onclick: () => openView(row._id) }];
		if (!readOnly) actions.push({ label: t(lang, 'edit'), onclick: () => editPayment(row._id) });
		return actions;
	}

	const totalAmount = $derived(
		(outstandingTableData?.outstandingAmount ?? 0) + (outstandingTableData?.totalPayment ?? 0)
	);
	const amountPaid = $derived(outstandingTableData?.totalPayment ?? 0);
	const remainingAmount = $derived(totalAmount - amountPaid);
	const completionPercentage = $derived(
		totalAmount === 0
			? 0
			: Number(((amountPaid / totalAmount) * 100).toFixed(1)) > 100
				? 100
				: ((amountPaid / totalAmount) * 100).toFixed(1)
	);

	const statusOptions = $derived([
		{ key: '', label: t(lang, 'allEntries') },
		{ key: 'payments', label: t(lang, 'payments') },
		{ key: 'deadMembers', label: t(lang, 'deadMembers') }
	]);

	let filters = $state({
		status: '',
		gender: '',
		maritalStatus: '',
		gotra: ''
	});

	function sortRecords(records: any[] = []) {
		return [...records].sort((a: any, b: any) => {
			const date1 = a.date || a?.deadMember?.date_of_death;
			const date2 = b.date || b?.deadMember?.date_of_death;

			const dateA = date1 && date1 !== '-' ? new Date(date1).getTime() : 0;
			const dateB = date2 && date2 !== '-' ? new Date(date2).getTime() : 0;

			return dateB - dateA;
		});
	}

	const tableColumns = $derived.by(() => {
		if (filters.status === 'payments') {
			return [
				{ key: 'date', label: t(lang, 'date') },
				{ key: 'amount', label: t(lang, 'amount') },
				{ key: 'payment_mode', label: t(lang, 'paymentMode') },
				{ key: 'payment_type', label: t(lang, 'paymentType') },
				{ key: 'remarks', label: t(lang, 'remarks') }
			];
		}
		if (filters.status === 'deadMembers') {
			return [
				{ key: 'date', label: t(lang, 'dateOfDeath') },
				{ key: 'name', label: t(lang, 'member') }
			];
		}
		return [
			{ key: 'date', label: t(lang, 'date') },
			{ key: 'amount', label: t(lang, 'amount') },
			{ key: 'remarks', label: t(lang, 'remarks') }
		];
	});

	const tableData = $derived.by(() => {
		if (filters.status === 'payments') {
			return sortRecords(outstandingTableData?.paymentRecords ?? []).map((payment: any) => ({
				_id: payment._id,
				date: formatDate(payment.date) || '-',
				amount: payment.amount || '-',
				payment_mode: formatString(payment.payment_mode, ['capitalize-first']) || '-',
				payment_type: formatString(payment.payment_type, ['capitalize-first']) || '-',
				remarks: payment.remarks || '-'
			}));
		}

		if (filters.status === 'deadMembers') {
			return sortRecords(outstandingTableData?.deadMemberRecords ?? []).map((payment: any) => {
				const memberName = payment.userDetails?.name;
				return {
					_id: payment._id,
					date: formatDate(`${payment.deadMember.date_of_death}`) || '-',
					amount: payment.amount || '-',
					name: memberName ? formatMemberDisplay(memberName, payment.userDetails?.member_id) : '-'
				};
			});
		}

		const mergedRecords = [
			...(outstandingTableData?.paymentRecords ?? []),
			...(outstandingTableData?.deadMemberRecords ?? [])
		];

		return sortRecords(mergedRecords).map((payment: any) => {
			const date = payment.date || payment?.deadMember?.date_of_death;
			const type = payment.date ? 'credit' : 'debit';
			return {
				_id: payment._id,
				date: date ? formatDate(date) : '-',
				amount: payment.amount ?? -100,
				remarks: payment.remarks || '-',
				type
			};
		});
	});

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
					<h3 class="flex-shrink-0 text-sm font-semibold text-gray-800">{t(lang, 'paymentSummary')}</h3>
					{#if !isSummaryOpen}
						<span class="min-w-0 flex-1 truncate text-right text-xs text-gray-500">
							₹{totalAmount} · {t(lang, 'paid')} ₹{amountPaid} ·
							<span class={remainingAmount < 0 ? 'text-green-600' : 'text-red-600'}>
								{t(lang, 'bal')} ₹{Math.abs(remainingAmount)}
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
								<p class="mb-0.5 text-[11px] text-gray-600 sm:text-xs">{t(lang, 'total')}</p>
								<p class="text-sm font-bold text-gray-800 sm:text-lg">₹{totalAmount}</p>
							</div>

							<div class="rounded-lg bg-white px-2 py-1.5 shadow-sm sm:px-3 sm:py-2">
								<p class="mb-0.5 text-[11px] text-gray-600 sm:text-xs">{t(lang, 'paid')}</p>
								<p class="text-sm font-bold text-blue-600 sm:text-lg">₹{amountPaid}</p>
							</div>

							<div class="rounded-lg bg-white px-2 py-1.5 shadow-sm sm:px-3 sm:py-2">
								<p class="mb-0.5 text-[11px] text-gray-600 sm:text-xs">{t(lang, 'balance')}</p>
								<p
									class={`text-sm font-bold sm:text-lg ${remainingAmount < 0 ? 'text-green-600' : 'text-red-600'}`}
								>
									₹{Math.abs(remainingAmount)}
									{remainingAmount < 0 ? t(lang, 'credit') : t(lang, 'due')}
								</p>
							</div>
						</div>
						<p class="mt-1.5 text-xs text-gray-500 sm:mt-2">
							{completionPercentage}% {t(lang, 'complete')}
						</p>
					</div>
				{/if}
			</div>

			{#if showSearch}
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
						placeholder={t(lang, 'searchMembers')}
					/>
				</div>
			{/if}
		</div>

		<!-- Payment History -->
		<div
			class={`flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ${fitHeight ? 'min-h-0 flex-1' : naturalHeight ? '' : 'h-[60vh]'}`}
		>
			<div class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-3 py-1.5 sm:px-4 sm:py-2">
				<div class="flex min-w-0 items-baseline gap-2">
					<h2 class="text-xs font-semibold text-gray-900 sm:text-sm">
						{t(lang, 'paymentHistory')} ({tableData.length})
					</h2>
					{#if memberName || memberId}
						<span class="truncate text-[11px] text-gray-500">
							{formatMemberDisplay(memberName, memberId)}
						</span>
					{/if}
				</div>
				<div class="flex items-center gap-1.5">
					<select
						bind:value={filters.status}
						class="w-24 rounded-md border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none sm:w-28 sm:px-2"
					>
						{#each statusOptions as option}
							<option value={option.key}>{option.label}</option>
						{/each}
					</select>
					<button
						type="button"
						onclick={toggleDensity}
						title={density === 'comfortable'
							? t(lang, 'switchToCompact')
							: t(lang, 'switchToComfortable')}
						class="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
					>
						{#if density === 'comfortable'}
							<Rows3 class="h-3.5 w-3.5" />
							<span class="hidden sm:inline">{t(lang, 'compact')}</span>
						{:else}
							<LayoutGrid class="h-3.5 w-3.5" />
							<span class="hidden sm:inline">{t(lang, 'comfortable')}</span>
						{/if}
					</button>
					<button
						type="button"
						onclick={downloadCsv}
						disabled={tableData.length === 0}
						title={t(lang, 'downloadCsv')}
						aria-label={t(lang, 'downloadCsv')}
						class="flex items-center rounded-md border border-gray-300 bg-white p-1.5 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Download class="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
			<div class="min-h-0 flex-1">
				<Table
					columns={tableColumns}
					data={tableData}
					rowMenu={filters.status === 'deadMembers' ? undefined : getRowMenuActions}
					{getRowBgColor}
					{density}
					{naturalHeight}
				/>
			</div>
		</div>
	</div>
</div>

<!-- Payment Details Modal -->
<Modal open={!!viewingRecord} onClose={closeView} title={t(lang, 'paymentDetails')}>
	{#if viewingRecord}
		<div class="space-y-4 text-sm">
			<div class="grid grid-cols-2 gap-3">
				<div>
					<p class="text-xs text-gray-500">{t(lang, 'amount')}</p>
					<p class="font-medium text-gray-900">₹{viewingRecord.amount}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">{t(lang, 'date')}</p>
					<p class="font-medium text-gray-900">{formatDate(viewingRecord.date)}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">{t(lang, 'paymentMode')}</p>
					<p class="font-medium text-gray-900">
						{formatString(viewingRecord.payment_mode, ['capitalize-first']) || '-'}
					</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">{t(lang, 'paymentType')}</p>
					<p class="font-medium text-gray-900">
						{backendMapping[viewingRecord.payment_type] || '-'}
					</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">{t(lang, 'referenceNumber')}</p>
					<p class="font-medium text-gray-900">{viewingRecord.payment_reference || '-'}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">{t(lang, 'receiptNumber')}</p>
					<p class="font-medium text-gray-900">{viewingRecord.reciept_number || '-'}</p>
				</div>
			</div>

			{#if viewingRecord.remarks}
				<div>
					<p class="text-xs text-gray-500">{t(lang, 'description')}</p>
					<p class="font-medium text-gray-900">{viewingRecord.remarks}</p>
				</div>
			{/if}

			{#if viewingRecord.photo}
				<div>
					<p class="mb-1 text-xs text-gray-500">{t(lang, 'receipt')}</p>
					<ImageViewer src={viewingRecord.photo} alt="Payment Receipt" thumbnailSize="medium" />
				</div>
			{/if}
		</div>

		{#if !readOnly}
			<div class="mt-4 flex justify-end border-t border-gray-200 pt-3">
				<Button variant="primary" size="sm" onclick={editFromView}>{t(lang, 'edit')}</Button>
			</div>
		{/if}
	{/if}
</Modal>
