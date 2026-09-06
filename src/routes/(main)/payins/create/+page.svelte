<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import paymentApi from '$lib/endpoints/paymentApi';
	import uploadApi from '$lib/endpoints/uploadApi';
	import { memberListStore } from '$lib/stores/memberListStore';
	import type { Payment } from '$lib/types/payment';
	import { formatToYYYYMMDD } from '$lib/utilities/helperFunc';
	import { formatMemberDisplay, memberIdDigits } from '$lib/utilities/memberId';
	import {
		Check,
		ChevronDown,
		Copy,
		MoreVertical,
		Plus,
		Search,
		Trash2,
		Upload,
		X
	} from '@lucide/svelte';
	import { onMount } from 'svelte';
	import * as Yup from 'yup';

	// Validation Schema (applied per payment entry)
	const paymentDetailsSchema = Yup.object().shape({
		memberId: Yup.string().required('Member is required'),
		amount: Yup.number()
			.required('Amount is required')
			.positive('Amount must be positive')
			.typeError('Amount must be a number'),
		description: Yup.string(),
		paymentMode: Yup.string().required('Payment Mode is required'),
		paymentType: Yup.string().required('Payment Type is required'),
		referenceNumber: Yup.string().required('Reference Number is required'),
		receiptNumber: Yup.string(),
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

	function emptyEntry() {
		return {
			memberId: '',
			memberName: '',
			amount: '',
			description: '-',
			paymentMode: 'upi',
			referenceNumber: '',
			paymentDate: formatToYYYYMMDD(Date().toString()),
			paymentType: 'msy_contribution',
			receiptNumber: '',
			file: null as File | null,
			memberSearchQuery: '',
			showMemberDropdown: false,
			fileName: '',
			menuOpen: false
		};
	}

	function emptyErrors() {
		return {
			memberId: '',
			amount: '',
			description: '',
			paymentMode: '',
			referenceNumber: '',
			paymentDate: '',
			paymentType: '',
			receiptNumber: '',
			file: ''
		};
	}

	function emptyStatus() {
		return { isCreating: false, isCreated: false, error: '' };
	}

	// One or more payment entries, all submitted together
	let entries = $state([emptyEntry()]);
	let errors = $state([emptyErrors()]);
	let submitStatus = $state([emptyStatus()]);

	let memberDropdownRefs: (HTMLDivElement | null)[] = [];
	let fileInputs: (HTMLInputElement | null)[] = [];
	let menuRefs: (HTMLDivElement | null)[] = [];

	function filteredMembersFor(query: string) {
		const searchLower = query.toLowerCase();
		return $memberListStore.members
			.filter((member) => {
				const fullName = (member.name || '').toLowerCase();
				const member_id = (member.member_id ?? '').toLowerCase();
				return fullName.includes(searchLower) || member_id.includes(searchLower);
			})
			.sort((a, b) => (memberIdDigits(a.member_id) ?? 0) - (memberIdDigits(b.member_id) ?? 0));
	}

	// Select member
	function selectMember(index: number, member: any) {
		entries[index].memberId = member._id;
		entries[index].memberName = member.name;
		entries[index].memberSearchQuery = formatMemberDisplay(member.name, member.member_id);
		entries[index].showMemberDropdown = false;
		errors[index].memberId = '';
	}

	// Clear member selection
	function clearMemberSelection(index: number) {
		entries[index].memberId = '';
		entries[index].memberName = '';
		entries[index].memberSearchQuery = '';
	}

	// Click outside to close dropdowns/menus
	function handleClickOutside(event: MouseEvent) {
		memberDropdownRefs.forEach((ref, index) => {
			if (ref && !ref.contains(event.target as Node)) {
				entries[index].showMemberDropdown = false;
			}
		});
		menuRefs.forEach((ref, index) => {
			if (ref && !ref.contains(event.target as Node)) {
				entries[index].menuOpen = false;
			}
		});
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	// Create-all state
	let isCreatingAll = $state(false);
	let showCreateAllModal = $state(false);
	const isLoading = $derived(isCreatingAll);

	const paymentModes = APP_CONSTANTS.PAYMENT_MODES;
	const paymentTypes = APP_CONSTANTS.PAYMENT_TYPES;

	function handleFileChange(index: number, event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			if (file.size > 5 * 1024 * 1024) {
				errors[index].file = 'File size must be less than 5MB';
				entries[index].file = null;
				entries[index].fileName = '';
				return;
			}

			const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
			if (!allowedTypes.includes(file.type)) {
				errors[index].file = 'Only JPG, PNG, and PDF files are allowed';
				entries[index].file = null;
				entries[index].fileName = '';
				return;
			}

			entries[index].file = file;
			entries[index].fileName = file.name;
			errors[index].file = '';
		}
	}

	function removeFile(index: number) {
		entries[index].file = null;
		entries[index].fileName = '';
		errors[index].file = '';
		const input = fileInputs[index];
		if (input) input.value = '';
	}

	// Validate individual field
	async function validateField(index: number, field: keyof ReturnType<typeof emptyErrors>) {
		if (field === 'file') return; // Skip file validation here

		try {
			await paymentDetailsSchema.validateAt(field, entries[index]);
			errors[index][field] = '';
		} catch (err: any) {
			errors[index][field] = err?.message || 'Invalid';
		}
	}

	function blockSpaceKey(event: KeyboardEvent) {
		if (event.key === ' ') {
			event.preventDefault();
		}
	}

	function trimPastedSpaces(index: number, event: ClipboardEvent) {
		event.preventDefault();
		const pasted = (event.clipboardData?.getData('text') ?? '').replace(/\s+/g, '');
		const input = event.target as HTMLInputElement;
		const start = input.selectionStart ?? input.value.length;
		const end = input.selectionEnd ?? input.value.length;
		const current = entries[index].referenceNumber ?? '';
		entries[index].referenceNumber = current.slice(0, start) + pasted + current.slice(end);
	}

	function handlePaymentModeChange(index: number, e: any) {
		const mode = e.target.value;

		entries[index].referenceNumber = mode === 'cash' ? 'N/A' : '';
		validateField(index, 'paymentMode');
		validateField(index, 'referenceNumber');
	}

	// Handle member search input
	function handleMemberSearch(index: number, event: Event) {
		const target = event.target as HTMLInputElement;
		entries[index].memberSearchQuery = target.value;
		entries[index].showMemberDropdown = true;

		// Clear selection if user types
		if (entries[index].memberId) {
			entries[index].memberId = '';
			entries[index].memberName = '';
		}
	}

	// Add another payment entry
	function addEntry() {
		entries.push(emptyEntry());
		errors.push(emptyErrors());
		submitStatus.push(emptyStatus());
	}

	// Remove a payment entry
	function removeEntry(index: number) {
		if (entries.length === 1) return;
		entries.splice(index, 1);
		errors.splice(index, 1);
		submitStatus.splice(index, 1);
	}

	// Duplicate a payment entry, inserted right after it
	function duplicateEntry(index: number) {
		const copy = {
			...entries[index],
			memberId: '',
			memberName: '',
			memberSearchQuery: '',
			showMemberDropdown: false,
			menuOpen: false
		};
		entries.splice(index + 1, 0, copy);
		errors.splice(index + 1, 0, emptyErrors());
		submitStatus.splice(index + 1, 0, emptyStatus());
	}

	function toggleMenu(index: number) {
		entries.forEach((entry, i) => {
			entry.menuOpen = i === index ? !entry.menuOpen : false;
		});
	}

	// Create a single payment entry; updates its own status as it goes
	async function createPayment(index: number) {
		const entry = entries[index];
		const status = submitStatus[index];
		if (status.isCreated || status.isCreating) return;

		status.error = '';
		status.isCreating = true;

		try {
			let fileUrl = '';
			if (entry.file) {
				const formDataToSend = new FormData();
				formDataToSend.append('file', entry.file);

				const uploadResponse = await uploadApi.file({ file: formDataToSend });
				fileUrl = uploadResponse.data.fileUrl;
			}

			const payload: Payment.Create = {
				amount: Number(entry.amount),
				date: formatToYYYYMMDD(entry.paymentDate),
				payment_reference: entry.referenceNumber,
				payment_mode: entry.paymentMode,
				payment_type: entry.paymentType,
				reciept_number: entry.receiptNumber.trim() || null,
				photo: fileUrl || null,
				remarks: entry.description.trim() || null,
				userId: entry.memberId
			};

			await paymentApi.addPayment({ payload });
			status.isCreated = true;
		} catch (err: any) {
			status.error = err.response?.data?.message || 'Failed to create payment.';
		} finally {
			status.isCreating = false;
		}
	}

	// ---------- Single submit for all entries ----------
	const allCreated = $derived(submitStatus.length > 0 && submitStatus.every((s) => s.isCreated));

	// Validate every entry, filling in per-field errors for whatever's invalid
	function validateAllEntries() {
		let isValid = true;

		entries.forEach((entry, index) => {
			try {
				paymentDetailsSchema.validateSync(entry, { abortEarly: false });
				errors[index] = emptyErrors();
			} catch (err: any) {
				isValid = false;
				const fieldErrors = emptyErrors();
				if (err.inner && Array.isArray(err.inner)) {
					err.inner.forEach((e: any) => {
						if (e.path && e.path in fieldErrors) {
							fieldErrors[e.path as keyof ReturnType<typeof emptyErrors>] = e.message;
						}
					});
				}
				errors[index] = fieldErrors;
			}
		});

		return isValid;
	}

	async function createAllPayments() {
		if (isCreatingAll) return;

		if (!validateAllEntries()) {
			setTimeout(() => {
				const firstErr = document.querySelector('.text-red-600');
				if (firstErr) {
					firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}, 100);
			return;
		}

		showCreateAllModal = true;
		isCreatingAll = true;
		try {
			for (let i = 0; i < entries.length; i++) {
				if (submitStatus[i].isCreated) continue;
				await createPayment(i);
			}
		} finally {
			isCreatingAll = false;
			if (allCreated) {
				setTimeout(() => goto('/payins'), 1200);
			}
		}
	}
</script>

<div class="mx-auto max-w-5xl p-3">
	<div class="space-y-3">
		{#each entries as entry, index (index)}
			<div class="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-xs font-semibold text-gray-500">Payment {index + 1}</span>
					<div class="relative" bind:this={menuRefs[index]}>
						<button
							type="button"
							onclick={() => toggleMenu(index)}
							class="text-gray-400 hover:text-gray-600"
							disabled={isLoading}
							aria-label="Payment options"
						>
							<MoreVertical class="h-4 w-4" />
						</button>

						{#if entry.menuOpen}
							<div
								class="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
							>
								<button
									type="button"
									onclick={() => {
										duplicateEntry(index);
										entry.menuOpen = false;
									}}
									class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
								>
									<Copy class="h-4 w-4" />
									Duplicate payment
								</button>
								<button
									type="button"
									onclick={() => removeEntry(index)}
									disabled={entries.length === 1}
									class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
								>
									<Trash2 class="h-4 w-4" />
									Remove payment
								</button>
							</div>
						{/if}
					</div>
				</div>

					<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
						<!-- Member Selection with Search -->
						<div class="md:col-span-2 lg:col-span-4">
							<label for="" class="mb-1 block text-sm font-medium text-gray-700">
								Member
								<span class="text-red-500">*</span>
							</label>

							<div
								class="relative"
								bind:this={memberDropdownRefs[index]}
							>
								<div class="relative">
									<div
										class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
									>
										<Search class="h-4 w-4 text-gray-400" />
									</div>
									<input
										type="text"
										value={entry.memberSearchQuery}
										oninput={(e) => handleMemberSearch(index, e)}
										onfocus={() => (entry.showMemberDropdown = true)}
										placeholder="Search member by name or mobile..."
										class={`w-full rounded-md border px-3 py-1.5 pr-10 pl-9 text-sm transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none ${
											errors[index].memberId
												? 'border-red-500 focus:ring-red-500'
												: 'border-gray-300'
										} ${
											isLoading
												? 'cursor-not-allowed bg-gray-100 text-gray-500'
												: 'bg-white text-gray-900'
										}`}
										disabled={isLoading}
									/>
									{#if entry.memberId}
										<button
											type="button"
											onclick={() => clearMemberSelection(index)}
											class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
										>
											<X class="h-4 w-4" />
										</button>
									{:else}
										<div
											class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"
										>
											<ChevronDown class="h-4 w-4 text-gray-400" />
										</div>
									{/if}
								</div>

								<!-- Dropdown -->
								{#if entry.showMemberDropdown && !isLoading}
									<div
										class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg"
									>
										{#if $memberListStore.isLoading}
											<div class="px-4 py-2 text-center text-sm text-gray-500">
												Loading members...
											</div>
										{:else if filteredMembersFor(entry.memberSearchQuery).length === 0}
											<div class="px-4 py-2 text-center text-sm text-gray-500">
												No members found
											</div>
										{:else}
											{#each filteredMembersFor(entry.memberSearchQuery) as member}
												<button
													type="button"
													onclick={() => selectMember(index, member)}
													class="w-full px-3 py-1.5 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
												>
													<div class="text-sm font-medium text-gray-900">
														{formatMemberDisplay(member.name, member.member_id)}
													</div>
													<div class="text-xs text-gray-500">
														{member.mobile}
													</div>
												</button>
											{/each}
										{/if}
									</div>
								{/if}
							</div>

							{#if errors[index].memberId}
								<p class="mt-1 text-sm text-red-600">{errors[index].memberId}</p>
							{/if}
						</div>

						<!-- Amount -->
						<Input
							id={`amount-${index}`}
							label="Amount"
							type="number"
							bind:value={entry.amount}
							error={errors[index].amount}
							onblur={() => validateField(index, 'amount')}
							placeholder="Enter amount"
							required
							disabled={isLoading}
						/>

						<!-- Payment Date -->
						<Input
							id={`paymentDate-${index}`}
							label="Payment Date"
							type="date"
							bind:value={entry.paymentDate}
							error={errors[index].paymentDate}
							onblur={() => validateField(index, 'paymentDate')}
							required
							disabled={isLoading}
						/>

						<!-- Payment Mode -->
						<Select
							id={`paymentMode-${index}`}
							label="Payment Mode"
							bind:value={entry.paymentMode}
							options={paymentModes}
							error={errors[index].paymentMode}
							onchange={(e) => handlePaymentModeChange(index, e)}
							required
							disabled={isLoading}
						/>

						<!-- Payment Type -->
						<Select
							id={`paymentType-${index}`}
							label="Payment Type"
							bind:value={entry.paymentType}
							options={paymentTypes}
							error={errors[index].paymentType}
							onchange={() => validateField(index, 'paymentType')}
							required
							disabled={isLoading}
						/>

						<!-- Reference Number -->
						<Input
							id={`referenceNumber-${index}`}
							label="Reference Number"
							bind:value={entry.referenceNumber}
							error={errors[index].referenceNumber}
							onblur={() => validateField(index, 'referenceNumber')}
							onkeydown={blockSpaceKey}
							onpaste={(e) => trimPastedSpaces(index, e)}
							placeholder="Transaction/Cheque number"
							required
							disabled={isLoading || entry.paymentMode === 'cash'}
						/>

						<Input
							id={`receiptNumber-${index}`}
							label="Receipt Number"
							bind:value={entry.receiptNumber}
							error={errors[index].receiptNumber}
							onblur={() => validateField(index, 'receiptNumber')}
							placeholder="Receipt book number"
							disabled={isLoading}
						/>

						<!-- Description -->
						<div class="md:col-span-2 lg:col-span-2">
							<Input
								id={`description-${index}`}
								label="Description"
								bind:value={entry.description}
								error={errors[index].description}
								onblur={() => validateField(index, 'description')}
								placeholder="Payment description or notes"
								disabled={isLoading}
							/>
						</div>

						<!-- File Upload -->
						<div class="md:col-span-2">
							<label
								for={`file-upload-${index}`}
								class="mb-1 block text-sm font-medium text-gray-700"
							>
								Payment Receipt
								<span class="text-red-500">*</span>
							</label>

							{#if !entry.fileName}
								<label
									for={`file-upload-${index}`}
									class="flex h-[38px] w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 px-3 transition-colors hover:border-gray-400"
								>
									<Upload class="h-4 w-4 text-gray-400" />
									<span class="text-xs text-gray-600"
										>Click to upload (PNG, JPG, PDF, max 5MB)</span
									>
								</label>
								<input
									id={`file-upload-${index}`}
									type="file"
									class="hidden"
									accept=".jpg,.jpeg,.png,.pdf"
									onchange={(e) => handleFileChange(index, e)}
									bind:this={fileInputs[index]}
									disabled={isLoading}
								/>
							{:else}
								<div
									class="flex h-[38px] items-center justify-between rounded-md border border-gray-300 bg-gray-50 px-3"
								>
									<div class="flex items-center gap-2 truncate">
										<Upload class="h-4 w-4 shrink-0 text-gray-400" />
										<span class="truncate text-sm text-gray-900">{entry.fileName}</span>
									</div>
									<button
										type="button"
										onclick={() => removeFile(index)}
										class="text-red-600 hover:text-red-800"
										disabled={isLoading}
									>
										<X class="h-4 w-4" />
									</button>
								</div>
							{/if}

							{#if errors[index].file}
								<p class="mt-1 text-sm text-red-600">{errors[index].file}</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

	<!-- Add another payment -->
	<button
		type="button"
		onclick={addEntry}
		disabled={isLoading}
		class="mt-3 flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
	>
		<Plus class="h-4 w-4" />
		Add another payment
	</button>

	<!-- Actions -->
	<div class="mt-4 flex justify-end">
		<Button variant="success" onclick={createAllPayments} disabled={isLoading}>
			{#if isLoading}
				<div class="flex items-center gap-2">
					<div
						class="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
					></div>
					<span>Saving...</span>
				</div>
			{:else}
				{entries.length > 1 ? `Add ${entries.length} Payments` : 'Add Payment'}
			{/if}
		</Button>
	</div>
</div>

<!-- Create-all progress: one row per payment entry, ticking off as each API
	 call finishes — same overlay/panel language as the screenshot-generate
	 flow's "Creating Payments" modal. -->
{#if showCreateAllModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => e.target === e.currentTarget && !isCreatingAll && (showCreateAllModal = false)}
		onkeydown={(e) => e.key === 'Escape' && !isCreatingAll && (showCreateAllModal = false)}
		role="dialog"
		aria-modal="true"
		aria-label="Creating Payments"
		tabindex="-1"
	>
		<div class="flex max-h-[85vh] w-full max-w-sm flex-col rounded-lg bg-white shadow-xl">
			<div class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
				<h2 class="text-sm font-semibold text-gray-900">Creating Payments</h2>
				{#if !isCreatingAll}
					<button
						type="button"
						onclick={() => (showCreateAllModal = false)}
						class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
						aria-label="Close"
					>
						<X class="h-5 w-5" />
					</button>
				{/if}
			</div>

			<div class="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
				{#each entries as entry, index}
					<div
						class="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm"
					>
						<span class="min-w-0 truncate text-gray-900">
							{entry.memberName || `Payment ${index + 1}`}
						</span>
						{#if submitStatus[index].isCreated}
							<span
								class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100"
							>
								<Check class="h-3.5 w-3.5 text-green-700" />
							</span>
						{:else if submitStatus[index].isCreating}
							<div
								class="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"
							></div>
						{:else if submitStatus[index].error}
							<span
								class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100"
								title={submitStatus[index].error}
							>
								<X class="h-3.5 w-3.5 text-red-700" />
							</span>
						{:else}
							<span class="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-gray-200"></span>
						{/if}
					</div>
				{/each}
			</div>

			{#if !isCreatingAll}
				<div class="flex-shrink-0 border-t border-gray-200 p-4">
					{#if allCreated}
						<div
							class="flex items-center justify-center gap-2 rounded-md bg-green-50 p-3 text-sm font-medium text-green-800"
						>
							<Check class="h-4 w-4" />
							All payments created — returning to Payins...
						</div>
					{:else}
						<div class="rounded-md bg-red-50 p-3 text-sm text-red-800">
							Some payments failed. Fix the highlighted fields and try again.
						</div>
						<div class="mt-3 flex justify-end">
							<Button variant="secondary" size="sm" onclick={() => (showCreateAllModal = false)}>
								Close
							</Button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}
