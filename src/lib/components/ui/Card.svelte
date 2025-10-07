<script lang="ts">
	type CardProps = {
		title?: string;
		children?: any;
	};

	let { title, children }: CardProps = $props();
</script>

<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
	{#if title}
		<div class="border-b border-gray-200 px-6 py-4">
			<h2 class="text-lg font-semibold text-gray-900">{title}</h2>
		</div>
	{/if}

	<div class="p-6">
		{@render children?.()}
	</div>
</div>
