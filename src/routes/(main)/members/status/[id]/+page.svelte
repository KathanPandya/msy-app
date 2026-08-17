<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ImageViewer from '$lib/components/ui/ImageViewer.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import coreApi from '$lib/endpoints/coreApi';
	import deadMemberApi from '$lib/endpoints/deadMemberApi';
	import uploadApi from '$lib/endpoints/uploadApi';
	import userApi from '$lib/endpoints/userApi';
	import type { DeadMember } from '$lib/types/deadMember';
	import type { User } from '$lib/types/user';
	import { formatToYYYYMMDD } from '$lib/utilities/helperFunc';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import { formatString } from '$lib/utilities/stringUtils';
	import { Upload, X } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import * as Yup from 'yup';

	// Validation Schema
	const statusUpdateSchema = Yup.object().shape({
		userId: Yup.string().required('Member is required'),
		status: Yup.string()
			.oneOf(['active', 'removed', 'voluntary-retired', 'dead'])
			.required('Status is required'),

		// Simple condition: single value
		date: Yup.date().when('status', {
			is: (val: any) => ['removed', 'voluntary-retired', 'dead'].includes(val),
			then: (s) => s.required('Date is required'),
			otherwise: (s) => s.notRequired()
		}),

		// Multiple values condition
		reason: Yup.string().when('status', {
			is: (val: any) => ['removed', 'voluntary-retired', 'dead'].includes(val),
			then: (s) => s.required('Reason is required'),
			otherwise: (s) => s.notRequired()
		}),

		contribution_amount: Yup.number().when('status', {
			is: 'dead',
			then: (s) => s.required('Contribution Amount is required'),
			otherwise: (s) => s.notRequired()
		})
	});

	const memberStatus = APP_CONSTANTS.MEMBER_STATUS;
	const getDateLabel: Record<string, string> = {
		dead: 'Death',
		removed: 'Removal',
		'voluntary-retired': 'Retirement'
	};

	// Load current member on mount
	onMount(async () => {
		const userId = page.params.id;
		if (!userId) return;

		const userInfo = await coreApi.fetchUserInfo({ userId });
		const member = userInfo?.user;
		if (member) {
			currentMember = member;
			formData.status = currentMember.status;
			formData.userId = currentMember._id;
			if (currentMember.status === 'removed' || currentMember.status === 'voluntary-retired') {
				if (currentMember.status_details) {
					formData.reason = currentMember.status_details.remarks;
					formData.date = formatString(currentMember.status_details.date?.split('T')[0], ['trim']);
					formData.photo = currentMember.status_details.photo_url;
				}
			}

			if (currentMember.status === 'dead') {
				const res = await deadMemberApi.getAllDeadMembers();
				const deadMemberDetail = res.data.find((detail) => detail.userId === currentMember?._id);
				if (deadMemberDetail) {
					deadMemberId = deadMemberDetail._id;
					formData.contribution_amount = String(deadMemberDetail.contribution_amount);
					formData.reason = deadMemberDetail.remarks;
					formData.date = formatString(deadMemberDetail.date_of_death?.split('T')[0], ['trim']);
					formData.photo = deadMemberDetail.death_certificate;
				}
			}
		}
	});

	let deadMemberId = $state('');
	let currentMember = $state<User.Get>();

	// Form Data
	let formData = $state({
		userId: '',
		memberName: '',
		status: '',
		date: '',
		contribution_amount: '100',
		reason: '',
		photo: null as File | null | string
	});

	// Errors
	let errors = $state({
		userId: '',
		date: '',
		status: '',
		contribution_amount: '',
		reason: '',
		photo: ''
	});

	function removeImage() {
		formData.photo = '';
	}

	// Loading state
	let isLoading = $state(false);

	// Success/Error messages
	let successMessage = $state('');
	let errorMessage = $state('');

	// File handling
	let fileInput = $state(null as HTMLInputElement | null);
	let fileName = $state('');

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			// Validate file size (5MB max)
			if (file.size > 5 * 1024 * 1024) {
				errors.photo = 'File size must be less than 5MB';
				formData.photo = null;
				fileName = '';
				return;
			}

			// Validate file type
			const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
			if (!allowedTypes.includes(file.type)) {
				errors.photo = 'Only JPG, PNG, and PDF files are allowed';
				formData.photo = null;
				fileName = '';
				return;
			}

			formData.photo = file;
			fileName = file.name;
			errors.photo = '';
		}
	}

	function removeFile() {
		formData.photo = null;
		fileName = '';
		errors.photo = '';
		if (fileInput) fileInput.value = '';
	}

	// Validate individual field
	async function validateField(field: keyof typeof errors) {
		if (field === 'photo') return; // Skip file validation here

		try {
			await statusUpdateSchema.validateAt(field, formData);
			errors[field] = '';
		} catch (err: any) {
			errors[field] = err?.message || 'Invalid';
		}
	}

	// Submit form
	async function submitForm() {
		if (!currentMember) {
			errorMessage = 'Current Member Not Found';
			return;
		}

		isLoading = true;
		successMessage = '';
		errorMessage = '';

		// Reset errors
		errors = {
			userId: '',
			date: '',
			status: '',
			contribution_amount: '',
			photo: '',
			reason: ''
		};

		try {
			// Validate form data
			await statusUpdateSchema.validate(formData, { abortEarly: false });
			let fileUrl = '';

			// Check if file is uploaded
			if (['removed', 'voluntary-retired', 'dead'].includes(formData.status)) {
				if (!formData.photo) {
					errors.photo = 'Photo proof is required';
					errorMessage = 'Please upload photo for proof';
					return;
				}

				if (typeof formData.photo === 'string') {
					fileUrl = formData.photo;
				} else {
					// Upload
					const formDataToSend = new FormData();
					formDataToSend.append('file', formData.photo);

					const uploadResponse = await uploadApi.file({ file: formDataToSend });
					fileUrl = uploadResponse.data.fileUrl;
				}
			}
			let apiRes;

			if (currentMember.status === 'dead') {
				let payload: DeadMember.Create | DeadMember.Update = {
					userId: formData.userId,
					date_of_death: formData.date,
					death_certificate: fileUrl,
					remarks: formData.reason,
					contribution_amount: Number(formData.contribution_amount)
				};

				if (deadMemberId) {
					payload = { ...payload, id: deadMemberId };
					apiRes = await deadMemberApi.updateDeadMember({
						payload: payload as DeadMember.Update
					});
				} else {
					apiRes = await deadMemberApi.changeMemberStatusToDead({
						payload: payload
					});
				}
			} else {
				const s_details =
					formData.status === 'active'
						? null
						: {
								date: formatToYYYYMMDD(formData.date),
								photo_url: fileUrl,
								remarks: formData.reason,
								contribution_amount: null
							};

				apiRes = await userApi.updateUser({
					userId: formData.userId,
					payload: {
						first_name: currentMember.first_name,
						middle_name: currentMember.middle_name,
						surname: currentMember.surname,
						status: currentMember.status,
						date_of_birth: formatToYYYYMMDD(currentMember.date_of_birth),
						gender: currentMember.gender,
						mobile: currentMember.mobile,
						email: currentMember.email,
						reference_member_1: currentMember.reference_member_1,
						reference_member_2: currentMember.reference_member_2,
						entry_date: formatToYYYYMMDD(currentMember.entry_date),
						status_details: s_details
					}
				});
			}

			if (apiRes.success) {
				successMessage = 'Member Status changed successfully! Redirecting...';
			} else {
				errorMessage = apiRes.message;
				return;
			}

			// Reset form after delay
			setTimeout(() => {
				resetForm();
				goto(`/members/view/${currentMember?._id}`);
			}, 1500);
		} catch (err: any) {
			if (err.inner && Array.isArray(err.inner)) {
				err.inner.forEach((e: any) => {
					if (e.path && e.path in errors) {
						errors[e.path as keyof typeof errors] = e.message;
					}
				});
			}
			errorMessage = 'Please fix the errors above';

			if (err.response) {
				errorMessage = err.response.data?.message || 'Request failed';
				return;
			}

			errorMessage = 'Something went wrong';

			// Scroll to first error
			setTimeout(() => {
				const firstErr = document.querySelector('.text-red-600');
				if (firstErr) {
					firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}, 100);
		} finally {
			isLoading = false;
		}
	}

	// Reset form
	function resetForm() {
		if (currentMember) {
			formData = {
				userId: currentMember._id,
				memberName: currentMember.name,
				status: currentMember.status,
				date: '',
				contribution_amount: '',
				photo: null,
				reason: ''
			};
		} else {
			console.log('Error while reseting Form');
		}
		errors = {
			userId: '',
			date: '',
			contribution_amount: '',
			status: '',
			photo: '',
			reason: ''
		};
		fileName = '';
		if (fileInput) fileInput.value = '';
		successMessage = '';
		errorMessage = '';
	}
</script>

<div class="mx-auto max-w-3xl p-6">
	<Card
		title={`Update User Status (${formatMemberDisplay(
			currentMember?.name,
			currentMember?.member_id
		)})`}
	>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Current Member -->
			<div class="md:col-span-2">
				<p class="mb-1 block text-sm font-medium text-gray-700">Member</p>
				<div class="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900">
					{formatMemberDisplay(currentMember?.name, currentMember?.member_id)}
				</div>
			</div>

			<Select
				id="status"
				label="Status"
				bind:value={formData.status}
				options={memberStatus}
				error={errors.status}
				onchange={() => validateField('status')}
			/>

			<!-- Date of Death -->
			{#if formData.status !== 'active'}
				<Input
					id="date"
					label={`Date of ${getDateLabel[formData.status]}`}
					type="date"
					bind:value={formData.date}
					error={errors.date}
					onblur={() => validateField('date')}
					required
					disabled={isLoading}
				/>

				<div class="md:col-span-2">
					<Input
						id="reason"
						label="Reason"
						bind:value={formData.reason}
						error={errors.reason}
						onblur={() => validateField('reason')}
						required
						disabled={isLoading}
					/>
				</div>
			{/if}

			<!-- Contribution Amount -->

			{#if formData.status == 'dead'}
				<Input
					id="contribution_amount"
					label="Contribution Amount"
					type="number"
					bind:value={formData.contribution_amount}
					error={errors.contribution_amount}
					onblur={() => validateField('contribution_amount')}
					placeholder="Enter amount"
					required
					disabled={isLoading}
				/>
			{/if}

			<!-- Death Certificate Upload -->

			{#if typeof formData.photo === 'string' && formData.photo !== ''}
				<div class="md:col-span-2">
					<label for="file-upload" class="mb-1 block text-sm font-medium text-gray-700">
						{formData.status === 'dead' ? 'Death Certificate' : 'Proof (Screenshot/Notice)'}
						<span class="text-red-500">*</span>
					</label>
					<ImageViewer {removeImage} src={formData.photo} alt="Proof Pic" thumbnailSize="large" />
				</div>
			{:else if formData.status !== 'active'}
				<div class="md:col-span-2">
					<label for="file-upload" class="mb-1 block text-sm font-medium text-gray-700">
						{formData.status === 'dead' ? 'Death Certificate' : 'Proof (Screenshot/Notice)'}
						<span class="text-red-500">*</span>
					</label>

					<div class="mt-1">
						{#if !fileName}
							<label
								for="file-upload"
								class="flex w-full cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-gray-300 px-4 py-6 transition-colors hover:border-gray-400"
							>
								<div class="text-center">
									<Upload class="mx-auto h-8 w-8 text-gray-400" />
									<p class="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
									<p class="mt-1 text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
								</div>
							</label>
							<input
								id="file-upload"
								type="file"
								class="hidden"
								accept=".jpg,.jpeg,.png,.pdf"
								onchange={handleFileChange}
								bind:this={fileInput}
								disabled={isLoading}
							/>
						{:else}
							<div
								class="flex items-center justify-between rounded-md border border-gray-300 bg-gray-50 px-4 py-3"
							>
								<div class="flex items-center space-x-3">
									<Upload class="h-5 w-5 text-gray-400" />
									<span class="text-sm text-gray-900">{fileName}</span>
								</div>
								<button
									type="button"
									onclick={removeFile}
									class="text-red-600 hover:text-red-800"
									disabled={isLoading}
								>
									<X class="h-5 w-5" />
								</button>
							</div>
						{/if}
					</div>

					{#if errors.photo}
						<p class="mt-1 text-sm text-red-600">{errors.photo}</p>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Messages -->
		{#if errorMessage}
			<div class="mt-4 rounded-md bg-red-50 p-4">
				<p class="text-sm text-red-800">{errorMessage}</p>
			</div>
		{/if}

		{#if successMessage}
			<div class="mt-4 rounded-md bg-green-50 p-4">
				<p class="text-sm text-green-800">{successMessage}</p>
			</div>
		{/if}

		<!-- Actions -->
		<div class="mt-6 flex justify-end gap-3">
			<!-- <Button variant="secondary" onclick={resetForm} disabled={isLoading}>Reset</Button> -->
			<Button variant="success" onclick={submitForm} disabled={isLoading}>
				{#if isLoading}
					<div class="flex items-center gap-2">
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
						></div>
						<span>Submitting...</span>
					</div>
				{:else}
					Update Status
				{/if}
			</Button>
		</div>
	</Card>
</div>
