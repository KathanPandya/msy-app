<script lang="ts">
	import { isHttpLoading } from '$lib/stores/httpLoadingStore';
</script>

{#if $isHttpLoading}
	<div class="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-blue-100">
		<div class="loading-bar-fill h-full w-1/3 bg-blue-600"></div>
	</div>
{/if}

<style>
	.loading-bar-fill {
		animation: loading-bar-slide 1.1s ease-in-out infinite;
	}

	@keyframes loading-bar-slide {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(300%);
		}
	}
</style>
