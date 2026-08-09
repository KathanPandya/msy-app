<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/authStore';
	import { requireMember } from '$lib/utilities/authGuard';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import familiesApi from '$lib/endpoints/familiesApi';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { onMount } from 'svelte';

	let isAuthorized = $state(false);
	let familyCount = $state<number | null>(null);
	let isLoadingFamily = $state(false);

	$effect(() => {
		if (!$authStore.isLoading) {
			isAuthorized = requireMember();
		}
	});

	onMount(async () => {
		if (!$authStore.isAuthenticated) return;
		isLoadingFamily = true;
		try {
			const res = await familiesApi.me();
			familyCount = res.family?.members?.length ?? null;
			if (familyCount != null && familyCount < 2) familyCount = null;
		} catch {
			familyCount = null;
		} finally {
			isLoadingFamily = false;
		}
	});

	const user = $derived($authStore.userAllInfo?.user);
	const displayName = $derived(
		user ? `${user.first_name || ''} ${user.surname || ''}`.trim() : 'Member'
	);
	const amount = $derived(user?.outstanding_amount ?? 0);
	const isHead = $derived(
		Boolean(user?.club_id) && familyCount != null && familyCount >= 2
	);

	function amountLabel(n: number) {
		if (n > 0) return { value: `₹${n}`, sub: 'to be paid', color: 'text-red-700' };
		if (n < 0) return { value: `₹${Math.abs(n)}`, sub: 'in credit', color: 'text-green-700' };
		return { value: '₹0', sub: 'All settled ✓', color: 'text-gray-800' };
	}

	const due = $derived(amountLabel(amount));
</script>

{#if $authStore.isLoading}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<p class="text-gray-600">Loading…</p>
	</div>
{:else if isAuthorized && user}
	<div class="min-h-screen bg-gray-50">
		<header class="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
			<div class="mx-auto flex max-w-lg items-center justify-between">
				<div class="flex items-center gap-3">
					<div
						class="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white"
					>
						{(user.first_name || '?').charAt(0).toUpperCase()}
					</div>
					<div>
						<p class="font-semibold text-gray-900">
							{formatMemberDisplay(displayName, user.member_id)}
						</p>
						{#if isHead}
							<p class="text-sm text-gray-500">
								<span
									class="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
									>Head</span
								>
							</p>
						{/if}
					</div>
				</div>
				<button
					type="button"
					onclick={() => authStore.logout()}
					class="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
				>
					Log out
				</button>
			</div>
		</header>

		<main class="mx-auto max-w-lg space-y-4 p-4 sm:p-6">
			<section class="rounded-xl bg-white p-6 shadow-sm">
				<p class="text-sm font-medium text-gray-500">Amount due</p>
				<p class={`mt-2 text-3xl font-bold ${due.color}`}>{due.value}</p>
				<p class="mt-1 text-sm text-gray-600">{due.sub}</p>
			</section>

			<section class="rounded-xl bg-white p-6 shadow-sm">
				<h2 class="mb-4 text-lg font-semibold text-gray-900">Details</h2>
				<dl class="space-y-3 text-sm">
					{#if user.entry_date}
						<div class="flex justify-between gap-4">
							<dt class="text-gray-500">Joined</dt>
							<dd class="font-medium text-gray-900">{formatDate(user.entry_date)}</dd>
						</div>
					{/if}
				</dl>
			</section>

			{#if !isLoadingFamily && familyCount != null && familyCount >= 2}
				<button
					type="button"
					onclick={() => goto('/me/family')}
					class="flex w-full items-center justify-between rounded-xl bg-white p-5 text-left shadow-sm hover:bg-gray-50"
				>
					<div>
						<p class="font-semibold text-gray-900">View my family</p>
						<p class="text-sm text-gray-500">{familyCount} members</p>
					</div>
					<span class="text-gray-400">→</span>
				</button>
			{/if}
		</main>
	</div>
{/if}
