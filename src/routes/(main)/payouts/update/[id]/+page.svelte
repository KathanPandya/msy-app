<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import paymentApi from '$lib/endpoints/paymentApi';
	import { authStore } from '$lib/stores/authStore';
	import { memberListStore } from '$lib/stores/memberListStore';
	import type { Payment } from '$lib/types/payment';
	import { AlertCircle, ChevronDown, Search, X } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import * as Yup from 'yup';

	// Validation Schema
	const payoutSchema = Yup.object().shape({
		userId: Yup.string().required('Processing admin is required'),
		deadMemberId: Yup.string().required('Deceased member is required'),
		nomineeId: Yup.string().required('Nominee is required'),
		paymentAmount: Yup.number()
			.required('Payment amount is required')
			.positive('Amount must be positive')
			.typeError('Amount must be a number'),
		paymentDate: Yup.date()
			.required('Payment date is required')
			.typeError('Payment date is required'),
		paymentToPerson: Yup.string().required('Recipient name is required'),
		aadhaarCardNo: Yup.string()
			.required('Aadhaar number is required')
			.matches(/^[0-9]{12}$/, 'Aadhaar must be 12 digits'),
		paymentByPerson: Yup.string().required('Payment processed by is required')
	});

	const payoutData: any = (page.state as any).payoutData;

	// debugger;
	// Form Data
	let formData = $state({
		userId: payoutData.userId || '',
		deadMemberId: payoutData.deadMemberId || '',
		deadMemberName: payoutData.memberName || '',
		nomineeId: payoutData.nomineeId || '',
		nomineeName: payoutData.payment_to_person || '',
		paymentAmount: payoutData.payment_amount || 0,
		paymentDate: '',
		paymentToPerson: payoutData.payment_to_person || '',
		aadhaarCardNo: payoutData.adhaar_card_no_of_reciever || '',
		paymentByPerson: payoutData.payment_by_person || ''
	});

	// Errors
	let errors = $state({
		userId: '',
		deadMemberId: '',
		nomineeId: '',
		paymentAmount: '',
		paymentDate: '',
		paymentToPerson: '',
		aadhaarCardNo: '',
		paymentByPerson: ''
	});

	// State
	let isLoading = $state(false);
	let successMessage = $state('');
	let errorMessage = $state('');

	// Deceased member dropdown
	let memberSearchQuery = $state(payoutData.memberName);
	let showMemberDropdown = $state(false);
	let memberDropdownRef: HTMLDivElement;

	// Nominee dropdown
	let nominees = $state<any[]>([]);
	let loadingNominees = $state(false);
	let nomineeSearchQuery = $state('');
	let showNomineeDropdown = $state(false);
	let nomineeDropdownRef: HTMLDivElement;

	// Load deceased members on mount
	onMount(() => {
		if ($memberListStore.members.length === 0) {
			memberListStore.fetchAllMembers();
		}

		// Click outside handlers
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	// Filtered deceased members
	const filteredDeceased = $derived(
		$memberListStore.members
			.filter((member) => member.status === 'dead')
			.filter((member) => {
				const searchLower = memberSearchQuery.toLowerCase();
				const fullName = `${member.first_name} ${member.surname}`.toLowerCase();
				const mobile = member.mobile || '';
				return fullName.includes(searchLower) || mobile.includes(searchLower);
			})
	);

	// Filtered nominees
	const filteredNominees = $derived(
		nominees.filter((nominee) => {
			const searchLower = nomineeSearchQuery.toLowerCase();
			const fullName = `${nominee.first_name} ${nominee.surname}`.toLowerCase();
			return fullName.includes(searchLower);
		})
	);

	// Select deceased member
	async function selectDeceased(member: any) {
		formData.deadMemberId = member._id;
		formData.deadMemberName = `${member.first_name} ${member.surname}`;
		memberSearchQuery = formData.deadMemberName;
		showMemberDropdown = false;
		errors.deadMemberId = '';

		// Clear nominee selection
		formData.nomineeId = '';
		formData.nomineeName = '';
		nomineeSearchQuery = '';
		nominees = [];

		// Fetch nominees for selected member
		await fetchNominees(member._id);
	}

	// Fetch nominees for deceased member
	async function fetchNominees(memberId: string) {
		loadingNominees = true;

		try {
			// TODO: Replace with actual API call
			// const response = await nomineeApi.getNominees(memberId);

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Mock data
			nominees = [
				{
					_id: 'nominee1',
					first_name: 'Ramesh',
					last_name: 'Kumar',
					relationship: 'Son',
					aadhaar: '123456789012'
				},
				{
					_id: 'nominee2',
					first_name: 'Priya',
					last_name: 'Devi',
					relationship: 'Daughter',
					aadhaar: '987654321098'
				}
			];
		} catch (error) {
			console.error('Failed to fetch nominees:', error);
			errorMessage = 'Failed to load nominees';
			nominees = [];
		} finally {
			loadingNominees = false;
		}
	}

	// Select nominee
	function selectNominee(nominee: any) {
		formData.nomineeId = nominee._id;
		formData.nomineeName = `${nominee.first_name} ${nominee.last_name}`;
		nomineeSearchQuery = formData.nomineeName;
		showNomineeDropdown = false;
		errors.nomineeId = '';

		// Auto-fill recipient details
		formData.paymentToPerson = `${nominee.first_name} ${nominee.last_name}`;
		formData.aadhaarCardNo = nominee.aadhaar || '';
	}

	// Clear selections
	function clearMemberSelection() {
		formData.deadMemberId = '';
		formData.deadMemberName = '';
		memberSearchQuery = '';
		formData.nomineeId = '';
		formData.nomineeName = '';
		nomineeSearchQuery = '';
		nominees = [];
	}

	function clearNomineeSelection() {
		formData.nomineeId = '';
		formData.nomineeName = '';
		nomineeSearchQuery = '';
		formData.paymentToPerson = '';
		formData.aadhaarCardNo = '';
	}

	// Click outside handler
	function handleClickOutside(event: MouseEvent) {
		if (memberDropdownRef && !memberDropdownRef.contains(event.target as Node)) {
			showMemberDropdown = false;
		}
		if (nomineeDropdownRef && !nomineeDropdownRef.contains(event.target as Node)) {
			showNomineeDropdown = false;
		}
	}

	// Handle search inputs
	function handleMemberSearch(event: Event) {
		const target = event.target as HTMLInputElement;
		memberSearchQuery = target.value;
		showMemberDropdown = true;

		if (formData.deadMemberId) {
			clearMemberSelection();
		}
	}

	function handleNomineeSearch(event: Event) {
		const target = event.target as HTMLInputElement;
		nomineeSearchQuery = target.value;
		showNomineeDropdown = true;

		if (formData.nomineeId) {
			formData.nomineeId = '';
		}
	}

	// Validate field
	async function validateField(field: keyof typeof errors) {
		try {
			await payoutSchema.validateAt(field, formData);
			errors[field] = '';
		} catch (err: any) {
			errors[field] = err?.message || 'Invalid';
		}
	}

	// Submit form
	async function submitForm() {
		isLoading = true;
		successMessage = '';
		errorMessage = '';

		// Reset errors
		errors = {
			userId: '',
			deadMemberId: '',
			nomineeId: '',
			paymentAmount: '',
			paymentDate: '',
			paymentToPerson: '',
			aadhaarCardNo: '',
			paymentByPerson: ''
		};

		try {
			// Validate
			await payoutSchema.validate(formData, { abortEarly: false });

			// TODO: Replace with actual API call
			await paymentApi.addPayout({
				payload: {
					userId: formData.userId,
					deadMemberId: formData.deadMemberId,
					nomineeId: '68e6999fa5ad5dcd6bc88c5c',
					payment_amount: parseFloat(formData.paymentAmount),
					payment_date: formData.paymentDate,
					payment_to_person: formData.paymentToPerson,
					adhaar_card_no_of_reciever: formData.aadhaarCardNo,
					payment_by_person: formData.paymentByPerson
				}
			});

			successMessage = 'Payout initialized successfully!';

			setTimeout(() => {
				// goto('/payouts');
			}, 1500);
		} catch (err: any) {
			if (err.inner && Array.isArray(err.inner)) {
				err.inner.forEach((e: any) => {
					if (e.path && e.path in errors) {
						errors[e.path as keyof typeof errors] = e.message;
					}
				});
				errorMessage = 'Please fix the errors above';
			} else {
				errorMessage = err?.response?.data?.message || 'Failed to initialize payout';
			}
		} finally {
			isLoading = false;
		}
	}

	// Reset form
	function resetForm() {
		formData = {
			userId: '',
			deadMemberId: '',
			deadMemberName: '',
			nomineeId: '',
			nomineeName: '',
			paymentAmount: 0,
			paymentDate: '',
			paymentToPerson: '',
			aadhaarCardNo: '',
			paymentByPerson: ''
		};
		errors = {
			userId: '',
			deadMemberId: '',
			nomineeId: '',
			paymentAmount: '',
			paymentDate: '',
			paymentToPerson: '',
			aadhaarCardNo: '',
			paymentByPerson: ''
		};
		memberSearchQuery = '';
		nomineeSearchQuery = '';
		nominees = [];
		successMessage = '';
		errorMessage = '';
	}
</script>

<div class="mx-auto max-w-4xl p-6">
	<Card title="Initialize Payout">
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			<!-- Processing Admin -->
			<div class="md:col-span-2">
				<Input
					id="userId"
					label="Processing Admin ID"
					bind:value={formData.userId}
					error={errors.userId}
					onblur={() => validateField('userId')}
					placeholder="Enter admin user ID"
					required
					disabled={true}
				/>
			</div>

			<!-- Deceased Member Selection -->
			<div class="md:col-span-2">
				<label class="mb-1 block text-sm font-medium text-gray-700">
					Deceased Member
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
							placeholder="Search deceased member by name..."
							class={`w-full rounded-md border px-3 py-2 pr-10 pl-10 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
								errors.deadMemberId ? 'border-red-500' : 'border-gray-300'
							} ${isLoading ? 'cursor-not-allowed bg-gray-100' : 'bg-white text-gray-900'}`}
							disabled={isLoading}
						/>
						{#if formData.deadMemberId}
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
								<div class="px-4 py-3 text-center text-sm text-gray-500">Loading...</div>
							{:else if filteredDeceased.length === 0}
								<div class="px-4 py-3 text-center text-sm text-gray-500">
									No deceased members found
								</div>
							{:else}
								{#each filteredDeceased as member}
									<button
										type="button"
										onclick={() => selectDeceased(member)}
										class="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
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

				{#if errors.deadMemberId}
					<p class="mt-1 text-sm text-red-600">{errors.deadMemberId}</p>
				{/if}
			</div>

			<!-- Nominee Selection -->
			<div class="md:col-span-2">
				<label class="mb-1 block text-sm font-medium text-gray-700">
					Nominee
					<span class="text-red-500">*</span>
				</label>

				{#if !formData.deadMemberId}
					<div
						class="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
					>
						<AlertCircle class="h-4 w-4 flex-shrink-0" />
						<p>Please select a deceased member first</p>
					</div>
				{:else if loadingNominees}
					<div class="flex items-center justify-center rounded-md border border-gray-300 py-4">
						<div
							class="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-r-transparent"
						></div>
						<span class="ml-2 text-sm text-gray-600">Loading nominees...</span>
					</div>
				{:else if nominees.length === 0}
					<div
						class="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
					>
						<AlertCircle class="h-4 w-4 flex-shrink-0" />
						<p>No nominees found for this member</p>
					</div>
				{:else}
					<div class="relative" bind:this={nomineeDropdownRef}>
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<Search class="h-5 w-5 text-gray-400" />
							</div>
							<input
								type="text"
								value={nomineeSearchQuery}
								oninput={handleNomineeSearch}
								onfocus={() => (showNomineeDropdown = true)}
								placeholder="Search nominee by name..."
								class={`w-full rounded-md border px-3 py-2 pr-10 pl-10 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
									errors.nomineeId ? 'border-red-500' : 'border-gray-300'
								} ${isLoading ? 'cursor-not-allowed bg-gray-100' : 'bg-white text-gray-900'}`}
								disabled={isLoading}
							/>
							{#if formData.nomineeId}
								<button
									type="button"
									onclick={clearNomineeSelection}
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
						{#if showNomineeDropdown && !isLoading}
							<div
								class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg"
							>
								{#if filteredNominees.length === 0}
									<div class="px-4 py-3 text-center text-sm text-gray-500">No nominees found</div>
								{:else}
									{#each filteredNominees as nominee}
										<button
											type="button"
											onclick={() => selectNominee(nominee)}
											class="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
										>
											<div class="font-medium text-gray-900">
												{nominee.first_name}
												{nominee.last_name}
											</div>
											<div class="text-sm text-gray-500">
												{nominee.relationship} • Aadhaar: {nominee.aadhaar}
											</div>
										</button>
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				{/if}

				{#if errors.nomineeId}
					<p class="mt-1 text-sm text-red-600">{errors.nomineeId}</p>
				{/if}
			</div>

			<!-- Payment Amount -->
			<Input
				id="paymentAmount"
				label="Payment Amount"
				type="number"
				bind:value={formData.paymentAmount}
				error={errors.paymentAmount}
				onblur={() => validateField('paymentAmount')}
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

			<!-- Payment To Person -->
			<!-- <Input
				id="paymentToPerson"
				label="Payment To (Recipient Name)"
				bind:value={formData.paymentToPerson}
				error={errors.paymentToPerson}
				onblur={() => validateField('paymentToPerson')}
				placeholder="Full name of recipient"
				required
				disabled={isLoading}
			/> -->

			<!-- Aadhaar Card Number -->
			<!-- <Input
				id="aadhaarCardNo"
				label="Aadhaar Card Number"
				bind:value={formData.aadhaarCardNo}
				error={errors.aadhaarCardNo}
				onblur={() => validateField('aadhaarCardNo')}
				placeholder="12 digit Aadhaar number"
				maxlength={12}
				inputmode="numeric"
				required
				disabled={isLoading}
			/> -->

			<!-- Payment By Person -->
			<div class="md:col-span-2">
				<Input
					id="paymentByPerson"
					label="Payment Processed By"
					bind:value={formData.paymentByPerson}
					error={errors.paymentByPerson}
					onblur={() => validateField('paymentByPerson')}
					placeholder="Name of person processing payment"
					required
					disabled={true}
				/>
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
							class="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"
						></div>
						<span>Processing...</span>
					</div>
				{:else}
					Initialize Payout
				{/if}
			</Button>
		</div>
	</Card>
</div>
