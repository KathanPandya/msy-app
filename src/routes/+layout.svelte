<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="bg-whit flex h-screen flex-col overflow-hidden">
	<main class="overflow-hiddens flex-1">
		{@render children?.()}
	</main>
</div>
