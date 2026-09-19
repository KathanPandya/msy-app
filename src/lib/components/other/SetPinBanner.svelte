<script lang="ts" module>
	// Set by the login page after an OTP login; consumed here so the banner
	// shows once — not on refresh or later visits.
	export const SET_PIN_PROMPT_AFTER_LOGIN_KEY = 'showSetPinPrompt';
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { t, withLang, type Lang } from '$lib/i18n';
	import { X } from '@lucide/svelte';

	let { lang }: { lang: Lang | undefined } = $props();

	const VISIBLE_SECONDS = 15;

	let visible = $state(false);
	let secondsLeft = $state(VISIBLE_SECONDS);

	onMount(() => {
		visible = sessionStorage.getItem(SET_PIN_PROMPT_AFTER_LOGIN_KEY) === '1';
		sessionStorage.removeItem(SET_PIN_PROMPT_AFTER_LOGIN_KEY);
	});

	$effect(() => {
		if (!visible) return;
		if (secondsLeft <= 0) {
			visible = false;
			return;
		}
		const timer = setTimeout(() => secondsLeft--, 1000);
		return () => clearTimeout(timer);
	});
</script>

{#if visible}
	<section class="overflow-hidden rounded-lg border border-yellow-200 bg-yellow-50 shadow-sm">
		<div class="flex items-center gap-2 px-3 py-2">
			<p class="min-w-0 flex-1 text-xs text-yellow-800">{t(lang, 'otpSessionSetPinNotice')}</p>
			<a
				href={withLang(lang, '/me/profile')}
				class="flex-shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700"
			>
				{t(lang, 'setPin')}
			</a>
			<span class="w-6 flex-shrink-0 text-right text-[11px] text-yellow-600 tabular-nums">
				{secondsLeft}s
			</span>
			<button
				type="button"
				onclick={() => (visible = false)}
				class="flex-shrink-0 rounded p-0.5 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-800"
				aria-label="Close"
			>
				<X class="h-3.5 w-3.5" />
			</button>
		</div>
		<!-- Countdown bar: shrinks each second until the banner hides itself. -->
		<div class="h-0.5 bg-yellow-100">
			<div
				class="h-full bg-yellow-500 transition-[width] duration-1000 ease-linear"
				style="width: {(secondsLeft / VISIBLE_SECONDS) * 100}%"
			></div>
		</div>
	</section>
{/if}
