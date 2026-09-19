<script lang="ts">
	import { afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { t, withLang } from '$lib/i18n';
	import emailVerificationApi from '$lib/endpoints/emailVerificationApi';
	import { authStore } from '$lib/stores/authStore';

	const lang = $derived(page.params.lang as 'guj' | undefined);

	let isVerifying = $state(true);
	let verified = $state(false);
	let linkInvalid = $state(false);
	let errorMessage = $state('');

	const isLoggedIn = $derived($authStore.isAuthenticated && $authStore.authType === 'pin');

	// afterNavigate, not onMount: replaceState throws until the router has started.
	// Runs once on page load, so the single-use token is confirmed exactly once.
	afterNavigate(async () => {
		// One-time secret from the emailed link: kept in memory only, never stored or logged.
		const token = page.url.searchParams.get('token');
		if (!token) {
			linkInvalid = true;
			isVerifying = false;
			return;
		}
		replaceState(withLang(lang, '/verify-email'), {});
		try {
			await emailVerificationApi.confirm({ token });
			verified = true;
		} catch (err: any) {
			const error = err?.response?.data?.error;
			if (error === 'Link is invalid or expired. Request a new one.') {
				linkInvalid = true;
			} else {
				errorMessage = error || t(lang, 'errSomethingWrong');
			}
		} finally {
			isVerifying = false;
		}
	});
</script>

<div class="flex min-h-full items-center justify-center overflow-y-auto bg-gray-50 px-4 py-8">
	<div class="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-sm sm:p-8">
		<img
			src="/logos/02_Website_Logo/website-logo-symbol-512.webp"
			alt="MSY"
			class="mx-auto mb-3 h-14 w-14"
		/>
		<h1 class="mb-6 text-2xl font-bold text-gray-900">{t(lang, 'verifyEmail')}</h1>

		{#if isVerifying}
			<p class="text-gray-800">{t(lang, 'verifyingEmail')}</p>
		{:else}
			{#if verified}
				<p class="text-gray-800">{t(lang, 'emailVerifiedNotice')}</p>
			{:else if linkInvalid}
				<p class="text-gray-800">{t(lang, 'resetLinkInvalid')}</p>
			{:else}
				<div class="rounded-md border border-red-200 bg-red-50 p-3">
					<p class="text-sm text-red-800">{errorMessage}</p>
				</div>
			{/if}

			<a
				href={withLang(lang, isLoggedIn ? '/me/profile' : '/login')}
				class="mt-6 inline-block w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700"
			>
				{isLoggedIn ? t(lang, 'goToProfile') : t(lang, 'logIn')}
			</a>
		{/if}
	</div>
</div>
