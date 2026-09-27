<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import termsApi from '$lib/endpoints/termsApi';
	import type { Terms } from '$lib/types/terms';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { parseRegistrationError } from '$lib/utilities/registrationUtils';
	import { escapeHtml } from '$lib/utilities/ticketUtils';
	import { Plus } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let versions = $state<Terms.ListRow[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let noticeMessage = $state((page.state as any)?.notice ?? '');

	const hasCurrent = $derived(versions.some((v) => v.is_current));

	async function load() {
		isLoading = true;
		errorMessage = '';
		try {
			versions = (await termsApi.list()).data ?? [];
		} catch (err) {
			versions = [];
			errorMessage = parseRegistrationError(err, 'Could not load the terms.');
		} finally {
			isLoading = false;
		}
	}

	onMount(load);

	function openVersion(id: string) {
		goto('/registration-terms/' + id);
	}

	function openPublish(fromId?: string) {
		goto('/registration-terms/publish' + (fromId ? '?from=' + fromId : ''));
	}

	let rollingBack = $state<Terms.ListRow | null>(null);
	let rollbackLoading = $state(false);
	let rollbackError = $state('');

	async function confirmRollback() {
		if (!rollingBack) return;
		rollbackLoading = true;
		rollbackError = '';
		try {
			await termsApi.makeCurrent({ id: rollingBack.id });
			noticeMessage = `Version ${rollingBack.version} is now current.`;
			rollingBack = null;
			await load();
		} catch (err) {
			rollbackError = parseRegistrationError(err, 'Could not make this version current.');
		} finally {
			rollbackLoading = false;
		}
	}

	function rowMenu(row: { raw: Terms.ListRow }) {
		const actions: { label: string; onclick: () => void }[] = [
			{ label: 'View', onclick: () => openVersion(row.raw.id) },
			{ label: 'Duplicate into new draft', onclick: () => openPublish(row.raw.id) }
		];
		if (!row.raw.is_current) {
			actions.push({
				label: 'Make current',
				onclick: () => {
					rollbackError = '';
					rollingBack = row.raw;
				}
			});
		}
		return actions;
	}

	function publisherName(p: Terms.Publisher) {
		return p?.name || p?.username || '-';
	}

	const columns = [
		{
			key: 'version',
			label: 'Version',
			width: 130,
			render: (value: number, row: any) =>
				'<span class="font-medium">v' +
				escapeHtml(value) +
				'</span>' +
				(row.raw.is_current
					? ' <span class="ml-1 inline-flex items-center rounded px-1.5 py-[1px] text-[11px] font-medium ring-1 ring-inset bg-green-50 text-green-700 ring-green-200">Current</span>'
					: '')
		},
		{ key: 'published', label: 'Published', width: 110 },
		{ key: 'publishedBy', label: 'Published by', width: 160 },
		{ key: 'note', label: 'Note', width: 260 },
		{ key: 'preview', label: 'Text (English)', width: 320 }
	];

	const tableData = $derived(
		versions.map((v) => ({
			_id: v.id,
			version: v.version,
			published: formatDate(v.published_at),
			publishedBy: publisherName(v.published_by),
			note: v.note || '-',
			preview: v.preview_en || '-',
			raw: v
		}))
	);
</script>

<div class="flex h-full flex-col">
	<div class="mb-1.5 flex-shrink-0 space-y-1.5">
		<div class="flex items-center gap-3">
			<div class="ml-auto shrink-0">
				<Button variant="primary" size="sm" onclick={() => openPublish()}>
					<div class="flex items-center justify-center gap-1.5">
						<Plus class="h-3.5 w-3.5" />
						<span>Publish new version</span>
					</div>
				</Button>
			</div>
		</div>

		{#if !isLoading && !errorMessage && !hasCurrent}
			<p
				class="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800"
			>
				No terms are published. Applicants cannot pay, so no registration can be completed until a
				version is published.
			</p>
		{/if}

		{#if !isLoading && versions.length > 0}
			<p class="px-1 text-xs text-gray-700 sm:text-sm">
				{versions.length} version{versions.length === 1 ? '' : 's'}
			</p>
		{/if}

		{#if noticeMessage}
			<p
				class="rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs text-green-700"
			>
				{noticeMessage}
			</p>
		{/if}
		{#if errorMessage}
			<p class="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
				{errorMessage}
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
					<p class="mt-2 text-sm text-gray-600">Loading terms...</p>
				</div>
			</div>
		{:else if versions.length === 0}
			<div
				class="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
			>
				<h3 class="text-sm font-medium text-gray-900">No versions yet</h3>
				<p class="mt-1 text-center text-sm text-gray-500">
					Publish the first version to open registration
				</p>
			</div>
		{:else}
			<div class="h-full overflow-y-auto sm:hidden">
				<div class="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
					{#each versions as v (v.id)}
						<button
							type="button"
							onclick={() => openVersion(v.id)}
							class="block w-full px-2.5 py-1.5 text-left hover:bg-gray-50 active:bg-gray-100"
						>
							<div class="flex items-center gap-1.5">
								<span class="text-xs font-medium text-gray-900">v{v.version}</span>
								{#if v.is_current}
									<span
										class="inline-flex items-center rounded bg-green-50 px-1.5 py-[1px] text-[11px] font-medium text-green-700 ring-1 ring-green-200 ring-inset"
										>Current</span
									>
								{/if}
								<span class="ml-auto shrink-0 text-[11px] text-gray-500"
									>{formatDate(v.published_at)}</span
								>
							</div>
							<p class="mt-0.5 truncate text-[11px] text-gray-500">
								{v.note || v.preview_en || '-'}
							</p>
						</button>
					{/each}
				</div>
			</div>

			<div class="hidden h-full sm:block">
				<Table {columns} data={tableData} {rowMenu} onRowClick={(row) => openVersion(row._id)} />
			</div>
		{/if}
	</div>
</div>

<Modal open={!!rollingBack} onClose={() => (rollingBack = null)} title="Make version current">
	<p class="text-sm text-gray-700">
		Make <span class="font-medium">v{rollingBack?.version}</span> the current terms? Every new applicant
		will be asked to accept this text. Nothing is deleted.
	</p>
	{#if rollbackError}
		<p class="mt-2 text-xs text-red-600">{rollbackError}</p>
	{/if}
	<div class="mt-3 flex justify-end gap-2">
		<Button variant="secondary" size="sm" onclick={() => (rollingBack = null)}>Cancel</Button>
		<Button variant="primary" size="sm" onclick={confirmRollback} disabled={rollbackLoading}>
			{rollbackLoading ? 'Saving...' : 'Make current'}
		</Button>
	</div>
</Modal>
