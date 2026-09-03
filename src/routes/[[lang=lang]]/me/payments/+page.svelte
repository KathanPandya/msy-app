<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { t, withLang } from '$lib/i18n';
	import { authStore } from '$lib/stores/authStore';
	import paymentApi from '$lib/endpoints/paymentApi';
	import { getCachedOutstanding, setCachedOutstanding } from '$lib/utilities/meCache';
	import { getMemberShellContext } from '$lib/context/memberShell';
	import Payments from '$lib/components/other/Payments.svelte';
	import PaymentDonut from '$lib/components/other/PaymentDonut.svelte';
	import PaymentYearlyBars from '$lib/components/other/PaymentYearlyBars.svelte';
	import MemberAvatarSwitcher from '$lib/components/other/MemberAvatarSwitcher.svelte';
	import type { Payment } from '$lib/types/payment';
	import { fade } from 'svelte/transition';

	const lang = $derived(page.params.lang as 'guj' | undefined);
	const shell = getMemberShellContext();

	const user = $derived($authStore.userAllInfo?.user);

	let paymentsData = $state<Payment.OutstandingData | null>(null);
	let isLoadingPayments = $state(false);
	let paymentsFetchedFor = $state('');

	// Which family member's payment summary is showing — the "member" query
	// param lets the Home page's family list and the Payments tab both land
	// here and pick a member, instead of each having their own view.
	const selectedId = $derived(page.url.searchParams.get('member') || user?._id || '');
	const selectedMember = $derived(
		shell.familyMembers.find((m) => m.id === selectedId) ||
			(user ? { id: user._id, name: user.name, member_id: user.member_id } : null)
	);

	function selectMember(id: string) {
		if (id === selectedId) return;
		goto(withLang(lang, `/me/payments${id === user?._id ? '' : `?member=${id}`}`));
	}

	$effect(() => {
		const id = selectedId;
		if (!id || paymentsFetchedFor === id) return;
		paymentsFetchedFor = id;

		const cached = getCachedOutstanding(id);
		if (cached) {
			paymentsData = cached.data;
			return;
		}

		isLoadingPayments = true;
		paymentsData = null;
		paymentApi
			.getOutstandingPaymentOfMember(id)
			.then((res) => {
				setCachedOutstanding(id, res);
				paymentsData = res.data;
			})
			.catch(() => {
				paymentsData = null;
			})
			.finally(() => {
				isLoadingPayments = false;
			});
	});

	const totalAmount = $derived(
		(paymentsData?.outstandingAmount ?? 0) + (paymentsData?.totalPayment ?? 0)
	);
	const amountPaid = $derived(paymentsData?.totalPayment ?? 0);
	const remainingAmount = $derived(totalAmount - amountPaid);

	let showCharts = $state(
		typeof localStorage !== 'undefined' ? localStorage.getItem('payments_charts_visible') !== '0' : true
	);
	function toggleCharts() {
		showCharts = !showCharts;
		localStorage.setItem('payments_charts_visible', showCharts ? '1' : '0');
	}
</script>

{#if user}
	<MemberAvatarSwitcher
		familyMembers={shell.familyMembers}
		{selectedId}
		myId={user._id}
		{lang}
		onselect={selectMember}
	/>

	{#if isLoadingPayments}
		<div
			class="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
		>
			<div
				class="h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
			></div>
		</div>
	{:else if paymentsData && selectedMember}
		<!-- Keyed on selectedId + faded in: cached member switches resolve
		     instantly, so without this the view would swap with no visible
		     change and switching would feel like it silently did nothing. -->
		{#key selectedId}
			<div in:fade={{ duration: 180 }} class="space-y-2">
				<div class="flex justify-end">
					<button
						type="button"
						onclick={toggleCharts}
						class="text-xs font-medium text-blue-600 hover:underline"
					>
						{showCharts ? t(lang, 'hideCharts') : t(lang, 'showCharts')}
					</button>
				</div>

				{#if showCharts}
					<PaymentDonut {totalAmount} {amountPaid} {remainingAmount} {lang} />

					<PaymentYearlyBars
						paymentRecords={paymentsData.paymentRecords}
						deadMemberRecords={paymentsData.deadMemberRecords}
						{lang}
					/>
				{/if}

				<Payments
					outstandingTableData={paymentsData}
					memberName={selectedMember.name}
					memberId={selectedMember.member_id}
					readOnly={true}
					showSearch={false}
					showMemberLabel={false}
					hideSummary={true}
					{lang}
				/>
			</div>
		{/key}
	{/if}
{/if}
