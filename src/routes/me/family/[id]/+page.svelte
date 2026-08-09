<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import familiesApi from '$lib/endpoints/familiesApi';
	import { authStore } from '$lib/stores/authStore';
	import { requireMember } from '$lib/utilities/authGuard';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { onMount } from 'svelte';

	let isAuthorized = $state(false);
	let member = $state<Record<string, any> | null>(null);
	let errorMessage = $state('');
	let isLoading = $state(true);

	$effect(() => {
		if (!$authStore.isLoading) {
			isAuthorized = requireMember();
		}
	});

	onMount(async () => {
		const id = page.params.id;
		if (!id) return;
		try {
			const res = await familiesApi.getMember(id);
			member = res.member;
		} catch (err: any) {
			errorMessage = err?.response?.data?.message || 'Not allowed to view this member.';
		} finally {
			isLoading = false;
		}
	});

	function amountLabel(n: number) {
		if (n > 0) return { value: `₹${n}`, sub: 'to be paid', color: 'text-red-700' };
		if (n < 0) return { value: `₹${Math.abs(n)}`, sub: 'in credit', color: 'text-green-700' };
		return { value: '₹0', sub: 'All settled ✓', color: 'text-gray-800' };
	}

	const due = $derived(amountLabel(Number(member?.outstanding_amount ?? 0)));
	const myId = $derived($authStore.userAllInfo?.user._id);
	const displayName = $derived(
		member
			? `${member.first_name || ''} ${member.surname || ''}`.trim() || member.name || 'Member'
			: ''
	);
</script>

{#if $authStore.isLoading || isLoading}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<p class="text-gray-600">Loading…</p>
	</div>
{:else if isAuthorized}
	<div class="min-h-screen bg-gray-50">
		<header class="border-b border-gray-200 bg-white px-4 py-4">
			<div class="mx-auto max-w-lg">
				<button
					type="button"
					onclick={() => goto('/me/family')}
					class="mb-2 text-sm text-blue-600 hover:underline">← Family</button
				>
				{#if member}
					<h1 class="text-xl font-bold text-gray-900">
						{formatMemberDisplay(displayName, member.member_id)}{member._id === myId ||
						member.id === myId
							? ' (you)'
							: ''}
					</h1>
				{/if}
			</div>
		</header>

		<main class="mx-auto max-w-lg space-y-4 p-4">
			{#if errorMessage}
				<div class="rounded-md bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>
			{:else if member}
				<section class="rounded-xl bg-white p-6 shadow-sm">
					<p class="text-sm font-medium text-gray-500">Amount due</p>
					<p class={`mt-2 text-3xl font-bold ${due.color}`}>{due.value}</p>
					<p class="mt-1 text-sm text-gray-600">{due.sub}</p>
				</section>

				<section class="rounded-xl bg-white p-6 shadow-sm">
					<h2 class="mb-4 text-lg font-semibold text-gray-900">Details</h2>
					<dl class="space-y-3 text-sm">
						<div class="flex justify-between gap-4">
							<dt class="text-gray-500">Status</dt>
							<dd class="font-medium text-gray-900">{member.status}</dd>
						</div>
						{#if member.middle_name}
							<div class="flex justify-between gap-4">
								<dt class="text-gray-500">Father/Husband</dt>
								<dd class="font-medium text-gray-900">{member.middle_name}</dd>
							</div>
						{/if}
						{#if member.mobile}
							<div class="flex justify-between gap-4">
								<dt class="text-gray-500">Mobile</dt>
								<dd class="font-medium text-gray-900">{member.mobile}</dd>
							</div>
						{/if}
						{#if member.entry_date}
							<div class="flex justify-between gap-4">
								<dt class="text-gray-500">Joined</dt>
								<dd class="font-medium text-gray-900">{formatDate(member.entry_date)}</dd>
							</div>
						{/if}
					</dl>
					<p class="mt-4 text-xs text-gray-500">
						View-only. Payments and changes are handled by the admin.
					</p>
				</section>
			{/if}
		</main>
	</div>
{/if}
