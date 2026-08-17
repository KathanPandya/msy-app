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

	type Stage = PinAuth.Stage | 'identify';

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
	let attemptsLeft = $state<number | null>(null);
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

	function startOver() {
		stage = 'identify';
		memberId = '';
		name = '';
		rawMemberId = '';
		resetFormFields();
	}

	async function handleIdentify(e: Event) {
		e.preventDefault();
		isLoading = true;
		errorMessage = '';
		attemptsLeft = null;
		try {
			const data = await pinAuthApi.identify({ memberId: rawMemberId });
			applyStageResult(data);
			resetFormFields();
			if (data.memberId) memberId = data.memberId;
			if (data.name) name = data.name;
			if (data.stage) stage = data.stage;
			errorMessage = data.error || '';
		} catch (err: any) {
			const data = err?.response?.data;
			if (data?.stage) {
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
</script>

<div class="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
	<div class="w-full max-w-md rounded-xl bg-white p-6 shadow-sm sm:p-8">
		<div class="mb-6 text-center">
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
			{/if}
		</div>

		{#if errorMessage}
			<div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
				<p class="text-sm text-red-800">{errorMessage}</p>
			</div>
		{/if}

		{#if attemptsLeft != null && (stage === 'pin' || stage === 'bootstrap' || stage === 'changePin')}
			<p class="mb-4 text-sm text-amber-700">{attemptsLeft} {t(lang, 'attemptsLeft')}</p>
		{/if}

		{#if stage === 'identify'}
			<form onsubmit={handleIdentify} class="space-y-4">
				<Input
					id="memberId"
					label={t(lang, 'memberId')}
					bind:value={rawMemberId}
					placeholder="MSY-1"
					required
				/>
				<button
					type="submit"
					disabled={isLoading}
					class="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isLoading ? t(lang, 'checking') : t(lang, 'continueLabel')}
				</button>
			</form>
		{:else if stage === 'pin'}
			<form onsubmit={handleLoginPin} class="space-y-4">
				<Input
					id="pin"
					label={t(lang, 'fourDigitPin')}
					type="password"
					inputmode="numeric"
					maxlength={4}
					bind:value={pin}
					required
				/>
				<button
					type="submit"
					disabled={isLoading}
					class="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isLoading ? t(lang, 'loggingIn') : t(lang, 'logIn')}
				</button>
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
			</div>
		{:else if stage === 'locked'}
			<div class="space-y-3 text-center">
				<p class="text-gray-800">
					{t(lang, 'accountLabel')} <strong>{displayMember}</strong> {t(lang, 'isLocked')}
				</p>
				<p class="text-sm text-gray-600">
					{t(lang, 'tooManyAttemptsNotice')}
				</p>
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

		{#if stage !== 'identify'}
			<button
				type="button"
				onclick={startOver}
				class="mt-6 w-full text-center text-sm font-medium text-blue-600 hover:text-blue-800"
			>
				{t(lang, 'startOver')}
			</button>
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

	<a
		href="/admin"
		class="absolute bottom-3 right-3 text-[11px] text-gray-400 hover:text-gray-600 hover:underline"
	>
		{t(lang, 'loginToAdminPortal')}
	</a>
</div>
