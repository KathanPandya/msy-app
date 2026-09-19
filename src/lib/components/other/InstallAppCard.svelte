<script lang="ts">
	import { onMount } from 'svelte';
	import { t, type Lang } from '$lib/i18n';
	import type { DictKey } from '$lib/i18n/translations';
	import { Download, Share, SquarePlus, EllipsisVertical, X } from '@lucide/svelte';

	let { lang }: { lang: Lang | undefined } = $props();

	type BeforeInstallPromptEvent = Event & {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	};

	let platform = $state<'ios' | 'android' | 'other'>('other');
	let deferred = $state<BeforeInstallPromptEvent | null>(null);
	let installed = $state(true); // hidden until checked on mount
	let showSteps = $state(false);
	let dismissed = $state(false);

	onMount(() => {
		installed =
			window.matchMedia('(display-mode: standalone)').matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true;
		if (installed) return;

		const ua = navigator.userAgent;
		// iPadOS reports itself as a Mac, so also check for touch support.
		if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1))
			platform = 'ios';
		else if (/android/i.test(ua)) platform = 'android';

		const onBeforeInstall = (e: Event) => {
			e.preventDefault();
			deferred = e as BeforeInstallPromptEvent;
		};
		const onInstalled = () => {
			installed = true;
			deferred = null;
		};
		window.addEventListener('beforeinstallprompt', onBeforeInstall);
		window.addEventListener('appinstalled', onInstalled);
		return () => {
			window.removeEventListener('beforeinstallprompt', onBeforeInstall);
			window.removeEventListener('appinstalled', onInstalled);
		};
	});

	async function install() {
		// iPhone never gets the native prompt; Android browsers without it get manual steps too.
		if (!deferred) {
			showSteps = !showSteps;
			return;
		}
		await deferred.prompt();
		const { outcome } = await deferred.userChoice;
		deferred = null;
		if (outcome === 'accepted') installed = true;
	}

	const steps = $derived<{ key: DictKey; icon: typeof Share | null }[]>(
		platform === 'ios'
			? [
					{ key: 'installIosStep1', icon: Share },
					{ key: 'installIosStep2', icon: SquarePlus },
					{ key: 'installIosStep3', icon: null }
				]
			: [
					{ key: 'installAndroidStep1', icon: EllipsisVertical },
					{ key: 'installAndroidStep2', icon: Download },
					{ key: 'installAndroidStep3', icon: null }
				]
	);
</script>

<!-- Phones always see it; desktop only when the browser supports installing. -->
{#if !dismissed && !installed && (platform !== 'other' || deferred)}
	<section class="rounded-lg border border-blue-200 bg-blue-50/50 p-3 shadow-sm">
		<div class="flex items-center gap-2.5">
			<img src="/logos/01_App_Icon/app-icon-192.png" alt="MSY" class="h-10 w-10 flex-shrink-0 rounded-lg" />
			<div class="min-w-0 flex-1">
				<h2 class="text-sm font-semibold text-gray-900">
					{t(lang, platform === 'ios' ? 'installIosTitle' : 'installAndroidTitle')}
				</h2>
				<p class="text-[11px] text-gray-600">
					{t(lang, platform === 'ios' ? 'installIosHint' : 'installAndroidHint')}
				</p>
			</div>
			<button
				type="button"
				onclick={() => (dismissed = true)}
				class="flex-shrink-0 self-start rounded p-0.5 text-gray-400 hover:bg-blue-100 hover:text-gray-600"
				aria-label="Close"
			>
				<X class="h-4 w-4" />
			</button>
		</div>

		<button
			type="button"
			onclick={install}
			class="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
		>
			<Download class="h-4 w-4" />
			{t(lang, 'installApp')}
		</button>

		{#if showSteps}
			<ol class="mt-2.5 space-y-1.5 rounded-md border border-gray-200 bg-white p-2.5">
				{#each steps as step, i (step.key)}
					<li class="flex items-center gap-2 text-xs text-gray-800">
						<span
							class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700"
							>{i + 1}</span
						>
						<span class="flex-1">{t(lang, step.key)}</span>
						{#if step.icon}
							<step.icon class="h-4 w-4 flex-shrink-0 text-blue-600" />
						{/if}
					</li>
				{/each}
			</ol>
		{/if}
	</section>
{/if}
