<script lang="ts">
	import Select from '$lib/components/ui/Select.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, IndianRupee } from '@lucide/svelte';
	import RowActionsMenu from './RowActionsMenu.svelte';
	import Tooltip from './Tooltip.svelte';

	const iconMapping: Record<string, any> = {
		rupee: IndianRupee,
		arrowDown: ArrowDown,
		arrowUp: ArrowUp
	};

	type Column = {
		key: string;
		label: string;
		align?: 'left' | 'right' | 'center';
		render?: (value: any, row: any) => any;
		tooltip?: boolean | ((value: any, row: any) => string);
		tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
		sorting?: (allRows: any) => any;
		icon?: string;
		width?: number;
	};

	// Smallest a column can be dragged to.
	const MIN_COLUMN_WIDTH = 100;
	const DEFAULT_COLUMN_WIDTH = 150;
	const ROW_MENU_COLUMN_WIDTH = 28;
	const CELL_HORIZONTAL_PADDING = { compact: 32, comfortable: 56 };

	type PaginationConfig = {
		limit: any;
		canGoNext: boolean;
		canGoPrevious: boolean;
	};

	type RowMenuAction = {
		label: string;
		onclick: () => void;
		disabled?: boolean;
		danger?: boolean;
	};

	type TableProps = {
		columns: Column[];
		data: any[];
		onRowClick?: (row: any) => void;
		getRowBgColor?: (row: any) => string; // NEW: Function to get background color
		pagination?: PaginationConfig;
		onNext?: () => void;
		onPrevious?: () => void;
		onLimitChange?: (v: string) => void;
		density?: 'comfortable' | 'compact';
		rowMenu?: (row: any) => RowMenuAction[];
		// When true, the table grows to fit all its rows instead of being boxed
		// into a fixed/percentage height with its own internal scrollbar — for
		// use on pages where the page itself scrolls.
		naturalHeight?: boolean;
	};

	let {
		columns,
		data,
		onRowClick,
		getRowBgColor,
		pagination,
		onNext,
		onPrevious,
		onLimitChange,
		density = 'compact',
		rowMenu,
		naturalHeight = false
	}: TableProps = $props();

	const headerPaddingClass = $derived(
		density === 'compact' ? 'px-2.5 py-1 sm:px-3 sm:py-1' : 'px-3 py-2.5 sm:px-6 sm:py-3'
	);
	const cellPaddingClass = $derived(
		density === 'compact' ? 'px-2.5 py-0.5 sm:px-3 sm:py-1' : 'px-3 py-2.5 sm:px-6 sm:py-4'
	);
	const cellTextClass = $derived(density === 'compact' ? 'text-xs' : 'text-sm');
	const paginationWrapClass = $derived(
		density === 'compact' ? 'mt-1.5 gap-2 p-1.5' : 'mt-4 gap-3 p-2 lg:p-4'
	);
	const paginationBtnClass = $derived(
		density === 'compact' ? 'gap-1 px-2 py-1 text-xs' : 'gap-1 px-2 py-1.5 text-sm sm:gap-1.5 sm:px-3 sm:py-2'
	);
	const paginationLimitTextClass = $derived(density === 'compact' ? 'text-xs' : 'text-sm');
	const paginationSelectWidthClass = $derived(density === 'compact' ? 'w-16 sm:w-20' : 'w-20 sm:w-24');

	// Only one row's actions menu can be open at a time — tracked by row index.
	let openMenuIndex = $state<number | null>(null);

	// User-adjustable column widths, keyed by column key.
	let columnWidths = $state<Record<string, number>>({});

	// Keys the user has dragged by hand — once resized, a column no longer
	// auto-fits to content when `data` changes (e.g. next page of rows).
	const manuallyResizedKeys = new Set<string>();

	// Persists manually-resized widths across reloads, scoped per distinct set of
	// columns so two different tables never collide on a shared column key (e.g.
	// both members and payins have a "gender"/"mobile"-ish column).
	const COLUMN_WIDTH_STORAGE_PREFIX = 'msy-table-column-widths:';
	const storageKey = $derived(
		COLUMN_WIDTH_STORAGE_PREFIX +
			columns
				.map((c) => c.key)
				.slice()
				.sort()
				.join('|')
	);

	function loadStoredWidths(key: string): Record<string, number> {
		if (typeof localStorage === 'undefined') return {};
		try {
			const raw = localStorage.getItem(key);
			return raw ? JSON.parse(raw) : {};
		} catch {
			return {};
		}
	}

	function saveStoredWidths(key: string) {
		if (typeof localStorage === 'undefined') return;
		const toSave: Record<string, number> = {};
		for (const resizedKey of manuallyResizedKeys) {
			if (columnWidths[resizedKey] !== undefined) toSave[resizedKey] = columnWidths[resizedKey];
		}
		try {
			localStorage.setItem(key, JSON.stringify(toSave));
		} catch {
			// Storage full/unavailable (e.g. private browsing) — resizing still
			// works for the session, it just won't persist. Not worth surfacing.
		}
	}

	// Below this, the pagination row (rows-per-page select + Previous/Next) starts
	// cramping. The table never renders narrower than this, independent of how
	// little content the columns have — it's a floor for the table box, not a
	// stretch target, so a 3-column table on a wide screen still just sits at its
	// own content width (or this floor, whichever is bigger), not screen width.
	const PAGINATION_MIN_WIDTH = { compact: 360, comfortable: 420 };

	let measureCanvas: HTMLCanvasElement | null = null;
	function measureTextWidth(text: string, font: string): number {
		if (typeof document === 'undefined') return 0;
		if (!measureCanvas) measureCanvas = document.createElement('canvas');
		const ctx = measureCanvas.getContext('2d');
		if (!ctx) return 0;
		ctx.font = font;
		return ctx.measureText(text).width;
	}

	// Default width = the widest string currently in that column (header included),
	// so the table starts at its natural content size instead of stretching to fill
	// the screen. Purely a starting point — the user can drag it to anything from there.
	function computeContentWidth(column: Column): number {
		const headerFont = '600 12px ui-sans-serif, system-ui, sans-serif';
		const cellFont =
			density === 'compact' ? '400 12px ui-sans-serif, system-ui, sans-serif' : '400 14px ui-sans-serif, system-ui, sans-serif';

		let widest = measureTextWidth(column.label.toUpperCase(), headerFont);
		for (const row of data) {
			const value = row[column.key];
			const text = value === null || value === undefined || value === '' ? '-' : String(value);
			const width = measureTextWidth(text, cellFont);
			if (width > widest) widest = width;
		}

		const padding = CELL_HORIZONTAL_PADDING[density];
		return Math.max(MIN_COLUMN_WIDTH, Math.ceil(widest + padding));
	}

	// Seeds/refreshes the width of every column the user hasn't dragged by hand
	// (this session or a previous one — a saved width counts as "manually set"),
	// to its own content width otherwise. A column only ever changes again from
	// here on if the user drags it directly.
	$effect(() => {
		const storedWidths = loadStoredWidths(storageKey);

		for (const column of columns) {
			if (manuallyResizedKeys.has(column.key)) continue;
			if (column.width !== undefined) {
				columnWidths[column.key] = column.width;
				continue;
			}
			if (columnWidths[column.key] === undefined && storedWidths[column.key] !== undefined) {
				columnWidths[column.key] = storedWidths[column.key];
				manuallyResizedKeys.add(column.key);
				continue;
			}
			// Keep whatever we last computed rather than shrinking to a
			// header-only width while a fresh page of `data` is still loading.
			if (data.length === 0 && columnWidths[column.key] !== undefined) continue;
			columnWidths[column.key] = computeContentWidth(column);
		}
	});

	const hasPagination = $derived(Boolean(pagination?.limit || onNext || onPrevious));

	// The table's own box: sum of its columns, floored (only when pagination is
	// shown) at PAGINATION_MIN_WIDTH. It is NOT stretched to fill the container —
	// dragging a column grows this directly, and once it exceeds the container the
	// scroll area takes over. This is the whole table's width, not any one column's.
	const totalTableWidth = $derived.by(() => {
		const contentWidth =
			(rowMenu ? ROW_MENU_COLUMN_WIDTH : 0) +
			columns.reduce((sum, column) => sum + (columnWidths[column.key] ?? column.width ?? DEFAULT_COLUMN_WIDTH), 0);
		return hasPagination ? Math.max(contentWidth, PAGINATION_MIN_WIDTH[density]) : contentWidth;
	});

	let resizingKey = $state<string | null>(null);

	// Listeners live on `window`, not the handle element. The handle sits inside a
	// `position: sticky` header — on touch devices, pointer capture on that kind of
	// target is unreliable (Android/iOS often hand the gesture to the scroll container
	// instead, so the drag reads as a near-motionless 1px nudge). Window-level listeners
	// don't depend on capture: once the drag starts we track the pointer everywhere.
	function startResize(event: PointerEvent, key: string) {
		event.preventDefault();
		event.stopPropagation();

		const startX = event.clientX;
		const startWidth = columnWidths[key] ?? DEFAULT_COLUMN_WIDTH;
		resizingKey = key;
		manuallyResizedKeys.add(key);

		const previousUserSelect = document.body.style.userSelect;
		const previousTouchAction = document.body.style.touchAction;
		document.body.style.userSelect = 'none';
		document.body.style.touchAction = 'none';

		function onMove(moveEvent: PointerEvent) {
			moveEvent.preventDefault();
			const delta = moveEvent.clientX - startX;
			columnWidths[key] = Math.max(MIN_COLUMN_WIDTH, startWidth + delta);
		}

		function stop() {
			resizingKey = null;
			document.body.style.userSelect = previousUserSelect;
			document.body.style.touchAction = previousTouchAction;
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', stop);
			window.removeEventListener('pointercancel', stop);
			saveStoredWidths(storageKey);
		}

		window.addEventListener('pointermove', onMove, { passive: false });
		window.addEventListener('pointerup', stop);
		window.addEventListener('pointercancel', stop);
	}

	function getAlignClass(align?: string) {
		if (align === 'right') return 'text-right';
		if (align === 'center') return 'text-center';
		return 'text-left';
	}

	function getTooltip(column: Column, value: any, row: any): string | null {
		if (!column.tooltip) return null;

		if (typeof column.tooltip === 'function') {
			return column.tooltip(value, row);
		}

		return value?.toString() || '';
	}

	// NEW: Get row classes including background color
	function getRowClasses(row: any): string {
		const baseClasses = onRowClick ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50';
		const bgColor = getRowBgColor ? getRowBgColor(row) : ''; // Call function if provided

		return `${baseClasses} ${bgColor}`.trim();
	}
</script>

<div
	class="flex {naturalHeight
		? ''
		: 'h-full overflow-hidden'} flex-col rounded-lg border border-gray-200 bg-white shadow-sm"
	style="width: {totalTableWidth}px; max-width: 100%;"
>
	<!-- Scrollable Table Area -->
	<div class="table-scroll-area {naturalHeight ? 'overflow-x-auto' : 'min-h-0 flex-1 overflow-auto'}">
		<table
			class="table-fixed border-separate border-spacing-0 border border-gray-200"
			style="width: {totalTableWidth}px"
		>
			<colgroup>
				{#if rowMenu}
					<col style="width: {ROW_MENU_COLUMN_WIDTH}px" />
				{/if}
				{#each columns as column}
					<col style="width: {columnWidths[column.key] ?? column.width ?? DEFAULT_COLUMN_WIDTH}px" />
				{/each}
			</colgroup>
			<thead class="sticky top-0 z-10 bg-gray-50">
				<tr class="divide-x divide-gray-200">
					{#if rowMenu}
						<th class="{headerPaddingClass} border-b border-gray-200 bg-gray-50"></th>
					{/if}
					{#each columns as column}
						<th
							class="{headerPaddingClass} {getAlignClass(
								column.align
							)} relative min-w-0 border-b border-gray-200 bg-gray-50 text-xs font-medium
								tracking-wider text-gray-500 uppercase"
						>
							<div class="flex min-w-0 items-center gap-1 align-middle">
								<span class="min-w-0 flex-1 truncate">{column.label}</span>
								{#if column.sorting}
									<button
										onclick={() => column?.sorting?.(data)}
										style="background: 'none'; border: 'none'; cursor: 'pointer'"
									>
										{#if column.icon && iconMapping[column.icon]}
											{@const Icon = iconMapping[column.icon]}
											<Icon size={15} class="cursor-pointer" />
										{/if}
									</button>
								{/if}
							</div>
							<!-- Straddles the column border rather than sitting fully inside this
								 th — the visible seam is the natural place a user's cursor/finger
								 lands, and it needs to actually be inside the hit zone, not just
								 adjacent to it. -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								role="separator"
								aria-orientation="vertical"
								class="absolute top-0 -right-2.5 z-20 flex h-full w-5 cursor-col-resize touch-none
									items-center justify-center select-none"
								style="touch-action: none;"
								onpointerdown={(e) => startResize(e, column.key)}
							>
								<div
									class="h-full w-1 {resizingKey === column.key
										? 'bg-blue-400/70'
										: 'bg-transparent hover:bg-blue-400/50'}"
								></div>
							</div>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="bg-white">
				{#each data as row, rowIndex}
					<tr class="{getRowClasses(row)} divide-x divide-gray-200" onclick={() => onRowClick?.(row)}>
						{#if rowMenu}
							{@const actions = rowMenu(row)}
							<td
								class="{cellPaddingClass} whitespace-nowrap border-b border-gray-200"
								onclick={(e) => e.stopPropagation()}
							>
								{#if actions.length > 0}
									<RowActionsMenu
										{actions}
										open={openMenuIndex === rowIndex}
										onToggle={() =>
											(openMenuIndex = openMenuIndex === rowIndex ? null : rowIndex)}
										onClose={() => (openMenuIndex = null)}
									/>
								{/if}
							</td>
						{/if}
						{#each columns as column}
							{@const tooltipText = getTooltip(column, row[column.key], row)}
							<td
								class="{cellPaddingClass} {cellTextClass} min-w-0 overflow-hidden text-ellipsis
									border-b border-gray-200 whitespace-nowrap text-gray-900 {getAlignClass(column.align)}"
							>
								{#if column.render}
									{@html column.render(row[column.key], row)}
								{:else if tooltipText}
									<Tooltip text={tooltipText} position={column.tooltipPosition || 'top'}>
										<span class="block max-w-full min-w-0 truncate cursor-help">
											{row[column.key] ?? '-'}
										</span>
									</Tooltip>
								{:else}
									<span class="block max-w-full min-w-0 truncate">
										{row[column.key] ?? '-'}
									</span>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}

				{#if data.length === 0}
					<tr>
						<td
							colspan={rowMenu ? columns.length + 1 : columns.length}
							class="px-6 py-8 text-center text-sm text-gray-500"
						>
							No data available
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Sticky Pagination Controls - Bottom -->
	{#if pagination?.limit || onNext || onPrevious}
		<div
			class="{paginationWrapClass} sticky bottom-0 z-10 flex items-center justify-between rounded-lg border border-gray-200 bg-white shadow-lg"
		>
			<!-- Rows per page -->
			{#if onLimitChange && pagination?.limit}
				<div class="flex items-center gap-2">
					<span class="hidden {paginationLimitTextClass} text-gray-700 md:inline">Show</span>
					<div class="{paginationSelectWidthClass} {density === 'compact' ? 'pagination-select-compact' : ''}">
						<Select
							options={APP_CONSTANTS.PAGINATION_OPTIONS}
							id="pagination"
							label=""
							bind:value={pagination.limit}
							onchange={(e: any) => onLimitChange(e.target.value)}
						/>
					</div>
					<span class="hidden {paginationLimitTextClass} text-gray-700 md:inline">entries</span>
				</div>
			{/if}

			<!-- Navigation Buttons -->
			{#if onNext || onPrevious}
				<div class="flex items-center gap-2">
					{#if onPrevious}
						<button
							disabled={!pagination?.canGoPrevious}
							onclick={onPrevious}
							class="{paginationBtnClass} inline-flex items-center rounded-md border border-gray-300 bg-white font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
						>
							<ChevronLeft class="h-4 w-4" />
							<span class="hidden sm:inline">Previous</span>
						</button>
					{/if}
					{#if onNext}
						<button
							disabled={!pagination?.canGoNext}
							onclick={onNext}
							class="{paginationBtnClass} inline-flex items-center rounded-md border border-gray-300 bg-white font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
						>
							<span class="hidden sm:inline">Next</span>
							<ChevronRight class="h-4 w-4" />
						</button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.pagination-select-compact :global(select) {
		padding-block: 0.25rem;
		padding-inline: 0.5rem;
		font-size: 0.75rem;
	}

	.table-scroll-area {
		scrollbar-color: #e5e7eb transparent;
		scrollbar-width: thin;
	}
</style>
