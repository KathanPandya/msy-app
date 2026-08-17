<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { t, withLang } from '$lib/i18n';
	import familiesApi from '$lib/endpoints/familiesApi';
	import paymentApi from '$lib/endpoints/paymentApi';
	import Payments from '$lib/components/other/Payments.svelte';
	import type { Payment } from '$lib/types/payment';
	import { authStore } from '$lib/stores/authStore';
	import { requireMember } from '$lib/utilities/authGuard';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { onMount } from 'svelte';

	const lang = $derived(page.params.lang as 'guj' | undefined);

	let isAuthorized = $state(false);
	let member = $state<Record<string, any> | null>(null);
	let errorMessage = $state('');
	let isLoading = $state(true);
	let paymentsData = $state<Payment.OutstandingData | null>(null);
	let isLoadingPayments = $state(true);

	$effect(() => {
		if (!$authStore.isLoading) {
			isAuthorized = requireMember(lang);
		}
	});

	onMount(async () => {
		const id = page.params.id;
		if (!id) return;
		try {
			const res = await familiesApi.getMember(id);
			member = res.member;
		} catch (err: any) {
			errorMessage = err?.response?.data?.message || t(lang, 'notAllowedToView');
		} finally {
			isLoading = false;
		}

		try {
			const res = await paymentApi.getOutstandingPaymentOfMember(id);
			paymentsData = res.data;
		} catch (err) {
			paymentsData = null;
		} finally {
			isLoadingPayments = false;
		}
	});

	const myId = $derived($authStore.userAllInfo?.user._id);
	const displayName = $derived(member ? member.name || t(lang, 'member') : '');
</script>

{#if $authStore.isLoading || isLoading}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<p class="text-gray-600">{t(lang, 'loading')}</p>
	</div>
{:else if isAuthorized}
	<div class="flex h-full flex-col bg-gray-50">
		<header class="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-4">
			<div class="mx-auto max-w-lg">
				<button
					type="button"
					onclick={() => goto(withLang(lang, '/me'))}
					class="mb-2 text-sm text-blue-600 hover:underline">{t(lang, 'myPage')}</button
				>
				{#if member}
					<h1 class="text-xl font-bold text-gray-900">
						{formatMemberDisplay(displayName, member.member_id)}{member._id === myId ||
						member.id === myId
							? ` (${t(lang, 'you')})`
							: ''}
					</h1>
				{/if}
			</div>
		</header>

		<main class="mx-auto min-h-0 w-full max-w-lg flex-1 space-y-4 overflow-y-auto p-4">
			{#if errorMessage}
				<div class="rounded-md bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>
			{:else if member}
				{#if isLoadingPayments}
					<div class="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
						<div
							class="h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
						></div>
					</div>
				{:else if paymentsData}
					<Payments
						outstandingTableData={paymentsData}
						memberName={displayName}
						memberId={member.member_id}
						readOnly={true}
						showSearch={false}
						{lang}
					/>
				{/if}

				<section class="rounded-xl bg-white p-6 shadow-sm">
					<h2 class="mb-4 text-lg font-semibold text-gray-900">{t(lang, 'details')}</h2>
					<dl class="space-y-3 text-sm">
						<div class="flex justify-between gap-4">
							<dt class="text-gray-500">{t(lang, 'status')}</dt>
							<dd class="font-medium text-gray-900">{member.status}</dd>
						</div>
						{#if member.middle_name}
							<div class="flex justify-between gap-4">
								<dt class="text-gray-500">{t(lang, 'fatherHusband')}</dt>
								<dd class="font-medium text-gray-900">{member.middle_name}</dd>
							</div>
						{/if}
						{#if member.mobile}
							<div class="flex justify-between gap-4">
								<dt class="text-gray-500">{t(lang, 'mobile')}</dt>
								<dd class="font-medium text-gray-900">{member.mobile}</dd>
							</div>
						{/if}
						{#if member.entry_date}
							<div class="flex justify-between gap-4">
								<dt class="text-gray-500">{t(lang, 'joined')}</dt>
								<dd class="font-medium text-gray-900">{formatDate(member.entry_date)}</dd>
							</div>
						{/if}
					</dl>
					<p class="mt-4 text-xs text-gray-500">
						{t(lang, 'viewOnlyNotice')}
					</p>
				</section>
			{/if}
		</main>
	</div>
{/if}
