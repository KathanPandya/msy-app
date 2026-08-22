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
	let buttonEl: HTMLButtonElement | undefined = $state();

	// `position: fixed` only resolves against the real viewport if NO ancestor
	// creates its own containing block — but any ancestor with a CSS
	// `transform` (even a settled/identity one, e.g. an entrance animation
	// left holding its final frame via animation-fill-mode) rebases fixed
	// descendants to itself instead. Several pages in this app animate their
	// content in on load, so that's not a rare edge case here — it's the norm.
	// A real DOM portal sidesteps the whole problem: once this node lives
	// directly under <body>, no table/page wrapper's CSS can affect its
	// positioning at all, regardless of what transforms exist anywhere in
	// the ancestor chain it used to have.
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.parentNode?.removeChild(node);
			}
		};
	}

	const MENU_WIDTH = 160;
	// Matches the menu item button's own box: px-3 py-1.5 + text-sm line-height.
	const MENU_ITEM_HEIGHT = 32;
	// Matches the menu container's own py-1.
	const MENU_PADDING = 8;
	let menuStyle = $state('');

	// Computed synchronously, before the menu ever renders — no post-render
	// remeasure step, so there's no frame where it can show up in the wrong
	// place. The action list is caller-supplied and varies row-menu to
	// row-menu (2 actions in one table, 5 in another); `actions.length` is
	// known at click time and is what actually determines the real height, so
	// this isn't a guess independent of what's being rendered.
	function positionMenu() {
		if (!buttonEl) return;
		const buttonRect = buttonEl.getBoundingClientRect();
		const menuHeight = actions.length * MENU_ITEM_HEIGHT + MENU_PADDING;
		const spaceBelow = window.innerHeight - buttonRect.bottom;
		const openUpward = spaceBelow < menuHeight + 8 && buttonRect.top > menuHeight + 8;
		const left = Math.min(buttonRect.left, window.innerWidth - MENU_WIDTH - 8);
		const top = openUpward ? buttonRect.top - 4 : buttonRect.bottom + 4;
		menuStyle = `left: ${Math.max(8, left)}px; top: ${top}px; width: ${MENU_WIDTH}px; ${
			openUpward ? 'transform: translateY(-100%);' : ''
		}`;
	}

	function toggle(e: MouseEvent) {
		e.stopPropagation();
		if (!open) positionMenu();
		onToggle();
	}

	function runAction(action: MenuAction) {
		if (action.disabled) return;
		onClose();
		action.onclick();
	}

	function handleWindowClick(e: MouseEvent) {
		if (!open) return;
		if (menuEl?.contains(e.target as Node)) return;
		if (buttonEl?.contains(e.target as Node)) return;
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') onClose();
	}

	// Any ancestor scrolling (including the table's own internal scroll area)
	// invalidates the computed position, so close rather than let it drift.
	// `scroll` doesn't bubble, so this has to be a capture-phase listener —
	// `onscroll` on svelte:document/window only fires for bubbling events.
	function handleScroll(e: Event) {
		if (!open) return;
		if (menuEl?.contains(e.target as Node)) return;
		onClose();
	}

	$effect(() => {
		if (!open) return;
		document.addEventListener('scroll', handleScroll, true);
		return () => document.removeEventListener('scroll', handleScroll, true);
	});
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleKeydown} onresize={onClose} />

<div class="inline-block">
	<button
		bind:this={buttonEl}
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
			bind:this={menuEl}
			use:portal
			role="menu"
			tabindex="-1"
			class="fixed z-50 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
			style={menuStyle}
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
