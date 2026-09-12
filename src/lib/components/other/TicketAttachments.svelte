<script lang="ts">
	import ImageViewer from '$lib/components/ui/ImageViewer.svelte';
	import type { Ticket } from '$lib/types/ticket';
	import { UPLOAD_ACCEPT, formatBytes, isImageAttachment } from '$lib/utilities/ticketUtils';
	import { FileText, Image as ImageIcon, Loader2, Paperclip, X } from '@lucide/svelte';

	/**
	 * One row per attachment, `text-xs` and 24px tall — a thumbnail grid of
	 * padded cards would take four times the height for the same information.
	 * Purely presentational: the create page holds its items in local state,
	 * the detail page holds the ticket's saved ones. Both look identical.
	 */
	type AttachmentItem = Ticket.AttachmentItem;

	type Props = {
		items: AttachmentItem[];
		disabled?: boolean;
		/** Hides the picker entirely — used on soft-deleted / non-creator views. */
		readonly?: boolean;
		busy?: boolean;
		onPick?: (files: File[]) => void;
		onRemove?: (item: AttachmentItem) => void;
	};

	let { items, disabled = false, readonly = false, busy = false, onPick, onRemove }: Props = $props();

	let inputEl: HTMLInputElement | null = $state(null);
	let viewerSrc = $state<string | null>(null);
	let viewerOpen = $state(false);

	function handleChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const picked = Array.from(input.files ?? []);
		// Reset so re-picking the same file still fires a change event.
		input.value = '';
		if (picked.length) onPick?.(picked);
	}

	function open(item: AttachmentItem) {
		if (!item.url || item.status !== 'done') return;
		if (isImageAttachment(item)) {
			viewerSrc = item.url;
			viewerOpen = true;
		} else {
			window.open(item.url, '_blank', 'noopener');
		}
	}
</script>

<div class="min-w-0">
	<div class="flex items-center gap-2">
		<span class="text-xs font-bold text-gray-700">
			Attachments{items.length ? ' (' + items.length + ')' : ''}
		</span>
		{#if !readonly}
			<button
				type="button"
				onclick={() => inputEl?.click()}
				disabled={disabled || busy}
				class="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
			>
				{#if busy}
					<Loader2 class="h-3 w-3 animate-spin" />
				{:else}
					<Paperclip class="h-3 w-3" />
				{/if}
				<span>Add</span>
			</button>
			<input
				bind:this={inputEl}
				type="file"
				multiple
				accept={UPLOAD_ACCEPT}
				onchange={handleChange}
				class="hidden"
			/>
		{/if}
	</div>

	{#if items.length === 0}
		<p class="mt-0.5 text-xs text-gray-400">
			{readonly ? 'None' : 'JPG, PNG, GIF, PDF, DOC or XLS — up to 10 MB each'}
		</p>
	{:else}
		<ul class="mt-1 divide-y divide-gray-100 border-y border-gray-100">
			{#each items as item (item.id)}
				<li class="flex items-center gap-1.5 py-1 text-xs">
					{#if item.status === 'uploading'}
						<Loader2 class="h-3.5 w-3.5 shrink-0 animate-spin text-gray-400" />
					{:else if isImageAttachment(item)}
						<ImageIcon class="h-3.5 w-3.5 shrink-0 text-gray-400" />
					{:else}
						<FileText class="h-3.5 w-3.5 shrink-0 text-gray-400" />
					{/if}

					<button
						type="button"
						onclick={() => open(item)}
						disabled={item.status !== 'done'}
						class="min-w-0 flex-1 truncate text-left {item.status === 'error'
							? 'text-red-600'
							: item.status === 'done'
								? 'text-gray-900 hover:text-blue-600 hover:underline'
								: 'text-gray-400'}"
						title={item.error || item.name}
					>
						{item.name}
					</button>

					{#if item.status === 'error'}
						<span class="shrink-0 truncate text-[11px] text-red-600">{item.error || 'Failed'}</span>
					{:else if item.size}
						<span class="shrink-0 text-[11px] text-gray-400">{formatBytes(item.size)}</span>
					{/if}

					{#if !readonly && onRemove}
						<button
							type="button"
							onclick={() => onRemove?.(item)}
							disabled={disabled || item.status === 'uploading'}
							class="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-40"
							aria-label={'Remove ' + item.name}
						>
							<X class="h-3.5 w-3.5" />
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if viewerSrc}
	<ImageViewer src={viewerSrc} thumbnail={false} bind:open={viewerOpen} />
{/if}
