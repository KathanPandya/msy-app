<script lang="ts">
	import { goto } from '$app/navigation';
	import MemberSearch, { type MemberSearchItem } from '$lib/components/MemberSearch.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import familiesApi from '$lib/endpoints/familiesApi';
	import { memberListStore } from '$lib/stores/memberListStore';
	import type { Family } from '$lib/types/family';
	import { formatMemberId } from '$lib/utilities/memberId';
	import { onMount } from 'svelte';

	let families = $state<Family.ListItem[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let searchQuery = $state('');
	let showSingles = $state(false);
	let showNewPanel = $state(false);
	let picked = $state<MemberSearchItem | null>(null);
	let creating = $state(false);
	let successMessage = $state('');

	onMount(async () => {
		await Promise.all([loadFamilies(), memberListStore.fetchAllMembers()]);
	});

	async function loadFamilies() {
		isLoading = true;
		errorMessage = '';
		try {
			const res = await familiesApi.list();
			families = res.families || [];
		} catch (err: any) {
			errorMessage = err?.response?.data?.message || 'Failed to load families.';
		} finally {
			isLoading = false;
		}
	}

	const searchMembers = $derived(
		($memberListStore.members || []).map((u) => ({
			id: u._id,
			member_id: u.member_id,
			name: `${u.first_name || ''} ${u.surname || ''}`.trim()
		}))
	);

	function headOf(f: Family.ListItem) {
		return f.members.find((m) => m.id === f.managerId) || f.members[0];
	}

	function netDue(f: Family.ListItem) {
		return f.members.reduce((s, m) => s + (m.outstanding_amount ?? 0), 0);
	}

	function dueLabel(n: number) {
		if (n > 0) return `₹${n} due`;
		if (n < 0) return `₹${Math.abs(n)} credit`;
		return 'settled';
	}

	const filtered = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		return families.filter((f) => {
			if (!showSingles && f.memberCount <= 1 && !q) return false;
			if (!q) return true;
			return f.members.some(
				(m) =>
					m.name.toLowerCase().includes(q) ||
					m.member_id.toLowerCase().includes(q) ||
					formatMemberId(m.member_id).toLowerCase().includes(q)
			);
		});
	});

	const multiCount = $derived(families.filter((f) => f.memberCount >= 2).length);

	async function createFamily() {
		if (!picked) return;
		creating = true;
		errorMessage = '';
		try {
			const res = await familiesApi.createNew({ memberId: picked.id });
			successMessage = `Started new family with ${picked.name}.`;
			showNewPanel = false;
			picked = null;
			await loadFamilies();
			goto(`/families/${res.clubId}`);
		} catch (err: any) {
			errorMessage = err?.response?.data?.message || 'Could not create family.';
		} finally {
			creating = false;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-xl font-semibold text-gray-900">Families</h2>
			<p class="text-sm text-gray-500">
				{multiCount} families of 2+ · {families.length} total (incl. single-member)
			</p>
		</div>
		<Button
			variant="primary"
			onclick={() => {
				showNewPanel = !showNewPanel;
				picked = null;
			}}
		>
			＋ New family
		</Button>
	</div>

	{#if successMessage}
		<div class="rounded-md bg-green-50 p-4 text-sm text-green-800">{successMessage}</div>
	{/if}
	{#if errorMessage}
		<div class="rounded-md bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>
	{/if}

	{#if showNewPanel}
		<section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<h3 class="text-lg font-semibold text-gray-900">Start a new family</h3>
			<p class="mt-1 text-sm text-gray-600">
				Pick the first member. A fresh family is created with just them (they become the head); add
				the rest on the next screen.
			</p>
			<div class="mt-4">
				<MemberSearch
					members={searchMembers}
					placeholder="Who's the first member?"
					onpick={(m) => (picked = m)}
				/>
			</div>
			{#if picked}
				<p class="mt-3 text-sm text-gray-800">
					Start a new family with <strong>{picked.name}</strong>?
				</p>
				<div class="mt-3 flex gap-2">
					<Button variant="primary" disabled={creating} onclick={createFamily}>
						{creating ? 'Creating…' : 'Create'}
					</Button>
					<Button
						variant="secondary"
						onclick={() => {
							picked = null;
						}}>Cancel</Button
					>
				</div>
			{/if}
		</section>
	{/if}

	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<input
			type="search"
			bind:value={searchQuery}
			placeholder="Search families by member name or MSY id…"
			class="w-full max-w-md rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		/>
		<label class="flex items-center gap-2 text-sm text-gray-700">
			<input type="checkbox" bind:checked={showSingles} class="rounded border-gray-300" />
			show single-member families
		</label>
	</div>

	{#if isLoading}
		<p class="text-sm text-gray-500">Loading families…</p>
	{:else if filtered.length === 0}
		<p class="text-sm text-gray-500">No families match.</p>
	{:else}
		<ul class="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
			{#each filtered as f (f.clubId)}
				{@const head = headOf(f)}
				<li>
					<a
						href={`/families/${f.clubId}`}
						class="flex flex-col gap-1 px-4 py-3 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
					>
						<div>
							<p class="font-medium text-gray-900">
								{head?.name || 'Unknown'}
								{#if head && head.status !== 'active'}
									<span title="head not active">⚠</span>
								{/if}
							</p>
							<p class="text-sm text-gray-500">
								{f.memberCount} member{f.memberCount === 1 ? '' : 's'}
							</p>
						</div>
						<span class="text-sm text-gray-600">{dueLabel(netDue(f))}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
