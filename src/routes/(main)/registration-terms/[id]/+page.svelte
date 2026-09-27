<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import termsApi from '$lib/endpoints/termsApi';
	import type { Terms } from '$lib/types/terms';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { parseRegistrationError } from '$lib/utilities/registrationUtils';
	import { Copy, RotateCcw } from '@lucide/svelte';

	const termsId = $derived(page.params.id as string);

	let terms = $state<Terms.Detail | null>(null);
	let isLoading = $state(true);
	let loadError = $state('');
	let showRollback = $state(false);
	let rollbackLoading = $state(false);
	let rollbackError = $state('');

	let lastLoadedId: string | null = null;
	$effect(() => {
		const id = termsId;
		if (!id || id === lastLoadedId) return;
		lastLoadedId = id;
		load(id);
	});

	async function load(id: string) {
		isLoading = true;
		loadError = '';
		try {
			terms = (await termsApi.get({ id })).data;
		} catch (err) {
			loadError = parseRegistrationError(err, 'Could not load this version.');
		} finally {
			isLoading = false;
		}
	}

	async function makeCurrent() {
		if (!terms) return;
		rollbackLoading = true;
		rollbackError = '';
		try {
			await termsApi.makeCurrent({ id: terms.id });
			showRollback = false;
			await load(terms.id);
		} catch (err) {
			rollbackError = parseRegistrationError(err, 'Could not make this version current.');
		} finally {
			rollbackLoading = false;
		}
	}
</script>

<div class="mx-auto flex h-full w-full max-w-3xl flex-col">
	{#if isLoading}
		<div class="flex h-full items-center justify-center">
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-2 text-sm text-gray-600">Loading version...</p>
			</div>
		</div>
	{:else if loadError || !terms}
		<div class="flex h-full flex-col items-center justify-center">
			<h3 class="text-sm font-medium text-gray-900">{loadError || 'Version not found'}</h3>
			<div class="mt-4">
				<Button variant="secondary" size="sm" onclick={() => goto('/registration-terms')}
					>Back to terms</Button
				>
			</div>
		</div>
	{:else}
		<div class="min-h-0 flex-1 overflow-y-auto pb-4">
			<div class="border-b border-gray-200 py-2">
				<div class="flex flex-wrap items-center gap-1.5">
					<h1 class="text-base font-semibold text-gray-900">Version {terms.version}</h1>
					{#if terms.is_current}
						<span
							class="inline-flex items-center rounded bg-green-50 px-1.5 py-[1px] text-[11px] font-medium text-green-700 ring-1 ring-green-200 ring-inset"
							>Current</span
						>
					{/if}
					<div class="ml-auto flex items-center gap-1.5">
						{#if !terms.is_current}
							<Button
								variant="secondary"
								size="sm"
								onclick={() => {
									rollbackError = '';
									showRollback = true;
								}}
							>
								<span class="flex items-center gap-1.5">
									<RotateCcw class="h-3.5 w-3.5" />
									<span>Make current</span>
								</span>
							</Button>
						{/if}
						<Button
							variant="primary"
							size="sm"
							onclick={() => goto('/registration-terms/publish?from=' + terms?.id)}
						>
							<span class="flex items-center gap-1.5">
								<Copy class="h-3.5 w-3.5" />
								<span>Duplicate into new draft</span>
							</span>
						</Button>
					</div>
				</div>
				<p class="mt-0.5 text-xs text-gray-500">
					Published {formatDate(terms.published_at)} by {terms.published_by?.name ||
						terms.published_by?.username ||
						'-'}{terms.note ? ` · ${terms.note}` : ''}
				</p>
			</div>

			<div class="space-y-3 py-3 text-sm text-gray-700">
				<div>
					<p class="mb-1 text-xs font-semibold text-gray-500">English</p>
					<p class="whitespace-pre-wrap">{terms.body_en}</p>
				</div>
				<div class="border-t border-gray-200 pt-3">
					<p class="mb-1 text-xs font-semibold text-gray-500">ગુજરાતી</p>
					<p class="whitespace-pre-wrap">{terms.body_guj}</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<Modal open={showRollback} onClose={() => (showRollback = false)} title="Make version current">
	<p class="text-sm text-gray-700">
		Make <span class="font-medium">v{terms?.version}</span> the current terms? Every new applicant will
		be asked to accept this text. Nothing is deleted.
	</p>
	{#if rollbackError}
		<p class="mt-2 text-xs text-red-600">{rollbackError}</p>
	{/if}
	<div class="mt-3 flex justify-end gap-2">
		<Button variant="secondary" size="sm" onclick={() => (showRollback = false)}>Cancel</Button>
		<Button variant="primary" size="sm" onclick={makeCurrent} disabled={rollbackLoading}>
			{rollbackLoading ? 'Saving...' : 'Make current'}
		</Button>
	</div>
</Modal>
