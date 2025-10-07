<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import addressApi from '$lib/endpoints/addressApi';
	import coreApi from '$lib/endpoints/coreApi';
	import profileApi from '$lib/endpoints/profileApi';
	import userApi from '$lib/endpoints/userApi';
	import { updateUserSchema } from '$lib/schema/update-user';
	import type { Address } from '$lib/types/address';
	import type { Form } from '$lib/types/form';
	import type { User } from '$lib/types/user';
	import {
		capitalizeFirst,
		formatDate,
		formatToYYYYMMDD,
		getUserAddress
	} from '$lib/utilities/helperFunc';
	import { onMount } from 'svelte';

	/***************
    State with $state rune
  ****************/
	let userInfo = $state<User.AllInfo | null>(null);
	let userAddress = $state<Address.Data | null>(null);
	const genders = APP_CONSTANTS.GENDERS;
	const gotras = APP_CONSTANTS.GOTRAS;
	const maritalStatus = APP_CONSTANTS.MARITAL_STATUS;
	const memberStatus = APP_CONSTANTS.MEMBER_STATUS;
	const tabs = [
		{ id: 'user-info', label: 'User Info' },
		{ id: 'payments', label: 'Payments' }
	];

	let activeTab = $state('user-info');
	let formData = $state<Form.UserUpdate>({
		firstName: '',
		middleName: '',
		lastName: '',
		mobileNumber: '',
		email: '',
		gender: '',
		dob: '',
		password: '',
		confirmPassword: '',
		maritalStatus: '',
		gotra: '',
		nativePlace: '',
		addressLine1: '',
		addressLine2: '',
		areaName: '',
		landmark: '',
		city: '',
		pincode: '',
		state: '',
		country: '',
		status: '',
		refNum1: '',
		refNum2: ''
	});

	let errors = $state<Record<keyof Form.UserUpdate, string>>({
		firstName: '',
		middleName: '',
		lastName: '',
		mobileNumber: '',
		email: '',
		gender: '',
		dob: '',
		password: '',
		confirmPassword: '',
		maritalStatus: '',
		gotra: '',
		nativePlace: '',
		addressLine1: '',
		addressLine2: '',
		areaName: '',
		landmark: '',
		city: '',
		pincode: '',
		state: '',
		country: '',
		status: '',
		refNum1: '',
		refNum2: ''
	});

	let successMessage = $state('');

	/***************
    Load user data
  ****************/
	onMount(async () => {
		const userId = page.params.id;
		if (userId) {
			userInfo = await coreApi.fetchUserInfo({ userId });

			// Populate form with user data
			if (userInfo?.user) {
				formData.firstName = userInfo.user.first_name || '';
				formData.middleName = userInfo.user.middle_name || '';
				formData.lastName = userInfo.user.surname || '';
				formData.mobileNumber = userInfo.user.mobile || '';
				formData.email = userInfo.user.email || '';
				formData.gender = userInfo.user.gender || '';
				formData.dob = userInfo.user.date_of_birth?.split('T')[0] || '';
				formData.status = userInfo?.user?.status || '';
				formData.refNum1 = userInfo?.user.reference_member_1 || '';
				formData.refNum2 = userInfo?.user.reference_member_2 || '';
			}

			if (userInfo.profile) {
				formData.maritalStatus = userInfo.profile?.marital_status || '';
				formData.gotra = userInfo.profile?.gotra || '';
				formData.nativePlace = userInfo.profile?.native_place || '';
			}

			if (userInfo.address) {
				userAddress = getUserAddress(userInfo.address);
				if (userAddress) {
					formData.addressLine1 = userAddress.address_line_1;
					formData.addressLine2 = userAddress.address_line_2;
					formData.areaName = userAddress.area_name;
					formData.city = userAddress.city;
					formData.country = userAddress.country;
					formData.pincode = userAddress.pincode;
					formData.state = userAddress.state;
					formData.landmark = userAddress.landmark;
				}
			}
		}
	});

	const tableData: any[] = $derived(
		userInfo?.payments?.map((payment) => ({
			_id: payment._id,
			date: formatDate(payment.date) || '-',
			amount: payment.amount || '-',
			payment_mode: capitalizeFirst(payment.payment_mode) || '-',
			payment_type: capitalizeFirst(payment.payment_type) || '-'
		})) ?? []
	);

	/***************
    Helper functions
  ****************/

	async function validateField<K extends keyof Form.UserUpdate>(name: K) {
		try {
			await updateUserSchema.validateAt(name as string, formData);
			errors[name] = '';
		} catch (err: any) {
			errors[name] = err?.message || 'Invalid';
		}
	}

	function resetForm() {
		formData = {
			firstName: userInfo?.user?.first_name || '',
			middleName: userInfo?.user?.middle_name || '',
			lastName: userInfo?.user?.surname || '',
			mobileNumber: userInfo?.user?.mobile || '',
			email: userInfo?.user?.email || '',
			gender: userInfo?.user?.gender || '',
			dob: userInfo?.user?.date_of_birth?.split('T')[0] || '',
			password: '',
			confirmPassword: '',
			maritalStatus: '',
			gotra: '',
			nativePlace: '',
			addressLine1: '',
			addressLine2: '',
			areaName: '',
			landmark: '',
			city: '',
			pincode: '',
			state: '',
			country: '',
			status: userInfo?.user?.status || '',
			refNum1: '',
			refNum2: ''
		};
		errors = Object.fromEntries(Object.keys(formData).map((k) => [k, ''])) as any;
		successMessage = '';
	}

	async function submitForm() {
		errors = Object.fromEntries(Object.keys(formData).map((k) => [k, ''])) as any;
		try {
			const validated = await updateUserSchema.validate(formData, { abortEarly: false });
			successMessage = 'Form submitted successfully. Check console for payload.';
			console.log('Validated payload:', validated);
		} catch (err: any) {
			if (err.inner && Array.isArray(err.inner)) {
				const errs: Partial<Record<keyof Form.UserUpdate, string>> = {};
				err.inner.forEach((e: any) => {
					if (e.path) errs[e.path as keyof Form.UserUpdate] = e.message;
				});
				errors = { ...errors, ...errs };
			} else {
				console.error(err);
			}
			successMessage = '';
			setTimeout(() => {
				const firstErr = document.querySelector('.error-message');
				if (firstErr)
					(firstErr as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
			}, 50);
		}
	}

	function inputClasses(errMsg: string) {
		return `input ${errMsg ? 'input--error' : ''}`;
	}

	function handleTabChange(tabId: string) {
		console.log('Tab changed to:', tabId);
	}

	let loaderStatus = $state<Record<string, boolean>>({
		general: false,
		other: false,
		address: false
	});

	// Error state for each section
	let sectionErrors = $state<Record<string, string>>({
		general: '',
		other: '',
		address: ''
	});

	// Success state for each section
	let sectionSuccess = $state<Record<string, string>>({
		general: '',
		other: '',
		address: ''
	});

	async function submitSection(section: string) {
		// Clear previous messages
		sectionErrors[section] = '';
		sectionSuccess[section] = '';

		// Start loading
		loaderStatus[section] = true;

		try {
			if (section === 'general') {
				// Validate userId exists
				if (!userInfo?.user?._id) {
					throw new Error('User ID is missing');
				}

				const response = await userApi.updateUser({
					userId: userInfo.user._id,
					payload: {
						first_name: formData.firstName,
						middle_name: formData.middleName,
						surname: formData.lastName,
						status: formData.status,
						date_of_birth: formatToYYYYMMDD(formData.dob),
						gender: formData.gender,
						mobile: formData.mobileNumber,
						reference_member_1: formData.refNum1,
						reference_member_2: formData.refNum2
					}
				});

				if (response.user) {
					// Update form with response data
					formData.firstName = response.user.first_name || '';
					formData.middleName = response.user.middle_name || '';
					formData.lastName = response.user.surname || '';
					formData.mobileNumber = response.user.mobile || '';
					formData.email = response.user.email || '';
					formData.gender = response.user.gender || '';
					formData.dob = response.user.date_of_birth?.split('T')[0] || '';
					formData.status = response.user.status || '';
					formData.refNum1 = response.user.reference_member_1 || '';
					formData.refNum2 = response.user.reference_member_2 || '';

					sectionSuccess[section] = response.message || 'General info updated successfully';
				}
			} else if (section === 'other') {
				if (!userInfo?.profile?._id) {
					throw new Error('Profile ID is missing');
				}

				const response = await profileApi.updateProfile({
					profileId: userInfo.profile._id,
					payload: {
						native_place: formData.nativePlace,
						marital_status: formData.maritalStatus,
						gotra: formData.gotra,
						entrance_fee: userInfo.profile.entrance_fee,
						corpus_fund: userInfo.profile.corpus_fund,
						deposit: userInfo.profile.deposit
					}
				});

				if (response.profile) {
					formData.maritalStatus = response.profile.marital_status || '';
					formData.gotra = response.profile.gotra || '';
					formData.nativePlace = response.profile.native_place || '';

					sectionSuccess[section] = response.message || 'Other info updated successfully';
				}
			} else if (section === 'address') {
				if (!userAddress?._id) {
					throw new Error('Address ID is missing');
				}

				const response = await addressApi.updateAddress({
					addressId: userAddress._id,
					payload: {
						address_line_1: formData.addressLine1,
						address_line_2: formData.addressLine2,
						area_name: formData.areaName,
						landmark: formData.landmark,
						city: formData.city,
						pincode: formData.pincode,
						state: formData.state,
						country: formData.country,
						is_nominee_address: false
					}
				});

				if (response.address) {
					userAddress = response.address;
					formData.addressLine1 = response.address.address_line_1 || '';
					formData.addressLine2 = response.address.address_line_2 || '';
					formData.areaName = response.address.area_name || '';
					formData.landmark = response.address.landmark || '';
					formData.city = response.address.city || '';
					formData.pincode = response.address.pincode || '';
					formData.state = response.address.state || '';
					formData.country = response.address.country || '';

					sectionSuccess[section] = response.message || 'Address updated successfully';
				}
			}
		} catch (error: any) {
			console.error(`Error updating ${section}:`, error);

			// Set user-friendly error message
			sectionErrors[section] =
				error?.response?.data?.message ||
				error?.message ||
				`Failed to update ${section}. Please try again.`;
		} finally {
			// Always stop loading
			loaderStatus[section] = false;

			// Auto-clear success message after 3 seconds
			if (sectionSuccess[section]) {
				setTimeout(() => {
					sectionSuccess[section] = '';
				}, 3000);
			}
		}
	}
</script>

<div class="mx-auto max-w-5xl">
	<Tabs {tabs} bind:activeTab onTabChange={handleTabChange} />
	<div class="space-y-6 p-6">
		{#if activeTab === 'user-info'}
			<Card title="General Info">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Input
						id="firstName"
						label="First name"
						bind:value={formData.firstName}
						error={errors.firstName}
						onblur={() => validateField('firstName')}
						placeholder="First name"
					/>

					<Input
						id="middleName"
						label="Middle name"
						bind:value={formData.middleName}
						error={errors.middleName}
						onblur={() => validateField('middleName')}
						placeholder="Middle name"
					/>

					<Input
						id="lastName"
						label="Surname"
						bind:value={formData.lastName}
						error={errors.lastName}
						onblur={() => validateField('lastName')}
						placeholder="Surname"
					/>

					<Input
						id="mobileNumber"
						label="Mobile number"
						bind:value={formData.mobileNumber}
						error={errors.mobileNumber}
						onblur={() => validateField('mobileNumber')}
						placeholder="10 digit mobile"
						inputmode="numeric"
						maxlength={10}
					/>

					<div class="md:col-span-2">
						<Input
							id="email"
							label="Email"
							type="email"
							bind:value={formData.email}
							error={errors.email}
							onblur={() => validateField('email')}
							placeholder="you@example.com"
						/>
					</div>

					<Input
						id="dob"
						label="Date of birth"
						type="date"
						bind:value={formData.dob}
						error={errors.dob}
						onblur={() => validateField('dob')}
					/>

					<Select
						id="gender"
						label="Gender"
						bind:value={formData.gender}
						options={genders}
						error={errors.gender}
						onchange={() => validateField('gender')}
					/>

					<Select
						id="status"
						label="Status"
						bind:value={formData.status}
						options={memberStatus}
						error={errors.status}
						onchange={() => validateField('status')}
					/>
				</div>

				{#if sectionErrors.general}
					<div class="mt-4 rounded-md bg-red-50 p-4">
						<div class="flex">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<div class="ml-3">
								<p class="text-sm text-red-800">{sectionErrors.general}</p>
							</div>
						</div>
					</div>
				{/if}

				{#if sectionSuccess.general}
					<div class="mt-4 rounded-md bg-green-50 p-4">
						<div class="flex">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<div class="ml-3">
								<p class="text-sm text-green-800">{sectionSuccess.general}</p>
							</div>
						</div>
					</div>
				{/if}

				<div class="mt-6 flex justify-end">
					<Button
						variant="primary"
						onclick={() => submitSection('general')}
						disabled={loaderStatus.general}
					>
						{#if loaderStatus.general}
							<div class="flex items-center gap-2">
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
								></div>
								<span>Saving...</span>
							</div>
						{:else}
							Save General Info
						{/if}
					</Button>
				</div>

				<!-- Messages -->
			</Card>

			<!-- Other Info -->
			<Card title="Other Info">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Input
						id="nativePlace"
						label="Native Place"
						bind:value={formData.nativePlace}
						error={errors.nativePlace}
						onblur={() => validateField('nativePlace')}
						placeholder="Native Place"
					/>

					<Select
						id="gotra"
						label="Gotra"
						bind:value={formData.gotra}
						options={gotras}
						error={errors.gotra}
						onchange={() => validateField('gotra')}
					/>

					<Select
						id="maritalStatus"
						label="Marital Status"
						bind:value={formData.maritalStatus}
						options={maritalStatus}
						error={errors.maritalStatus}
						onchange={() => validateField('maritalStatus')}
					/>
				</div>

				{#if sectionErrors.other}
					<div class="mt-4 rounded-md bg-red-50 p-4">
						<div class="flex">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<div class="ml-3">
								<p class="text-sm text-red-800">{sectionErrors.other}</p>
							</div>
						</div>
					</div>
				{/if}

				{#if sectionSuccess.other}
					<div class="mt-4 rounded-md bg-green-50 p-4">
						<div class="flex">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<div class="ml-3">
								<p class="text-sm text-green-800">{sectionSuccess.other}</p>
							</div>
						</div>
					</div>
				{/if}

				<div class="mt-6 flex justify-end">
					<Button
						variant="primary"
						onclick={() => submitSection('other')}
						disabled={loaderStatus.other}
					>
						{#if loaderStatus.other}
							<div class="flex items-center gap-2">
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
								></div>
								<span>Saving...</span>
							</div>
						{:else}
							Save Other Info
						{/if}
					</Button>
				</div>
			</Card>

			<!-- Address -->
			<Card title="Address">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Input
						id="addressLine1"
						label="Address Line 1"
						bind:value={formData.addressLine1}
						error={errors.addressLine1}
						onblur={() => validateField('addressLine1')}
						placeholder="House, building, street"
					/>

					<Input
						id="addressLine2"
						label="Address Line 2"
						bind:value={formData.addressLine2}
						error={errors.addressLine2}
						onblur={() => validateField('addressLine2')}
						placeholder="Area, locality"
					/>

					<Input
						id="areaName"
						label="Area Name"
						bind:value={formData.areaName}
						error={errors.areaName}
						onblur={() => validateField('areaName')}
						placeholder="Area"
					/>

					<Input
						id="landmark"
						label="Landmark"
						bind:value={formData.landmark}
						error={errors.landmark}
						onblur={() => validateField('landmark')}
						placeholder="Nearby landmark"
					/>

					<Input
						id="city"
						label="City"
						bind:value={formData.city}
						error={errors.city}
						onblur={() => validateField('city')}
						placeholder="City"
					/>

					<Input
						id="pincode"
						label="Pincode"
						bind:value={formData.pincode}
						error={errors.pincode}
						onblur={() => validateField('pincode')}
						placeholder="6 digit pincode"
						inputmode="numeric"
						maxlength={6}
					/>

					<Input
						id="state"
						label="State"
						bind:value={formData.state}
						error={errors.state}
						onblur={() => validateField('state')}
						placeholder="State"
					/>

					<Input
						id="country"
						label="Country"
						bind:value={formData.country}
						error={errors.country}
						onblur={() => validateField('country')}
						placeholder="Country"
					/>
				</div>

				{#if sectionErrors.address}
					<div class="mt-4 rounded-md bg-red-50 p-4">
						<div class="flex">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<div class="ml-3">
								<p class="text-sm text-red-800">{sectionErrors.address}</p>
							</div>
						</div>
					</div>
				{/if}

				{#if sectionSuccess.address}
					<div class="mt-4 rounded-md bg-green-50 p-4">
						<div class="flex">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<div class="ml-3">
								<p class="text-sm text-green-800">{sectionSuccess.address}</p>
							</div>
						</div>
					</div>
				{/if}

				<div class="mt-6 flex justify-end">
					<Button
						variant="primary"
						onclick={() => submitSection('address')}
						disabled={loaderStatus.address}
					>
						{#if loaderStatus.address}
							<div class="flex items-center gap-2">
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
								></div>
								<span>Saving...</span>
							</div>
						{:else}
							Save Address
						{/if}
					</Button>
				</div>
			</Card>

			<!-- Final Actions -->
			<div class="flex justify-end gap-3">
				<Button variant="secondary" onclick={resetForm}>Reset All</Button>
				<Button variant="success" onclick={submitForm}>Save All Changes</Button>
			</div>
		{:else if activeTab === 'payments'}
			<!-- Payments Content -->
			<Card title="Payment History">
				<div class="space-y-4">
					<p class="text-sm text-gray-600">Payment records for this user</p>

					<!-- You can use Table component here -->
					<Table
						columns={[
							{ key: 'date', label: 'Date' },
							{ key: 'amount', label: 'Amount' },
							{ key: 'payment_mode', label: 'Payment Mode' },
							{ key: 'payment_type', label: 'Payment Type' }
						]}
						data={tableData}
					/>
				</div>
			</Card>
		{/if}
	</div>
</div>
