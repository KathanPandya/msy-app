<script lang="ts">
	import { ArrowDown, ArrowUp, Component, IndianRupee, type IconProps } from '@lucide/svelte';
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

	type TableProps = {
		columns: Column[];
		data: any[];
		onRowClick?: (row: any) => void;
		getRowBgColor?: (row: any) => string; // NEW: Function to get background color
	};

	let { columns, data, onRowClick, getRowBgColor }: TableProps = $props();

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
									<Icon size={15} class='cursor-pointer'/>
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
						class="px-6 py-4 text-sm whitespace-nowrap text-gray-900 {getAlignClass(column.align)}"
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
