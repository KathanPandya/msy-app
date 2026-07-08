<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import MemberSearch, { type MemberSearchItem } from '$lib/components/MemberSearch.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import familiesApi from '$lib/endpoints/familiesApi';
	import type { Family } from '$lib/types/family';
	import { formatMemberId } from '$lib/utilities/memberId';
	import { onMount } from 'svelte';

	let family = $state<Family.Detail | null>(null);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let banner = $state('');
	let picked = $state<MemberSearchItem | null>(null);
	let confirmRemoveId = $state<string | null>(null);
	let busy = $state(false);

	onMount(() => load());

	async function load() {
		const id = page.params.id;
		if (!id) return;
		isLoading = true;
		errorMessage = '';
		try {
			const res = await familiesApi.detail(id);
			family = res.family;
		} catch (err: any) {
			errorMessage = err?.response?.data?.message || 'Family not found.';
			family = null;
		} finally {
			isLoading = false;
		}
	}

	function dueLabel(n: number | undefined) {
		const amount = n ?? 0;
		if (amount > 0) return `₹${amount} due`;
		if (amount < 0) return `₹${Math.abs(amount)} credit`;
		return 'settled';
	}

	const head = $derived(
		family?.members.find((m) => m.id === family?.managerId) || family?.members[0]
	);
	const netDue = $derived(
		(family?.members || []).reduce((s, m) => s + (m.outstanding_amount ?? 0), 0)
	);
	const addable = $derived(
		(family?.addable || []).map((m) => ({
			id: m.id,
			member_id: m.member_id,
			name: m.name
		}))
	);
	const headInactive = $derived(Boolean(head && head.status !== 'active'));

	async function addMember() {
		if (!family || !picked) return;
		busy = true;
		errorMessage = '';
		try {
			await familiesApi.addMember(family.clubId, { memberId: picked.id });
			banner = `Added ${formatMemberId(picked.member_id)} to this family.`;
			picked = null;
			await load();
		} catch (err: any) {
			errorMessage = err?.response?.data?.message || 'Could not add member.';
		} finally {
			busy = false;
		}
	}

	async function removeMember(memberId: string, memberLabel: string) {
		if (!family) return;
		busy = true;
		errorMessage = '';
		try {
			const res = await familiesApi.removeMember(family.clubId, { memberId });
			banner = `Removed ${memberLabel} — they now have their own family.`;
			confirmRemoveId = null;
			await load();
			if (res.clubId && res.clubId !== family.clubId) {
				// stay on current family after remove
			}
		} catch (err: any) {
			errorMessage = err?.response?.data?.message || 'Could not remove member.';
		} finally {
			busy = false;
		}
	}

	async function makeHead(memberId: string, memberLabel: string) {
		if (!family) return;
		busy = true;
		errorMessage = '';
		try {
			await familiesApi.makeHead(family.clubId, { memberId });
			banner = `${memberLabel} is now the head.`;
			await load();
		} catch (err: any) {
			errorMessage = err?.response?.data?.message || 'Could not set head.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="space-y-4">
	<button type="button" onclick={() => goto('/families')} class="text-sm text-blue-600 hover:underline"
		>← All families</button
	>

	{#if isLoading}
		<p class="text-sm text-gray-500">Loading…</p>
	{:else if family}
		<section class="rounded-lg bg-white p-4 shadow-sm sm:p-6">
			<h2 class="text-xl font-semibold text-gray-900">Family</h2>
			<p class="mt-1 text-sm text-gray-600">
				Head: <strong>{head?.name || '—'}</strong> · {family.members.length} member{family.members
					.length === 1
					? ''
					: 's'} · {dueLabel(netDue)}
			</p>
			{#if headInactive}
				<p class="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
					⚠ This family's head is not active. Make an active member the head so they can view the
					family in their app.
				</p>
			{/if}
		</section>

		{#if banner}
			<div class="rounded-md bg-green-50 p-4 text-sm text-green-800">{banner}</div>
		{/if}
		{#if errorMessage}
			<div class="rounded-md bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>
		{/if}

		<ul class="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
			{#each family.members as m (m.id)}
				{@const isHead = m.id === family.managerId}
				<li class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p class="font-medium text-gray-900">
							{#if isHead}★{/if}
							<a href={`/members/view/${m.id}`} class="hover:underline">{m.name}</a>
						</p>
						<p class="text-sm text-gray-500">
							{formatMemberId(m.member_id)} · {m.status} · {dueLabel(m.outstanding_amount)}
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						{#if !isHead && m.status === 'active'}
							<Button
								variant="secondary"
								disabled={busy}
								onclick={() => makeHead(m.id, formatMemberId(m.member_id))}
							>
								Make head
							</Button>
						{/if}
						{#if family.members.length > 1}
							{#if confirmRemoveId === m.id}
								<Button
									variant="danger"
									disabled={busy}
									onclick={() => removeMember(m.id, formatMemberId(m.member_id))}
								>
									Confirm remove
								</Button>
								<Button variant="secondary" onclick={() => (confirmRemoveId = null)}>Cancel</Button>
							{:else}
								<Button
									variant="secondary"
									disabled={busy}
									onclick={() => (confirmRemoveId = m.id)}>Remove</Button
								>
							{/if}
						{/if}
					</div>
				</li>
			{/each}
		</ul>

		<section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<h3 class="text-lg font-semibold text-gray-900">＋ Add a member to this family</h3>
			<div class="mt-3">
				<MemberSearch
					members={addable}
					placeholder="Search by name or MSY id…"
					onpick={(m) => (picked = m)}
				/>
			</div>
			{#if picked}
				<p class="mt-3 text-sm text-gray-800">
					Add <strong>{picked.name}</strong> to this family?
				</p>
				<div class="mt-3 flex gap-2">
					<Button variant="primary" disabled={busy} onclick={addMember}
						>{busy ? 'Adding…' : 'Add'}</Button
					>
					<Button variant="secondary" onclick={() => (picked = null)}>Cancel</Button>
				</div>
			{/if}
			<p class="mt-4 text-xs text-gray-500">
				Removing a member starts a new family for them (with just them). The head is the one member
				who can see the whole family in their own app.
			</p>
		</section>
	{:else}
		<div class="rounded-md bg-red-50 p-4 text-sm text-red-800">{errorMessage || 'Not found'}</div>
	{/if}
</div>
