<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import adminApi from '$lib/endpoints/adminApi';
	import type { AdminUser } from '$lib/types/admin';
	import { formatTicketDate, parseTicketError } from '$lib/utilities/ticketUtils';
	import { Plus } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let admins = $state<AdminUser.Data[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');

	async function loadAdmins() {
		isLoading = true;
		errorMessage = '';
		try {
			const res = await adminApi.fetchAdmins();
			admins = res.data ?? [];
		} catch (err) {
			admins = [];
			errorMessage = parseTicketError(err, 'Could not load admins');
		} finally {
			isLoading = false;
		}
	}

	onMount(loadAdmins);

	// ---------- Create popup ----------
	let showCreate = $state(false);
	let username = $state('');
	let password = $state('');
	let usernameError = $state('');
	let passwordError = $state('');
	let createError = $state('');
	let createLoading = $state(false);

	function openCreate() {
		username = '';
		password = '';
		usernameError = '';
		passwordError = '';
		createError = '';
		showCreate = true;
	}

	async function submitCreate(event: Event) {
		event.preventDefault();
		usernameError = username.trim() ? '' : 'Username is required';
		passwordError = !password
			? 'Password is required'
			: password.length < 8
				? 'Password must be at least 8 characters'
				: '';
		createError = '';
		if (usernameError || passwordError) return;

		createLoading = true;
		try {
			await adminApi.createAdmin({ payload: { username: username.trim(), password } });
			showCreate = false;
			loadAdmins();
		} catch (err: any) {
			const message = parseTicketError(err, 'Could not create admin');
			if (err?.response?.status === 409) usernameError = message;
			else createError = message;
		} finally {
			createLoading = false;
		}
	}

	// ---------- Table ----------
	const columns = [
		{ key: 'username', label: 'Username', width: 220 },
		{ key: 'createdBy', label: 'Created by', width: 180 },
		{ key: 'created', label: 'Created', width: 140 }
	];

	const tableData = $derived(
		admins.map((admin) => ({
			_id: admin._id,
			username: admin.username,
			createdBy: admin.createdBy?.username ?? '-',
			created: formatTicketDate(admin.createdAt)
		}))
	);
</script>

<div class="flex h-full flex-col">
	<div class="mb-1.5 flex-shrink-0 space-y-1.5">
		<div class="flex items-center gap-3">
			<div class="ml-auto shrink-0">
				<Button variant="primary" size="sm" onclick={openCreate}>
					<div class="flex items-center justify-center gap-1.5">
						<Plus class="h-3.5 w-3.5" />
						<span>New Admin</span>
					</div>
				</Button>
			</div>
		</div>

		{#if !isLoading && admins.length > 0}
			<p class="px-1 text-xs text-gray-700 sm:text-sm">{admins.length} admins</p>
		{/if}

		{#if errorMessage}
			<p class="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
				{errorMessage}
			</p>
		{/if}
	</div>

	<div class="min-h-0 flex-1">
		{#if isLoading}
			<div
				class="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm"
			>
				<div class="text-center">
					<div
						class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<p class="mt-2 text-sm text-gray-600">Loading admins...</p>
				</div>
			</div>
		{:else if admins.length === 0}
			<div
				class="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
			>
				<h3 class="text-sm font-medium text-gray-900">No admins found</h3>
			</div>
		{:else}
			<!-- Mobile: dense rows -->
			<div class="h-full overflow-y-auto sm:hidden">
				<div class="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
					{#each admins as admin (admin._id)}
						<div class="px-2.5 py-1.5">
							<div class="truncate text-xs font-medium text-gray-900">{admin.username}</div>
							<div class="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
								<span class="truncate">by {admin.createdBy?.username ?? '-'}</span>
								<span class="ml-auto shrink-0">{formatTicketDate(admin.createdAt)}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Desktop / tablet -->
			<div class="hidden h-full sm:block">
				<Table {columns} data={tableData} density="compact" />
			</div>
		{/if}
	</div>
</div>

<Modal open={showCreate} onClose={() => (showCreate = false)} title="New admin">
	<form class="space-y-3" onsubmit={submitCreate}>
		<Input
			id="admin-username"
			label="Username"
			bind:value={username}
			error={usernameError}
			required
		/>
		<Input
			id="admin-password"
			label="Password"
			type="password"
			bind:value={password}
			error={passwordError}
			required
		/>
		{#if createError}
			<p class="text-xs text-red-600">{createError}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<Button variant="secondary" size="sm" onclick={() => (showCreate = false)}>Cancel</Button>
			<Button variant="primary" size="sm" type="submit" disabled={createLoading}>
				{createLoading ? 'Creating...' : 'Create'}
			</Button>
		</div>
	</form>
</Modal>
