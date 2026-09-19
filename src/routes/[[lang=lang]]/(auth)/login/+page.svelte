<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { t, withLang } from '$lib/i18n';
	import Input from '$lib/components/ui/Input.svelte';
	import pinAuthApi from '$lib/endpoints/pinAuthApi';
	import { authStore } from '$lib/stores/authStore';
	import type { PinAuth } from '$lib/types/pinAuth';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import { onMount } from 'svelte';
	import { EMAIL_PROMPT_AFTER_LOGIN_KEY } from '$lib/components/other/EmailVerifyPrompt.svelte';
	import { SET_PIN_PROMPT_AFTER_LOGIN_KEY } from '$lib/components/other/SetPinBanner.svelte';

	// otp → code entry after "Log in with OTP".
	type Stage = PinAuth.Stage | 'identify' | 'otp';

	const lang = $derived(page.params.lang as 'guj' | undefined);

	let stage = $state<Stage>('identify');
	let memberId = $state('');
	let name = $state('');
	let rawMemberId = $state('');
	let pin = $state('');
	let dob = $state('');
	let newPin = $state('');
	let confirmPin = $state('');
	let currentPin = $state('');
	let errorMessage = $state('');
	let successMessage = $state('');
	let resendCooldown = $state(0);
	let attemptsLeft = $state<number | null>(null);
	// From /identify: "Log in with OTP" is only offered for a verified email.
	let emailVerified = $state(false);
	let otpCode = $state('');
	// Screen to go back to from the code screen ("Use PIN instead").
	let otpReturnStage = $state<Stage>('pin');
	// Member a code was already sent to — reopening the code screen reuses it
	// instead of requesting a new one (which the backend rejects during cooldown).
	let otpSentFor = $state('');
	// Daily / rate limit hit: no new code can be requested, so hide "Resend code".
	let resendBlocked = $state(false);
	let isLoading = $state(false);

	onMount(() => {
		if ($authStore.isAuthenticated && $authStore.authType === 'pin') {
			goto(withLang(lang, '/me'));
		} else if ($authStore.isAuthenticated && $authStore.userAllInfo?.user.role === 'admin') {
			goto('/dashboard');
		}
	});

	function resetFormFields() {
		pin = '';
		otpCode = '';
		dob = '';
		newPin = '';
		confirmPin = '';
		currentPin = '';
		errorMessage = '';
		attemptsLeft = null;
	}

	function applyStageResult(data: PinAuth.StageResult | PinAuth.IdentifyResult) {
		if (data.stage) stage = data.stage;
		if (data.memberId) memberId = data.memberId;
		if (data.name) name = data.name;
		if ('error' in data && data.error) errorMessage = data.error;
		if ('left' in data && data.left != null) attemptsLeft = data.left;
	}

	$effect(() => {
		if (resendCooldown <= 0) return;
		const timer = setTimeout(() => resendCooldown--, 1000);
		return () => clearTimeout(timer);
	});

	async function requestOtp() {
		isLoading = true;
		errorMessage = '';
		successMessage = '';
		attemptsLeft = null;
		try {
			const data = await pinAuthApi.requestOtp({ memberId });
			otpSentFor = memberId;
			if (stage !== 'otp') otpReturnStage = stage;
			stage = 'otp';
			otpCode = '';
			successMessage = data.message || '';
			resendCooldown = 60;
		} catch (err: any) {
			const error: string | undefined = err?.response?.data?.error;
			if (err?.response?.status !== 429) {
				errorMessage = error || t(lang, 'errSomethingWrong');
				return;
			}
			// 429 = a code was sent recently (e.g. before a refresh) and may still be
			// valid — open the code screen anyway so the member can enter it.
			otpSentFor = memberId;
			if (stage !== 'otp') otpReturnStage = stage;
			stage = 'otp';
			otpCode = '';
			// Cooldown ("Please wait 42 seconds…"): no error, just count Resend down
			// from the backend's seconds. Any other limit: show it and hide Resend.
			const waitSeconds = error?.match(/(\d+)\s*seconds?/)?.[1];
			if (waitSeconds) {
				resendCooldown = Number(waitSeconds);
			} else {
				errorMessage = error || t(lang, 'errSomethingWrong');
				resendBlocked = true;
			}
		} finally {
			isLoading = false;
		}
	}

	function openOtp() {
		if (otpSentFor !== memberId) {
			requestOtp();
			return;
		}
		otpReturnStage = stage;
		stage = 'otp';
		resetFormFields();
	}

	function usePinInstead() {
		stage = otpReturnStage;
		successMessage = '';
		resetFormFields();
	}

	async function handleLoginOtp(e: Event) {
		e.preventDefault();
		errorMessage = '';
		attemptsLeft = null;
		if (!/^\d{6}$/.test(otpCode)) {
			errorMessage = t(lang, 'errCodeSixDigits');
			return;
		}
		isLoading = true;
		try {
			const data = await pinAuthApi.loginOtp({ memberId, code: otpCode });
			if (data.success && data.token && data.user) {
				sessionStorage.setItem(SET_PIN_PROMPT_AFTER_LOGIN_KEY, '1');
				await completeSession(data);
			}
		} catch (err: any) {
			const data = err?.response?.data as PinAuth.StageResult | undefined;
			errorMessage = data?.error || t(lang, 'errSomethingWrong');
			if (data?.left != null) attemptsLeft = data.left;
			otpCode = '';
		} finally {
			isLoading = false;
		}
	}

	let otpForm = $state<HTMLFormElement>();

	// Auto-submits once all 6 digits are in.
	function handleOtpInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		otpCode = target.value.replace(/\D/g, '').slice(0, 6);
		target.value = otpCode;
		if (otpCode.length === 6 && !isLoading) otpForm?.requestSubmit();
	}

	async function handleIdentify(e: Event) {
		e.preventDefault();
		if (!rawMemberId) {
			errorMessage = t(lang, 'errEnterIdFirst');
			return;
		}
		isLoading = true;
		errorMessage = '';
		attemptsLeft = null;
		try {
			const data = await pinAuthApi.identify({ memberId: `MSY-${rawMemberId}` });
			emailVerified = !!data.emailVerified;
			applyStageResult(data);
			resetFormFields();
			if (data.memberId) memberId = data.memberId;
			if (data.name) name = data.name;
			if (data.stage) stage = data.stage;
			errorMessage = data.error || '';
		} catch (err: any) {
			const data = err?.response?.data;
			if (data?.stage) {
				emailVerified = !!data.emailVerified;
				applyStageResult(data);
			} else {
				errorMessage = data?.error || data?.message || t(lang, 'errSomethingWrong');
			}
		} finally {
			isLoading = false;
		}
	}

	async function completeSession(data: PinAuth.StageResult) {
		if (data.success && data.token && data.user) {
			await authStore.loginWithPinSession(data.token, data.user);
			sessionStorage.setItem(EMAIL_PROMPT_AFTER_LOGIN_KEY, '1');
			goto(withLang(lang, '/me'));
			return true;
		}
		return false;
	}

	async function handleLoginPin(e: Event) {
		e.preventDefault();
		isLoading = true;
		errorMessage = '';
		attemptsLeft = null;
		try {
			const data = await pinAuthApi.loginPin({ memberId, pin });
			if (await completeSession(data)) return;
			applyStageResult(data);
			if (data.stage === 'changePin') {
				currentPin = '';
				newPin = '';
				confirmPin = '';
			}
		} catch (err: any) {
			const data = err?.response?.data as PinAuth.StageResult | undefined;
			if (data?.stage) applyStageResult(data);
			else errorMessage = data?.error || err?.response?.data?.message || t(lang, 'errLoginFailed');
		} finally {
			isLoading = false;
		}
	}

	async function handleBootstrap(e: Event) {
		e.preventDefault();
		errorMessage = '';
		attemptsLeft = null;
		if (newPin !== confirmPin) {
			errorMessage = t(lang, 'errPinsMismatch');
			return;
		}
		isLoading = true;
		try {
			const data = await pinAuthApi.bootstrap({
				memberId,
				dob,
				newPin,
				confirm: confirmPin
			});
			if (await completeSession(data)) return;
			applyStageResult(data);
		} catch (err: any) {
			const data = err?.response?.data as PinAuth.StageResult | undefined;
			if (data?.stage) applyStageResult(data);
			else errorMessage = data?.error || err?.response?.data?.message || t(lang, 'errCouldNotSetPin');
		} finally {
			isLoading = false;
		}
	}

	async function handleChangePin(e: Event) {
		e.preventDefault();
		errorMessage = '';
		attemptsLeft = null;
		if (newPin !== confirmPin) {
			errorMessage = t(lang, 'errPinsMismatch');
			return;
		}
		isLoading = true;
		try {
			const data = await pinAuthApi.changePin({
				memberId,
				current: currentPin,
				newPin,
				confirm: confirmPin
			});
			if (await completeSession(data)) return;
			applyStageResult(data);
		} catch (err: any) {
			const data = err?.response?.data as PinAuth.StageResult | undefined;
			if (data?.stage) applyStageResult(data);
			else
				errorMessage = data?.error || err?.response?.data?.message || t(lang, 'errCouldNotUpdatePin');
		} finally {
			isLoading = false;
		}
	}

	const displayMember = $derived(memberId ? formatMemberDisplay(name, memberId) : '');

	const MEMBER_ID_PREFIX = 'MSY-';

	function handleMemberIdInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		let val = target.value;
		if (!val.startsWith(MEMBER_ID_PREFIX)) {
			val = MEMBER_ID_PREFIX + val.replace(/\D/g, '');
		}
		const digits = val.slice(MEMBER_ID_PREFIX.length).replace(/\D/g, '');
		rawMemberId = digits;
		target.value = MEMBER_ID_PREFIX + digits;
	}

	function handleMemberIdKeydown(e: KeyboardEvent) {
		const target = e.currentTarget as HTMLInputElement;
		const cursorAtPrefix =
			target.selectionStart !== null && target.selectionStart <= MEMBER_ID_PREFIX.length;
		if ((e.key === 'Backspace' || e.key === 'Delete') && cursorAtPrefix) {
			e.preventDefault();
		}
	}

	function handleMemberIdFocus(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		if (target.selectionStart !== null && target.selectionStart < MEMBER_ID_PREFIX.length) {
			const end = target.value.length;
			target.setSelectionRange(end, end);
		}
	}

	// English → offer Gujarati (label itself in Gujarati, since that's the
	// language being offered); Gujarati → offer English, label in English.
	const langSwitchHref = $derived(
		lang === 'guj' ? page.url.pathname.replace(/^\/guj/, '') || '/' : `/guj${page.url.pathname}`
	);
	const langSwitchLabel = $derived(
		lang === 'guj' ? 'Use website in English' : 'વેબસાઇટ ગુજરાતીમાં વાપરો'
	);
</script>

{#snippet otpOption(align: 'center' | 'right' = 'center')}
	{#if emailVerified}
		<button
			type="button"
			onclick={openOtp}
			disabled={isLoading}
			class="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 {align === 'right'
				? 'ml-auto block'
				: 'w-full text-center'}"
		>
			{t(lang, 'loginWithOtp')}
		</button>
	{:else}
		<p class="text-sm text-gray-500 {align === 'right' ? 'text-right' : 'text-center'}">{t(lang, 'forgotPinContactAdmin')}</p>
	{/if}
{/snippet}

<div
	class="relative grid min-h-full grid-rows-[1fr_auto_1fr] items-center justify-items-center overflow-y-auto bg-gray-50 px-4 py-12"
>
	<!-- Same header as the home page; absolute so the card stays centered in the page. -->
	<header
		class="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-1.5 sm:px-6"
	>
		<a href={withLang(lang, '/')} class="flex min-w-0 items-center gap-1">
			<img
				src="/logos/02_Website_Logo/website-logo-symbol-512.webp"
				alt=""
				class="h-8 w-8 flex-shrink-0"
			/>
			<div class="min-w-0 leading-tight">
				<p class="text-sm font-medium text-[#2f9fb3]"><b class="text-lg">M</b>rutyu <b class="text-lg">S</b>ahay <b class="-mr-0.5 text-lg">Y</b>ojana</p>
			</div>
		</a>
		<a
			href={langSwitchHref}
			data-sveltekit-replacestate
			class="text-xs font-medium text-blue-600 hover:underline"
		>
			{langSwitchLabel}
		</a>
	</header>
	<!--
		This empty div stays in the DOM (unlike a fully commented-out node) so the
		1fr/auto/1fr grid still has its three rows and the login card below stays
		vertically centered. Only the Welcome content itself is commented out.

		<div class="w-full max-w-md self-end pb-6 text-center" style="transform: translateY(-17px);">
			<p class="mb-2 text-2xl font-bold text-blue-600">Welcome,</p>
			<p class="text-xs font-normal text-gray-800">
				શ્રી અખિલ હિંદ ભટ્ટ મેવાડા બ્રહ્મ સમાજ ફેડરેશન સંચાલિત
				<br />
				<strong class="font-bold">
					શ્રીમતી નિરંજનાબેન ભરતકુમાર ભટ્ટ સમસ્ત ભટ્ટ મેવાડા પરિવાર કલ્યાણ (મૃત્યુ સહાય) યોજના
				</strong>
				માં આપનું સ્વાગત છે 🙏
			</p>
		</div>
	-->
	<div class="w-full max-w-md self-end pb-6" style="transform: translateY(-17px);"></div>
	<div class="w-full max-w-md rounded-xl bg-white p-6 shadow-sm sm:p-8">
		<div class="mb-6 text-center">
			<img
				src="/logos/02_Website_Logo/website-logo-symbol-512.webp"
				alt="MSY"
				class="mx-auto mb-3 h-14 w-14"
			/>
			<h1 class="text-2xl font-bold text-gray-900">{t(lang, 'memberLogin')}</h1>
			{#if stage === 'pin'}
				<p class="mt-2 text-sm text-gray-600">
					{t(lang, 'welcomeBack')} <strong>{displayMember}</strong>.
				</p>
			{:else if stage === 'bootstrap'}
				<p class="mt-2 text-sm text-gray-600">
					{t(lang, 'firstLoginFor')} <strong>{displayMember}</strong>. {t(lang, 'verifyDobAndSetPin')}
				</p>
			{:else if stage === 'changePin'}
				<p class="mt-2 text-sm text-gray-600">
					{t(lang, 'pinSetByAdminNotice')}
				</p>
			{:else if stage === 'otp'}
				<p class="mt-2 text-sm text-gray-600">
					{t(lang, 'enterCodeFor')} <strong>{displayMember}</strong>.
				</p>
			{/if}
		</div>

		{#if successMessage}
			<div class="mb-4 rounded-md border border-green-200 bg-green-50 p-3">
				<p class="text-sm text-green-800">{successMessage}</p>
				{#if stage === 'otp'}
					<p class="mt-1 text-sm text-green-800">{t(lang, 'otpSentNotice')}</p>
				{/if}
			</div>
		{/if}

		{#if errorMessage}
			<div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
				<p class="text-sm text-red-800">{errorMessage}</p>
			</div>
		{/if}

		{#if attemptsLeft != null && (stage === 'pin' || stage === 'bootstrap' || stage === 'changePin' || stage === 'otp')}
			<p class="mb-4 text-sm text-amber-700">{attemptsLeft} {t(lang, 'attemptsLeft')}</p>
		{/if}

		{#if stage === 'identify'}
			<form onsubmit={handleIdentify} class="space-y-4">
				<div>
					<label for="memberId" class="mb-1 block text-sm font-medium text-gray-700">
						{t(lang, 'memberId')}
						<span class="text-red-500">*</span>
					</label>
					<input
						id="memberId"
						type="text"
						inputmode="numeric"
						value={MEMBER_ID_PREFIX + rawMemberId}
						oninput={handleMemberIdInput}
						onkeydown={handleMemberIdKeydown}
						onfocus={handleMemberIdFocus}
						onclick={handleMemberIdFocus}
						required
						class="h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-0 text-base text-gray-900 sm:h-10 sm:text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<button
					type="submit"
					disabled={isLoading}
					class="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isLoading ? t(lang, 'checking') : t(lang, 'continueLabel')}
				</button>
			</form>
		{:else if stage === 'pin'}
			<form onsubmit={handleLoginPin} class="space-y-3">
				<div class="space-y-1.5">
					<Input
						id="pin"
						label={t(lang, 'fourDigitPin')}
						type="password"
						inputmode="numeric"
						maxlength={4}
						bind:value={pin}
						required
					/>
					{@render otpOption('right')}
				</div>
				<button
					type="submit"
					disabled={isLoading}
					class="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isLoading ? t(lang, 'loggingIn') : t(lang, 'logIn')}
				</button>
			</form>
		{:else if stage === 'otp'}
			<form bind:this={otpForm} onsubmit={handleLoginOtp} class="space-y-4">
				<div>
					<label for="otpCode" class="mb-1 block text-sm font-medium text-gray-700">
						{t(lang, 'sixDigitCode')}
						<span class="text-red-500">*</span>
					</label>
					<input
						id="otpCode"
						type="text"
						inputmode="numeric"
						autocomplete="one-time-code"
						maxlength={6}
						value={otpCode}
						oninput={handleOtpInput}
						required
						class="h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-0 text-base tracking-widest text-gray-900 sm:h-10 sm:text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<button
					type="submit"
					disabled={isLoading}
					class="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isLoading ? t(lang, 'loggingIn') : t(lang, 'logIn')}
				</button>
				<div class="flex items-center">
					{#if !resendBlocked}
						<button
							type="button"
							onclick={requestOtp}
							disabled={isLoading || resendCooldown > 0}
							class="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
						>
							{resendCooldown > 0
								? t(lang, 'resendCodeInSeconds').replace('{seconds}', String(resendCooldown))
								: t(lang, 'resendCode')}
						</button>
					{/if}
					<button
						type="button"
						onclick={usePinInstead}
						class="ml-auto text-sm font-medium text-blue-600 hover:text-blue-800"
					>
						{t(lang, 'usePinInstead')}
					</button>
				</div>
			</form>
		{:else if stage === 'bootstrap'}
			<form onsubmit={handleBootstrap} class="space-y-4">
				<Input id="dob" label={t(lang, 'dateOfBirth')} type="date" bind:value={dob} required />
				<Input
					id="newPin"
					label={t(lang, 'newFourDigitPin')}
					type="password"
					inputmode="numeric"
					maxlength={4}
					bind:value={newPin}
					required
				/>
				<Input
					id="confirmPin"
					label={t(lang, 'confirmPin')}
					type="password"
					inputmode="numeric"
					maxlength={4}
					bind:value={confirmPin}
					required
				/>
				<button
					type="submit"
					disabled={isLoading}
					class="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isLoading ? t(lang, 'saving') : t(lang, 'setPinAndLogIn')}
				</button>
				{@render otpOption()}
			</form>
		{:else if stage === 'changePin'}
			<form onsubmit={handleChangePin} class="space-y-4">
				<Input
					id="currentPin"
					label={t(lang, 'temporaryPin')}
					type="password"
					inputmode="numeric"
					maxlength={4}
					bind:value={currentPin}
					required
				/>
				<Input
					id="newPinChange"
					label={t(lang, 'newFourDigitPin')}
					type="password"
					inputmode="numeric"
					maxlength={4}
					bind:value={newPin}
					required
				/>
				<Input
					id="confirmPinChange"
					label={t(lang, 'confirmPin')}
					type="password"
					inputmode="numeric"
					maxlength={4}
					bind:value={confirmPin}
					required
				/>
				<button
					type="submit"
					disabled={isLoading}
					class="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isLoading ? t(lang, 'updating') : t(lang, 'updatePin')}
				</button>
			</form>
		{:else if stage === 'admin'}
			<div class="space-y-3 text-center">
				<p class="text-gray-800">
					{t(lang, 'accountLabel')} <strong>{displayMember}</strong>
					{t(lang, 'accountNotSelfActivated')}
				</p>
				<p class="text-sm text-gray-600">
					{t(lang, 'askAdminForTempPin')}
				</p>
				{@render otpOption()}
			</div>
		{:else if stage === 'locked'}
			<div class="space-y-3 text-center">
				<p class="text-gray-800">
					{t(lang, 'accountLabel')} <strong>{displayMember}</strong> {t(lang, 'isLocked')}
				</p>
				<p class="text-sm text-gray-600">
					{t(lang, 'tooManyAttemptsNotice')}
				</p>
				{@render otpOption()}
			</div>
		{:else if stage === 'inactive'}
			<div class="space-y-3 text-center">
				<p class="text-gray-800">
					{t(lang, 'accountLabel')} <strong>{displayMember}</strong> {t(lang, 'isInactive')}
				</p>
				<p class="text-sm text-gray-600">
					{t(lang, 'membershipInactiveNotice')}
				</p>
			</div>
		{/if}

		<p class="mt-8 text-center text-xs text-gray-500">
			{t(lang, 'needHelp')}
			<a
				href="https://wa.me/919898897380?text=Hi%2C%20I%20need%20help%20with%20MSY%20Portal%20login"
				target="_blank"
				rel="noopener noreferrer"
				class="text-blue-600 hover:underline"
			>
				{t(lang, 'contactSupport')}
			</a>
		</p>
	</div>

	<!-- Empty bottom row keeps the 1fr/auto/1fr grid, so the card stays centered. -->
	<div class="w-full max-w-md self-start pt-4"></div>

	<a
		href="/admin"
		class="absolute bottom-3 right-3 text-[11px] text-gray-400 hover:text-gray-600 hover:underline"
	>
		{t(lang, 'loginToAdminPortal')}
	</a>
</div>
