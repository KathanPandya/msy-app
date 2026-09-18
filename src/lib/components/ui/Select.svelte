<script lang="ts">
	type SelectOption = {
		key: string;
		label: string;
	};

	type SelectProps = {
		id: string;
		label?: string;
		size?: 'md' | 'sm';
		value: string;
		options: SelectOption[];
		error?: string;
		required?: boolean;
		disabled?: boolean;
		onchange?: (e?: any) => void;
	};

	let {
		id,
		label,
		size = 'md',
		value = $bindable(),
		options,
		error = '',
		required = false,
		disabled = false,
		onchange
	}: SelectProps = $props();

	const selectClasses = $derived(
		`w-full pl-3 pr-10 py-0 h-11 text-base border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
			size === 'sm' ? 'sm:h-8 sm:text-sm' : 'sm:h-10 sm:text-sm'
		} ${
			error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
		} ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white text-gray-900'}`
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
