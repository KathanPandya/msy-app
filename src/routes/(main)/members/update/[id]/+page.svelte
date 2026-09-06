<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { Trash2 } from '@lucide/svelte';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import addressApi from '$lib/endpoints/addressApi';
	import coreApi from '$lib/endpoints/coreApi';
	import profileApi from '$lib/endpoints/profileApi';
	import userApi from '$lib/endpoints/userApi';
	import nomineeApi from '$lib/endpoints/nomineeApi';
	import { updateUserSchema } from '$lib/schema/update-user';
	import type { Address } from '$lib/types/address';
	import type { Form } from '$lib/types/form';
	import type { User } from '$lib/types/user';
	import type { Nominee } from '$lib/types/nominee';
	import { formatToYYYYMMDD, getUserAddress } from '$lib/utilities/helperFunc';
	import { formatString } from '$lib/utilities/stringUtils';
	import { onMount } from 'svelte';

	/***************
    State with $state rune
  ****************/
	let userInfo = $state<User.AllInfo | null>(null);
	let userAddress = $state<Address.Data | null>(null);
	let isLoading = $state<boolean>(true);

	let nominees = $state<Nominee.Data[]>([]);
	let newNomineeName = $state('');
	let newNomineeRelation = $state('');
	let nomineeCreating = $state(false);
	let editingNomineeId = $state<string | null>(null);
	let editNomineeRelation = $state('');
	let nomineeSavingId = $state<string | null>(null);
	let nomineeDeletingId = $state<string | null>(null);
	let nomineeToDelete = $state<Nominee.Data | null>(null);
	let nomineeSectionError = $state('');
	let nomineeSectionSuccess = $state('');
	const genders = APP_CONSTANTS.GENDERS;
	const gotras = APP_CONSTANTS.GOTRAS;
	const maritalStatus = APP_CONSTANTS.MARITAL_STATUS;
	const memberStatus = APP_CONSTANTS.MEMBER_STATUS;
	const nomineeRelations = APP_CONSTANTS.NOMINEE_RELATIONS;

	let formData = $state<Form.UserUpdate>({
		firstName: '',
		middleName: '',
		lastName: '',
		mobileNumber: '',
		email: '',
		gender: '',
		dob: '',
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

	/***************
    Per-section dirty tracking
    Snapshots of "last saved" values per card, used to know when to show
    each card's Reset button and to revert only that card's fields.
  ****************/
	const GENERAL_FIELDS = [
		'firstName',
		'middleName',
		'lastName',
		'mobileNumber',
		'email',
		'gender',
		'dob',
		'refNum1',
		'refNum2'
	] as const;
	const OTHER_FIELDS = ['nativePlace', 'gotra', 'maritalStatus'] as const;
	const ADDRESS_FIELDS = [
		'addressLine1',
		'addressLine2',
		'areaName',
		'landmark',
		'city',
		'pincode',
		'state',
		'country'
	] as const;

	function snapshot<K extends keyof Form.UserUpdate>(keys: readonly K[]) {
		return Object.fromEntries(keys.map((k) => [k, formData[k]])) as Pick<Form.UserUpdate, K>;
	}

	function isSectionDirty<K extends keyof Form.UserUpdate>(
		keys: readonly K[],
		original: Pick<Form.UserUpdate, K>
	) {
		return keys.some((k) => formData[k] !== original[k]);
	}

	let originalGeneral = $state<Pick<Form.UserUpdate, (typeof GENERAL_FIELDS)[number]>>(
		snapshot(GENERAL_FIELDS)
	);
	let originalOther = $state<Pick<Form.UserUpdate, (typeof OTHER_FIELDS)[number]>>(
		snapshot(OTHER_FIELDS)
	);
	let originalAddress = $state<Pick<Form.UserUpdate, (typeof ADDRESS_FIELDS)[number]>>(
		snapshot(ADDRESS_FIELDS)
	);

	let isGeneralDirty = $derived(isSectionDirty(GENERAL_FIELDS, originalGeneral));
	let isOtherDirty = $derived(isSectionDirty(OTHER_FIELDS, originalOther));
	let isAddressDirty = $derived(isSectionDirty(ADDRESS_FIELDS, originalAddress));

	function resetSection(section: 'general' | 'other' | 'address') {
		if (section === 'general') {
			GENERAL_FIELDS.forEach((k) => {
				formData[k] = originalGeneral[k];
				errors[k] = '';
			});
		} else if (section === 'other') {
			OTHER_FIELDS.forEach((k) => {
				formData[k] = originalOther[k];
				errors[k] = '';
			});
		} else {
			ADDRESS_FIELDS.forEach((k) => {
				formData[k] = originalAddress[k];
				errors[k] = '';
			});
		}
		sectionErrors[section] = '';
		sectionSuccess[section] = '';
	}

	/***************
    Load user data
  ****************/
	onMount(async () => {
		isLoading = true;
		const userId = page.params.id;
		if (userId) {
			userInfo = await coreApi.fetchUserInfo({ userId });

			if (userInfo.profile === null) {
				const newProfile = await profileApi.createProfileById({
					userId: userId
				});
				userInfo.profile = newProfile.profile;
			}

			// Populate form with user data
			if (userInfo?.user) {
				formData.firstName = formatString(userInfo.user.first_name, ['trim']);
				formData.middleName = formatString(userInfo.user.middle_name, ['trim']);
				formData.lastName = formatString(userInfo.user.surname, ['trim']);
				formData.mobileNumber = formatString(userInfo.user.mobile, ['trim']);
				formData.email = formatString(userInfo.user.email, ['trim']);
				formData.gender = formatString(userInfo.user.gender, ['trim']);
				formData.dob = formatString(userInfo.user.date_of_birth?.split('T')[0], ['trim']);
				formData.status = formatString(userInfo?.user?.status, ['trim']);
				formData.refNum1 = formatString(userInfo?.user.reference_member_1, ['trim']);
				formData.refNum2 = formatString(userInfo?.user.reference_member_2, ['trim']);
			}

			if (userInfo.profile) {
				formData.maritalStatus = formatString(userInfo.profile?.marital_status, ['trim']);
				formData.gotra = formatString(userInfo.profile?.gotra, ['trim']);
				formData.nativePlace = formatString(userInfo.profile?.native_place, ['trim']);
			}

			if (userInfo.address) {
				userAddress = getUserAddress(userInfo.address);
				if (userAddress) {
					formData.addressLine1 = formatString(userAddress.address_line_1, ['trim']);
					formData.addressLine2 = formatString(userAddress.address_line_2, ['trim']);
					formData.areaName = formatString(userAddress.area_name, ['trim']);
					formData.city = formatString(userAddress.city, ['trim']);
					formData.country = formatString(userAddress.country, ['trim']);
					formData.pincode = formatString(userAddress.pincode, ['trim']);
					formData.state = formatString(userAddress.state, ['trim']);
					formData.landmark = formatString(userAddress.landmark, ['trim']);
				}
			}

			originalGeneral = snapshot(GENERAL_FIELDS);
			originalOther = snapshot(OTHER_FIELDS);
			originalAddress = snapshot(ADDRESS_FIELDS);

			const nomineeRes = await nomineeApi.fetchNominees({ userId });
			nominees = nomineeRes.data;

			isLoading = false;
		}
	});

	/***************
    Nominees (admin: view, edit relation, delete — create is disabled for now)
  ****************/
	// Create disabled for now — keep implementation ready for when it's re-enabled.
	// async function createNominee() {
	// 	if (!userInfo?.user?._id) return;
	// 	nomineeSectionError = '';
	// 	nomineeSectionSuccess = '';
	// 	nomineeCreating = true;
	// 	try {
	// 		const res = await nomineeApi.createNominee({
	// 			payload: {
	// 				full_name: newNomineeName,
	// 				relation: newNomineeRelation as Nominee.Create['relation']
	// 			}
	// 		});
	// 		nominees = [...nominees, res.address];
	// 		newNomineeName = '';
	// 		newNomineeRelation = '';
	// 		nomineeSectionSuccess = res.message || 'Nominee has been created';
	// 	} catch (error: any) {
	// 		nomineeSectionError =
	// 			error?.response?.data?.error?.full_name ||
	// 			error?.response?.data?.error?.relation ||
	// 			error?.response?.data?.message ||
	// 			'Failed to create nominee. Please try again.';
	// 	} finally {
	// 		nomineeCreating = false;
	// 	}
	// }

	function openNomineeEdit(nominee: Nominee.Data) {
		editingNomineeId = nominee._id;
		editNomineeRelation = nominee.relation || '';
		nomineeSectionError = '';
		nomineeSectionSuccess = '';
	}

	async function saveNomineeRelation(nomineeId: string) {
		nomineeSectionError = '';
		nomineeSectionSuccess = '';
		nomineeSavingId = nomineeId;
		try {
			const res = await nomineeApi.updateNomineeRelation({
				nomineeId,
				payload: { relation: editNomineeRelation as Nominee.Update['relation'] }
			});
			nominees = nominees.map((n) => (n._id === nomineeId ? { ...n, ...res.nominee } : n));
			editingNomineeId = null;
			nomineeSectionSuccess = res.message || 'Nominee has been updated';
		} catch (error: any) {
			nomineeSectionError =
				error?.response?.data?.error?.relation ||
				error?.response?.data?.message ||
				'Failed to update nominee. Please try again.';
		} finally {
			nomineeSavingId = null;
		}
	}

	function openDeleteNominee(nominee: Nominee.Data) {
		nomineeToDelete = nominee;
	}

	function closeDeleteNominee() {
		nomineeToDelete = null;
	}

	async function confirmDeleteNominee() {
		if (!nomineeToDelete) return;
		const nomineeId = nomineeToDelete._id;
		nomineeSectionError = '';
		nomineeSectionSuccess = '';
		nomineeDeletingId = nomineeId;
		try {
			const res = await nomineeApi.deleteNominee({ nomineeId });
			nominees = nominees.filter((n) => n._id !== nomineeId);
			nomineeSectionSuccess = res.message || 'Nominee has been deleted';
			nomineeToDelete = null;
		} catch (error: any) {
			nomineeSectionError =
				error?.response?.data?.message || 'Failed to delete nominee. Please try again.';
		} finally {
			nomineeDeletingId = null;
		}
	}

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
						email: formData.email,
						reference_member_1: formData.refNum1,
						reference_member_2: formData.refNum2,
						status_details: userInfo.user.status_details,
						entry_date: formatToYYYYMMDD(userInfo.user.entry_date)
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

					originalGeneral = snapshot(GENERAL_FIELDS);
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

					originalOther = snapshot(OTHER_FIELDS);
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

					originalAddress = snapshot(ADDRESS_FIELDS);
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

{#if !isLoading}
	<div class="mx-auto max-w-5xl">
		<div class="space-y-6 p-2 lg:p-6">
			<Card title="General Info">
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Input
							id="firstName"
							label="First name"
							bind:value={formData.firstName}
							error={errors.firstName}
							onblur={() => validateField('firstName')}
							placeholder="First name"
							required
						/>

						<Input
							id="middleName"
							label="Middle name"
							bind:value={formData.middleName}
							error={errors.middleName}
							onblur={() => validateField('middleName')}
							placeholder="Middle name"
							required
						/>

						<Input
							id="lastName"
							label="Surname"
							bind:value={formData.lastName}
							error={errors.lastName}
							onblur={() => validateField('lastName')}
							placeholder="Surname"
							required
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
							required
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
								required
							/>
						</div>

						<Input
							id="dob"
							label="Date of birth"
							type="date"
							bind:value={formData.dob}
							error={errors.dob}
							onblur={() => validateField('dob')}
							required
						/>

						<Select
							id="gender"
							label="Gender"
							bind:value={formData.gender}
							options={genders}
							error={errors.gender}
							onchange={() => validateField('gender')}
							required
						/>

						<Input
							id="refNum1"
							label="Reference Number 1"
							bind:value={formData.refNum1}
							error={errors.refNum1}
							onblur={() => validateField('refNum1')}
							placeholder="Reference Number 1"
							required
						/>

						<Input
							id="refNum2"
							label="Reference Number 2"
							bind:value={formData.refNum2}
							error={errors.refNum2}
							onblur={() => validateField('refNum2')}
							placeholder="Reference Number 2"
							required
						/>

						<!-- <Select
						id="status"
						label="Status"
						bind:value={formData.status}
						options={memberStatus}
						error={errors.status}
						onchange={() => validateField('status')}
					/> -->
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

					<div class="mt-6 flex justify-end gap-2">
						{#if isGeneralDirty}
							<Button variant="secondary" size="sm" onclick={() => resetSection('general')}>
								Reset
							</Button>
						{/if}
						<Button
							variant="primary"
							size="sm"
							onclick={() => submitSection('general')}
							disabled={loaderStatus.general || !isGeneralDirty}
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
							required
						/>

						<Select
							id="gotra"
							label="Gotra"
							bind:value={formData.gotra}
							options={gotras}
							error={errors.gotra}
							onchange={() => validateField('gotra')}
							required
						/>

						<Select
							id="maritalStatus"
							label="Marital Status"
							bind:value={formData.maritalStatus}
							options={maritalStatus}
							error={errors.maritalStatus}
							onchange={() => validateField('maritalStatus')}
							required
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

					<div class="mt-6 flex justify-end gap-2">
						{#if isOtherDirty}
							<Button variant="secondary" size="sm" onclick={() => resetSection('other')}>
								Reset
							</Button>
						{/if}
						<Button
							variant="primary"
							size="sm"
							onclick={() => submitSection('other')}
							disabled={loaderStatus.other || !isOtherDirty}
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
							required
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
							required
						/>

						<Input
							id="landmark"
							label="Landmark"
							bind:value={formData.landmark}
							error={errors.landmark}
							onblur={() => validateField('landmark')}
							placeholder="Nearby landmark"
							required
						/>

						<Input
							id="city"
							label="City"
							bind:value={formData.city}
							error={errors.city}
							onblur={() => validateField('city')}
							placeholder="City"
							required
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
							required
						/>

						<Input
							id="state"
							label="State"
							bind:value={formData.state}
							error={errors.state}
							onblur={() => validateField('state')}
							placeholder="State"
							required
						/>

						<Input
							id="country"
							label="Country"
							bind:value={formData.country}
							error={errors.country}
							onblur={() => validateField('country')}
							placeholder="Country"
							required
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

					<div class="mt-6 flex justify-end gap-2">
						{#if isAddressDirty}
							<Button variant="secondary" size="sm" onclick={() => resetSection('address')}>
								Reset
							</Button>
						{/if}
						<Button
							variant="primary"
							size="sm"
							onclick={() => submitSection('address')}
							disabled={loaderStatus.address || !isAddressDirty}
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

				<!-- Nominees -->
				<Card title="Nominees">
					{#if nominees.length === 0}
						<p class="text-sm text-gray-500">No nominees on file.</p>
					{:else}
						<div class="space-y-3">
							{#each nominees as nominee (nominee._id)}
								<div class="rounded-md border border-gray-200 p-3">
									{#if editingNomineeId === nominee._id}
										<div class="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-end">
											<div>
												<p class="mb-1 text-sm font-medium text-gray-700">Name</p>
												<p class="text-sm text-gray-900">{nominee.full_name}</p>
											</div>
											<Select
												id={`edit-relation-${nominee._id}`}
												label="Relation"
												bind:value={editNomineeRelation}
												options={nomineeRelations}
												required
											/>
										</div>
										<div class="mt-3 flex justify-end gap-2">
											<Button
												variant="secondary"
												size="sm"
												onclick={() => (editingNomineeId = null)}
												disabled={nomineeSavingId === nominee._id}
											>
												Cancel
											</Button>
											<Button
												variant="primary"
												size="sm"
												onclick={() => saveNomineeRelation(nominee._id)}
												disabled={nomineeSavingId === nominee._id || !editNomineeRelation}
											>
												{nomineeSavingId === nominee._id ? 'Saving...' : 'Save'}
											</Button>
										</div>
									{:else}
										<div class="flex items-center justify-between gap-3">
											<div>
												<p class="text-sm font-medium text-gray-900">{nominee.full_name}</p>
												<p class="text-sm capitalize text-gray-500">
													{nominee.relation
														? nomineeRelations.find((r) => r.key === nominee.relation)?.label ||
															nominee.relation
														: 'Relation not set'}
												</p>
											</div>
											<div class="flex flex-shrink-0 items-center gap-3">
												<Button variant="secondary" size="sm" onclick={() => openNomineeEdit(nominee)}>
													Edit
												</Button>
												<button
													type="button"
													onclick={() => openDeleteNominee(nominee)}
													disabled={nomineeDeletingId === nominee._id}
													class="ml-2 rounded-md border-l border-gray-200 py-1 pl-3 text-gray-400 hover:text-red-600 disabled:opacity-50"
													aria-label="Delete nominee"
												>
													<Trash2 class="h-4 w-4" />
												</button>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					<!-- Add nominee — disabled for now, admin-side create is not offered yet.
					{#if nominees.length < 2}
						<div
							class="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 md:grid-cols-2 md:items-end"
						>
							<Input
								id="newNomineeName"
								label="Nominee name"
								bind:value={newNomineeName}
								placeholder="Full name"
								required
							/>
							<Select
								id="newNomineeRelation"
								label="Relation"
								bind:value={newNomineeRelation}
								options={nomineeRelations}
								required
							/>
						</div>
						<div class="mt-3 flex justify-end">
							<Button
								variant="primary"
								size="sm"
								onclick={createNominee}
								disabled={nomineeCreating || !newNomineeName.trim() || !newNomineeRelation}
							>
								{nomineeCreating ? 'Adding...' : 'Add Nominee'}
							</Button>
						</div>
					{:else}
						<p class="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500">
							Maximum of 2 nominees reached.
						</p>
					{/if}
					-->

					{#if nomineeSectionError}
						<div class="mt-4 rounded-md bg-red-50 p-4">
							<p class="text-sm text-red-800">{nomineeSectionError}</p>
						</div>
					{/if}
					{#if nomineeSectionSuccess}
						<div class="mt-4 rounded-md bg-green-50 p-4">
							<p class="text-sm text-green-800">{nomineeSectionSuccess}</p>
						</div>
					{/if}
				</Card>
		</div>
	</div>
{:else}
	<div class="flex min-h-[60vh] items-center justify-center">
		<div class="text-center">
			<div
				class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
			></div>
			<p class="mt-4 text-gray-600">Loading member info...</p>
		</div>
	</div>
{/if}

<!-- Delete nominee confirmation -->
<Modal open={!!nomineeToDelete} onClose={closeDeleteNominee} title="Delete Nominee">
	{#if nomineeToDelete}
		<p class="text-sm text-gray-700">
			Are you sure you want to delete <strong>{nomineeToDelete.full_name}</strong> as a nominee?
			This cannot be undone.
		</p>
		<div class="mt-4 flex justify-end gap-2">
			<Button
				variant="secondary"
				size="sm"
				onclick={closeDeleteNominee}
				disabled={nomineeDeletingId === nomineeToDelete._id}
			>
				Cancel
			</Button>
			<Button
				variant="danger"
				size="sm"
				onclick={confirmDeleteNominee}
				disabled={nomineeDeletingId === nomineeToDelete._id}
			>
				{nomineeDeletingId === nomineeToDelete._id ? 'Deleting...' : 'Delete'}
			</Button>
		</div>
	{/if}
</Modal>
