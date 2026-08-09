<script lang="ts">
	type CardProps = {
		title?: string;
		children?: any;
	};

	let { title, children }: CardProps = $props();
</script>

<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
	{#if title}
		<div class="border-b border-gray-200 px-4 py-3">
			<h2 class="text-lg font-semibold text-gray-900">{title}</h2>
		</div>
	{/if}

	<div class="p-4">
		{@render children?.()}
	</div>
</div>
