<script lang="ts">
	import { page } from '$app/state';
	import { t } from '$lib/i18n';
	import { Copy, Check } from '@lucide/svelte';

	const lang = $derived(page.params.lang as 'guj' | undefined);

	function fallbackCopyText(text: string) {
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.focus();
		textarea.select();
		document.execCommand('copy');
		document.body.removeChild(textarea);
	}

	let copiedId = $state<string | null>(null);
	let copiedTimeout: ReturnType<typeof setTimeout> | undefined;
	async function copyText(value: string, id: string) {
		try {
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(value);
			} else {
				fallbackCopyText(value);
			}
		} catch {
			fallbackCopyText(value);
		}
		copiedId = id;
		clearTimeout(copiedTimeout);
		copiedTimeout = setTimeout(() => {
			copiedId = null;
		}, 1500);
	}

	const BOI_ACCOUNT_NUMBER = '202010110017389';
	const BOI_IFSC_CODE = 'BKID0002020';
</script>

{#snippet copyButton(value: string, id: string)}
	<button
		type="button"
		onclick={() => copyText(value, id)}
		class="relative inline-flex items-center justify-center rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
		title={t(lang, 'copy')}
	>
		{#if copiedId === id}
			<Check class="h-3.5 w-3.5 text-green-600" />
			<span
				class="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white"
			>
				{t(lang, 'copied')}
			</span>
		{:else}
			<Copy class="h-3.5 w-3.5" />
		{/if}
	</button>
{/snippet}

{#snippet bankDetails()}
	<div class="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
		<p class="text-sm font-semibold text-gray-800">
			{t(lang, 'contributeUseBankDetails')}
		</p>
		<div class="mt-3 space-y-2 text-sm text-gray-700">
			<p>{t(lang, 'bankLabel')} : {t(lang, 'bankNameBoi')}</p>
			<div class="flex items-center gap-1">
				<span>{t(lang, 'accountNumberLabel')}:- {BOI_ACCOUNT_NUMBER}</span>
				{@render copyButton(BOI_ACCOUNT_NUMBER, 'account')}
			</div>
			<div class="flex items-center gap-1">
				<span>{t(lang, 'ifscCodeLabel')}:- {BOI_IFSC_CODE}</span>
				{@render copyButton(BOI_IFSC_CODE, 'ifsc')}
			</div>
		</div>
	</div>
{/snippet}

<div class="overflow-y-auto bg-gray-50 px-4 py-4">
	<div class="mx-auto max-w-2xl">
		<div class="space-y-4">
			<section class="rounded-xl bg-white p-4 shadow-sm sm:p-6">
				<p class="text-sm font-semibold text-gray-500">અન્નપૂર્ણા યોજના</p>
				<h2 class="mt-1 text-lg font-bold text-gray-900">
					શ્રીમતી ઉષાનંદી વિનોદચંન્દ્ર જોષી અન્નપૂર્ણા (અનાજ સહાય) યોજના
				</h2>
				<p class="mt-4 text-sm leading-relaxed text-gray-700">
					{t(lang, 'annapurnaSchemeParagraph1')}
				</p>
				<p class="mt-4 text-sm leading-relaxed text-gray-700">
					{t(lang, 'annapurnaSchemeParagraph2')}
				</p>

				{@render bankDetails()}
			</section>

			<section class="rounded-xl bg-white p-4 shadow-sm sm:p-6">
				<p class="text-sm font-semibold text-gray-500">શિક્ષણ સહાય યોજના</p>
				<h2 class="mt-1 text-lg font-bold text-gray-900">
					શ્રીમતી સાવિત્રીબેન વિભાકરભાઈ ચતુર્ભુજ ભટ્ટ શિક્ષણ સહાય યોજના
				</h2>
				<p class="mt-4 text-sm leading-relaxed text-gray-700">
					{t(lang, 'shikshanSchemeParagraph')}
				</p>

				{@render bankDetails()}
			</section>
		</div>
	</div>
</div>
