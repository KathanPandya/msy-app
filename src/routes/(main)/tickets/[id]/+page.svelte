<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import TicketAttachments from '$lib/components/other/TicketAttachments.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ticketApi from '$lib/endpoints/ticketApi';
	import { authStore } from '$lib/stores/authStore';
	import type { Ticket } from '$lib/types/ticket';
	import {
		TICKET_TYPES,
		adminName,
		attachmentName,
		formatTicketDate,
		formatTicketDateTime,
		isCreator,
		parseTicketError,
		resolveCurrentAdminId,
		statusLabel,
		statusPillClass,
		timeAgo,
		toAttachmentInput,
		typeLabel,
		typePillClass,
		uploadTicketFile,
		validateUploadFile
	} from '$lib/utilities/ticketUtils';
	import { CheckCircle2, Pencil, RotateCcw, Send, Trash2 } from '@lucide/svelte';

	const ticketId = $derived(page.params.id as string);
	// Set when we arrived from the list, so Back returns to the same page/filters.
	const returnTo = $derived((page.state as any)?.returnTo || '/tickets');

	let ticket = $state<Ticket.Data | null>(null);
	let statusLogs = $state<Ticket.StatusLog[]>([]);
	let comments = $state<Ticket.Comment[]>([]);

	let isLoading = $state(true);
	let loadError = $state('');
	let actionError = $state('');

	const currentUserId = $derived(resolveCurrentAdminId($authStore.userAllInfo?.user));
	const canEdit = $derived(!!ticket && !ticket.is_deleted && isCreator(ticket, currentUserId));
	// Status and comments are open to any admin; only edit/delete are creator-only.
	const canAct = $derived(!!ticket && !ticket.is_deleted);

	let lastLoadedId: string | null = null;
	$effect(() => {
		const id = ticketId;
		if (!id || id === lastLoadedId) return;
		lastLoadedId = id;
		load(id);
	});

	async function load(id: string) {
		isLoading = true;
		loadError = '';
		try {
			const res = await ticketApi.fetchTicket({ id });
			ticket = res.data.ticket;
			statusLogs = res.data.statusLogs ?? [];
			comments = res.data.comments ?? [];
		} catch (err) {
			ticket = null;
			loadError = parseTicketError(err, 'Could not load this ticket');
		} finally {
			isLoading = false;
		}
	}

	/** Mutations return `createdBy` as a raw id string (§4) — refetch for names. */
	async function refresh() {
		if (!ticketId) return;
		try {
			const res = await ticketApi.fetchTicket({ id: ticketId });
			ticket = res.data.ticket;
			statusLogs = res.data.statusLogs ?? [];
			comments = res.data.comments ?? [];
		} catch (err) {
			actionError = parseTicketError(err, 'Could not refresh the ticket');
		}
	}

	// ---------- Activity feed ----------
	// Status logs and comments are two separate lists; merged here by
	// `createdAt` into the single timeline the page actually reads as.
	type FeedItem = {
		id: string;
		at: number;
		kind: 'status' | 'comment';
		who: string;
		text: string;
	};

	const feed = $derived.by<FeedItem[]>(() => {
		const statusItems: FeedItem[] = statusLogs.map((log) => ({
			id: 'log-' + log._id,
			at: log.createdAt,
			kind: 'status',
			who: log.changedBy?.username ?? '-',
			// `from === null` is the creation row, always first.
			text: log.from === null ? 'created this ticket' : 'marked it ' + statusLabel(log.to)
		}));

		const commentItems: FeedItem[] = comments.map((comment) => ({
			id: 'comment-' + comment._id,
			at: comment.createdAt,
			kind: 'comment',
			who: comment.createdBy?.username ?? '-',
			text: comment.text
		}));

		return [...statusItems, ...commentItems].sort((a, b) => a.at - b.at);
	});

	// ---------- Inline edit ----------
	let isEditing = $state(false);
	let editTitle = $state('');
	let editDescription = $state('');
	let editType = $state<Ticket.Type>('bug');
	let editError = $state('');
	let editSaving = $state(false);

	function startEdit() {
		if (!ticket) return;
		editTitle = ticket.title;
		editDescription = ticket.description;
		editType = ticket.type;
		editError = '';
		isEditing = true;
	}

	async function saveEdit() {
		if (!ticket || editSaving) return;
		if (!editTitle.trim() || !editDescription.trim()) {
			editError = 'Title and description cannot be empty';
			return;
		}

		// Only send what actually changed. Attachments are deliberately never
		// part of this PATCH — including them regenerates every attachment _id
		// (§10.1) and would make the list below stale on every save.
		const payload: Ticket.Update = {};
		if (editTitle.trim() !== ticket.title) payload.title = editTitle.trim();
		if (editDescription.trim() !== ticket.description) payload.description = editDescription.trim();
		if (editType !== ticket.type) payload.type = editType;

		if (Object.keys(payload).length === 0) {
			isEditing = false;
			return;
		}

		editSaving = true;
		editError = '';
		try {
			await ticketApi.updateTicket({ id: ticket._id, payload });
			isEditing = false;
			await refresh();
		} catch (err) {
			editError = parseTicketError(err, 'Could not save changes');
		} finally {
			editSaving = false;
		}
	}

	// ---------- Status ----------
	let statusSaving = $state(false);

	async function toggleStatus() {
		if (!ticket || statusSaving) return;
		const next: Ticket.Status = ticket.status === 'open' ? 'solved' : 'open';
		statusSaving = true;
		actionError = '';
		try {
			await ticketApi.updateStatus({ id: ticket._id, status: next });
			await refresh();
		} catch (err: any) {
			// 400 "already <status>" means someone else got there first — just
			// resync rather than surfacing an error the user can't act on.
			if (err?.response?.status === 400) await refresh();
			else actionError = parseTicketError(err, 'Could not change status');
		} finally {
			statusSaving = false;
		}
	}

	// ---------- Comments ----------
	let commentText = $state('');
	let commentSaving = $state(false);

	async function postComment() {
		const text = commentText.trim();
		if (!ticket || !text || commentSaving) return;
		commentSaving = true;
		actionError = '';
		try {
			const res = await ticketApi.addComment({ id: ticket._id, text });
			// `createdBy` comes back populated here, so the new row renders with
			// a real name without a refetch — and commenting doesn't touch
			// ticket.updatedAt (§10.6), so there's nothing else to resync.
			comments = [...comments, res.data];
			commentText = '';
		} catch (err) {
			actionError = parseTicketError(err, 'Could not post comment');
		} finally {
			commentSaving = false;
		}
	}

	function onCommentKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			postComment();
		}
	}

	// ---------- Attachments ----------
	let uploading = $state<Ticket.AttachmentItem[]>([]);
	let attachmentBusy = $state(false);

	const attachmentItems = $derived<Ticket.AttachmentItem[]>([
		...(ticket?.attachments ?? []).map((a) => ({
			id: a._id,
			name: attachmentName(a),
			url: a.url,
			mimeType: a.mimeType,
			status: 'done' as const
		})),
		...uploading
	]);

	async function handlePick(files: File[]) {
		if (!ticket) return;
		actionError = '';

		const valid: File[] = [];
		for (const file of files) {
			const invalid = validateUploadFile(file);
			if (invalid) {
				actionError = invalid;
				continue;
			}
			valid.push(file);
		}
		if (!valid.length) return;

		const placeholders: Ticket.AttachmentItem[] = valid.map((file) => ({
			id: crypto.randomUUID(),
			name: file.name,
			size: file.size,
			mimeType: file.type,
			status: 'uploading'
		}));
		uploading = [...uploading, ...placeholders];
		attachmentBusy = true;

		try {
			const results = await Promise.allSettled(valid.map((file) => uploadTicketFile(file)));
			const uploaded = results
				.filter((r) => r.status === 'fulfilled')
				.map((r) => (r as PromiseFulfilledResult<Ticket.AttachmentInput>).value);

			if (results.some((r) => r.status === 'rejected')) {
				actionError = 'Some files could not be uploaded';
			}

			if (uploaded.length) {
				// PATCH replaces the whole array, so the existing ones have to be
				// resent alongside the new (§6.4). Every _id is regenerated by
				// this call, which is exactly why we refetch straight after.
				const existing = (ticket.attachments ?? []).map(toAttachmentInput);
				await ticketApi.updateTicket({
					id: ticket._id,
					payload: { attachments: [...existing, ...uploaded] }
				});
				await refresh();
			}
		} catch (err) {
			actionError = parseTicketError(err, 'Could not attach files');
		} finally {
			uploading = [];
			attachmentBusy = false;
		}
	}

	let removingAttachment = $state<Ticket.AttachmentItem | null>(null);
	let removeLoading = $state(false);

	async function confirmRemoveAttachment() {
		if (!ticket || !removingAttachment) return;
		removeLoading = true;
		actionError = '';
		try {
			// The dedicated endpoint — dropping it via PATCH would leave the
			// file orphaned in S3 (§10.2).
			await ticketApi.deleteAttachment({
				id: ticket._id,
				attachmentId: removingAttachment.id
			});
			removingAttachment = null;
			await refresh();
		} catch (err) {
			actionError = parseTicketError(err, 'Could not remove attachment');
		} finally {
			removeLoading = false;
		}
	}

	// ---------- Delete ----------
	let showDelete = $state(false);
	let deleteLoading = $state(false);
	let deleteError = $state('');

	async function confirmDelete() {
		if (!ticket) return;
		deleteLoading = true;
		deleteError = '';
		try {
			await ticketApi.deleteTicket({ id: ticket._id });
			showDelete = false;
			goto(returnTo);
		} catch (err) {
			deleteError = parseTicketError(err, 'Could not delete ticket');
		} finally {
			deleteLoading = false;
		}
	}
</script>

<div class="mx-auto flex h-full w-full max-w-3xl flex-col">
	{#if isLoading}
		<div
			class="flex h-full items-center justify-center"
		>
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-2 text-sm text-gray-600">Loading ticket...</p>
			</div>
		</div>
	{:else if loadError || !ticket}
		<div
			class="flex h-full flex-col items-center justify-center"
		>
			<h3 class="text-sm font-medium text-gray-900">{loadError || 'Ticket not found'}</h3>
			<div class="mt-4">
				<Button variant="secondary" size="sm" onclick={() => goto('/tickets')}>Back to tickets</Button
				>
			</div>
		</div>
	{:else}
		<div class="min-h-0 flex-1 overflow-y-auto">
			<!-- Header: pills + actions on one line, title under it, meta as a
				 single line of text rather than a grid of label/value pairs. -->
			<div class="border-b border-gray-200 py-2">
				{#if ticket.is_deleted}
					<p
						class="mb-1.5 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
					>
						Deleted by {adminName(ticket.deleted_by)} on {formatTicketDate(ticket.deleted_at)} — this
						ticket is read-only.
					</p>
				{/if}

				<div class="flex flex-wrap items-center gap-1.5">
					<span class="text-xs font-bold text-gray-700">Tags:</span>
					<span class={typePillClass(ticket.type)}>{typeLabel(ticket.type)}</span>
					<span class="ml-1.5 text-xs font-bold text-gray-700">Status:</span>
					<span class={statusPillClass(ticket.status)}>{statusLabel(ticket.status)}</span>

					{#if canAct}
						<div class="ml-auto flex items-center gap-1.5">
							<Button
								variant={ticket.status === 'open' ? 'success' : 'secondary'}
								size="sm"
								onclick={toggleStatus}
								disabled={statusSaving}
							>
								<span class="flex items-center gap-1.5">
									{#if ticket.status === 'open'}
										<CheckCircle2 class="h-3.5 w-3.5" />
										<span>{statusSaving ? 'Saving...' : 'Mark solved'}</span>
									{:else}
										<RotateCcw class="h-3.5 w-3.5" />
										<span>{statusSaving ? 'Saving...' : 'Reopen'}</span>
									{/if}
								</span>
							</Button>

							{#if canEdit && !isEditing}
								<button
									type="button"
									onclick={startEdit}
									title="Edit ticket"
									aria-label="Edit ticket"
									class="rounded-md border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
								>
									<Pencil class="h-3.5 w-3.5" />
								</button>
								<button
									type="button"
									onclick={() => (showDelete = true)}
									title="Delete ticket"
									aria-label="Delete ticket"
									class="rounded-md border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-red-50 hover:text-red-600"
								>
									<Trash2 class="h-3.5 w-3.5" />
								</button>
							{/if}
						</div>
					{/if}
				</div>

				{#if isEditing}
					<div class="mt-2 space-y-2">
						<div class="flex flex-col gap-2 sm:flex-row sm:items-start">
							<div class="min-w-0 flex-1">
								<input
									type="text"
									bind:value={editTitle}
									placeholder="Title"
									class="h-11 w-full rounded-md border border-gray-300 px-3 py-0 text-base font-medium text-gray-900 sm:h-10 sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
								/>
							</div>
							<select
								bind:value={editType}
								class="h-11 shrink-0 rounded-md border border-gray-300 bg-white py-0 pr-10 pl-3 text-base text-gray-900 sm:h-10 sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none sm:w-40"
							>
								{#each TICKET_TYPES as option}
									<option value={option.key}>{option.label}</option>
								{/each}
							</select>
						</div>
						<textarea
							bind:value={editDescription}
							rows="5"
							placeholder="Description"
							class="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
						></textarea>
						{#if editError}
							<p class="text-xs text-red-600">{editError}</p>
						{/if}
						<div class="flex justify-end gap-2">
							<Button variant="secondary" size="sm" onclick={() => (isEditing = false)}>Cancel</Button
							>
							<Button variant="primary" size="sm" onclick={saveEdit} disabled={editSaving}>
								{editSaving ? 'Saving...' : 'Save'}
							</Button>
						</div>
					</div>
				{:else}
					<h1
						class="mt-1 text-base font-semibold break-words {ticket.is_deleted
							? 'text-gray-400 line-through'
							: 'text-gray-900'}"
					>
						{ticket.title}
					</h1>
					<p class="mt-0.5 text-xs text-gray-500">
						{adminName(ticket.createdBy)} · {formatTicketDateTime(ticket.createdAt)}
						{#if ticket.updatedAt && ticket.updatedAt !== ticket.createdAt}
							· updated {timeAgo(ticket.updatedAt)}
						{/if}
					</p>
				{/if}
			</div>

			<!-- Description -->
			{#if !isEditing}
				<div class="border-b border-gray-200 py-2">
					<!-- The label is inline with the text, so `whitespace-pre-wrap` sits
						 on the value alone — on the wrapper it would also preserve this
						 markup's own indentation. -->
					<p class="text-sm text-gray-800">
						<span class="font-bold text-gray-700">Description:</span>
						<span class="whitespace-pre-wrap">{ticket.description}</span>
					</p>
				</div>
			{/if}

			<!-- Attachments -->
			<div class="border-b border-gray-200 py-2">
				<TicketAttachments
					items={attachmentItems}
					readonly={!canEdit}
					busy={attachmentBusy}
					disabled={attachmentBusy}
					onPick={handlePick}
					onRemove={(item) => (removingAttachment = item)}
				/>
			</div>

			{#if actionError}
				<p class="my-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
					{actionError}
				</p>
			{/if}

			<!-- Activity: status changes and comments in one timeline -->
			<div class="py-2">
				<p class="mb-1 text-xs font-bold text-gray-700">Activity ({feed.length})</p>
				<ul class="space-y-0 border-l border-gray-200 pl-3">
					{#each feed as item (item.id)}
						<li class="relative py-1">
							<span
								class="absolute -left-[17px] top-[10px] h-1.5 w-1.5 rounded-full {item.kind ===
								'status'
									? 'bg-gray-300'
									: 'bg-blue-400'}"
							></span>
							{#if item.kind === 'status'}
								<p class="text-xs text-gray-500 italic">
									<span class="font-medium not-italic">{item.who}</span>
									{item.text}
									<span class="text-gray-400">· {formatTicketDateTime(item.at)}</span>
								</p>
							{:else}
								<p class="text-xs text-gray-500">
									<span class="font-medium text-gray-900">{item.who}</span>
									<span class="text-gray-400">· {formatTicketDateTime(item.at)}</span>
								</p>
								<p class="text-sm whitespace-pre-wrap text-gray-800">{item.text}</p>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<!-- Comment box, pinned under the scroll area so it's always reachable -->
		{#if canAct}
			<div class="mt-1.5 flex flex-shrink-0 items-end gap-1.5">
				<textarea
					bind:value={commentText}
					onkeydown={onCommentKeydown}
					rows="1"
					placeholder="Add a comment…"
					class="max-h-28 min-h-11 w-full resize-y rounded-md border border-gray-300 px-3 py-[9px] text-base text-gray-900 sm:min-h-10 sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
				></textarea>
				<Button
					variant="primary"
					size="sm"
					onclick={postComment}
					disabled={commentSaving || !commentText.trim()}
				>
					<span class="flex items-center gap-1.5">
						<Send class="h-3.5 w-3.5" />
						<span class="hidden sm:inline">{commentSaving ? 'Posting...' : 'Post'}</span>
					</span>
				</Button>
			</div>
		{/if}
	{/if}
</div>

<Modal open={showDelete} onClose={() => (showDelete = false)} title="Delete ticket">
	<p class="text-sm text-gray-700">
		Delete <span class="font-medium">{ticket?.title}</span>? It stays in the records but can no
		longer be edited or commented on, and there is no way to restore it.
	</p>
	{#if deleteError}
		<p class="mt-2 text-xs text-red-600">{deleteError}</p>
	{/if}
	<div class="mt-3 flex justify-end gap-2">
		<Button variant="secondary" size="sm" onclick={() => (showDelete = false)}>Cancel</Button>
		<Button variant="danger" size="sm" onclick={confirmDelete} disabled={deleteLoading}>
			{deleteLoading ? 'Deleting...' : 'Delete'}
		</Button>
	</div>
</Modal>

<Modal
	open={!!removingAttachment}
	onClose={() => (removingAttachment = null)}
	title="Remove attachment"
>
	<p class="text-sm text-gray-700">
		Remove <span class="font-medium">{removingAttachment?.name}</span>? The file is deleted
		permanently.
	</p>
	<div class="mt-3 flex justify-end gap-2">
		<Button variant="secondary" size="sm" onclick={() => (removingAttachment = null)}>Cancel</Button>
		<Button variant="danger" size="sm" onclick={confirmRemoveAttachment} disabled={removeLoading}>
			{removeLoading ? 'Removing...' : 'Remove'}
		</Button>
	</div>
</Modal>
