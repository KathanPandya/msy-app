<script lang="ts">
	import { t, type Lang } from '$lib/i18n';
	import registrationApi from '$lib/endpoints/registrationApi';
	import { parseRegistrationError } from '$lib/utilities/registrationUtils';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { Check, Copy, Share2 } from '@lucide/svelte';

	let { open, onClose, lang }: { open: boolean; onClose: () => void; lang: Lang | undefined } =
		$props();

	let link = $state('');
	let isLoading = $state(false);
	let errorMessage = $state('');
	let copied = $state(false);
	let copiedTimeout: ReturnType<typeof setTimeout> | undefined;

	async function getLink() {
		isLoading = true;
		errorMessage = '';
		try {
			link = (await registrationApi.myLink()).link;
		} catch (err) {
			errorMessage = parseRegistrationError(err, t(lang, 'errSomethingWrong'));
		} finally {
			isLoading = false;
		}
	}

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

	async function copyLink() {
		try {
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(link);
			} else {
				fallbackCopyText(link);
			}
		} catch {
			fallbackCopyText(link);
		}
		copied = true;
		clearTimeout(copiedTimeout);
		copiedTimeout = setTimeout(() => (copied = false), 1500);
	}

	const whatsAppHref = $derived(
		`https://wa.me/?text=${encodeURIComponent(t(lang, 'inviteWhatsAppMessage').replace('{link}', link))}`
	);
</script>

<Modal {open} {onClose} title={t(lang, 'inviteTitle')}>
	<p class="text-sm text-gray-600">{t(lang, 'inviteHint')}</p>

	{#if link}
		<div
			class="mt-2.5 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 py-1.5 pr-1.5 pl-2.5"
		>
			<p class="min-w-0 flex-1 truncate text-xs text-gray-800">{link}</p>
			<button
				type="button"
				onclick={copyLink}
				class="relative inline-flex items-center justify-center rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
				title={t(lang, 'copy')}
				aria-label={t(lang, 'copy')}
			>
				{#if copied}
					<Check class="h-4 w-4 text-green-600" />
				{:else}
					<Copy class="h-4 w-4" />
				{/if}
			</button>
		</div>
		<a
			href={whatsAppHref}
			target="_blank"
			rel="noopener noreferrer"
			class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
		>
			<Share2 class="h-4 w-4" />
			{t(lang, 'inviteShareWhatsApp')}
		</a>
		<p class="mt-1.5 text-[11px] text-gray-500">{t(lang, 'inviteLinkNote')}</p>
	{:else}
		<button
			type="button"
			onclick={getLink}
			disabled={isLoading}
			class="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
		>
			{isLoading ? t(lang, 'pleaseWait') : t(lang, 'inviteGetLink')}
		</button>
	{/if}

	{#if errorMessage}
		<p class="mt-1.5 text-xs text-red-600">{errorMessage}</p>
	{/if}
</Modal>
