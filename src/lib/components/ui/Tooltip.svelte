<script lang="ts">
	type TooltipProps = {
		text: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
		delay?: number;
		children?: any;
	};

	let { text, position = 'top', delay = 300, children }: TooltipProps = $props();

	let showTooltip = $state(false);
	let timeoutId: ReturnType<typeof setTimeout>;

	function handleMouseEnter() {
		timeoutId = setTimeout(() => {
			showTooltip = true;
		}, delay);
	}

	function handleMouseLeave() {
		clearTimeout(timeoutId);
		showTooltip = false;
	}

	const positionClasses = {
		top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
		bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
		left: 'right-full top-1/2 -translate-y-1/2 mr-2',
		right: 'left-full top-1/2 -translate-y-1/2 ml-2'
	};

	const arrowClasses = {
		top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
		bottom:
			'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
		left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
		right:
			'right-full top-1/2 -translate-y-1/2 -mr-1 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900'
	};
</script>

<div class="relative inline-block" onmouseenter={handleMouseEnter} onmouseleave={handleMouseLeave}>
	{@render children?.()}

	{#if showTooltip && text}
		<div
			class="animate-in fade-in pointer-events-none absolute z-50 duration-200 {positionClasses[
				position
			]}"
		>
			<div class="relative max-w-xs rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-xl">
				<div class="break-words whitespace-pre-line">
					{text}
				</div>
				<!-- Arrow -->
				<div class="absolute {arrowClasses[position]}">
					<div class="border-4 border-solid"></div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.animate-in {
		animation: fade-in 0.2s ease-out;
	}
</style>
