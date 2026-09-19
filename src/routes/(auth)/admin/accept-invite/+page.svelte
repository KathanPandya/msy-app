<script lang="ts">
	import { afterNavigate, goto, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Input from '$lib/components/ui/Input.svelte';
	import adminInviteApi from '$lib/endpoints/adminInviteApi';

	const INVALID_MESSAGE = 'This invitation is invalid or has expired.';
	const NAME_ERROR = 'Name must be 2 to 60 characters.';
	const USERNAME_ERROR =
		'Username must be 3 to 30 lowercase letters followed by @msy, e.g. kathan@msy.';
	const PASSWORD_ERROR =
		'Password must be at least 8 characters with at least one letter and one number.';
	const CONFIRM_ERROR = 'Passwords do not match.';

	// Invite token from the emailed link: kept in memory only, never stored.
	let token = '';

	let isChecking = $state(true);
	let invalidMessage = $state('');
	let invitedEmail = $state('');

	let name = $state('');
	let usernamePart = $state('');
	let password = $state('');
	let confirmPassword = $state('');

	let errors = $state({ name: '', username: '', password: '', confirmPassword: '' });
	let formError = $state('');
	let emailExists = $state(false);
	let successMessage = $state('');
	let isSubmitting = $state(false);

	const nameValid = $derived(name.trim().length >= 2 && name.trim().length <= 60);
	const usernameValid = $derived(/^[a-z]{3,30}$/.test(usernamePart));
	const passwordValid = $derived(
		password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)
	);
	const confirmValid = $derived(confirmPassword.length > 0 && confirmPassword === password);
	const canSubmit = $derived(
		nameValid && usernameValid && passwordValid && confirmValid && !isSubmitting && !successMessage
	);

	function apiMessage(err: any): string {
		if ((err?.response?.status ?? 0) >= 500 || !err?.response?.data?.message) {
			return 'Something went wrong, try again.';
		}
		return err.response.data.message;
	}

	// afterNavigate, not onMount: replaceState throws until the router has started.
	afterNavigate(async () => {
		token = page.url.searchParams.get('token') ?? '';
		if (!token) {
			invalidMessage = INVALID_MESSAGE;
			isChecking = false;
			return;
		}
		replaceState('/admin/accept-invite', {});
		try {
			const res = await adminInviteApi.check({ token });
			invitedEmail = res.email;
		} catch (err: any) {
			if (err?.response?.status === 400) invalidMessage = err.response.data?.message || INVALID_MESSAGE;
			else formError = apiMessage(err);
		} finally {
			isChecking = false;
		}
	});

	// Only a-z, lowercased, while typing.
	function handleUsernameInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const cleaned = input.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, 30);
		input.value = cleaned;
		usernamePart = cleaned;
		if (errors.username) errors.username = '';
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		errors = {
			name: nameValid ? '' : NAME_ERROR,
			username: usernameValid ? '' : USERNAME_ERROR,
			password: passwordValid ? '' : PASSWORD_ERROR,
			confirmPassword: confirmValid ? '' : CONFIRM_ERROR
		};
		formError = '';
		emailExists = false;
		if (!canSubmit) return;

		isSubmitting = true;
		try {
			const res = await adminInviteApi.accept({
				token,
				name: name.trim(),
				username: `${usernamePart}@msy`,
				password
			});
			successMessage = res.message;
			setTimeout(() => {
				goto(`/admin?username=${encodeURIComponent(res.username)}`);
			}, 1500);
		} catch (err: any) {
			const status = err?.response?.status;
			const message = apiMessage(err);
			if (status === 400 && message === INVALID_MESSAGE) {
				invalidMessage = message;
			} else if (status === 409 && message === 'This username is already taken.') {
				errors.username = message;
			} else if (status === 409) {
				formError = message;
				emailExists = true;
			} else {
				formError = message;
			}
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="relative flex min-h-full items-center justify-center bg-gray-50 px-4 py-8">
	<div class="w-full max-w-md rounded-xl bg-white p-6 shadow-sm sm:p-8">
		<div class="mb-6 text-center">
			<h1 class="text-2xl font-bold text-gray-900">Admin invitation</h1>
			{#if invitedEmail && !invalidMessage}
				<p class="mt-2 text-sm text-gray-600">
					Invited as <span class="font-medium text-gray-900">{invitedEmail}</span>
				</p>
			{/if}
		</div>

		{#if isChecking}
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
			</div>
		{:else if invalidMessage}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
				<p class="text-sm text-red-800">{invalidMessage}</p>
				<p class="mt-1 text-sm text-red-800">Ask an admin to send a new invitation.</p>
			</div>
		{:else if !invitedEmail}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<p class="text-sm text-red-800">{formError}</p>
			</div>
		{:else}
			<form novalidate onsubmit={handleSubmit} class="space-y-5">
				<Input
					id="invite-name"
					label="Name"
					bind:value={name}
					error={errors.name}
					onblur={() => (errors.name = name && !nameValid ? NAME_ERROR : '')}
					maxlength={60}
					required
					disabled={isSubmitting}
				/>

				<div>
					<label for="invite-username" class="mb-1 block text-sm font-medium text-gray-700">
						Username<span class="text-red-500">*</span>
					</label>
					<div
						class="flex h-11 items-center overflow-hidden rounded-md border bg-white focus-within:border-transparent focus-within:ring-2 sm:h-10 {errors.username
							? 'border-red-500 focus-within:ring-red-500'
							: 'border-gray-300 focus-within:ring-blue-500'}"
					>
						<input
							id="invite-username"
							type="text"
							value={usernamePart}
							oninput={handleUsernameInput}
							onblur={() =>
								(errors.username = usernamePart && !usernameValid ? USERNAME_ERROR : '')}
							placeholder="kathan"
							autocomplete="off"
							autocapitalize="none"
							spellcheck="false"
							maxlength={30}
							required
							disabled={isSubmitting}
							class="h-full min-w-0 flex-1 bg-transparent px-3 text-base text-gray-900 focus:outline-none sm:text-sm"
						/>
						<span
							class="flex h-full items-center border-l border-gray-300 bg-gray-50 px-3 text-base text-gray-500 select-none sm:text-sm"
						>
							@msy
						</span>
					</div>
					{#if errors.username}
						<p class="mt-1 text-sm text-red-600">{errors.username}</p>
					{/if}
				</div>

				<Input
					id="invite-password"
					label="Password"
					type="password"
					bind:value={password}
					error={errors.password}
					onblur={() => (errors.password = password && !passwordValid ? PASSWORD_ERROR : '')}
					required
					disabled={isSubmitting}
				/>

				<Input
					id="invite-confirm-password"
					label="Confirm password"
					type="password"
					bind:value={confirmPassword}
					error={errors.confirmPassword}
					onblur={() =>
						(errors.confirmPassword = confirmPassword && !confirmValid ? CONFIRM_ERROR : '')}
					required
					disabled={isSubmitting}
				/>

				{#if formError}
					<div class="rounded-lg border border-red-200 bg-red-50 p-3">
						<p class="text-sm text-red-800">{formError}</p>
						{#if emailExists}
							<a href="/admin" class="mt-1 inline-block text-sm font-semibold text-blue-600">
								Go to login
							</a>
						{/if}
					</div>
				{/if}

				{#if successMessage}
					<div class="rounded-lg border border-green-200 bg-green-50 p-3">
						<p class="text-sm text-green-800">{successMessage}</p>
					</div>
				{/if}

				<button
					type="submit"
					disabled={!canSubmit}
					class="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isSubmitting}
						<div class="flex items-center gap-2">
							<div
								class="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
							></div>
							<span>Creating account...</span>
						</div>
					{:else}
						Create account
					{/if}
				</button>
			</form>
		{/if}
	</div>
</div>
