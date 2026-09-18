<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import TicketAttachments from '$lib/components/other/TicketAttachments.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ticketApi from '$lib/endpoints/ticketApi';
	import type { Ticket } from '$lib/types/ticket';
	import {
		TICKET_TYPES,
		parseTicketError,
		uploadTicketFile,
		validateUploadFile
	} from '$lib/utilities/ticketUtils';
	// Where the user opened this form from — the list with its filters and page
	// still applied. Both Cancel and a successful create return here rather
	// than dropping the user into the ticket they just wrote.
	const returnTo = $derived((page.state as any)?.returnTo || '/tickets');

	let title = $state('');
	let description = $state('');
	let type = $state<Ticket.Type>('bug');

	let errors = $state<{ title?: string; description?: string }>({});
	let errorMessage = $state('');
	let warningMessage = $state('');
	let isSaving = $state(false);

	// Files are uploaded the moment they're picked, so submitting the ticket is
	// a single fast request. `payload` is the mapped attachment (fileUrl → url)
	// and is only set once that file's upload has landed.
	type PendingAttachment = Ticket.AttachmentItem & { payload?: Ticket.AttachmentInput };
	let attachments = $state<PendingAttachment[]>([]);
	const isUploading = $derived(attachments.some((a) => a.status === 'uploading'));

	async function handlePick(files: File[]) {
		warningMessage = '';
		for (const file of files) {
			const invalid = validateUploadFile(file);
			const id = crypto.randomUUID();

			if (invalid) {
				attachments = [
					...attachments,
					{ id, name: file.name, size: file.size, status: 'error', error: invalid }
				];
				continue;
			}

			attachments = [
				...attachments,
				{ id, name: file.name, size: file.size, mimeType: file.type, status: 'uploading' }
			];

			// One request per file (§7), fired independently so a single
			// failure doesn't take the rest of the batch down with it.
			uploadTicketFile(file)
				.then((payload) => {
					attachments = attachments.map((a) =>
						a.id === id
							? { ...a, status: 'done', url: payload.url, mimeType: payload.mimeType, payload }
							: a
					);
				})
				.catch((err) => {
					attachments = attachments.map((a) =>
						a.id === id
							? { ...a, status: 'error', error: parseTicketError(err, 'Upload failed') }
							: a
					);
				});
		}
	}

	function handleRemove(item: Ticket.AttachmentItem) {
		// Nothing is saved to a ticket yet, so this is purely local. The S3
		// object for an already-uploaded file is left behind on purpose —
		// there's no ticket to hang a delete off until the ticket exists.
		attachments = attachments.filter((a) => a.id !== item.id);
	}

	function validate() {
		errors = {};
		if (!title.trim()) errors.title = 'Title is required';
		if (!description.trim()) errors.description = 'Description is required';
		return Object.keys(errors).length === 0;
	}

	async function submit() {
		errorMessage = '';
		warningMessage = '';
		if (!validate() || isUploading || isSaving) return;

		const ready = attachments
			.filter((a) => a.status === 'done' && a.payload)
			.map((a) => a.payload as Ticket.AttachmentInput);

		isSaving = true;
		try {
			const res = await ticketApi.createTicket({
				payload: {
					title: title.trim(),
					description: description.trim(),
					type,
					attachments: ready
				}
			});

			// The server silently drops attachment objects missing `url`/`key`
			// (§10.3) — trust what came back, not what we sent.
			const saved = res.data.attachments?.length ?? 0;
			if (saved < ready.length) {
				warningMessage =
					'Ticket created, but ' + (ready.length - saved) + ' attachment(s) were not saved.';
				setTimeout(() => goto(returnTo, { replaceState: true }), 2500);
				return;
			}

			goto(returnTo, { replaceState: true });
		} catch (err) {
			errorMessage = parseTicketError(err, 'Could not create ticket');
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="mx-auto w-full max-w-2xl">
	<form
		onsubmit={(e) => {
			e.preventDefault();
			submit();
		}}
		class="space-y-2.5"
	>
		<!-- Title + type share a row on anything wider than a phone: the type is
			 three short words, giving it its own full-width row is wasted space. -->
		<div class="flex flex-col gap-2.5 sm:flex-row sm:items-start">
			<div class="min-w-0 flex-1">
				<label for="ticket-title" class="mb-1 block text-xs font-medium text-gray-500">
					Title <span class="text-red-500">*</span>
				</label>
				<input
					id="ticket-title"
					type="text"
					bind:value={title}
					placeholder="Short summary of the issue"
					class="h-11 w-full rounded-md border px-3 py-0 text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:h-10 sm:text-sm {errors.title
						? 'border-red-500'
						: 'border-gray-300'}"
				/>
				{#if errors.title}<p class="mt-0.5 text-xs text-red-600">{errors.title}</p>{/if}
			</div>

			<div class="shrink-0 sm:w-40">
				<label for="ticket-type" class="mb-1 block text-xs font-medium text-gray-500">Type</label>
				<select
					id="ticket-type"
					bind:value={type}
					class="h-11 w-full rounded-md border border-gray-300 bg-white py-0 pr-10 pl-3 text-base text-gray-900 sm:h-10 sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
				>
					{#each TICKET_TYPES as option}
						<option value={option.key}>{option.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<div>
			<label for="ticket-description" class="mb-1 block text-xs font-medium text-gray-500">
				Description <span class="text-red-500">*</span>
			</label>
			<textarea
				id="ticket-description"
				bind:value={description}
				rows="6"
				placeholder="What happened, what you expected, and how to reproduce it"
				class="w-full resize-y rounded-md border px-3 py-2 text-base text-gray-900 sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none {errors.description
					? 'border-red-500'
					: 'border-gray-300'}"
			></textarea>
			{#if errors.description}
				<p class="mt-0.5 text-xs text-red-600">{errors.description}</p>
			{/if}
		</div>

		<div class="border-t border-gray-200 pt-2.5">
			<TicketAttachments
				items={attachments}
				busy={isUploading}
				onPick={handlePick}
				onRemove={handleRemove}
			/>
		</div>

		{#if errorMessage}
			<p class="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
				{errorMessage}
			</p>
		{/if}
		{#if warningMessage}
			<p class="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
				{warningMessage}
			</p>
		{/if}

		<div class="flex justify-end gap-2 border-t border-gray-200 pt-2.5">
			<Button variant="secondary" size="sm" onclick={() => goto(returnTo)}>Cancel</Button>
			<Button type="submit" variant="primary" size="sm" disabled={isSaving || isUploading}>
				{isSaving ? 'Creating...' : isUploading ? 'Uploading...' : 'Create Ticket'}
			</Button>
		</div>
	</form>
</div>
