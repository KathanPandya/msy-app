<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import ImageViewer from '$lib/components/ui/ImageViewer.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { APP_CONSTANTS, getMemberStatusLabel } from '$lib/constants/app-constants';
	import coreApi from '$lib/endpoints/coreApi';
	import statusLogApi from '$lib/endpoints/statusLogApi';
	import uploadApi from '$lib/endpoints/uploadApi';
	import type { StatusLog } from '$lib/types/statusLog';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import { Upload, X } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let { userId, onStatusChanged }: { userId: string; onStatusChanged?: () => void } = $props();

	const memberStatus = APP_CONSTANTS.MEMBER_STATUS;
	// Marking a member dead is only allowed from "active" — the backend rejects
	// it otherwise, so hide the option before the user can even pick it.
	const documentTypeByStatus: Record<string, StatusLog.DocumentType> = {
		removed: 'proof_photo',
		'voluntary-retired': 'proof_photo',
		dead: 'death_certificate'
	};
	const documentLabelByStatus: Record<string, string> = {
		removed: 'Proof (Screenshot/Notice)',
		'voluntary-retired': 'Proof (Screenshot/Notice)',
		dead: 'Death Certificate'
	};

	const statusBadgeClass: Record<string, string> = {
		active: 'bg-green-100 text-green-800',
		removed: 'bg-red-100 text-red-800',
		'voluntary-retired': 'bg-yellow-100 text-yellow-800',
		dead: 'bg-gray-200 text-gray-800'
	};

	function escapeHtml(value: string): string {
		return value
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}

	function bindEl(node: HTMLInputElement, callback: (el: HTMLInputElement) => void) {
		callback(node);
	}

	const logColumns = [
		{
			key: 'status',
			label: 'Status',
			width: 140,
			render: (value: StatusLog.MemberStatus) =>
				`<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
					statusBadgeClass[value] ?? 'bg-gray-100 text-gray-800'
				}">${getMemberStatusLabel(value)}</span>`
		},
		{
			key: 'date',
			label: 'Date',
			width: 120,
			render: (value: string) => formatDate(value)
		},
		{
			key: 'reason',
			label: 'Reason',
			width: 260,
			tooltip: true
		},
		{
			key: 'document',
			label: 'Document',
			width: 120,
			render: (value: StatusLog.StatusDocument | null) =>
				value?.url
					? `<button type="button" onclick="window.openStatusDocument('${escapeHtml(value.url)}')" class="font-medium text-blue-600 hover:underline">View</button>`
					: '-'
		},
		{
			key: 'createdAt',
			label: 'Recorded On',
			width: 140,
			render: (value: string) => formatDate(value)
		}
	];

	let memberName = $state('');
	let memberIdRaw = $state('');
	let currentStatus = $state<StatusLog.MemberStatus | null>(null);
	let revertible = $state(false);
	let logs = $state<StatusLog.Entry[]>([]);
	let isLoading = $state(true);
	let loadError = $state('');

	let viewerOpen = $state(false);
	let viewerSrc = $state('');

	function openStatusDocument(url: string) {
		if (url.toLowerCase().endsWith('.pdf')) {
			window.open(url, '_blank', 'noopener,noreferrer');
			return;
		}
		viewerSrc = url;
		viewerOpen = true;
	}

	const newStatusOptions = $derived(
		currentStatus === 'active' ? memberStatus : memberStatus.filter((o) => o.key !== 'dead')
	);

	async function loadStatusLog() {
		loadError = '';
		try {
			const res = await statusLogApi.getStatusLog(userId);
			currentStatus = res.status;
			revertible = res.revertible;
			logs = res.logs;
		} catch (err: any) {
			loadError = err?.response?.data?.message || 'Failed to load status history';
		}
	}

	onMount(async () => {
		(window as any).openStatusDocument = openStatusDocument;
		if (!userId) return;
		isLoading = true;
		const userInfo = await coreApi.fetchUserInfo({ userId });
		if (userInfo?.user) {
			memberName = userInfo.user.name;
			memberIdRaw = userInfo.user.member_id;
		}
		await loadStatusLog();
		isLoading = false;
	});

	// New status form
	let showNewForm = $state(false);
	let newForm = $state({
		status: '' as StatusLog.MemberStatus | '',
		date: '',
		reason: '',
		photo: null as File | null
	});
	let newFormErrors = $state({ status: '', date: '', photo: '' });
	let newFormFileName = $state('');
	let newFormFileInput = $state(null as HTMLInputElement | null);
	let isSubmittingNew = $state(false);
	let newFormError = $state('');
	let newFormSuccess = $state('');

	function resetNewForm() {
		newForm = { status: '', date: '', reason: '', photo: null };
		newFormErrors = { status: '', date: '', photo: '' };
		newFormFileName = '';
		if (newFormFileInput) newFormFileInput.value = '';
		newFormError = '';
	}

	function handleNewFormFile(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		if (file.size > 5 * 1024 * 1024) {
			newFormErrors.photo = 'File size must be less than 5MB';
			return;
		}
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
		if (!allowedTypes.includes(file.type)) {
			newFormErrors.photo = 'Only JPG, PNG, and PDF files are allowed';
			return;
		}

		newForm.photo = file;
		newFormFileName = file.name;
		newFormErrors.photo = '';
	}

	function removeNewFormFile() {
		newForm.photo = null;
		newFormFileName = '';
		newFormErrors.photo = '';
		if (newFormFileInput) newFormFileInput.value = '';
	}

	async function submitNewStatus() {
		newFormError = '';
		newFormSuccess = '';
		newFormErrors = { status: '', date: '', photo: '' };

		if (!newForm.status) {
			newFormErrors.status = 'Status is required';
			return;
		}
		if (newForm.status === 'dead' && currentStatus !== 'active') {
			newFormErrors.status = 'Only an active member can be marked deceased';
			return;
		}
		if (!newForm.date) {
			newFormErrors.date = 'Date is required';
			return;
		}

		isSubmittingNew = true;
		try {
			let document: StatusLog.StatusDocument | null = null;
			if (newForm.photo) {
				const formDataToSend = new FormData();
				formDataToSend.append('file', newForm.photo);
				const uploadResponse = await uploadApi.file({ file: formDataToSend });
				document = {
					type: documentTypeByStatus[newForm.status],
					url: uploadResponse.data.fileUrl
				};
			}

			const res = await statusLogApi.postStatusLog(userId, {
				status: newForm.status,
				date: newForm.date,
				reason: newForm.reason || undefined,
				document
			});

			if (!res.success) {
				newFormError = res.message;
				return;
			}

			newFormSuccess = res.message || 'Status has been updated';
			resetNewForm();
			showNewForm = false;
			await loadStatusLog();
			onStatusChanged?.();
		} catch (err: any) {
			newFormError = err?.response?.data?.message || 'Something went wrong';
		} finally {
			isSubmittingNew = false;
		}
	}

	// Edit-log-entry modal (reason/document only)
	let editEntry = $state<StatusLog.Entry | null>(null);
	let editForm = $state({ reason: '', photo: null as File | null | string });
	let editFormFileName = $state('');
	let editFormFileInput = $state(null as HTMLInputElement | null);
	let isSubmittingEdit = $state(false);
	let editError = $state('');

	function startEdit(entry: StatusLog.Entry) {
		editEntry = entry;
		editForm = { reason: entry.reason || '', photo: entry.document?.url || null };
		editFormFileName = '';
		editError = '';
	}

	function closeEditModal() {
		editEntry = null;
		editError = '';
	}

	function handleEditFormFile(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		editForm.photo = file;
		editFormFileName = file.name;
	}

	function removeEditPhoto() {
		editForm.photo = null;
		editFormFileName = '';
	}

	function removeEditFormFile() {
		editForm.photo = null;
		editFormFileName = '';
		if (editFormFileInput) editFormFileInput.value = '';
	}

	async function submitEdit() {
		if (!editEntry) return;
		editError = '';
		isSubmittingEdit = true;
		try {
			let document: StatusLog.StatusDocument | null | undefined = undefined;
			if (editForm.photo instanceof File) {
				const formDataToSend = new FormData();
				formDataToSend.append('file', editForm.photo);
				const uploadResponse = await uploadApi.file({ file: formDataToSend });
				document = {
					type: editEntry.document?.type ?? documentTypeByStatus[editEntry.status] ?? 'proof_photo',
					url: uploadResponse.data.fileUrl
				};
			} else if (editForm.photo === null) {
				document = null;
			}

			const res = await statusLogApi.putStatusLog(userId, editEntry._id, {
				reason: editForm.reason,
				document
			});

			if (!res.success) {
				editError = res.message;
				return;
			}

			closeEditModal();
			await loadStatusLog();
		} catch (err: any) {
			editError = err?.response?.data?.message || 'Something went wrong';
		} finally {
			isSubmittingEdit = false;
		}
	}
</script>

{#snippet fileDropzone(props: {
	id: string;
	label: string;
	fileName: string;
	onchange: (e: Event) => void;
	onremove: () => void;
	inputRef: (el: HTMLInputElement) => void;
	disabled?: boolean;
	error?: string;
})}
	<label for={props.id} class="mb-1 block text-sm font-medium text-gray-700">
		{props.label}
	</label>

	{#if !props.fileName}
		<label
			for={props.id}
			class="flex w-full cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-gray-300 px-4 py-6 transition-colors hover:border-gray-400"
		>
			<div class="text-center">
				<Upload class="mx-auto h-8 w-8 text-gray-400" />
				<p class="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
				<p class="mt-1 text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
			</div>
		</label>
		<input
			id={props.id}
			type="file"
			class="hidden"
			accept=".jpg,.jpeg,.png,.pdf"
			onchange={props.onchange}
			use:bindEl={props.inputRef}
			disabled={props.disabled}
		/>
	{:else}
		<div class="flex items-center justify-between rounded-md border border-gray-300 bg-gray-50 px-4 py-3">
			<div class="flex items-center space-x-3">
				<Upload class="h-5 w-5 text-gray-400" />
				<span class="text-sm text-gray-900">{props.fileName}</span>
			</div>
			<button
				type="button"
				onclick={props.onremove}
				class="text-red-600 hover:text-red-800"
				disabled={props.disabled}
			>
				<X class="h-5 w-5" />
			</button>
		</div>
	{/if}

	{#if props.error}
		<p class="mt-1 text-sm text-red-600">{props.error}</p>
	{/if}
{/snippet}

<div>
	<h2 class="mb-3 text-lg font-semibold text-gray-900">
		Status History ({formatMemberDisplay(memberName, memberIdRaw)})
	</h2>
	{#if isLoading}
		<div class="flex items-center justify-center py-10">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
			></div>
		</div>
	{:else if loadError}
		<div class="rounded-md bg-red-50 p-3 text-sm text-red-800">{loadError}</div>
	{:else}
		<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium text-gray-500">Current status:</span>
				{#if currentStatus}
					<span
						class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {statusBadgeClass[
							currentStatus
						] ?? 'bg-gray-100 text-gray-800'}"
					>
						{getMemberStatusLabel(currentStatus)}
					</span>
				{:else}
					<span class="text-sm font-semibold text-gray-900">—</span>
				{/if}
			</div>
			{#if revertible}
				<Button variant="primary" size="sm" onclick={() => (showNewForm = !showNewForm)}>
					<span class="whitespace-nowrap">{showNewForm ? 'Cancel' : 'Change Status'}</span>
				</Button>
			{/if}
		</div>

		{#if !revertible}
			<div class="mb-3 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
				This member is marked deceased. Status cannot be changed further.
			</div>
		{/if}

		{#if showNewForm}
			<div class="mb-4 rounded-md border border-gray-200 p-3">
				<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
					<Select
						id="new-status"
						label="Status"
						bind:value={newForm.status}
						options={newStatusOptions}
						error={newFormErrors.status}
						required
					/>

					<Input
						id="new-date"
						label="Effective Date"
						type="date"
						bind:value={newForm.date}
						error={newFormErrors.date}
						required
						disabled={isSubmittingNew}
					/>

					<div class="md:col-span-2">
						<Input
							id="new-reason"
							label="Reason"
							bind:value={newForm.reason}
							disabled={isSubmittingNew}
						/>
					</div>

					{#if newForm.status === 'dead'}
						<div class="md:col-span-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
							Marking a member as deceased is permanent and cannot be reverted through this form.
						</div>
					{/if}

					{#if newForm.status}
						<div class="md:col-span-2">
							{@render fileDropzone({
								id: 'new-file-upload',
								label: documentLabelByStatus[newForm.status] ?? 'Document',
								fileName: newFormFileName,
								onchange: handleNewFormFile,
								onremove: removeNewFormFile,
								inputRef: (el) => (newFormFileInput = el),
								disabled: isSubmittingNew,
								error: newFormErrors.photo
							})}
						</div>
					{/if}
				</div>

				{#if newFormError}
					<div class="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{newFormError}</div>
				{/if}

				<div class="mt-3 flex justify-end">
					<Button variant="success" size="sm" onclick={submitNewStatus} disabled={isSubmittingNew}>
						{isSubmittingNew ? 'Submitting...' : 'Submit'}
					</Button>
				</div>
			</div>
		{/if}

		{#if newFormSuccess}
			<div class="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-800">{newFormSuccess}</div>
		{/if}

		<!-- History table -->
		<div style="height: {Math.min(80 + logs.length * 40, 480)}px;">
			<Table
				columns={logColumns}
				data={logs}
				naturalHeight
				density="compact"
				rowMenu={(row) => [{ label: 'Edit', onclick: () => startEdit(row) }]}
			/>
		</div>
	{/if}
</div>

<ImageViewer src={viewerSrc} alt="Document" thumbnail={false} bind:open={viewerOpen} />

<Modal open={editEntry !== null} onClose={closeEditModal} title="Edit status entry">
	{#if editEntry}
		<div class="space-y-4">
			<div class="flex items-center gap-2">
				<span
					class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {statusBadgeClass[
						editEntry.status
					] ?? 'bg-gray-100 text-gray-800'}"
				>
					{getMemberStatusLabel(editEntry.status)}
				</span>
				<span class="text-sm text-gray-500">{formatDate(editEntry.date)}</span>
			</div>
			<p class="text-xs text-gray-500">
				Only the reason and document can be edited here — the status and date for this entry are
				locked.
			</p>

			<Input id="edit-reason" label="Reason" bind:value={editForm.reason} />

			{#if typeof editForm.photo === 'string' && editForm.photo}
				<div>
					<span class="mb-1 block text-sm font-medium text-gray-700">
						{documentLabelByStatus[editEntry.status] ?? 'Document'}
					</span>
					<ImageViewer
						src={editForm.photo}
						alt="Document"
						thumbnailSize="medium"
						removeImage={removeEditPhoto}
					/>
				</div>
			{:else}
				{@render fileDropzone({
					id: 'edit-file-upload',
					label: documentLabelByStatus[editEntry.status] ?? 'Document',
					fileName: editFormFileName,
					onchange: handleEditFormFile,
					onremove: removeEditFormFile,
					inputRef: (el) => (editFormFileInput = el),
					disabled: isSubmittingEdit
				})}
			{/if}

			{#if editError}
				<p class="text-sm text-red-600">{editError}</p>
			{/if}

			<div class="flex justify-end gap-2">
				<Button variant="secondary" size="sm" onclick={closeEditModal}>Cancel</Button>
				<Button variant="success" size="sm" onclick={submitEdit} disabled={isSubmittingEdit}>
					{isSubmittingEdit ? 'Saving...' : 'Save'}
				</Button>
			</div>
		</div>
	{/if}
</Modal>
