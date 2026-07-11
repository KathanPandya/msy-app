<script lang="ts">
	import { goto } from '$app/navigation';
	import familiesApi from '$lib/endpoints/familiesApi';
	import { authStore } from '$lib/stores/authStore';
	import type { Family } from '$lib/types/family';
	import { requireMember } from '$lib/utilities/authGuard';
	import { formatMemberId } from '$lib/utilities/memberId';
	import { onMount } from 'svelte';

	let isAuthorized = $state(false);
	let members = $state<Family.MemberSummary[]>([]);
	let errorMessage = $state('');
	let isLoading = $state(true);
	let myId = $state('');

	$effect(() => {
		if (!$authStore.isLoading) {
			isAuthorized = requireMember();
			myId = $authStore.userAllInfo?.user._id || '';
		}
	});

	onMount(async () => {
		try {
			const res = await familiesApi.me();
			if (!res.family || res.family.members.length < 2) {
				errorMessage = 'You are not the head of a family.';
				members = [];
			} else {
				members = res.family.members;
			}
		} catch (err: any) {
			errorMessage = err?.response?.data?.message || 'Could not load family.';
		} finally {
			isLoading = false;
		}
	});

	function dueLabel(n: number | undefined) {
		const amount = n ?? 0;
		if (amount > 0) return { text: `₹${amount} due`, color: 'text-red-700' };
		if (amount < 0) return { text: `₹${Math.abs(amount)} credit`, color: 'text-green-700' };
		return { text: 'settled', color: 'text-gray-800' };
	}

	const netDue = $derived(members.reduce((sum, m) => sum + (m.outstanding_amount ?? 0), 0));
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
					onclick={() => goto('/me')}
					class="mb-2 text-sm text-blue-600 hover:underline">← My page</button
				>
				<h1 class="text-xl font-bold text-gray-900">My family</h1>
			</div>
		</header>

		<main class="mx-auto max-w-lg space-y-3 p-4">
			{#if errorMessage}
				<div class="rounded-md bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>
			{:else}
				{#each members as m (m.id)}
					<button
						type="button"
						onclick={() => goto(`/me/family/${m.id}`)}
						class="flex w-full items-center justify-between rounded-xl bg-white p-4 text-left shadow-sm hover:bg-gray-50"
					>
						<div>
							<p class="font-semibold text-gray-900">
								{m.name}{m.id === myId ? ' (you)' : ''}
							</p>
							<p class="text-sm text-gray-500">
								{formatMemberId(m.member_id)}
								{#if m.status !== 'active'}
									<span class="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800"
										>{m.status}</span
									>
								{/if}
							</p>
						</div>
						<span class={`text-sm font-medium ${dueLabel(m.outstanding_amount).color}`}
							>{dueLabel(m.outstanding_amount).text}</span
						>
					</button>
				{/each}

				<section class="rounded-xl bg-white p-4 shadow-sm">
					<p class="text-sm text-gray-500">Family total</p>
					<p class={`text-lg font-semibold ${dueLabel(netDue).color}`}>{dueLabel(netDue).text}</p>
					<p class="mt-2 text-xs text-gray-500">Tap a name to see their details. View-only.</p>
				</section>
			{/if}
		</main>
	</div>
{/if}
