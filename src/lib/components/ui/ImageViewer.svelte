<script lang="ts">
	import { X, ZoomIn, Download } from '@lucide/svelte';

	type ImageViewerProps = {
		src: string;
		alt?: string;
		thumbnailSize?: 'small' | 'medium' | 'large';
		rounded?: boolean;
	};

	let { src, alt = 'Image', thumbnailSize = 'medium', rounded = true }: ImageViewerProps = $props();

	let isOpen = $state(false);

	const sizeClasses = {
		small: 'w-16 h-16',
		medium: 'w-24 h-24',
		large: 'w-32 h-32'
	};

	function openLightbox() {
		isOpen = true;
		// Prevent body scroll when lightbox is open
		document.body.style.overflow = 'hidden';
	}

	function closeLightbox() {
		isOpen = false;
		document.body.style.overflow = 'auto';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			closeLightbox();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closeLightbox();
		}
	}

	function downloadImage() {
		const link = document.createElement('a');
		link.href = src;
		link.download = alt || 'image';
		link.click();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Thumbnail -->
<div class="group relative inline-block">
	<button
		type="button"
		onclick={openLightbox}
		class="relative overflow-hidden transition-all {sizeClasses[thumbnailSize]} {rounded
			? 'rounded-lg'
			: ''} focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
	>
		<img {src} {alt} class="h-full w-full object-cover" />

		<!-- Hover overlay -->
		<div
			class="bg-opacity-0 group-hover:bg-opacity-40 absolute inset-0 flex items-center justify-center  transition-all"
		>
			<ZoomIn class="h-6 w-6 text-black opacity-0 transition-opacity group-hover:opacity-100" />
		</div>
	</button>
</div>

<!-- Lightbox Modal -->
{#if isOpen}
	<div
		class="bg-opacity-90 animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-label="Image viewer"
	>
		<!-- Close button -->
		<button
			type="button"
			onclick={closeLightbox}
			class="hover:bg-opacity-20 absolute top-4 right-4 rounded-lg p-2 text-white transition-colors hover:bg-white focus:ring-2 focus:ring-white focus:outline-none"
			aria-label="Close"
		>
			<X class="h-6 w-6" />
		</button>

		<!-- Download button -->
		<button
			type="button"
			onclick={downloadImage}
			class="hover:bg-opacity-20 absolute top-4 right-16 rounded-lg p-2 text-white transition-colors hover:bg-white focus:ring-2 focus:ring-white focus:outline-none"
			aria-label="Download"
		>
			<Download class="h-6 w-6" />
		</button>

		<!-- Image container -->
		<div class="relative max-h-[90vh] max-w-7xl p-4">
			<img
				{src}
				{alt}
				class="animate-zoom-in max-h-full max-w-full rounded-lg object-contain shadow-2xl"
			/>
		</div>

		<!-- Close hint -->
		<div
			class="bg-opacity-50 absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black px-4 py-2 text-sm text-white"
		>
			Press ESC or click outside to close
		</div>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes zoom-in {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.2s ease-out;
	}

	.animate-zoom-in {
		animation: zoom-in 0.3s ease-out;
	}
</style>
