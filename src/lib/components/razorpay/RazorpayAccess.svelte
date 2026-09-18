<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import { getMemberStatusLabel } from '$lib/constants/app-constants';
	import adminApi from '$lib/endpoints/adminApi';
	import { memberListStore } from '$lib/stores/memberListStore';
	import { formatMemberDisplay, memberIdDigits } from '$lib/utilities/memberId';
	import { SvelteSet } from 'svelte/reactivity';
	import { onMount } from 'svelte';

	// Selection is the source of truth for the save — PUT is a full replace
	// (razorpay.md §2), so ids stay selected even when filtered out of view.
	const selected = new SvelteSet<string>();
	let savedIds = $state<string[]>([]);

	let isLoading = $state(true);
	let loadError = $state('');
	let saving = $state(false);
	let saveError = $state('');
	let saveMessage = $state('');

	let searchQuery = $state('');
	let selectedOnly = $state(false);

	async function loadSelection() {
		isLoading = true;
		loadError = '';
		try {
			const [res] = await Promise.all([
				adminApi.fetchRazorpayUsers(),
				$memberListStore.members.length === 0
					? memberListStore.fetchAllMembers()
					: Promise.resolve()
			]);
			savedIds = res.userIds ?? [];
			selected.clear();
			savedIds.forEach((id) => selected.add(id));
		} catch (err: any) {
			loadError = err?.response?.data?.message || 'Failed to load Razorpay access.';
		} finally {
			isLoading = false;
		}
	}

	onMount(loadSelection);

	const isDirty = $derived(
		selected.size !== savedIds.length || savedIds.some((id) => !selected.has(id))
	);

	const members = $derived(
		[...$memberListStore.members].sort(
			(a, b) => (memberIdDigits(a.member_id) ?? 0) - (memberIdDigits(b.member_id) ?? 0)
		)
	);

	const visibleMembers = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		return members.filter((m) => {
			if (selectedOnly && !selected.has(m._id)) return false;
			if (!q) return true;
			return (
				(m.name || '').toLowerCase().includes(q) ||
				(m.member_id || '').toLowerCase().includes(q) ||
				(m.mobile || '').includes(q)
			);
		});
	});

	const allVisibleSelected = $derived(
		visibleMembers.length > 0 && visibleMembers.every((m) => selected.has(m._id))
	);

	function toggle(id: string) {
		saveMessage = '';
		if (selected.has(id)) selected.delete(id);
		else selected.add(id);
	}

	function toggleAllVisible() {
		saveMessage = '';
		if (allVisibleSelected) visibleMembers.forEach((m) => selected.delete(m._id));
		else visibleMembers.forEach((m) => selected.add(m._id));
	}

	function resetSelection() {
		selected.clear();
		savedIds.forEach((id) => selected.add(id));
		saveError = '';
		saveMessage = '';
	}

	async function save() {
		saving = true;
		saveError = '';
		saveMessage = '';
		try {
			const res = await adminApi.saveRazorpayUsers({ userIds: [...selected] });
			savedIds = res.userIds ?? [...selected];
			saveMessage = `Saved — ${res.enabled} enabled, ${res.disabled} disabled`;
		} catch (err: any) {
			const data = err?.response?.data;
			const fieldError =
				data?.error && typeof data.error === 'object' ? Object.values(data.error)[0] : null;
			saveError =
				(typeof fieldError === 'string' && fieldError) ||
				data?.message ||
				(typeof data?.error === 'string' && data.error) ||
				'Failed to save Razorpay access.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex h-full flex-col">
	<div class="mb-1.5 flex-shrink-0 space-y-1.5">
		<div class="flex flex-wrap items-center gap-2 sm:flex-nowrap">
			<div class="w-full sm:w-64">
				<SearchInput
					id="razorpay-access-search"
					bind:value={searchQuery}
					placeholder="Search name, member ID, mobile"
				/>
			</div>
			<label class="flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-700">
				<input
					type="checkbox"
					bind:checked={selectedOnly}
					class="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:size-4"
				/>
				Selected only
			</label>
			<div class="ml-auto flex shrink-0 items-center gap-2">
				{#if isDirty}
					<Button variant="secondary" size="sm" onclick={resetSelection} disabled={saving}
						>Reset</Button
					>
				{/if}
				<Button variant="primary" size="sm" onclick={save} disabled={saving || isLoading || !isDirty}>
					{saving ? 'Saving...' : 'Save'}
				</Button>
			</div>
		</div>

		{#if !isLoading}
			<div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 px-1">
				<p class="text-xs text-gray-700 sm:text-sm">
					{selected.size} of {members.length} enabled{#if isDirty}<span class="text-amber-700">
							· unsaved changes</span
						>{/if}
				</p>
				{#if saveMessage}
					<p class="text-xs text-green-700">{saveMessage}</p>
				{/if}
			</div>
		{/if}

		{#if loadError || saveError}
			<p class="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
				{loadError || saveError}
			</p>
		{/if}
	</div>

	<div class="min-h-0 flex-1">
		{#if isLoading}
			<div
				class="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm"
			>
				<div class="text-center">
					<div
						class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<p class="mt-2 text-sm text-gray-600">Loading members...</p>
				</div>
			</div>
		{:else if visibleMembers.length === 0}
			<div
				class="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
			>
				<h3 class="text-sm font-medium text-gray-900">No members found</h3>
				<p class="mt-1 text-center text-sm text-gray-500">
					{selectedOnly ? 'No members have Razorpay enabled' : 'Try a different search'}
				</p>
			</div>
		{:else}
			<div
				class="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
			>
				<label
					class="flex flex-shrink-0 cursor-pointer items-center gap-2.5 border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600"
				>
					<input
						type="checkbox"
						checked={allVisibleSelected}
						onchange={toggleAllVisible}
						class="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:size-4"
					/>
					{allVisibleSelected ? 'Deselect' : 'Select'} all {visibleMembers.length} shown
				</label>
				<div class="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto">
					{#each visibleMembers as m (m._id)}
						<label
							class={`flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-gray-50 sm:py-1.5 ${
								selected.has(m._id) ? 'bg-blue-50/40' : ''
							}`}
						>
							<input
								type="checkbox"
								checked={selected.has(m._id)}
								onchange={() => toggle(m._id)}
								class="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:size-4"
							/>
							<span class="min-w-0 flex-1 truncate text-xs font-medium text-gray-900">
								{formatMemberDisplay(m.name, m.member_id)}
							</span>
							<span class="hidden shrink-0 text-xs text-gray-500 sm:inline">{m.mobile || '-'}</span>
							<span class="w-16 shrink-0 text-right text-[11px] text-gray-500">
								{getMemberStatusLabel(m.status)}
							</span>
						</label>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
