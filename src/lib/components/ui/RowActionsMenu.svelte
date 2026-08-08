<script lang="ts">
	import { MoreVertical } from '@lucide/svelte';

	type MenuAction = {
		label: string;
		onclick: () => void;
		disabled?: boolean;
		danger?: boolean;
	};

	type RowActionsMenuProps = {
		actions: MenuAction[];
		// Controlled from the parent (Table) so only one row's menu can be open
		// across the whole table at any given time.
		open: boolean;
		onToggle: () => void;
		onClose: () => void;
	};

	let { actions, open, onToggle, onClose }: RowActionsMenuProps = $props();

	let menuEl: HTMLDivElement | undefined = $state();

	function toggle(e: MouseEvent) {
		e.stopPropagation();
		onToggle();
	}

	function runAction(action: MenuAction) {
		if (action.disabled) return;
		onClose();
		action.onclick();
	}

	function handleWindowClick(e: MouseEvent) {
		if (!open) return;
		if (menuEl && !menuEl.contains(e.target as Node)) onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') onClose();
	}
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleKeydown} />

<div class="relative inline-block" bind:this={menuEl}>
	<button
		type="button"
		class="rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label="Row actions"
		onclick={toggle}
	>
		<MoreVertical class="h-3.5 w-3.5" />
	</button>

	{#if open}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
		<div
			role="menu"
			tabindex="-1"
			class="absolute left-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
			onclick={(e) => e.stopPropagation()}
		>
			{#each actions as action}
				<button
					type="button"
					role="menuitem"
					disabled={action.disabled}
					class="block w-full px-3 py-1.5 text-left text-sm transition-colors {action.danger
						? 'text-red-600 hover:bg-red-50'
						: 'text-gray-700 hover:bg-gray-50'} disabled:cursor-not-allowed disabled:opacity-50"
					onclick={() => runAction(action)}
				>
					{action.label}
				</button>
			{/each}
		</div>
	{/if}
</div>
