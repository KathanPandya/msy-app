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
	let pendingAdditions = $state<MemberSearchItem[]>([]);
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

	function amountClass(n: number | undefined) {
		const amount = n ?? 0;
		if (amount > 0) return 'text-red-600';
		if (amount < 0) return 'text-green-600';
		return 'text-gray-500';
	}

	function fullName(m: Family.MemberSummary) {
		const parts = [m.first_name, m.middle_name, m.surname].filter(Boolean);
		return parts.length ? parts.join(' ') : m.name;
	}

	function joinedLabel(s: string | undefined) {
		if (!s) return '—';
		const d = new Date(s);
		if (Number.isNaN(d.getTime())) return s;
		return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

	// Members already in the family or already queued shouldn't show up in the search.
	const excludeIds = $derived([
		...(family?.members.map((m) => m.id) ?? []),
		...pendingAdditions.map((p) => p.id)
	]);

	function queueMember(m: MemberSearchItem) {
		if (!m || pendingAdditions.some((p) => p.id === m.id)) return;
		pendingAdditions = [...pendingAdditions, m];
	}

	function unqueueMember(id: string) {
		pendingAdditions = pendingAdditions.filter((p) => p.id !== id);
	}

	async function updateFamily() {
		if (!family || !pendingAdditions.length) return;
		busy = true;
		errorMessage = '';
		banner = '';
		const added: string[] = [];
		const failed: string[] = [];
		for (const m of pendingAdditions) {
			try {
				await familiesApi.addMember(family.clubId, { memberId: m.id });
				added.push(formatMemberId(m.member_id));
			} catch {
				failed.push(formatMemberId(m.member_id));
			}
		}
		busy = false;
		pendingAdditions = [];
		if (added.length) banner = `Added ${added.join(', ')} to this family.`;
		if (failed.length) errorMessage = `Could not add: ${failed.join(', ')}.`;
		await load();
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

		<section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div class="w-full sm:max-w-md">
					<MemberSearch
						members={addable}
						exclude={excludeIds}
						placeholder="Search by name or MSY id to add…"
						onpick={queueMember}
					/>
				</div>
				{#if pendingAdditions.length}
					<Button variant="primary" disabled={busy} onclick={updateFamily}>
						{busy ? 'Updating…' : `Update family (${pendingAdditions.length})`}
					</Button>
				{/if}
			</div>
			<p class="mt-2 text-xs text-gray-500">
				{#if pendingAdditions.length}
					{pendingAdditions.length} member{pendingAdditions.length === 1 ? '' : 's'} queued — click
					“Update family” to save.
				{:else}
					Pick members to add; they’ll queue below until you update the family.
				{/if}
			</p>
		</section>

		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{#each family.members as m (m.id)}
				{@const isHead = m.id === family.managerId}
				<div
					class="group relative flex flex-col rounded-xl border bg-white p-3.5 transition-shadow hover:shadow-md {isHead
						? 'border-blue-200 ring-1 ring-blue-100'
						: 'border-gray-200'}"
				>
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0">
							<a
								href={`/members/view/${m.id}`}
								class="flex items-center gap-1.5 font-semibold text-gray-900 hover:underline"
							>
								{#if isHead}<span title="Head" class="text-amber-500">★</span>{/if}
								<span class="truncate">{fullName(m)}</span>
							</a>
							<p class="mt-0.5 text-xs text-gray-400">{formatMemberId(m.member_id)}</p>
						</div>
						<span
							class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize {m.status ===
							'active'
								? 'bg-green-50 text-green-700'
								: 'bg-gray-100 text-gray-500'}"
						>
							{m.status}
						</span>
					</div>

					<dl class="mt-2.5 space-y-1.5 text-[13px] text-gray-600">
						<div class="flex items-center gap-2">
							<svg class="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
							<span class="truncate">{m.mobile || '—'}</span>
						</div>
						<div class="flex items-start gap-2">
							<svg class="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
							<span class="line-clamp-2">{m.address || '—'}</span>
						</div>
						<div class="flex items-center gap-2">
							<svg class="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
							<span>Joined {joinedLabel(m.entry_date)}</span>
						</div>
					</dl>

					<div class="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2">
						<span class="text-xs text-gray-400">Amount left</span>
						<span class="text-sm font-semibold {amountClass(m.outstanding_amount)}">
							{dueLabel(m.outstanding_amount)}
						</span>
					</div>

					{#if family.members.length > 1 || (!isHead && m.status === 'active')}
						<div
							class="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 rounded-b-xl border-t border-gray-100 bg-white/95 px-3 py-2 opacity-0 backdrop-blur-sm transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
						>
							{#if !isHead && m.status === 'active'}
								<button
									type="button"
									disabled={busy}
									onclick={() => makeHead(m.id, formatMemberId(m.member_id))}
									class="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
								>
									Make head
								</button>
							{/if}
							{#if family.members.length > 1}
								{#if confirmRemoveId === m.id}
									<button
										type="button"
										disabled={busy}
										onclick={() => removeMember(m.id, formatMemberId(m.member_id))}
										class="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
									>
										Confirm
									</button>
									<button
										type="button"
										onclick={() => (confirmRemoveId = null)}
										class="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
									>
										Cancel
									</button>
								{:else}
									<button
										type="button"
										disabled={busy}
										onclick={() => (confirmRemoveId = m.id)}
										class="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
									>
										Remove
									</button>
								{/if}
							{/if}
						</div>
					{/if}
				</div>
			{/each}

			{#each pendingAdditions as p (p.id)}
				<div
					class="relative flex flex-col rounded-xl border border-dashed border-blue-300 bg-blue-50/40 p-3.5"
				>
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0">
							<p class="truncate font-semibold text-gray-900">{p.name}</p>
							<p class="mt-0.5 text-xs text-gray-400">{formatMemberId(p.member_id)}</p>
						</div>
						<span
							class="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700"
						>
							New
						</span>
					</div>
					<p class="mt-2.5 text-[13px] text-gray-500">
						Will be added when you update the family.
					</p>
					<div class="mt-2.5 flex justify-end border-t border-blue-100 pt-2">
						<button
							type="button"
							onclick={() => unqueueMember(p.id)}
							class="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
						>
							Remove
						</button>
					</div>
				</div>
			{/each}
		</div>

		<p class="text-xs text-gray-500">
			Removing a member starts a new family for them (with just them). The head is the one member who
			can see the whole family in their own app.
		</p>
	{:else}
		<div class="rounded-md bg-red-50 p-4 text-sm text-red-800">{errorMessage || 'Not found'}</div>
	{/if}
</div>
