<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Payments from '$lib/components/other/Payments.svelte';
	import coreApi from '$lib/endpoints/coreApi';
	import paymentApi from '$lib/endpoints/paymentApi';
	import type { Payment } from '$lib/types/payment';
	import { ArrowLeft } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let data = $state<Payment.OutstandingData | null>(null);
	let memberName = $state('');
	let memberId = $state('');
	let isLoading = $state(true);
	let errorMessage = $state('');

	onMount(async () => {
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
	});
</script>

<div class="flex h-full flex-col">
	<div class="flex-shrink-0 pb-1.5">
		<button
			type="button"
			onclick={() => goto(`/members/view/${page.params.id}`)}
			title="Back to member"
			class="inline-flex items-center gap-1 rounded-md p-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
		>
			<ArrowLeft class="h-3.5 w-3.5" />
			Back to member
		</button>
	</div>

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
			<Payments outstandingTableData={data} {memberName} {memberId} fitHeight={true} />
		{/if}
	</div>
</div>
