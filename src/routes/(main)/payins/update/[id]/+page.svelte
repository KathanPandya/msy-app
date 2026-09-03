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
	import paymentApi from '$lib/endpoints/paymentApi';
	import uploadApi from '$lib/endpoints/uploadApi';
	import type { Payment } from '$lib/types/payment';
	import { formatToYYYYMMDD } from '$lib/utilities/helperFunc';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import { Search, Upload, X } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import * as Yup from 'yup';

	// Validation Schema
	const paymentDetailsSchema = Yup.object().shape({
		amount: Yup.number()
			.required('Amount is required')
			.positive('Amount must be positive')
			.typeError('Amount must be a number'),
		description: Yup.string(),
		paymentMode: Yup.string().required('Payment Mode is required'),
		paymentType: Yup.string().required('Payment Type is required'),
		receiptNumber: Yup.string(),
		paymentReference: Yup.string().required('Payment Reference Number is required'),
		paymentDate: Yup.date()
			.typeError('Payment Date is required')
			.required('Payment Date is required')
	});

	const returnTo = (page.state as any)?.returnTo || '/payins';

	let paymentData = $state<Payment.Get | null>(null);
	let memberName = $state('');
	let memberDisplayId = $state('');
	let isLoadingPayment = $state(true);
	let loadError = $state('');

	// Form Data
	let formData = $state<any>({});

	onMount(async () => {
		try {
			const paymentRes = await paymentApi.getPaymentById(page.params.id as string);
			paymentData = paymentRes.data;

			const userInfo = await coreApi.fetchUserInfo({ userId: paymentData.userId });
			memberName = userInfo.user.name;
			memberDisplayId = userInfo.user.member_id;

			formData = {
				amount: paymentData.amount,
				description: paymentData.remarks || '',
				paymentMode: paymentData.payment_mode,
				receiptNumber: paymentData.reciept_number || '',
				paymentDate: paymentData.date?.split('T')[0] || '',
				paymentType: paymentData.payment_type,
				paymentReference: (paymentData.payment_reference || '').replace(/\s+/g, ''),
				file: paymentData.photo || ''
			};
		} catch {
			loadError = 'Failed to load payment.';
		} finally {
			isLoadingPayment = false;
		}
	});

	// Errors
	let errors = $state({
		amount: '',
		description: '',
		paymentMode: '',
		receiptNumber: '',
		paymentDate: '',
		paymentType: '',
		paymentReference: '',
		file: ''
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

	function blockSpaceKey(event: KeyboardEvent) {
		if (event.key === ' ') {
			event.preventDefault();
		}
	}

	function trimPastedSpaces(event: ClipboardEvent) {
		event.preventDefault();
		const pasted = (event.clipboardData?.getData('text') ?? '').replace(/\s+/g, '');
		const input = event.target as HTMLInputElement;
		const start = input.selectionStart ?? input.value.length;
		const end = input.selectionEnd ?? input.value.length;
		const current = formData.paymentReference ?? '';
		formData.paymentReference = current.slice(0, start) + pasted + current.slice(end);
	}

	function removeImage() {
		formData.file = '';
	}

	// Submit form
	async function submitForm() {
		if (!paymentData) return;

		isLoading = true;
		successMessage = '';
		errorMessage = '';

		// Reset errors
		errors = {
			amount: '',
			description: '',
			paymentMode: '',
			receiptNumber: '',
			paymentDate: '',
			file: '',
			paymentType: '',
			paymentReference: ''
		};

		try {
			// Validate form data
			await paymentDetailsSchema.validate(formData, { abortEarly: false });

			let fileUrl: string | null = null;

			if (formData.file instanceof File) {
				// New file picked — upload it
				const formDataToSend = new FormData();
				formDataToSend.append('file', formData.file);

				const uploadResponse = await uploadApi.file({ file: formDataToSend });
				fileUrl = uploadResponse.data.fileUrl;
			} else if (typeof formData.file === 'string' && formData.file) {
				// Unchanged existing photo
				fileUrl = formData.file;
			}

			const payload: Payment.Update = {
				id: paymentData._id,
				amount: Number(formData.amount),
				date: formatToYYYYMMDD(formData.paymentDate),
				payment_reference: formData.paymentReference,
				payment_mode: formData.paymentMode,
				payment_type: formData.paymentType,
				reciept_number: formData.receiptNumber.trim() || null,
				photo: fileUrl,
				remarks: formData.description.trim() || null,
				userId: paymentData.userId
			};

			const response = await paymentApi.updatePayment({ payload });

			successMessage = response.message || 'Payment added successfully! Redirecting...';

			// Reset form after delay
			setTimeout(() => {
				goto(returnTo);
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
</script>

<div class="mx-auto max-w-5xl p-4">
	<Card title="Update Payment">
		{#if isLoadingPayment}
			<p class="text-sm text-gray-500">Loading payment...</p>
		{:else if loadError}
			<p class="text-sm text-red-600">{loadError}</p>
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<!-- Member (read-only) -->
				<div class="md:col-span-2 lg:col-span-3">
					<label for="" class="mb-1 block text-sm font-medium text-gray-700">Member</label>
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<Search class="h-5 w-5 text-gray-400" />
						</div>
						<input
							type="text"
							value={formatMemberDisplay(memberName, memberDisplayId)}
							class="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 px-3 py-2 pl-10 text-gray-500"
							disabled={true}
						/>
					</div>
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

				<!-- Receipt Number -->
				<Input
					id="receiptNumber"
					label="Receipt Number"
					bind:value={formData.receiptNumber}
					error={errors.receiptNumber}
					onblur={() => validateField('receiptNumber')}
					placeholder="Receipt Book number"
					disabled={isLoading}
				/>

				<Input
					id="paymentReference"
					label="Reference Number"
					bind:value={formData.paymentReference}
					error={errors.paymentReference}
					onblur={() => validateField('paymentReference')}
					onkeydown={blockSpaceKey}
					onpaste={trimPastedSpaces}
					placeholder="Transaction/Cheque/upi number"
					required
					disabled={isLoading}
				/>

				<!-- Description -->
				<div class="md:col-span-2 lg:col-span-3">
					<Input
						id="description"
						label="Description"
						bind:value={formData.description}
						error={errors.description}
						onblur={() => validateField('description')}
						placeholder="Payment description or notes"
						disabled={isLoading}
					/>
				</div>

				<!-- File Upload -->
				<div class="md:col-span-2 lg:col-span-3">
					<label for="file-upload" class="mb-1 block text-sm font-medium text-gray-700">
						Payment Receipt
					</label>

					{#if formData.file !== '' && typeof formData.file === 'string'}
						<ImageViewer
							{removeImage}
							src={formData.file}
							alt="Payment Receipt"
							thumbnailSize="large"
						/>
					{:else}
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
					{/if}
				</div>
			</div>

			<!-- Messages -->
			{#if errorMessage}
				<div class="mt-4 rounded-md bg-red-50 p-3">
					<p class="text-sm text-red-800">{errorMessage}</p>
				</div>
			{/if}

			{#if successMessage}
				<div class="mt-4 rounded-md bg-green-50 p-3">
					<p class="text-sm text-green-800">{successMessage}</p>
				</div>
			{/if}

			<!-- Actions -->
			<div class="mt-6 flex justify-end gap-3">
				<Button variant="success" onclick={submitForm} disabled={isLoading}>
					{#if isLoading}
						<div class="flex items-center gap-2">
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
							></div>
							<span>Saving...</span>
						</div>
					{:else}
						Update Payment
					{/if}
				</Button>
			</div>
		{/if}
	</Card>
</div>
