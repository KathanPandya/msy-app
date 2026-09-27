<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import termsApi from '$lib/endpoints/termsApi';
	import { parseRegistrationError } from '$lib/utilities/registrationUtils';
	import { onMount } from 'svelte';

	let bodyEn = $state('');
	let bodyGuj = $state('');
	let note = $state('');
	let fromVersion = $state<number | null>(null);

	let isLoadingSource = $state(false);
	let errors = $state<{ bodyEn?: string; bodyGuj?: string }>({});
	let errorMessage = $state('');
	let showConfirm = $state(false);
	let isPublishing = $state(false);

	onMount(async () => {
		const fromId = page.url.searchParams.get('from');
		if (!fromId) return;
		isLoadingSource = true;
		try {
			const { data } = await termsApi.get({ id: fromId });
			bodyEn = data.body_en;
			bodyGuj = data.body_guj;
			fromVersion = data.version;
		} catch (err) {
			errorMessage = parseRegistrationError(err, 'Could not load that version to copy.');
		} finally {
			isLoadingSource = false;
		}
	});

	function review() {
		errorMessage = '';
		errors = {
			bodyEn: bodyEn.trim() ? undefined : 'English text is required.',
			bodyGuj: bodyGuj.trim() ? undefined : 'Gujarati text is required.'
		};
		if (errors.bodyEn || errors.bodyGuj) return;
		showConfirm = true;
	}

	async function publish() {
		isPublishing = true;
		errorMessage = '';
		try {
			const res = await termsApi.publish({
				payload: {
					body_en: bodyEn.trim(),
					body_guj: bodyGuj.trim(),
					...(note.trim() ? { note: note.trim() } : {})
				}
			});
			goto('/registration-terms', { state: { notice: res.message } });
		} catch (err) {
			showConfirm = false;
			errorMessage = parseRegistrationError(err, 'Could not publish the terms.');
		} finally {
			isPublishing = false;
		}
	}

	const textareaClass =
		'w-full resize-y rounded-md border px-3 py-2 text-base text-gray-900 sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none';
</script>

<div class="mx-auto w-full max-w-5xl">
	<form
		onsubmit={(e) => {
			e.preventDefault();
			review();
		}}
		class="space-y-2.5"
	>
		{#if fromVersion}
			<p class="text-xs text-gray-500">
				Copied from v{fromVersion}. Edit, then publish as a new version.
			</p>
		{/if}

		<div class="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
			<div>
				<label for="terms-en" class="mb-1 block text-xs font-medium text-gray-500">
					English <span class="text-red-500">*</span>
				</label>
				<textarea
					id="terms-en"
					bind:value={bodyEn}
					rows="16"
					disabled={isLoadingSource}
					placeholder="1. Membership is subject to…"
					class="{textareaClass} {errors.bodyEn ? 'border-red-500' : 'border-gray-300'}"
				></textarea>
				{#if errors.bodyEn}<p class="mt-0.5 text-xs text-red-600">{errors.bodyEn}</p>{/if}
			</div>
			<div>
				<label for="terms-guj" class="mb-1 block text-xs font-medium text-gray-500">
					Gujarati <span class="text-red-500">*</span>
				</label>
				<textarea
					id="terms-guj"
					bind:value={bodyGuj}
					rows="16"
					disabled={isLoadingSource}
					placeholder="1. સભ્યપદ…"
					class="{textareaClass} {errors.bodyGuj ? 'border-red-500' : 'border-gray-300'}"
				></textarea>
				{#if errors.bodyGuj}<p class="mt-0.5 text-xs text-red-600">{errors.bodyGuj}</p>{/if}
			</div>
		</div>

		<div>
			<label for="terms-note" class="mb-1 block text-xs font-medium text-gray-500">
				Note <span class="font-normal">(for the audit trail — never shown to applicants)</span>
			</label>
			<input
				id="terms-note"
				type="text"
				bind:value={note}
				placeholder="e.g. added refund clause"
				class="h-11 w-full rounded-md border border-gray-300 px-3 py-0 text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:h-10 sm:text-sm"
			/>
		</div>

		{#if bodyEn.trim() || bodyGuj.trim()}
			<div class="border-t border-gray-200 pt-2.5">
				<p class="mb-1.5 text-xs font-medium text-gray-500">Preview — as the applicant sees it</p>
				<div
					class="max-h-72 max-w-md space-y-3 overflow-y-auto overscroll-contain rounded-md border border-gray-200 p-3 text-sm text-gray-700"
				>
					<div>
						<p class="mb-1 text-xs font-semibold text-gray-500">English</p>
						<p class="whitespace-pre-wrap">{bodyEn.trim()}</p>
					</div>
					<div class="border-t border-gray-200 pt-3">
						<p class="mb-1 text-xs font-semibold text-gray-500">ગુજરાતી</p>
						<p class="whitespace-pre-wrap">{bodyGuj.trim()}</p>
					</div>
				</div>
			</div>
		{/if}

		{#if errorMessage}
			<p class="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
				{errorMessage}
			</p>
		{/if}

		<div class="flex justify-end gap-2 border-t border-gray-200 pt-2.5">
			<Button variant="secondary" size="sm" onclick={() => goto('/registration-terms')}
				>Cancel</Button
			>
			<Button type="submit" variant="primary" size="sm" disabled={isLoadingSource}>Publish</Button>
		</div>
	</form>
</div>

<Modal open={showConfirm} onClose={() => (showConfirm = false)} title="Publish terms">
	<p class="text-sm text-gray-700">
		Publish this as a new version? It goes live for every new applicant immediately and cannot be
		edited afterwards.
	</p>
	<div class="mt-3 flex justify-end gap-2">
		<Button variant="secondary" size="sm" onclick={() => (showConfirm = false)}>Cancel</Button>
		<Button variant="primary" size="sm" onclick={publish} disabled={isPublishing}>
			{isPublishing ? 'Publishing...' : 'Publish'}
		</Button>
	</div>
</Modal>
