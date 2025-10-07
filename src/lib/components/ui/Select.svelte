<script lang="ts">
	type SelectOption = {
		key: string;
		label: string;
	};

	type SelectProps = {
		id: string;
		label?: string;
		value: string;
		options: SelectOption[];
		error?: string;
		required?: boolean;
		disabled?: boolean;
		onchange?: () => void;
	};

	let {
		id,
		label,
		value = $bindable(),
		options,
		error = '',
		required = false,
		disabled = false,
		onchange
	}: SelectProps = $props();

	const selectClasses = $derived(
		`w-full px-3 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
			error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
		} ${
			disabled 
				? 'bg-gray-100 cursor-not-allowed text-gray-500' 
				: 'bg-white text-gray-900'
		}`
	);
</script>

<div>
	{#if label}
		<label for={id} class="mb-1 block text-sm font-medium text-gray-700">
			{label}
			{#if required}<span class="text-red-500">*</span>{/if}
		</label>
	{/if}

	<select {id} {required} {disabled} bind:value {onchange} class={selectClasses}>
		{#each options as option}
			<option value={option.key} disabled={option.key === ''}>
				{option.label}
			</option>
		{/each}
	</select>

	{#if error}
		<p class="mt-1 text-sm text-red-600">{error}</p>
	{/if}
</div>