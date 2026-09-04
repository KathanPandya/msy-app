<script lang="ts">
	import { page } from '$app/state';
	import Payments from '$lib/components/other/Payments.svelte';
	import PaymentDonut from '$lib/components/other/PaymentDonut.svelte';
	import PaymentYearlyBars from '$lib/components/other/PaymentYearlyBars.svelte';
	import { t } from '$lib/i18n';
	import coreApi from '$lib/endpoints/coreApi';
	import paymentApi from '$lib/endpoints/paymentApi';
	import type { Payment } from '$lib/types/payment';
	import { onMount } from 'svelte';

	let data = $state<Payment.OutstandingData | null>(null);
	let memberName = $state('');
	let memberId = $state('');
	let isLoading = $state(true);
	let errorMessage = $state('');

	const totalAmount = $derived((data?.outstandingAmount ?? 0) + (data?.totalPayment ?? 0));
	const amountPaid = $derived(data?.totalPayment ?? 0);
	const remainingAmount = $derived(totalAmount - amountPaid);
	const isCredit = $derived(remainingAmount < 0);
	const isSettled = $derived(remainingAmount === 0 && totalAmount > 0);
	const balanceLabel = $derived(isSettled ? t(undefined, 'balance') : isCredit ? t(undefined, 'credit') : t(undefined, 'due'));

	// Charts default to closed here — the table is what admins look at most,
	// so this one-line summary fills the space instead until they opt in.
	let showCharts = $state(
		typeof localStorage !== 'undefined' ? localStorage.getItem('admin_payments_charts_visible') === '1' : false
	);
	function toggleCharts() {
		showCharts = !showCharts;
		localStorage.setItem('admin_payments_charts_visible', showCharts ? '1' : '0');
	}

	async function loadPayments() {
		const userId = page.params.id;
		if (!userId) return;
		try {
			const [paymentsRes, userInfo] = await Promise.all([
				paymentApi.getOutstandingPaymentOfMember(userId),
				coreApi.fetchUserInfo({ userId })
			]);
			data = paymentsRes.data;
			if (userInfo?.user) {
				memberName = userInfo.user.name ?? '';
				memberId = userInfo.user.member_id ?? '';
			}
		} catch (err: any) {
			errorMessage = err?.response?.data?.message || 'Failed to load payments.';
		} finally {
			isLoading = false;
		}
	}

	onMount(loadPayments);
</script>

<div class="flex h-full flex-col">
	<div class="min-h-0 flex-1">
		{#if isLoading}
			<div class="flex h-full items-center justify-center">
				<div class="text-center">
					<div
						class="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<p class="mt-3 text-sm text-gray-600">Loading payments...</p>
				</div>
			</div>
		{:else if errorMessage}
			<div class="m-3 rounded-md bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>
		{:else if data}
			<div class="flex h-full min-h-0 flex-col gap-2">
				<div class="flex flex-shrink-0 items-center justify-between">
					{#if !showCharts}
						<p class="text-xs text-gray-600">
							{t(undefined, 'paid')} <span class="font-semibold text-blue-600">₹{amountPaid}</span>
							· {balanceLabel}
							<span class={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
								₹{Math.abs(remainingAmount)}
							</span>
						</p>
					{:else}
						<span></span>
					{/if}
					<button
						type="button"
						onclick={toggleCharts}
						class="text-xs font-medium text-blue-600 hover:underline"
					>
						{showCharts ? t(undefined, 'hideCharts') : t(undefined, 'showCharts')}
					</button>
				</div>

				{#if showCharts}
					<div class="flex flex-shrink-0 flex-col gap-2 lg:flex-row lg:items-stretch">
						<div class="min-w-0 lg:flex-1">
							<PaymentDonut {totalAmount} {amountPaid} {remainingAmount} />
						</div>
						<div class="min-w-0 lg:flex-1">
							<PaymentYearlyBars
								paymentRecords={data.paymentRecords}
								deadMemberRecords={data.deadMemberRecords}
							/>
						</div>
					</div>
				{/if}

				<div class="min-h-0 flex-1">
					<Payments
						outstandingTableData={data}
						{memberName}
						{memberId}
						fitHeight={true}
						hideSummary={true}
						onDeleted={loadPayments}
					/>
				</div>
			</div>
		{/if}
	</div>
</div>
