<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import adminApi from '$lib/endpoints/adminApi';
	import { authStore } from '$lib/stores/authStore';
	import type { AdminInvite, AdminUser } from '$lib/types/admin';
	import { formatTicketDate, parseTicketError } from '$lib/utilities/ticketUtils';
	import { Plus } from '@lucide/svelte';
	import { onMount } from 'svelte';

	function apiError(err: any, fallback: string): string {
		if ((err?.response?.status ?? 0) >= 500) return 'Something went wrong, try again.';
		return parseTicketError(err, fallback);
	}

	const tabs = [
		{ id: 'admins', label: 'Admins' },
		{ id: 'invites', label: 'Invitations' }
	];
	let activeTab = $state('admins');

	let noticeMessage = $state('');

	// ---------- Admins ----------
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
			errorMessage = apiError(err, 'Could not load admins');
		} finally {
			isLoading = false;
		}
	}

	// ---------- Delete admin ----------
	// Can't delete yourself: no Delete on the logged-in admin's row.
	const myId = $derived($authStore.userAllInfo?.user?._id);
	let deleteTarget = $state<AdminUser.Data | null>(null);
	let deleteError = $state('');
	let deleteLoading = $state(false);

	function openDelete(admin: AdminUser.Data) {
		deleteError = '';
		deleteTarget = admin;
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleteLoading = true;
		deleteError = '';
		try {
			const res = await adminApi.deleteAdmin({ id: deleteTarget._id });
			deleteTarget = null;
			noticeMessage = res.message;
			loadAdmins();
		} catch (err) {
			deleteError = apiError(err, 'Could not delete admin');
		} finally {
			deleteLoading = false;
		}
	}

	function adminActions(
		admin: AdminUser.Data
	): { label: string; onclick: () => void; danger?: boolean }[] {
		if (admin._id === myId) return [];
		return [{ label: 'Delete', danger: true, onclick: () => openDelete(admin) }];
	}

	// ---------- Invitations ----------
	let invites = $state<AdminInvite.Data[]>([]);
	let invitesLoading = $state(true);
	let invitesError = $state('');

	async function loadInvites() {
		invitesLoading = true;
		invitesError = '';
		try {
			const res = await adminApi.fetchInvites();
			invites = res.data ?? [];
		} catch (err) {
			invites = [];
			invitesError = apiError(err, 'Could not load invitations');
		} finally {
			invitesLoading = false;
		}
	}

	onMount(() => {
		loadAdmins();
		loadInvites();
	});

	async function revokeInvite(invite: AdminInvite.Data) {
		noticeMessage = '';
		invitesError = '';
		try {
			const res = await adminApi.revokeInvite({ id: invite._id });
			noticeMessage = res.message;
		} catch (err: any) {
			invitesError = apiError(err, 'Could not revoke invitation');
		} finally {
			// 404 = already accepted/revoked, so refresh either way.
			loadInvites();
		}
	}

	async function resendInvite(invite: AdminInvite.Data) {
		noticeMessage = '';
		invitesError = '';
		try {
			const res = await adminApi.sendInvite({ email: invite.email });
			noticeMessage = res.message;
			loadInvites();
		} catch (err) {
			invitesError = apiError(err, 'Could not send invitation');
		}
	}

	// ---------- Invite popup ----------
	let showInvite = $state(false);
	let inviteEmail = $state('');
	let inviteEmailError = $state('');
	let inviteError = $state('');
	let inviteLoading = $state(false);

	function openInvite() {
		inviteEmail = '';
		inviteEmailError = '';
		inviteError = '';
		showInvite = true;
	}

	async function submitInvite(event: Event) {
		event.preventDefault();
		inviteEmailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())
			? ''
			: 'Enter a valid email.';
		inviteError = '';
		if (inviteEmailError) return;

		inviteLoading = true;
		try {
			const res = await adminApi.sendInvite({ email: inviteEmail.trim() });
			showInvite = false;
			noticeMessage = res.message;
			activeTab = 'invites';
			loadInvites();
		} catch (err: any) {
			const message = apiError(err, 'Could not send invitation');
			if (err?.response?.status === 400) inviteEmailError = message;
			else inviteError = message;
		} finally {
			inviteLoading = false;
		}
	}

	// ---------- Tables ----------
	const columns = [
		{ key: 'username', label: 'Username', width: 180 },
		{ key: 'name', label: 'Name', width: 180 },
		{ key: 'email', label: 'Email', width: 220 },
		{ key: 'createdBy', label: 'Created by', width: 160 },
		{ key: 'created', label: 'Created', width: 130 }
	];

	const tableData = $derived(
		admins.map((admin) => ({
			_id: admin._id,
			username: admin.username,
			name: admin.name || '-',
			email: admin.email || '-',
			createdBy: admin.createdBy?.username ?? '-',
			created: formatTicketDate(admin.createdAt),
			raw: admin
		}))
	);

	const STATUS_BADGE: Record<AdminInvite.Status, { label: string; cls: string }> = {
		pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-800' },
		accepted: { label: 'Accepted', cls: 'bg-green-100 text-green-800' },
		revoked: { label: 'Revoked', cls: 'bg-gray-100 text-gray-700' },
		expired: { label: 'Expired', cls: 'bg-red-100 text-red-800' }
	};

	function statusBadge(status: AdminInvite.Status): string {
		const badge = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
		return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}">${badge.label}</span>`;
	}

	const inviteColumns = [
		{ key: 'email', label: 'Email', width: 240 },
		{
			key: 'status',
			label: 'Status',
			width: 120,
			render: (_value: any, row: any) => statusBadge(row.raw.status)
		},
		{ key: 'invitedBy', label: 'Invited by', width: 150 },
		{ key: 'sent', label: 'Sent', width: 130 },
		{ key: 'acceptedAs', label: 'Accepted as', width: 150 }
	];

	const inviteTableData = $derived(
		invites.map((invite) => ({
			_id: invite._id,
			email: invite.email,
			status: '',
			invitedBy: invite.invitedBy?.username ?? '-',
			sent: formatTicketDate(invite.createdAt),
			acceptedAs: invite.acceptedAdmin?.username ?? '-',
			raw: invite
		}))
	);

	function inviteActions(
		invite: AdminInvite.Data
	): { label: string; onclick: () => void; danger?: boolean }[] {
		if (invite.status === 'pending') {
			return [{ label: 'Revoke', danger: true, onclick: () => revokeInvite(invite) }];
		}
		if (invite.status === 'expired' || invite.status === 'revoked') {
			return [{ label: 'Resend', onclick: () => resendInvite(invite) }];
		}
		return [];
	}
</script>

<div class="flex h-full flex-col">
	<div class="mb-1.5 flex-shrink-0 space-y-1.5">
		<div class="flex items-center gap-3">
			<Tabs {tabs} bind:activeTab />
			<div class="ml-auto shrink-0">
				<Button variant="primary" size="sm" onclick={openInvite}>
					<div class="flex items-center justify-center gap-1.5">
						<Plus class="h-3.5 w-3.5" />
						<span>Invite admin</span>
					</div>
				</Button>
			</div>
		</div>

		{#if noticeMessage}
			<p
				class="rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs text-green-700"
			>
				{noticeMessage}
			</p>
		{/if}

		{#if activeTab === 'admins'}
			{#if !isLoading && admins.length > 0}
				<p class="px-1 text-xs text-gray-700 sm:text-sm">{admins.length} admins</p>
			{/if}

			{#if errorMessage}
				<p class="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
					{errorMessage}
				</p>
			{/if}
		{:else}
			{#if !invitesLoading && invites.length > 0}
				<p class="px-1 text-xs text-gray-700 sm:text-sm">{invites.length} invitations</p>
			{/if}

			{#if invitesError}
				<p class="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
					{invitesError}
				</p>
			{/if}
		{/if}
	</div>

	<div class="min-h-0 flex-1">
		{#if activeTab === 'admins'}
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
								<div class="flex items-center gap-1.5">
									<span class="truncate text-xs font-medium text-gray-900">{admin.username}</span>
									{#if admin.name}
										<span class="truncate text-[11px] text-gray-500">{admin.name}</span>
									{/if}
								</div>
								{#if admin.email}
									<div class="truncate text-[11px] text-gray-500">{admin.email}</div>
								{/if}
								<div class="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
									<span class="truncate">by {admin.createdBy?.username ?? '-'}</span>
									<span class="ml-auto shrink-0">{formatTicketDate(admin.createdAt)}</span>
									{#each adminActions(admin) as action}
										<button
											type="button"
											class="shrink-0 font-medium text-red-600"
											onclick={action.onclick}
										>
											{action.label}
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Desktop / tablet -->
				<div class="hidden h-full sm:block">
					<Table
						{columns}
						data={tableData}
						rowMenu={(row) => adminActions(row.raw)}
						density="compact"
					/>
				</div>
			{/if}
		{:else if invitesLoading}
			<div
				class="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm"
			>
				<div class="text-center">
					<div
						class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<p class="mt-2 text-sm text-gray-600">Loading invitations...</p>
				</div>
			</div>
		{:else if invites.length === 0}
			<div
				class="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
			>
				<h3 class="text-sm font-medium text-gray-900">No invitations yet</h3>
			</div>
		{:else}
			<!-- Mobile: dense rows -->
			<div class="h-full overflow-y-auto sm:hidden">
				<div class="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
					{#each invites as invite (invite._id)}
						{@const actions = inviteActions(invite)}
						<div class="px-2.5 py-1.5">
							<div class="flex items-center gap-1.5">
								<span class="truncate text-xs font-medium text-gray-900">{invite.email}</span>
								<span class="ml-auto shrink-0">{@html statusBadge(invite.status)}</span>
							</div>
							<div class="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
								<span class="truncate">
									by {invite.invitedBy?.username ?? '-'}
									{#if invite.acceptedAdmin}· as {invite.acceptedAdmin.username}{/if}
								</span>
								<span class="ml-auto shrink-0">{formatTicketDate(invite.createdAt)}</span>
								{#each actions as action}
									<button
										type="button"
										class="shrink-0 font-medium {action.danger
											? 'text-red-600'
											: 'text-blue-600'}"
										onclick={action.onclick}
									>
										{action.label}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Desktop / tablet -->
			<div class="hidden h-full sm:block">
				<Table
					columns={inviteColumns}
					data={inviteTableData}
					rowMenu={(row) => inviteActions(row.raw)}
					density="compact"
				/>
			</div>
		{/if}
	</div>
</div>

<Modal open={showInvite} onClose={() => (showInvite = false)} title="Invite admin">
	<form class="space-y-3" novalidate onsubmit={submitInvite}>
		<Input
			id="invite-email"
			label="Email"
			type="email"
			inputmode="email"
			bind:value={inviteEmail}
			error={inviteEmailError}
			required
		/>
		{#if inviteError}
			<p class="text-xs text-red-600">{inviteError}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<Button variant="secondary" size="sm" onclick={() => (showInvite = false)}>Cancel</Button>
			<Button variant="primary" size="sm" type="submit" disabled={inviteLoading}>
				{inviteLoading ? 'Sending...' : 'Send invitation'}
			</Button>
		</div>
	</form>
</Modal>

<Modal open={!!deleteTarget} onClose={() => (deleteTarget = null)} title="Delete admin">
	<div class="space-y-3">
		<p class="text-sm text-gray-700">
			Delete admin <span class="font-semibold text-gray-900">{deleteTarget?.username}</span>? They
			won't be able to log in.
		</p>
		{#if deleteError}
			<p class="text-xs text-red-600">{deleteError}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<Button variant="secondary" size="sm" onclick={() => (deleteTarget = null)}>Cancel</Button>
			<Button variant="danger" size="sm" onclick={confirmDelete} disabled={deleteLoading}>
				{deleteLoading ? 'Deleting...' : 'Delete'}
			</Button>
		</div>
	</div>
</Modal>
