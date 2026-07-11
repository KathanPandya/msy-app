<script lang="ts">
	import { goto } from '$app/navigation';
	import Input from '$lib/components/ui/Input.svelte';
	import pinAuthApi from '$lib/endpoints/pinAuthApi';
	import { authStore } from '$lib/stores/authStore';
	import type { PinAuth } from '$lib/types/pinAuth';
	import { formatMemberId } from '$lib/utilities/memberId';
	import { onMount } from 'svelte';

	type Stage = PinAuth.Stage | 'identify';

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
			goto('/me');
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
				errorMessage = data?.error || data?.message || 'Something went wrong.';
			}
		} finally {
			isLoading = false;
		}
	}

	async function completeSession(data: PinAuth.StageResult) {
		if (data.success && data.token && data.user) {
			await authStore.loginWithPinSession(data.token, data.user);
			goto('/me');
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
			else errorMessage = data?.error || err?.response?.data?.message || 'Login failed.';
		} finally {
			isLoading = false;
		}
	}

	async function handleBootstrap(e: Event) {
		e.preventDefault();
		isLoading = true;
		errorMessage = '';
		attemptsLeft = null;
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
			else errorMessage = data?.error || err?.response?.data?.message || 'Could not set PIN.';
		} finally {
			isLoading = false;
		}
	}

	async function handleChangePin(e: Event) {
		e.preventDefault();
		isLoading = true;
		errorMessage = '';
		attemptsLeft = null;
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
			else errorMessage = data?.error || err?.response?.data?.message || 'Could not update PIN.';
		} finally {
			isLoading = false;
		}
	}

	const displayId = $derived(memberId ? formatMemberId(memberId) : '');
</script>

<div class="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
	<div class="w-full max-w-md rounded-xl bg-white p-6 shadow-sm sm:p-8">
		<div class="mb-6 text-center">
			<h1 class="text-2xl font-bold text-gray-900">Member login</h1>
			{#if stage === 'identify'}
				<p class="mt-2 text-sm text-gray-600">Enter your member ID to continue.</p>
			{:else if stage === 'pin'}
				<p class="mt-2 text-sm text-gray-600">
					Welcome back, <strong>{name}</strong> ({displayId}).
				</p>
			{:else if stage === 'bootstrap'}
				<p class="mt-2 text-sm text-gray-600">
					First login for <strong>{name}</strong> ({displayId}). Verify your date of birth and set a
					PIN.
				</p>
			{:else if stage === 'changePin'}
				<p class="mt-2 text-sm text-gray-600">
					Your PIN was set by the admin. Please choose your own.
				</p>
			{/if}
		</div>

		{#if errorMessage}
			<div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
				<p class="text-sm text-red-800">{errorMessage}</p>
			</div>
		{/if}

		{#if attemptsLeft != null && (stage === 'pin' || stage === 'bootstrap' || stage === 'changePin')}
			<p class="mb-4 text-sm text-amber-700">{attemptsLeft} attempt(s) left.</p>
		{/if}

		{#if stage === 'identify'}
			<form onsubmit={handleIdentify} class="space-y-4">
				<Input
					id="memberId"
					label="Member ID"
					bind:value={rawMemberId}
					placeholder="MSY_1"
					required
				/>
				<button
					type="submit"
					disabled={isLoading}
					class="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isLoading ? 'Checking…' : 'Continue'}
				</button>
			</form>
		{:else if stage === 'pin'}
			<form onsubmit={handleLoginPin} class="space-y-4">
				<Input
					id="pin"
					label="4-digit PIN"
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
					{isLoading ? 'Logging in…' : 'Log in'}
				</button>
			</form>
		{:else if stage === 'bootstrap'}
			<form onsubmit={handleBootstrap} class="space-y-4">
				<Input id="dob" label="Date of birth" type="date" bind:value={dob} required />
				<Input
					id="newPin"
					label="New 4-digit PIN"
					type="password"
					inputmode="numeric"
					maxlength={4}
					bind:value={newPin}
					required
				/>
				<Input
					id="confirmPin"
					label="Confirm PIN"
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
					{isLoading ? 'Saving…' : 'Set PIN & log in'}
				</button>
			</form>
		{:else if stage === 'changePin'}
			<form onsubmit={handleChangePin} class="space-y-4">
				<Input
					id="currentPin"
					label="Temporary PIN"
					type="password"
					inputmode="numeric"
					maxlength={4}
					bind:value={currentPin}
					required
				/>
				<Input
					id="newPinChange"
					label="New 4-digit PIN"
					type="password"
					inputmode="numeric"
					maxlength={4}
					bind:value={newPin}
					required
				/>
				<Input
					id="confirmPinChange"
					label="Confirm PIN"
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
					{isLoading ? 'Updating…' : 'Update PIN'}
				</button>
			</form>
		{:else if stage === 'admin'}
			<div class="space-y-3 text-center">
				<p class="text-gray-800">
					Account <strong>{displayId}</strong> isn't set up for self-activation.
				</p>
				<p class="text-sm text-gray-600">
					Please ask the admin for a temporary PIN, then come back to log in.
				</p>
			</div>
		{:else if stage === 'locked'}
			<div class="space-y-3 text-center">
				<p class="text-gray-800">Account <strong>{displayId}</strong> is locked.</p>
				<p class="text-sm text-gray-600">
					Too many incorrect attempts. Please contact the admin to unlock it.
				</p>
			</div>
		{:else if stage === 'inactive'}
			<div class="space-y-3 text-center">
				<p class="text-gray-800">Account <strong>{displayId}</strong> is inactive.</p>
				<p class="text-sm text-gray-600">
					This membership is no longer active. Please contact the admin.
				</p>
			</div>
		{/if}

		{#if stage !== 'identify'}
			<button
				type="button"
				onclick={startOver}
				class="mt-6 w-full text-center text-sm font-medium text-blue-600 hover:text-blue-800"
			>
				← Start over
			</button>
		{/if}

		<p class="mt-8 text-center text-xs text-gray-500">
			Need help?
			<a
				href="https://wa.me/919898897380?text=Hi%2C%20I%20need%20help%20with%20MSY%20Portal%20login"
				target="_blank"
				rel="noopener noreferrer"
				class="text-blue-600 hover:underline"
			>
				Contact Support
			</a>
		</p>
	</div>

	<a
		href="/admin"
		class="absolute bottom-3 right-3 text-[11px] text-gray-400 hover:text-gray-600 hover:underline"
	>
		Login to admin portal
	</a>
</div>
