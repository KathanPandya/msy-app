<script lang="ts">
	import Select from '$lib/components/ui/Select.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, IndianRupee } from '@lucide/svelte';
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
	};

	type PaginationConfig = {
		limit: any;
		canGoNext: boolean;
		canGoPrevious: boolean;
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
	};

	let {
		columns,
		data,
		onRowClick,
		getRowBgColor,
		pagination,
		onNext,
		onPrevious,
		onLimitChange
	}: TableProps = $props();

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

<div class="flex h-full flex-col">
	<!-- Scrollable Table Area -->
	<div class="min-h-0 flex-1 overflow-auto">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="sticky top-0 z-10 bg-gray-50">
				<tr>
					{#each columns as column}
						<th
							class="px-6 py-3 {getAlignClass(
								column.align
							)} bg-gray-50 text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							<div class="flex align-middle">
								{column.label}
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
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 bg-white">
				{#each data as row}
					<tr class={getRowClasses(row)} onclick={() => onRowClick?.(row)}>
						{#each columns as column}
							{@const tooltipText = getTooltip(column, row[column.key], row)}
							<td
								class="px-6 py-4 text-sm whitespace-nowrap text-gray-900 {getAlignClass(
									column.align
								)}"
							>
								{#if column.render}
									{@html column.render(row[column.key], row)}
								{:else if tooltipText}
									<Tooltip text={tooltipText} position={column.tooltipPosition || 'top'}>
										<span class="cursor-help">
											{row[column.key] ?? '-'}
										</span>
									</Tooltip>
								{:else}
									<span>
										{row[column.key] ?? '-'}
									</span>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}

				{#if data.length === 0}
					<tr>
						<td colspan={columns.length} class="px-6 py-8 text-center text-sm text-gray-500">
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
			class="sticky bottom-0 z-10 mt-4 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-2 shadow-lg lg:p-4"
		>
			<!-- Rows per page -->
			{#if onLimitChange && pagination?.limit}
				<div class="flex items-center gap-2">
					<span class="hidden text-sm text-gray-700 md:inline">Show</span>
					<div class="w-20 sm:w-24">
						<Select
							options={APP_CONSTANTS.PAGINATION_OPTIONS}
							id="pagination"
							label=""
							bind:value={pagination.limit}
							onchange={(e: any) => onLimitChange(e.target.value)}
						/>
					</div>
					<span class="hidden text-sm text-gray-700 md:inline">entries</span>
				</div>
			{/if}

			<!-- Navigation Buttons -->
			{#if onNext || onPrevious}
				<div class="flex items-center gap-2">
					{#if onPrevious}
						<button
							disabled={!pagination?.canGoPrevious}
							onclick={onPrevious}
							class="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white sm:gap-1.5 sm:px-3 sm:py-2"
						>
							<ChevronLeft class="h-4 w-4" />
							<span class="hidden sm:inline">Previous</span>
						</button>
					{/if}
					{#if onNext}
						<button
							disabled={!pagination?.canGoNext}
							onclick={onNext}
							class="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white sm:gap-1.5 sm:px-3 sm:py-2"
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
