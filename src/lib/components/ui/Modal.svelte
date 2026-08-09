<script lang="ts">
	import { X } from '@lucide/svelte';

	type ModalProps = {
		open: boolean;
		onClose: () => void;
		title?: string;
		children?: any;
	};

	let { open, onClose, title, children }: ModalProps = $props();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) onClose();
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) onClose();
	}

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = open ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-label={title || 'Dialog'}
		tabindex="-1"
	>
		<div class="flex max-h-[85vh] w-full max-w-md flex-col rounded-lg bg-white shadow-xl">
			<div
				class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3"
			>
				<h2 class="text-sm font-semibold text-gray-900">{title}</h2>
				<button
					type="button"
					onclick={onClose}
					class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
					aria-label="Close"
				>
					<X class="h-5 w-5" />
				</button>
			</div>
			<div class="min-h-0 flex-1 overflow-y-auto p-4">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}
