<script lang="ts">
	import { Eye, EyeOff } from '@lucide/svelte';

	type InputProps = {
		id: string;
		label?: string;
		labelStyle?: 'stacked' | 'border';
		type?: string;
		value: string;
		error?: string;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		onblur?: () => void;
		maxlength?: number;
		inputmode?:
			| 'text'
			| 'search'
			| 'none'
			| 'tel'
			| 'url'
			| 'email'
			| 'numeric'
			| 'decimal'
			| null
			| undefined;
		onChange?: (event: Event) => void;
	};

	let {
		id,
		label,
		labelStyle = 'stacked',
		type = 'text',
		value = $bindable(),
		error = '',
		placeholder = '',
		required = false,
		disabled = false,
		onblur,
		maxlength,
		inputmode,
		onChange
	}: InputProps = $props();

	// State for password visibility
	let showPassword = $state(false);

	// Determine actual input type
	const inputType = $derived(type === 'password' && showPassword ? 'text' : type);

	const inputClasses = $derived(
		`w-full px-3 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
			labelStyle === 'border' ? 'pt-2 pb-1.5' : 'py-2'
		} ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'} ${
			disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white text-gray-900'
		} ${type === 'password' ? 'pr-10' : ''}`
	);

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}
</script>

<div>
	{#if label && labelStyle === 'stacked'}
		<label for={id} class="mb-1 block text-sm font-medium text-gray-700">
			{label}
			{#if required}<span class="text-red-500">*</span>{/if}
		</label>
	{/if}

	<div class="relative">
		{#if label && labelStyle === 'border'}
			<label
				for={id}
				class="absolute -top-2 left-2 z-10 bg-white px-1 text-[11px] font-medium text-gray-600"
			>
				{label}
				{#if required}<span class="text-red-500">*</span>{/if}
			</label>
		{/if}
		<input
			{id}
			type={inputType}
			{placeholder}
			{required}
			{disabled}
			{maxlength}
			{inputmode}
			bind:value
			{onblur}
			class={inputClasses}
			oninput={onChange}
		/>

		{#if type === 'password'}
			<button
				type="button"
				onclick={togglePasswordVisibility}
				class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
				aria-label={showPassword ? 'Hide password' : 'Show password'}
			>
				{#if showPassword}
					<EyeOff size={20} />
				{:else}
					<Eye size={20} />
				{/if}
			</button>
		{/if}
	</div>

	{#if error}
		<p class="mt-1 text-sm text-red-600">{error}</p>
	{/if}
</div>
