<script lang="ts">
	import { tick } from 'svelte';

	type TooltipProps = {
		text: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
		delay?: number;
		children?: any;
	};

	let { text, position = 'top', delay = 300, children }: TooltipProps = $props();

	// SSR-safe unique id (Math.random() here would mismatch between server and
	// client render) — links the bubble to the trigger for screen readers.
	const uid = $props.id();
	const tooltipId = `tooltip-${uid}`;

	let visible = $state(false);
	// Arrow orientation only now (position is computed in px, see below) —
	// still flips to the opposite side if the requested one can't fit.
	let side = $state(position);
	let coords = $state({ top: 0, left: 0 });
	// Held hidden for one frame while we measure, so it never flashes at
	// (0, 0) before the real position is computed.
	let ready = $state(false);
	let openTimer: ReturnType<typeof setTimeout>;

	let triggerEl: HTMLDivElement | undefined = $state();
	let bubbleEl: HTMLDivElement | undefined = $state();

	// Moves the bubble to a direct child of <body>. Left inside whatever
	// scrollable container the trigger lives in (a table cell, a modal body),
	// a bubble that overflows the container's own bounds forces that
	// container to become scrollable to reveal it — scrolling to read it then
	// carries the trigger out from under the pointer, firing mouseleave and
	// closing the tooltip before it can be read. `position: fixed` off a
	// <body>-level node is positioned against the viewport instead, so it's
	// unaffected by any ancestor's overflow/scroll, and — combined with the
	// viewport clamping in measure() below — never needs scrolling to see in
	// full in the first place.
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.parentNode?.removeChild(node);
			}
		};
	}

	function show() {
		clearTimeout(openTimer);
		openTimer = setTimeout(() => {
			visible = true;
			ready = false;
			side = position;
			requestAnimationFrame(measure);
		}, delay);
	}

	function hide() {
		clearTimeout(openTimer);
		visible = false;
	}

	async function measure() {
		if (!triggerEl || !bubbleEl) return;
		const margin = 8;
		const trigger = triggerEl.getBoundingClientRect();

		// Flip to the opposite side first if the requested one can't fit.
		let bubble = bubbleEl.getBoundingClientRect();
		let nextSide = position;
		if (position === 'right' && trigger.right + margin + bubble.width > window.innerWidth) {
			nextSide = 'left';
		} else if (position === 'left' && trigger.left - margin - bubble.width < 0) {
			nextSide = 'right';
		} else if (position === 'top' && trigger.top - margin - bubble.height < 0) {
			nextSide = 'bottom';
		} else if (
			position === 'bottom' &&
			trigger.bottom + margin + bubble.height > window.innerHeight
		) {
			nextSide = 'top';
		}
		side = nextSide;

		// Re-measure after the arrow/side change (if any) lands in the DOM.
		await tick();
		if (!bubbleEl) return;
		bubble = bubbleEl.getBoundingClientRect();

		let top = 0;
		let left = 0;
		if (side === 'top') {
			top = trigger.top - margin - bubble.height;
			left = trigger.left + trigger.width / 2 - bubble.width / 2;
		} else if (side === 'bottom') {
			top = trigger.bottom + margin;
			left = trigger.left + trigger.width / 2 - bubble.width / 2;
		} else if (side === 'left') {
			top = trigger.top + trigger.height / 2 - bubble.height / 2;
			left = trigger.left - margin - bubble.width;
		} else {
			top = trigger.top + trigger.height / 2 - bubble.height / 2;
			left = trigger.right + margin;
		}

		// Clamp fully inside the viewport — the bubble is always entirely
		// visible the moment it opens, never partially off-screen.
		top = Math.min(Math.max(top, margin), window.innerHeight - bubble.height - margin);
		left = Math.min(Math.max(left, margin), window.innerWidth - bubble.width - margin);

		coords = { top, left };
		ready = true;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') hide();
	}

	// Any ancestor scrolling moves the trigger out from under the computed
	// position — close rather than let the bubble drift and point at nothing.
	function handleScroll() {
		if (visible) hide();
	}

	$effect(() => {
		if (!visible) return;
		window.addEventListener('scroll', handleScroll, true);
		window.addEventListener('resize', handleScroll);
		return () => {
			window.removeEventListener('scroll', handleScroll, true);
			window.removeEventListener('resize', handleScroll);
		};
	});

	const arrowClasses = {
		top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-t-gray-900 border-x-transparent border-b-transparent',
		bottom:
			'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-gray-900 border-x-transparent border-t-transparent',
		left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-l-gray-900 border-y-transparent border-r-transparent',
		right:
			'right-full top-1/2 -translate-y-1/2 -mr-1 border-r-gray-900 border-y-transparent border-l-transparent'
	};
</script>

<div
	bind:this={triggerEl}
	class="relative inline-block"
	onmouseenter={show}
	onmouseleave={hide}
	onfocusin={show}
	onfocusout={hide}
	onkeydown={handleKeydown}
	aria-describedby={visible ? tooltipId : undefined}
>
	{@render children?.()}

	{#if visible && text}
		<div
			use:portal
			class="tooltip-fade pointer-events-none fixed z-[100]"
			style="top: {coords.top}px; left: {coords.left}px; visibility: {ready
				? 'visible'
				: 'hidden'};"
		>
			<div
				bind:this={bubbleEl}
				id={tooltipId}
				role="tooltip"
				class="w-max rounded-lg bg-gray-900 px-3 py-2 text-left text-sm leading-snug font-normal whitespace-normal text-white shadow-xl"
				style="max-width: min(20rem, calc(100vw - 2rem));"
			>
				{text}
			</div>
			<div class="absolute h-0 w-0 border-4 border-solid {arrowClasses[side]}"></div>
		</div>
	{/if}
</div>

<style>
	.tooltip-fade {
		animation: tooltip-fade-in 0.15s ease-out;
	}

	@keyframes tooltip-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.tooltip-fade {
			animation-name: tooltip-fade-in-motion;
		}

		@keyframes tooltip-fade-in-motion {
			from {
				opacity: 0;
				transform: scale(0.96);
			}
			to {
				opacity: 1;
				transform: scale(1);
			}
		}
	}
</style>
