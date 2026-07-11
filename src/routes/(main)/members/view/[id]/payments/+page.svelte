<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Payments from '$lib/components/other/Payments.svelte';
	import paymentApi from '$lib/endpoints/paymentApi';
	import type { Payment } from '$lib/types/payment';
	import { onMount } from 'svelte';

	let data = $state<Payment.OutstandingData | null>(null);
	let isLoading = $state(true);
	let errorMessage = $state('');

	onMount(async () => {
		const userId = page.params.id;
		if (!userId) return;
		try {
			const res = await paymentApi.getOutstandingPaymentOfMember(userId);
			data = res.data;
		} catch (err: any) {
			errorMessage = err?.response?.data?.message || 'Failed to load payments.';
		} finally {
			isLoading = false;
		}
	});
</script>

<div class="flex h-full flex-col">
	<div class="flex-shrink-0 px-3 pt-3 lg:px-4">
		<button
			type="button"
			onclick={() => goto(`/members/view/${page.params.id}`)}
			class="text-sm font-medium text-blue-600 hover:underline"
		>
			← Back to member
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
			<Payments outstandingTableData={data} fitHeight={true} />
		{/if}
	</div>
</div>
