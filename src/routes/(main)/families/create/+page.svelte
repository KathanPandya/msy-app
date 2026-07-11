<script lang="ts">
	import { goto } from '$app/navigation';
	import MemberSearch, { type MemberSearchItem } from '$lib/components/MemberSearch.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import familiesApi from '$lib/endpoints/familiesApi';
	import userApi from '$lib/endpoints/userApi';
	import { familyListStore } from '$lib/stores/familyListStore';
	import { formatMemberId } from '$lib/utilities/memberId';

	let pendingMembers = $state<MemberSearchItem[]>([]);
	let creating = $state(false);
	let errorMessage = $state('');

	async function memberFetcher(query: string): Promise<MemberSearchItem[]> {
		const res = await userApi.getAllUsers({ query, limit: 8 });
		return (res?.users || []).map((u) => ({
			id: u._id,
			member_id: u.member_id,
			name: `${u.first_name || ''} ${u.surname || ''}`.trim()
		}));
	}

	function queueMember(m: MemberSearchItem) {
		if (!m || pendingMembers.some((p) => p.id === m.id)) return;
		pendingMembers = [...pendingMembers, m];
	}

	function unqueueMember(id: string) {
		pendingMembers = pendingMembers.filter((p) => p.id !== id);
	}

	async function createFamily() {
		if (!pendingMembers.length) return;
		creating = true;
		errorMessage = '';
		try {
			// First queued member creates the family (becomes head); the rest are added to it.
			const [firstMember, ...rest] = pendingMembers;
			const res = await familiesApi.createNew({ memberId: firstMember.id });
			const clubId = res.clubId;

			for (const m of rest) {
				await familiesApi.addMember(clubId, { memberId: m.id });
			}

			// Drop the cached list so it reloads with the new family.
			familyListStore.invalidate();
			goto(`/families/${clubId}`);
		} catch (err: any) {
			errorMessage = err?.response?.data?.message || 'Could not create family.';
			creating = false;
		}
	}
</script>

<div class="space-y-4">
	<button
		type="button"
		onclick={() => goto('/families')}
		class="text-sm text-blue-600 hover:underline"
	>
		← All families
	</button>

	<section class="rounded-lg bg-white p-4 shadow-sm sm:p-6">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 class="text-xl font-semibold text-gray-900">New family</h2>
				<p class="mt-1 text-sm text-gray-600">
					Search and add members; the first one becomes the head.
				</p>
			</div>
			{#if pendingMembers.length}
				<Button variant="primary" disabled={creating} onclick={createFamily}>
					{creating ? 'Creating…' : `Create family (${pendingMembers.length})`}
				</Button>
			{/if}
		</div>

		{#if errorMessage}
			<div class="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{errorMessage}</div>
		{/if}

		<div class="mt-4 w-full sm:max-w-md">
			<MemberSearch
				fetcher={memberFetcher}
				exclude={pendingMembers.map((p) => p.id)}
				placeholder="Search by name or MSY id to add…"
				onpick={queueMember}
			/>
		</div>
	</section>

	{#if pendingMembers.length}
		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{#each pendingMembers as p, i (p.id)}
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
							{i === 0 ? 'Head' : 'New'}
						</span>
					</div>
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
	{:else}
		<p class="text-sm text-gray-500">No members added yet. Use the search above to add members.</p>
	{/if}

	<p class="text-xs text-gray-500">
		The first member becomes the family head — you can change it later.
	</p>
</div>
