<script lang="ts">
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ScanLine } from '@lucide/svelte';
	import type QrScanner from 'qr-scanner';

	let videoEl = $state<HTMLVideoElement>();
	let scanner: QrScanner | null = null;
	let isScanning = $state(false);
	let error = $state('');

	// The pass QR holds only the 64-character pass code, not a link.
	const PASS_CODE = /^[a-f0-9]{64}$/i;

	async function startScan() {
		error = '';
		isScanning = true;
		try {
			const { default: Scanner } = await import('qr-scanner');
			scanner = new Scanner(
				videoEl!,
				(result) => {
					const code = result.data.trim();
					if (!PASS_CODE.test(code)) {
						error = 'This is not an event pass QR.';
						return;
					}
					stopScan();
					goto(`/event-checkin/${code}`);
				},
				{ preferredCamera: 'environment', highlightScanRegion: true, returnDetailedScanResult: true }
			);
			await scanner.start();
		} catch {
			stopScan();
			error = 'Could not open the camera. Allow camera access and try again.';
		}
	}

	function stopScan() {
		scanner?.stop();
		scanner?.destroy();
		scanner = null;
		isScanning = false;
	}

	onDestroy(stopScan);
</script>

<div class="mx-auto flex h-full w-full max-w-md flex-col gap-4 py-2">
	<div class="overflow-hidden rounded-md bg-black {isScanning ? '' : 'hidden'}">
		<video bind:this={videoEl} class="aspect-square w-full object-cover"></video>
	</div>

	{#if error}
		<p class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
	{/if}

	<div class="grid">
		{#if isScanning}
			<Button variant="secondary" onclick={stopScan}>Stop</Button>
		{:else}
			<Button onclick={startScan}>
				<span class="flex items-center justify-center gap-1.5">
					<ScanLine class="h-4 w-4" />
					Scan
				</span>
			</Button>
		{/if}
	</div>
</div>
