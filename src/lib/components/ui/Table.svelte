<!-- src/lib/components/ui/Table.svelte -->
<script lang="ts">
	import Tooltip from './Tooltip.svelte';

	type Column = {
		key: string;
		label: string;
		align?: 'left' | 'right' | 'center';
		render?: (value: any, row: any) => any;
		tooltip?: boolean | ((value: any, row: any) => string);
		tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
	};

	type TableProps = {
		columns: Column[];
		data: any[];
		onRowClick?: (row: any) => void;
	};

	let { columns, data, onRowClick }: TableProps = $props();

	function getAlignClass(align?: string) {
		if (align === 'right') return 'text-right';
		if (align === 'center') return 'text-center';
		return 'text-left';
	}

	// Get tooltip content
	function getTooltip(column: Column, value: any, row: any): string | null {
		if (!column.tooltip) return null;

		if (typeof column.tooltip === 'function') {
			return column.tooltip(value, row);
		}

		// Default: show the raw value as tooltip
		return value?.toString() || '';
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
					{column.label}
				</th>
			{/each}
		</tr>
	</thead>
	<tbody class="divide-y divide-gray-200 bg-white">
		{#each data as row}
			<tr
				class={onRowClick ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50'}
				onclick={() => onRowClick?.(row)}
			>
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
