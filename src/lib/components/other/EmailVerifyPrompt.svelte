<script lang="ts" module>
	// Set by the login page; consumed here so the popup opens once right after
	// login — not on refresh or later visits (the banner covers those).
	export const EMAIL_PROMPT_AFTER_LOGIN_KEY = 'showEmailVerifyPrompt';
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { t, type Lang } from '$lib/i18n';
	import emailVerificationApi from '$lib/endpoints/emailVerificationApi';
	import type { EmailVerification } from '$lib/types/emailVerification';
	import { authStore } from '$lib/stores/authStore';
	import { getPrefillEmail, isPlaceholderEmail } from '$lib/utilities/helperFunc';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { MailWarning } from '@lucide/svelte';

	let { lang }: { lang: Lang | undefined } = $props();

	let status = $state<EmailVerification.Status | null>(null);
	let popupOpen = $state(false);
	let email = $state('');
	let sending = $state(false);
	let message = $state('');
	let error = $state('');
	let resendCooldown = $state(0);

	const needsVerification = $derived(!!status && !status.verified);

	// Always fetched fresh: an admin can set or replace the verified email.
	async function fetchStatus() {
		try {
			status = await emailVerificationApi.fetchStatus();
		} catch {
			status = null;
		}
	}

	onMount(async () => {
		const justLoggedIn = sessionStorage.getItem(EMAIL_PROMPT_AFTER_LOGIN_KEY) === '1';
		sessionStorage.removeItem(EMAIL_PROMPT_AFTER_LOGIN_KEY);
		// The verified email is separate from the profile email; a real profile
		// email is only used to save the member some typing.
		email = getPrefillEmail($authStore.userAllInfo?.user.email);
		await fetchStatus();
		popupOpen = justLoggedIn && needsVerification;
	});

	$effect(() => {
		if (resendCooldown <= 0) return;
		const timer = setTimeout(() => resendCooldown--, 1000);
		return () => clearTimeout(timer);
	});

	async function sendVerificationEmail(event: SubmitEvent) {
		event.preventDefault();
		message = '';
		error = '';
		if (isPlaceholderEmail(email)) {
			error = t(lang, 'errEnterRealEmail');
			return;
		}
		popupOpen = false;
		sending = true;
		try {
			const res = await emailVerificationApi.send({ email: email.trim() });
			if (res.alreadyVerified) {
				await fetchStatus();
			} else {
				message = res.message || '';
				resendCooldown = 60;
			}
		} catch (err: any) {
			error = err?.response?.data?.error || t(lang, 'errSomethingWrong');
			// e.g. "Email already verified. Contact admin to change it."
			if (err?.response?.status === 400) await fetchStatus();
		} finally {
			sending = false;
		}
	}
</script>

{#snippet emailForm(id: string)}
	<form onsubmit={sendVerificationEmail} class="mt-2 flex items-center gap-2">
		<div class="min-w-0 flex-1">
			<Input
				{id}
				type="email"
				inputmode="email"
				size="sm"
				placeholder={t(lang, 'enterYourEmail')}
				bind:value={email}
				required
			/>
		</div>
		<Button type="submit" size="xs" variant="danger" disabled={sending || resendCooldown > 0}>
			{#if sending}
				{t(lang, 'sending')}
			{:else if resendCooldown > 0}
				{t(lang, 'resendInSeconds').replace('{seconds}', String(resendCooldown))}
			{:else}
				{t(lang, 'verifyEmail')}
			{/if}
		</Button>
	</form>
{/snippet}

{#if needsVerification}
	<section class="rounded-lg border border-red-300 bg-red-50 p-3 shadow-sm">
		<div class="flex items-start gap-2">
			<MailWarning class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
			<div class="min-w-0 flex-1">
				<p class="text-sm font-semibold text-red-800">{t(lang, 'emailNotVerifiedTitle')}</p>
				<p class="mt-0.5 text-xs text-red-700">{t(lang, 'emailNotVerifiedNotice')}</p>
				{@render emailForm('bannerEmail')}
				{#if message}
					<p class="mt-1 text-xs text-green-700">{message} {t(lang, 'verifyLinkSentNotice')}</p>
				{/if}
				{#if error}
					<p class="mt-1 text-xs text-red-600">{error}</p>
				{/if}
			</div>
		</div>
	</section>

	<Modal open={popupOpen} onClose={() => (popupOpen = false)} title={t(lang, 'emailNotVerifiedTitle')}>
		<div class="space-y-3">
			<p class="text-sm text-gray-700">{t(lang, 'emailNotVerifiedNotice')}</p>
			{@render emailForm('popupEmail')}
			<div class="flex justify-end">
				<Button size="sm" variant="secondary" onclick={() => (popupOpen = false)}>
					{t(lang, 'later')}
				</Button>
			</div>
		</div>
	</Modal>
{/if}
