<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import paymentApi from '$lib/endpoints/paymentApi';
	import uploadApi from '$lib/endpoints/uploadApi';
	import { memberListStore } from '$lib/stores/memberListStore';
	import type { Payment } from '$lib/types/payment';
	import { formatToYYYYMMDD } from '$lib/utilities/helperFunc';
	import { ChevronDown, Search, Upload, X } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import * as Yup from 'yup';

	// Validation Schema
	const paymentDetailsSchema = Yup.object().shape({
		memberId: Yup.string().required('Member is required'),
		amount: Yup.number()
			.required('Amount is required')
			.positive('Amount must be positive')
			.typeError('Amount must be a number'),
		description: Yup.string().required('Description is required'),
		paymentMode: Yup.string().required('Payment Mode is required'),
		paymentType: Yup.string().required('Payment Type is required'),
		referenceNumber: Yup.string().required('Reference Number is required'),
		receiptNumber: Yup.string().required('Receipt Number is required'),
		paymentDate: Yup.date()
			.typeError('Payment Date is required')
			.required('Payment Date is required')
	});

	// Load members on mount
	onMount(() => {
		if ($memberListStore.members.length === 0) {
			memberListStore.fetchAllMembers();
		}
	});

	// Form Data
	let formData = $state({
		memberId: '',
		memberName: '',
		amount: '',
		description: '',
		paymentMode: '',
		referenceNumber: '',
		paymentDate: '',
		paymentType: '',
		receiptNumber: '',
		file: null as File | null
	});

	// Errors
	let errors = $state({
		memberId: '',
		amount: '',
		description: '',
		paymentMode: '',
		referenceNumber: '',
		paymentDate: '',
		paymentType: '',
		receiptNumber: '',
		file: ''
	});

	// Member dropdown state
	let memberSearchQuery = $state('');
	let showMemberDropdown = $state(false);
	let memberDropdownRef: HTMLDivElement;

	// Filtered members based on search
	const filteredMembers = $derived(
		$memberListStore.members.filter((member) => {
			const searchLower = memberSearchQuery.toLowerCase();
			const fullName = `${member.first_name} ${member.surname}`.toLowerCase();
			const mobile = member.mobile || '';
			return fullName.includes(searchLower) || mobile.includes(searchLower);
		})
	);

	// Select member
	function selectMember(member: any) {
		// debugger
		formData.memberId = member._id;
		formData.memberName = `${member.first_name} ${member.surname}`;
		memberSearchQuery = formData.memberName;
		showMemberDropdown = false;
		errors.memberId = '';
	}

	// Clear member selection
	function clearMemberSelection() {
		formData.memberId = '';
		formData.memberName = '';
		memberSearchQuery = '';
	}

	// Click outside to close dropdown
	function handleClickOutside(event: MouseEvent) {
		if (memberDropdownRef && !memberDropdownRef.contains(event.target as Node)) {
			showMemberDropdown = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	// Loading state
	let isLoading = $state(false);

	// Success/Error messages
	let successMessage = $state('');
	let errorMessage = $state('');

	const paymentModes = APP_CONSTANTS.PAYMENT_MODES;
	const paymentTypes = APP_CONSTANTS.PAYMENT_TYPES;

	// File handling
	let fileInput = $state(null as HTMLInputElement | null);
	let fileName = $state('');

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			// Validate file size (5MB max)
			if (file.size > 5 * 1024 * 1024) {
				errors.file = 'File size must be less than 5MB';
				formData.file = null;
				fileName = '';
				return;
			}

			// Validate file type
			const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
			if (!allowedTypes.includes(file.type)) {
				errors.file = 'Only JPG, PNG, and PDF files are allowed';
				formData.file = null;
				fileName = '';
				return;
			}

			formData.file = file;
			fileName = file.name;
			errors.file = '';
		}
	}

	function removeFile() {
		formData.file = null;
		fileName = '';
		errors.file = '';
		if (fileInput) fileInput.value = '';
	}

	// Validate individual field
	async function validateField(field: keyof typeof errors) {
		if (field === 'file') return; // Skip file validation here

		try {
			await paymentDetailsSchema.validateAt(field, formData);
			errors[field] = '';
		} catch (err: any) {
			errors[field] = err?.message || 'Invalid';
		}
	}

	// Handle member search input
	function handleMemberSearch(event: Event) {
		const target = event.target as HTMLInputElement;
		memberSearchQuery = target.value;
		showMemberDropdown = true;

		// Clear selection if user types
		if (formData.memberId) {
			formData.memberId = '';
			formData.memberName = '';
		}
	}

	// Submit form
	async function submitForm() {
		isLoading = true;
		successMessage = '';
		errorMessage = '';

		// Reset errors
		errors = {
			amount: '',
			description: '',
			paymentMode: '',
			referenceNumber: '',
			paymentDate: '',
			file: '',
			memberId: '',
			paymentType: '',
			receiptNumber: ''
		};

		try {
			// Validate form data
			await paymentDetailsSchema.validate(formData, { abortEarly: false });

			let fileUrl = '';

			// Check if file is uploaded
			if (formData.file) {
				console.log(formData.file);
				const formDataToSend = new FormData();
				formDataToSend.append('file', formData.file);

				const uploadResponse = await uploadApi.file({ file: formDataToSend });
				fileUrl = uploadResponse.data.fileUrl;
				// errors.file = 'Payment receipt is required';
				// errorMessage = 'Please upload a payment receipt';
				// return;
			}

			const payload: Payment.Create = {
				amount: formData.amount,
				date: formatToYYYYMMDD(formData.paymentDate),
				payment_reference: formData.referenceNumber,
				payment_mode: formData.paymentMode,
				payment_type: formData.paymentType,
				reciept_number: formData.receiptNumber,
				photo: fileUrl,
				remarks: formData.description,
				userId: formData.memberId
			};

			const response = await paymentApi.addPayment({ payload });

			successMessage = response.message || 'Payment added successfully! Redirecting...';

			// Reset form after delay
			setTimeout(() => {
				resetForm();
				goto('/payins'); // Or wherever you want to redirect
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
		formData = {
			memberId: '',
			memberName: '',
			amount: '',
			description: '',
			paymentMode: '',
			referenceNumber: '',
			paymentDate: '',
			paymentType: '',
			file: null,
			receiptNumber: ''
		};
		errors = {
			memberId: '',
			amount: '',
			description: '',
			paymentMode: '',
			referenceNumber: '',
			paymentDate: '',
			paymentType: '',
			file: '',
			receiptNumber: ''
		};
		memberSearchQuery = '';
		fileName = '';
		if (fileInput) fileInput.value = '';
		successMessage = '';
		errorMessage = '';
	}
</script>

<div class="mx-auto max-w-3xl p-6">
	<Card title="Add Payment">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Member Selection with Search -->
			<div class="md:col-span-2">
				<label for="" class="mb-1 block text-sm font-medium text-gray-700">
					Member
					<span class="text-red-500">*</span>
				</label>

				<div class="relative" bind:this={memberDropdownRef}>
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<Search class="h-5 w-5 text-gray-400" />
						</div>
						<input
							type="text"
							value={memberSearchQuery}
							oninput={handleMemberSearch}
							onfocus={() => (showMemberDropdown = true)}
							placeholder="Search member by name or mobile..."
							class={`w-full rounded-md border px-3 py-2 pr-10 pl-10 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none ${
								errors.memberId ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
							} ${
								isLoading
									? 'cursor-not-allowed bg-gray-100 text-gray-500'
									: 'bg-white text-gray-900'
							}`}
							disabled={isLoading}
						/>
						{#if formData.memberId}
							<button
								type="button"
								onclick={clearMemberSelection}
								class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
							>
								<X class="h-5 w-5" />
							</button>
						{:else}
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
								<ChevronDown class="h-5 w-5 text-gray-400" />
							</div>
						{/if}
					</div>

					<!-- Dropdown -->
					{#if showMemberDropdown && !isLoading}
						<div
							class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg"
						>
							{#if $memberListStore.isLoading}
								<div class="px-4 py-3 text-center text-sm text-gray-500">Loading members...</div>
							{:else if filteredMembers.length === 0}
								<div class="px-4 py-3 text-center text-sm text-gray-500">No members found</div>
							{:else}
								{#each filteredMembers as member}
									<button
										type="button"
										onclick={() => selectMember(member)}
										class="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
									>
										<div class="font-medium text-gray-900">
											{member.first_name}
											{member.surname}
										</div>
										<div class="text-sm text-gray-500">
											{member.mobile} • {member.email}
										</div>
									</button>
								{/each}
							{/if}
						</div>
					{/if}
				</div>

				{#if errors.memberId}
					<p class="mt-1 text-sm text-red-600">{errors.memberId}</p>
				{/if}
			</div>

			<!-- Amount -->
			<Input
				id="amount"
				label="Amount"
				type="number"
				bind:value={formData.amount}
				error={errors.amount}
				onblur={() => validateField('amount')}
				placeholder="Enter amount"
				required
				disabled={isLoading}
			/>

			<!-- Payment Date -->
			<Input
				id="paymentDate"
				label="Payment Date"
				type="date"
				bind:value={formData.paymentDate}
				error={errors.paymentDate}
				onblur={() => validateField('paymentDate')}
				required
				disabled={isLoading}
			/>

			<!-- Payment Mode -->
			<Select
				id="paymentMode"
				label="Payment Mode"
				bind:value={formData.paymentMode}
				options={paymentModes}
				error={errors.paymentMode}
				onchange={() => validateField('paymentMode')}
				required
				disabled={isLoading}
			/>

			<!-- Payment Type -->
			<Select
				id="paymentType"
				label="Payment Type"
				bind:value={formData.paymentType}
				options={paymentTypes}
				error={errors.paymentType}
				onchange={() => validateField('paymentType')}
				required
				disabled={isLoading}
			/>

			<!-- Reference Number -->
			<Input
				id="referenceNumber"
				label="Reference Number"
				bind:value={formData.referenceNumber}
				error={errors.referenceNumber}
				onblur={() => validateField('referenceNumber')}
				placeholder="Transaction/Cheque number"
				required
				disabled={isLoading}
			/>

			<Input
				id="receiptNumber"
				label="Receipt Number"
				bind:value={formData.receiptNumber}
				error={errors.receiptNumber}
				onblur={() => validateField('receiptNumber')}
				placeholder="Receipt book number"
				required
				disabled={isLoading}
			/>

			<!-- Description -->
			<div class="md:col-span-2">
				<Input
					id="description"
					label="Description"
					bind:value={formData.description}
					error={errors.description}
					onblur={() => validateField('description')}
					placeholder="Payment description or notes"
					required
					disabled={isLoading}
				/>
			</div>

			<!-- File Upload -->
			<div class="md:col-span-2">
				<label for="file-upload" class="mb-1 block text-sm font-medium text-gray-700">
					Payment Receipt
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

				{#if errors.file}
					<p class="mt-1 text-sm text-red-600">{errors.file}</p>
				{/if}
			</div>
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
			<Button variant="secondary" onclick={resetForm} disabled={isLoading}>Reset</Button>
			<Button variant="success" onclick={submitForm} disabled={isLoading}>
				{#if isLoading}
					<div class="flex items-center gap-2">
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
						></div>
						<span>Saving...</span>
					</div>
				{:else}
					Add Payment
				{/if}
			</Button>
		</div>
	</Card>
</div>
