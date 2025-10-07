<script lang="ts">
  type Column = {
    key: string;
    label: string;
    align?: 'left' | 'right' | 'center';
    render?: (value: any, row: any) => any;
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
</script>

<!-- Remove overflow-x-auto from here -->
<table class="min-w-full divide-y divide-gray-200">
  <thead class="bg-gray-50 sticky top-0 z-10">
    <tr>
      {#each columns as column}
        <th class="px-6 py-3 {getAlignClass(column.align)} text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
          {column.label}
        </th>
      {/each}
    </tr>
  </thead>
  <tbody class="bg-white divide-y divide-gray-200">
    {#each data as row}
      <tr 
        class={onRowClick ? 'hover:bg-gray-50 cursor-pointer' : 'hover:bg-gray-50'}
        onclick={() => onRowClick?.(row)}
      >
        {#each columns as column}
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 {getAlignClass(column.align)}">
            {#if column.render}
              {@html column.render(row[column.key], row)}
            {:else}
              {row[column.key] ?? '-'}
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