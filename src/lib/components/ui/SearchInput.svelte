<script lang="ts">
	import { Search } from '@lucide/svelte';

	type SearchInputProps = {
		id: string;
		value: string;
		placeholder?: string;
		disabled?: boolean;
		oninput?: (e: Event) => void;
	};

	let {
		id,
		value = $bindable(),
		placeholder = 'Search...',
		disabled = false,
		oninput
	}: SearchInputProps = $props();
</script>

<div class="relative">
	<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
		<Search class="h-5 w-5 text-gray-400" />
	</div>
	<input
		{id}
		type="search"
		{placeholder}
		{disabled}
		bind:value
		{oninput}
		class="w-full rounded-md border border-gray-300 bg-white py-2 pr-3 pl-10 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
	/>
</div>
