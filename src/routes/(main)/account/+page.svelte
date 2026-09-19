<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import adminApi from '$lib/endpoints/adminApi';
	import { authStore } from '$lib/stores/authStore';
	import { pageTitleOverride } from '$lib/stores/pageTitleStore';
	import { formatTicketDate } from '$lib/utilities/ticketUtils';
	import { onDestroy, onMount } from 'svelte';

	const PASSWORD_ERROR =
		'Password must be at least 8 characters with at least one letter and one number.';
	const CONFIRM_ERROR = 'Passwords do not match.';

	onMount(() => pageTitleOverride.set('Account'));
	onDestroy(() => pageTitleOverride.set(null));

	// From GET /api/auth/me; name and email are null for admins created before invites.
	const admin = $derived($authStore.userAllInfo?.user);
	const adminInfo = $derived([
		{ label: 'Name', value: admin?.name || '-' },
		{ label: 'Email', value: admin?.email || '-' },
		{ label: 'Username', value: admin?.username || '-' },
		{ label: 'Role', value: admin?.role || '-' },
		{
			label: 'Member since',
			value: admin?.createdAt ? formatTicketDate(new Date(admin.createdAt).getTime()) : '-'
		}
	]);

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	let errors = $state({ currentPassword: '', newPassword: '', confirmPassword: '' });
	let formError = $state('');
	let successMessage = $state('');
	let isSubmitting = $state(false);

	const newPasswordValid = $derived(
		newPassword.length >= 8 && /[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword)
	);

	async function handleSubmit(event: Event) {
		event.preventDefault();
		errors = {
			currentPassword: currentPassword ? '' : 'Current password is required',
			newPassword: newPasswordValid ? '' : PASSWORD_ERROR,
			confirmPassword: confirmPassword === newPassword ? '' : CONFIRM_ERROR
		};
		formError = '';
		successMessage = '';
		if (errors.currentPassword || errors.newPassword || errors.confirmPassword) return;

		isSubmitting = true;
		try {
			const res = await adminApi.changePassword({ currentPassword, newPassword });
			successMessage = res.message;
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch (err: any) {
			const status = err?.response?.status ?? 0;
			const message =
				status >= 500 || !err?.response?.data?.message
					? 'Something went wrong, try again.'
					: err.response.data.message;
			if (status === 400) errors.newPassword = message;
			else if (status === 401) errors.currentPassword = message;
			else formError = message;
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="max-w-md space-y-2">
	<div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
		<h2 class="mb-2 text-sm font-semibold text-gray-900">Admin information</h2>
		<dl class="divide-y divide-gray-100">
			{#each adminInfo as item (item.label)}
				<div class="flex items-center gap-3 py-1.5 text-sm">
					<dt class="w-28 shrink-0 text-gray-500">{item.label}</dt>
					<dd class="min-w-0 truncate font-medium text-gray-900">{item.value}</dd>
				</div>
			{/each}
		</dl>
	</div>

	<div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
		<h2 class="mb-2 text-sm font-semibold text-gray-900">Change password</h2>
		<form novalidate onsubmit={handleSubmit} class="space-y-3">
			<Input
				id="current-password"
				label="Current password"
				type="password"
				size="sm"
				bind:value={currentPassword}
				error={errors.currentPassword}
				required
				disabled={isSubmitting}
			/>
			<Input
				id="new-password"
				label="New password"
				type="password"
				size="sm"
				bind:value={newPassword}
				error={errors.newPassword}
				onblur={() => (errors.newPassword = newPassword && !newPasswordValid ? PASSWORD_ERROR : '')}
				required
				disabled={isSubmitting}
			/>
			<Input
				id="confirm-new-password"
				label="Confirm new password"
				type="password"
				size="sm"
				bind:value={confirmPassword}
				error={errors.confirmPassword}
				onblur={() =>
					(errors.confirmPassword =
						confirmPassword && confirmPassword !== newPassword ? CONFIRM_ERROR : '')}
				required
				disabled={isSubmitting}
			/>

			{#if formError}
				<p class="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
					{formError}
				</p>
			{/if}
			{#if successMessage}
				<p
					class="rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs text-green-700"
				>
					{successMessage}
				</p>
			{/if}

			<div class="flex justify-end">
				<Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Changing...' : 'Change password'}
				</Button>
			</div>
		</form>
	</div>
</div>
