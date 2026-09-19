<script lang="ts">
	import { onMount } from 'svelte';
	import adminApi from '$lib/endpoints/adminApi';
	import type { AdminUser } from '$lib/types/admin';
	import { formatDate, getPrefillEmail } from '$lib/utilities/helperFunc';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	// profileEmail only prefills the input; the verified email is a separate record.
	let { userId, profileEmail }: { userId: string; profileEmail: string } = $props();

	let info = $state<AdminUser.EmailInfo | null>(null);
	let loadError = $state('');
	let email = $state('');
	let emailError = $state('');
	let message = $state('');
	let error = $state('');
	let busy = $state<'send' | 'mark' | null>(null);
	// Action waiting for the admin to confirm in the popup.
	let confirming = $state<'send' | 'mark' | null>(null);

	async function loadEmail() {
		loadError = '';
		try {
			info = await adminApi.fetchUserEmail({ userId });
		} catch (err: any) {
			info = null;
			loadError = err?.response?.data?.message || 'Failed to load email';
		}
	}

	onMount(() => {
		email = getPrefillEmail(profileEmail);
		loadEmail();
	});

	function methodLabel(row: AdminUser.VerifiedEmail) {
		if (row.method === 'admin') return 'marked by admin';
		return row.admin_id ? 'by admin (link)' : 'by member (link)';
	}

	function showError(err: any) {
		const status = err?.response?.status;
		const text = err?.response?.data?.message || 'Something went wrong, try again.';
		if (status === 400) emailError = text;
		else error = text;
	}

	function confirmAction() {
		const action = confirming;
		confirming = null;
		if (action === 'send') sendVerification();
		else if (action === 'mark') markVerified();
	}

	async function sendVerification() {
		busy = 'send';
		message = '';
		error = '';
		emailError = '';
		try {
			const res = await adminApi.sendUserEmailVerification({ userId, email: email.trim() });
			message = res.message;
		} catch (err: any) {
			showError(err);
		} finally {
			busy = null;
		}
	}

	async function markVerified() {
		busy = 'mark';
		message = '';
		error = '';
		emailError = '';
		try {
			const res = await adminApi.markUserEmailVerified({ userId, email: email.trim() });
			message = res.message;
			await loadEmail();
		} catch (err: any) {
			showError(err);
		} finally {
			busy = null;
		}
	}
</script>

<div class="rounded-lg bg-white p-4 shadow-sm">
	<div class="mb-3 flex items-center justify-between gap-2 border-b pb-2">
		<h2 class="text-xl font-semibold text-gray-800">Email</h2>
	</div>

	{#if loadError}
		<p class="text-sm text-red-600">{loadError}</p>
	{:else if info}
		<p class="text-sm text-gray-600">
			Verified email:
			{#if info.active}
				<span class="font-medium text-gray-900">{info.active.email}</span>
				<span class="text-gray-500">
					· {methodLabel(info.active)} · {formatDate(info.active.verified_at)}
				</span>
			{:else}
				<span class="font-medium text-gray-900">None</span>
			{/if}
		</p>
	{/if}

	<div class="mt-3 flex flex-col gap-2 md:flex-row md:items-start">
		<div class="min-w-0 flex-1">
			<Input
				id="adminVerifyEmail"
				type="email"
				inputmode="email"
				size="sm"
				placeholder="Enter email"
				bind:value={email}
				error={emailError}
			/>
		</div>
		<div class="flex flex-shrink-0 justify-end gap-2">
			<Button
				variant="secondary"
				size="sm"
				disabled={!!busy || !email.trim()}
				onclick={() => (confirming = 'send')}
			>
				{busy === 'send' ? 'Sending...' : 'Send verification link'}
			</Button>
			<Button
				variant="primary"
				size="sm"
				disabled={!!busy || !email.trim()}
				onclick={() => (confirming = 'mark')}
			>
				{busy === 'mark' ? 'Saving...' : 'Mark as verified'}
			</Button>
		</div>
	</div>

	{#if message}
		<p class="mt-2 text-sm text-green-700">{message}</p>
	{/if}
	{#if error}
		<p class="mt-2 text-sm text-red-600">{error}</p>
	{/if}

	{#if info && info.history.length > 0}
		<div class="mt-4">
			<p class="mb-1 text-sm font-medium text-gray-700">History</p>
			<ul class="divide-y divide-gray-100 rounded-md border border-gray-200">
				{#each info.history as row (row.email + row.verified_at)}
					<li class="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 py-2 text-sm">
						<span class="min-w-0 truncate font-medium text-gray-900">{row.email}</span>
						<span class="text-xs text-gray-500">
							<span
								class="mr-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium {row.status ===
								'active'
									? 'bg-green-100 text-green-800'
									: 'bg-gray-100 text-gray-600'}"
							>
								{row.status}
							</span>
							{methodLabel(row)} · verified {formatDate(row.verified_at)}
							{#if row.replaced_at}
								· replaced {formatDate(row.replaced_at)}
							{/if}
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<Modal
	open={!!confirming}
	onClose={() => (confirming = null)}
	title={confirming === 'mark' ? 'Mark as verified' : 'Send verification link'}
>
	<div class="space-y-3 text-sm">
		{#if confirming === 'mark'}
			<p class="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-amber-800">
				This marks the email as verified directly, without the member confirming it. The previous
				verified email moves to history.
			</p>
			<p class="text-gray-700">
				Email: <span class="font-medium text-gray-900">{email.trim()}</span>
			</p>
		{:else}
			<p class="text-gray-700">
				A verification link will be sent to <span class="font-medium text-gray-900"
					>{email.trim()}</span
				>.
			</p>
		{/if}
		<div class="flex justify-end gap-2 border-t border-gray-200 pt-3">
			<Button variant="secondary" size="sm" onclick={() => (confirming = null)}>Cancel</Button>
			<Button variant="primary" size="sm" onclick={confirmAction}>
				{confirming === 'mark' ? 'Mark as verified' : 'Send link'}
			</Button>
		</div>
	</div>
</Modal>
