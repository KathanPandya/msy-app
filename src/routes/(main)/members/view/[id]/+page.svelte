<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import coreApi from '$lib/endpoints/coreApi';
	import familiesApi from '$lib/endpoints/familiesApi';
	import paymentApi from '$lib/endpoints/paymentApi';
	import profileApi from '$lib/endpoints/profileApi';
	import addressApi from '$lib/endpoints/addressApi';
	import userApi from '$lib/endpoints/userApi';
	import nomineeApi from '$lib/endpoints/nomineeApi';
	import { updateUserSchema } from '$lib/schema/update-user';
	import { APP_CONSTANTS, getMemberStatusLabel } from '$lib/constants/app-constants';
	import type { Payment } from '$lib/types/payment';
	import type { Address } from '$lib/types/address';
	import type { Form } from '$lib/types/form';
	import type { Nominee } from '$lib/types/nominee';
	import { formatDate, formatToYYYYMMDD, getUserAddress } from '$lib/utilities/helperFunc';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import { formatString } from '$lib/utilities/stringUtils';
	import { pageTitleOverride } from '$lib/stores/pageTitleStore';
	import { t } from '$lib/i18n';
	import Payments from '$lib/components/other/Payments.svelte';
	import PaymentDonut from '$lib/components/other/PaymentDonut.svelte';
	import PaymentYearlyBars from '$lib/components/other/PaymentYearlyBars.svelte';
	import FamilyPanel from '$lib/components/other/FamilyPanel.svelte';
	import MemberStatusPanel from '$lib/components/other/MemberStatusPanel.svelte';
	import { Pencil, Trash2 } from '@lucide/svelte';
	import { onMount, onDestroy } from 'svelte';

	type TabKey = 'info' | 'payments' | 'family' | 'status' | 'other';
	const tabs: { key: TabKey; label: string }[] = [
		{ key: 'info', label: 'Info' },
		{ key: 'payments', label: 'Payments' },
		{ key: 'family', label: 'Family' },
		{ key: 'status', label: 'Status' },
		{ key: 'other', label: 'Other' }
	];
	const tabKeys = new Set(tabs.map((t) => t.key));
	function isTabKey(value: string | null): value is TabKey {
		return !!value && tabKeys.has(value as TabKey);
	}

	const urlTab = page.url.searchParams.get('tab');
	let activeTab = $state<TabKey>(isTabKey(urlTab) ? urlTab : 'info');

	function selectTab(tab: TabKey) {
		activeTab = tab;
		const url = new URL(page.url);
		url.searchParams.set('tab', tab);
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
	}

	let paymentsTableInfo = $state<Payment.OutstandingData | null>(null);

	// Charts default to closed here — the table is what admins look at most.
	let showCharts = $state(
		typeof localStorage !== 'undefined'
			? localStorage.getItem('admin_payments_charts_visible') === '1'
			: false
	);
	function toggleCharts() {
		showCharts = !showCharts;
		localStorage.setItem('admin_payments_charts_visible', showCharts ? '1' : '0');
	}

	const paymentsTotalAmount = $derived(
		(paymentsTableInfo?.outstandingAmount ?? 0) + (paymentsTableInfo?.totalPayment ?? 0)
	);
	const paymentsAmountPaid = $derived(paymentsTableInfo?.totalPayment ?? 0);
	const paymentsRemainingAmount = $derived(paymentsTotalAmount - paymentsAmountPaid);
	const paymentsIsCredit = $derived(paymentsRemainingAmount < 0);
	const paymentsIsSettled = $derived(paymentsRemainingAmount === 0 && paymentsTotalAmount > 0);
	const paymentsBalanceLabel = $derived(
		paymentsIsSettled
			? t(undefined, 'balance')
			: paymentsIsCredit
				? t(undefined, 'credit')
				: t(undefined, 'due')
	);

	async function reloadPayments() {
		const userId = page.params.id;
		if (!userId) return;
		const res = await paymentApi.getOutstandingPaymentOfMember(userId);
		paymentsTableInfo = res.data;
	}

	async function refreshStatusAfterChange() {
		const userId = page.params.id;
		if (!userId) return;
		const userInfo = await coreApi.fetchUserInfo({ userId });
		if (userInfo?.user) {
			userData.status = getMemberStatusLabel(formatString(userInfo.user.status, ['trim']));
			applyPinFields(userInfo.user);
		}
	}

	let isLoading = $state(false);
	let pinBusy = $state(false);
	let pinError = $state('');
	let tempPinBanner = $state<{ memberId: string; tempPin: string } | null>(null);
	let unlockBanner = $state('');
	let memberIdRaw = $state('');
	let pinStatus = $state({
		has_pin: false,
		must_change_pin: false,
		locked: false,
		pin_attempts: 0,
		club_id: null as string | null,
		statusRaw: ''
	});

	let userData = {
		હિસાબ: 0,
		name: '',
		firstName: '',
		middleName: '',
		surname: '',
		mobile: '',
		email: '',
		dob: '',
		gender: '',
		referenceMember1: '',
		referenceMember2: '',
		status: '',
		nativePlace: '',
		gotra: '',
		maritalStatus: '',
		addressLine1: '',
		addressLine2: '',
		areaName: '',
		landmark: '',
		city: '',
		pincode: '',
		state: '',
		country: '',
		joiningDate: '',
		_id: ''
	};

	const isActiveMember = $derived(pinStatus.statusRaw === 'active');

	// --- In-place edit state (General / Other / Address / Nominees) ---
	let userAddress = $state<Address.Data | null>(null);
	let userProfileId = $state('');
	let entryDateRaw = $state('');
	let profileFinancials = $state({
		entrance_fee: 0,
		corpus_fund: 0,
		deposit: 0
	});

	let generalEditing = $state(false);
	let otherEditing = $state(false);
	let addressEditing = $state(false);

	const genders = APP_CONSTANTS.GENDERS;
	const gotras = APP_CONSTANTS.GOTRAS;
	const maritalStatusOptions = APP_CONSTANTS.MARITAL_STATUS;
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
		refNum1: '',
		refNum2: ''
	});

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

	function resetSectionFields<K extends keyof Form.UserUpdate>(
		keys: readonly K[],
		original: Pick<Form.UserUpdate, K>
	) {
		keys.forEach((k) => {
			formData[k] = original[k];
			errors[k] = '';
		});
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

	function isSectionDirty<K extends keyof Form.UserUpdate>(
		keys: readonly K[],
		original: Pick<Form.UserUpdate, K>
	) {
		return keys.some((k) => formData[k] !== original[k]);
	}

	const isGeneralDirty = $derived(isSectionDirty(GENERAL_FIELDS, originalGeneral));
	const isOtherDirty = $derived(isSectionDirty(OTHER_FIELDS, originalOther));
	const isAddressDirty = $derived(isSectionDirty(ADDRESS_FIELDS, originalAddress));

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
	let sectionErrors = $state<Record<string, string>>({ general: '', other: '', address: '' });
	let sectionSuccess = $state<Record<string, string>>({ general: '', other: '', address: '' });

	function openGeneralEdit() {
		sectionErrors.general = '';
		sectionSuccess.general = '';
		generalEditing = true;
	}
	function cancelGeneralEdit() {
		resetSectionFields(GENERAL_FIELDS, originalGeneral);
		sectionErrors.general = '';
		generalEditing = false;
	}
	function openOtherEdit() {
		sectionErrors.other = '';
		sectionSuccess.other = '';
		otherEditing = true;
	}
	function cancelOtherEdit() {
		resetSectionFields(OTHER_FIELDS, originalOther);
		sectionErrors.other = '';
		otherEditing = false;
	}
	function openAddressEdit() {
		sectionErrors.address = '';
		sectionSuccess.address = '';
		addressEditing = true;
	}
	function cancelAddressEdit() {
		resetSectionFields(ADDRESS_FIELDS, originalAddress);
		sectionErrors.address = '';
		addressEditing = false;
	}

	async function submitSection(section: 'general' | 'other' | 'address') {
		sectionErrors[section] = '';
		sectionSuccess[section] = '';
		loaderStatus[section] = true;

		try {
			if (section === 'general') {
				if (!userData._id) throw new Error('User ID is missing');

				const response = await userApi.updateUser({
					userId: userData._id,
					payload: {
						first_name: formData.firstName,
						middle_name: formData.middleName,
						surname: formData.lastName,
						date_of_birth: formatToYYYYMMDD(formData.dob),
						gender: formData.gender,
						mobile: formData.mobileNumber,
						email: formData.email,
						reference_member_1: formData.refNum1,
						reference_member_2: formData.refNum2,
						entry_date: formatToYYYYMMDD(entryDateRaw)
					}
				});

				if (response.user) {
					formData.firstName = response.user.first_name || '';
					formData.middleName = response.user.middle_name || '';
					formData.lastName = response.user.surname || '';
					formData.mobileNumber = response.user.mobile || '';
					formData.email = response.user.email || '';
					formData.gender = response.user.gender || '';
					formData.dob = response.user.date_of_birth?.split('T')[0] || '';
					formData.refNum1 = response.user.reference_member_1 || '';
					formData.refNum2 = response.user.reference_member_2 || '';

					userData.name = response.user.name || userData.name;
					userData.firstName = formData.firstName;
					userData.middleName = formData.middleName;
					userData.surname = formData.lastName;
					userData.mobile = formData.mobileNumber;
					userData.email = formData.email;
					userData.gender = formatString(formData.gender, ['trim', 'capitalize-first']);
					userData.dob = formData.dob;
					userData.referenceMember1 = formData.refNum1;
					userData.referenceMember2 = formData.refNum2;

					originalGeneral = snapshot(GENERAL_FIELDS);
					sectionSuccess.general = response.message || 'General info updated successfully';
					generalEditing = false;
					syncPageTitle();
				}
			} else if (section === 'other') {
				if (!userProfileId) throw new Error('Profile ID is missing');

				const response = await profileApi.updateProfile({
					profileId: userProfileId,
					payload: {
						native_place: formData.nativePlace,
						marital_status: formData.maritalStatus,
						gotra: formData.gotra,
						entrance_fee: profileFinancials.entrance_fee,
						corpus_fund: profileFinancials.corpus_fund,
						deposit: profileFinancials.deposit
					}
				});

				if (response.profile) {
					formData.maritalStatus = response.profile.marital_status || '';
					formData.gotra = response.profile.gotra || '';
					formData.nativePlace = response.profile.native_place || '';

					userData.maritalStatus = formatString(formData.maritalStatus, [
						'trim',
						'capitalize-first'
					]);
					userData.gotra = formatString(formData.gotra, ['trim', 'capitalize-first']);
					userData.nativePlace = formatString(formData.nativePlace, ['trim', 'capitalize-first']);

					originalOther = snapshot(OTHER_FIELDS);
					sectionSuccess.other = response.message || 'Other info updated successfully';
					otherEditing = false;
				}
			} else if (section === 'address') {
				if (!userAddress?._id) throw new Error('Address ID is missing');

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

					userData.addressLine1 = formData.addressLine1;
					userData.addressLine2 = formData.addressLine2;
					userData.areaName = formData.areaName;
					userData.landmark = formData.landmark;
					userData.city = formData.city;
					userData.pincode = formData.pincode;
					userData.state = formData.state;
					userData.country = formData.country;

					originalAddress = snapshot(ADDRESS_FIELDS);
					sectionSuccess.address = response.message || 'Address updated successfully';
					addressEditing = false;
				}
			}
		} catch (error: any) {
			const backendError = error?.response?.data?.error;
			const backendErrorMessage =
				typeof backendError === 'string'
					? backendError
					: backendError && typeof backendError === 'object'
						? Object.values(backendError)[0]
						: undefined;

			sectionErrors[section] =
				error?.response?.data?.message ||
				backendErrorMessage ||
				error?.message ||
				`Failed to update ${section}. Please try again.`;
		} finally {
			loaderStatus[section] = false;
			if (sectionSuccess[section]) {
				setTimeout(() => {
					sectionSuccess[section] = '';
				}, 3000);
			}
		}
	}

	// --- Nominees (view, edit relation, delete) ---
	let nominees = $state<Nominee.Data[]>([]);
	let editingNomineeId = $state<string | null>(null);
	let editNomineeRelation = $state('');
	let nomineeSavingId = $state<string | null>(null);
	let nomineeDeletingId = $state<string | null>(null);
	let nomineeToDelete = $state<Nominee.Data | null>(null);
	let nomineeSectionError = $state('');
	let nomineeSectionSuccess = $state('');

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

	function applyPinFields(user: {
		has_pin?: boolean;
		must_change_pin?: boolean;
		locked?: boolean;
		pin_attempts?: number;
		club_id?: string | null;
		status?: string;
		member_id?: string;
	}) {
		pinStatus = {
			has_pin: Boolean(user.has_pin),
			must_change_pin: Boolean(user.must_change_pin),
			locked: Boolean(user.locked),
			pin_attempts: user.pin_attempts || 0,
			club_id: user.club_id || null,
			statusRaw: user.status || ''
		};
		if (user.member_id) memberIdRaw = user.member_id;
	}

	function syncPageTitle() {
		pageTitleOverride.set(formatMemberDisplay(userData.name, memberIdRaw));
	}

	onDestroy(() => {
		pageTitleOverride.set(null);
	});

	onMount(async () => {
		const userId = page.params.id;
		if (userId) {
			isLoading = true;
			const res = await paymentApi.getOutstandingPaymentOfMember(userId);
			paymentsTableInfo = res.data;

			userData.હિસાબ = paymentsTableInfo.outstandingAmount;

			let userInfo = await coreApi.fetchUserInfo({ userId });

			if (userInfo.profile === null) {
				const newProfile = await profileApi.createProfileById({
					userId: userId
				});
				userInfo.profile = newProfile.profile;
			}

			if (userInfo?.user) {
				userData.name = userInfo.user.name;
				userData.firstName = formatString(userInfo.user.first_name, ['trim']);
				userData.middleName = formatString(userInfo.user.middle_name, ['trim']);
				userData.surname = formatString(userInfo.user.surname, ['trim']);
				userData.mobile = formatString(userInfo.user.mobile, ['trim']);
				userData.email = formatString(userInfo.user.email, ['trim']);
				userData.gender = formatString(userInfo.user.gender, ['trim', 'capitalize-first']);
				userData.dob = formatString(userInfo.user.date_of_birth?.split('T')[0], ['trim']);
				userData.status = getMemberStatusLabel(formatString(userInfo?.user?.status, ['trim']));
				userData.joiningDate = formatDate(userInfo.user.entry_date);
				userData._id = userInfo.user._id;
				applyPinFields(userInfo.user);
				entryDateRaw = userInfo.user.entry_date;

				formData.firstName = userData.firstName;
				formData.middleName = userData.middleName;
				formData.lastName = userData.surname;
				formData.mobileNumber = userData.mobile;
				formData.email = userData.email;
				formData.gender = formatString(userInfo.user.gender, ['trim']);
				formData.dob = userData.dob;
				formData.refNum1 = formatString(userInfo.user.reference_member_1, ['trim']);
				formData.refNum2 = formatString(userInfo.user.reference_member_2, ['trim']);
				userData.referenceMember1 = formData.refNum1;
				userData.referenceMember2 = formData.refNum2;
			}

			if (userInfo.profile) {
				userData.maritalStatus = formatString(userInfo.profile?.marital_status, [
					'trim',
					'capitalize-first'
				]);
				userData.gotra = formatString(userInfo.profile?.gotra, ['trim', 'capitalize-first']);
				userData.nativePlace = formatString(userInfo.profile?.native_place, [
					'trim',
					'capitalize-first'
				]);

				userProfileId = userInfo.profile._id;
				profileFinancials = {
					entrance_fee: userInfo.profile.entrance_fee,
					corpus_fund: userInfo.profile.corpus_fund,
					deposit: userInfo.profile.deposit
				};
				formData.maritalStatus = formatString(userInfo.profile.marital_status, ['trim']);
				formData.gotra = formatString(userInfo.profile.gotra, ['trim']);
				formData.nativePlace = formatString(userInfo.profile.native_place, ['trim']);
			}

			if (userInfo.address) {
				userAddress = getUserAddress(userInfo.address);
				if (userAddress) {
					userData.addressLine1 = formatString(userAddress.address_line_1, ['trim']);
					userData.addressLine2 = formatString(userAddress.address_line_2, ['trim']);
					userData.areaName = formatString(userAddress.area_name, ['trim']);
					userData.city = formatString(userAddress.city, ['trim']);
					userData.country = formatString(userAddress.country, ['trim']);
					userData.pincode = formatString(userAddress.pincode, ['trim']);
					userData.state = formatString(userAddress.state, ['trim']);
					userData.landmark = formatString(userAddress.landmark, ['trim']);

					formData.addressLine1 = userData.addressLine1;
					formData.addressLine2 = userData.addressLine2;
					formData.areaName = userData.areaName;
					formData.landmark = userData.landmark;
					formData.city = userData.city;
					formData.pincode = userData.pincode;
					formData.state = userData.state;
					formData.country = userData.country;
				}
			}

			originalGeneral = snapshot(GENERAL_FIELDS);
			originalOther = snapshot(OTHER_FIELDS);
			originalAddress = snapshot(ADDRESS_FIELDS);

			const nomineeRes = await nomineeApi.fetchNominees({ userId });
			nominees = nomineeRes.data;

			syncPageTitle();
			isLoading = false;
		}
	});

	async function handleResetPin() {
		if (!userData._id || !isActiveMember) return;
		pinBusy = true;
		pinError = '';
		unlockBanner = '';
		try {
			const res = await familiesApi.resetPin(userData._id);
			tempPinBanner = {
				memberId: formatMemberDisplay(userData.name, memberIdRaw || res.member.member_id),
				tempPin: res.tempPin
			};
			applyPinFields(res.member);
		} catch (err: any) {
			pinError = err?.response?.data?.message || 'Could not reset PIN.';
		} finally {
			pinBusy = false;
		}
	}

	async function handleUnlock() {
		if (!userData._id || !isActiveMember) return;
		pinBusy = true;
		pinError = '';
		try {
			const res = await familiesApi.unlock(userData._id);
			unlockBanner = `${formatMemberDisplay(userData.name, memberIdRaw || res.member.member_id)} unlocked.`;
			tempPinBanner = null;
			applyPinFields(res.member);
		} catch (err: any) {
			pinError = err?.response?.data?.message || 'Could not unlock member.';
		} finally {
			pinBusy = false;
		}
	}

	function dismissTempPin() {
		tempPinBanner = null;
	}

	const pinTag = $derived.by(() => {
		if (!isActiveMember) return '—';
		if (pinStatus.locked) return 'Locked';
		if (!pinStatus.has_pin) return 'No PIN';
		if (pinStatus.must_change_pin) return 'Temp PIN';
		return 'Set';
	});
</script>

{#if !isLoading}
	<div>
		<!-- Status + Joining Date -->
		<div class="flex items-center gap-4 text-sm">
			<span class="text-gray-500">Status: <span class="font-medium text-gray-900">{userData.status}</span></span>
			<span class="text-gray-500">Joined: <span class="font-medium text-gray-900">{userData.joiningDate}</span></span>
		</div>
		<!-- Tabs -->
		<div class="mb-2 border-b border-gray-200">
			<nav class="-mb-px flex gap-4 overflow-x-auto">
				{#each tabs as tab}
					<button
						type="button"
						onclick={() => selectTab(tab.key)}
						class="whitespace-nowrap border-b-2 px-1 py-1.5 text-sm font-medium {activeTab === tab.key
							? 'border-blue-600 text-blue-600'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					>
						{tab.label}
					</button>
				{/each}
			</nav>
		</div>

			{#if activeTab === 'info'}
			<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<!-- General Information -->
			<div class="rounded-lg bg-white p-4 shadow-sm">
				<div class="mb-3 flex items-center justify-between gap-2 border-b pb-2">
					<div class="flex min-w-0 items-center gap-2">
						<h2 class="text-xl font-semibold text-gray-800">General Information</h2>
						{#if sectionSuccess.general}
							<span class="truncate text-xs text-green-700">{sectionSuccess.general}</span>
						{/if}
					</div>
					{#if !generalEditing}
						<button
							type="button"
							onclick={openGeneralEdit}
							class="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
						>
							<Pencil class="h-3 w-3" />
							Edit
						</button>
					{/if}
				</div>

				{#if generalEditing}
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
					</div>

					{#if sectionErrors.general}
						<p class="mt-4 text-sm text-red-600">{sectionErrors.general}</p>
					{/if}

					<div class="mt-3 flex justify-end gap-2">
						<Button
							variant="secondary"
							size="sm"
							onclick={cancelGeneralEdit}
							disabled={loaderStatus.general}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							size="sm"
							onclick={() => submitSection('general')}
							disabled={loaderStatus.general || !isGeneralDirty}
						>
							{loaderStatus.general ? 'Saving...' : 'Save'}
						</Button>
					</div>
				{:else}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">First Name</p>
						<p class="text-base text-gray-900">{userData.firstName}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Middle Name</p>
						<p class="text-base text-gray-900">{userData.middleName}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Surname</p>
						<p class="text-base text-gray-900">{userData.surname}</p>
					</div>

					<div class="min-w-0">
						<p class="mb-1 text-sm font-medium text-gray-500">Mobile Number</p>
						<p class="flex min-w-0 items-center text-base text-gray-900">
							<svg
								class="mr-2 h-4 w-4 flex-shrink-0 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
								/>
							</svg>
							<span class="truncate">{userData.mobile}</span>
						</p>
					</div>

					<div class="min-w-0">
						<p class="mb-1 text-sm font-medium text-gray-500">Email</p>
						<p class="flex min-w-0 items-center text-base text-gray-900">
							<svg
								class="mr-2 h-4 w-4 flex-shrink-0 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
								/>
							</svg>
							<span class="truncate">{userData.email}</span>
						</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Date of Birth</p>
						<p class="text-base text-gray-900">
							{new Date(userData.dob).toLocaleDateString('en-IN', {
								day: 'numeric',
								month: 'long',
								year: 'numeric'
							})}
						</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Gender</p>
						<p class="text-base text-gray-900">{userData.gender}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Reference Number 1</p>
						<p class="text-base text-gray-900">{userData.referenceMember1 || '-'}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Reference Number 2</p>
						<p class="text-base text-gray-900">{userData.referenceMember2 || '-'}</p>
					</div>

					<!-- <div>
						<p class="mb-1 text-sm font-medium text-gray-500">Blood Group</p>
						<p class="text-base text-gray-900">{userData.bloodGroup}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Occupation</p>
						<p class="text-base text-gray-900">{userData.occupation}</p>
					</div> -->
				</div>
				{/if}
			</div>

			<!-- Other Information -->
			<div class="rounded-lg bg-white p-4 shadow-sm">
				<div class="mb-3 flex items-center justify-between gap-2 border-b pb-2">
					<div class="flex min-w-0 items-center gap-2">
						<h2 class="text-xl font-semibold text-gray-800">Other Information</h2>
						{#if sectionSuccess.other}
							<span class="truncate text-xs text-green-700">{sectionSuccess.other}</span>
						{/if}
					</div>
					{#if !otherEditing}
						<button
							type="button"
							onclick={openOtherEdit}
							class="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
						>
							<Pencil class="h-3 w-3" />
							Edit
						</button>
					{/if}
				</div>

				{#if otherEditing}
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
							options={maritalStatusOptions}
							error={errors.maritalStatus}
							onchange={() => validateField('maritalStatus')}
							required
						/>
					</div>

					{#if sectionErrors.other}
						<p class="mt-4 text-sm text-red-600">{sectionErrors.other}</p>
					{/if}

					<div class="mt-3 flex justify-end gap-2">
						<Button
							variant="secondary"
							size="sm"
							onclick={cancelOtherEdit}
							disabled={loaderStatus.other}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							size="sm"
							onclick={() => submitSection('other')}
							disabled={loaderStatus.other || !isOtherDirty}
						>
							{loaderStatus.other ? 'Saving...' : 'Save'}
						</Button>
					</div>
				{:else}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Native Place</p>
						<p class="text-base text-gray-900">{userData.nativePlace}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Gotra</p>
						<p class="text-base text-gray-900">{userData.gotra}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Marital Status</p>
						<p class="text-base text-gray-900">{userData.maritalStatus}</p>
					</div>

					<!-- <div>
						<p class="mb-1 text-sm font-medium text-gray-500">Membership Type</p>
						<p class="text-base text-gray-900">
							<span class="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
								{userData.membershipType}
							</span>
						</p>
					</div> -->
				</div>
				{/if}
			</div>

			<!-- Address Information -->
			<div class="rounded-lg bg-white p-4 shadow-sm">
				<div class="mb-3 flex items-center justify-between gap-2 border-b pb-2">
					<div class="flex min-w-0 items-center gap-2">
						<h2 class="text-xl font-semibold text-gray-800">Address</h2>
						{#if sectionSuccess.address}
							<span class="truncate text-xs text-green-700">{sectionSuccess.address}</span>
						{/if}
					</div>
					{#if !addressEditing}
						<button
							type="button"
							onclick={openAddressEdit}
							class="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
						>
							<Pencil class="h-3 w-3" />
							Edit
						</button>
					{/if}
				</div>

				{#if addressEditing}
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
						<p class="mt-4 text-sm text-red-600">{sectionErrors.address}</p>
					{/if}

					<div class="mt-3 flex justify-end gap-2">
						<Button
							variant="secondary"
							size="sm"
							onclick={cancelAddressEdit}
							disabled={loaderStatus.address}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							size="sm"
							onclick={() => submitSection('address')}
							disabled={loaderStatus.address || !isAddressDirty}
						>
							{loaderStatus.address ? 'Saving...' : 'Save'}
						</Button>
					</div>
				{:else}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="md:col-span-2">
						<p class="mb-1 text-sm font-medium text-gray-500">Address Line 1</p>
						<p class="text-base text-gray-900">{userData.addressLine1}</p>
					</div>

					<div class="md:col-span-2">
						<p class="mb-1 text-sm font-medium text-gray-500">Address Line 2</p>
						<p class="text-base text-gray-900">{userData.addressLine2}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Area Name</p>
						<p class="text-base text-gray-900">{userData.areaName}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Landmark</p>
						<p class="text-base text-gray-900">{userData.landmark}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">City</p>
						<p class="text-base text-gray-900">{userData.city}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Pincode</p>
						<p class="text-base text-gray-900">{userData.pincode}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">State</p>
						<p class="text-base text-gray-900">{userData.state}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Country</p>
						<p class="text-base text-gray-900">{userData.country}</p>
					</div>
				</div>
				{/if}
			</div>

			<!-- Nominees -->
			<div class="rounded-lg bg-white p-4 shadow-sm">
				<div class="mb-3 flex items-center justify-between gap-2 border-b pb-2">
					<h2 class="text-xl font-semibold text-gray-800">Nominees</h2>
				</div>

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
											disabled={nomineeSavingId === nominee._id ||
												!editNomineeRelation ||
												editNomineeRelation === (nominee.relation || '')}
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
											<button
												type="button"
												onclick={() => openNomineeEdit(nominee)}
												class="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
											>
												<Pencil class="h-3 w-3" />
												Edit
											</button>
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

				{#if nomineeSectionError}
					<p class="mt-4 text-sm text-red-600">{nomineeSectionError}</p>
				{/if}
				{#if nomineeSectionSuccess}
					<p class="mt-4 text-sm text-green-700">{nomineeSectionSuccess}</p>
				{/if}
			</div>
			</div>
			{:else if activeTab === 'payments'}
				<!-- Payments -->
				<div class="flex flex-shrink-0 items-center justify-between">
					{#if !showCharts}
						<p class="text-xs text-gray-600">
							{t(undefined, 'paid')}
							<span class="font-semibold text-blue-600">₹{paymentsAmountPaid}</span>
							· {paymentsBalanceLabel}
							<span
								class={`font-semibold ${paymentsIsCredit ? 'text-green-600' : 'text-red-600'}`}
							>
								₹{Math.abs(paymentsRemainingAmount)}
							</span>
						</p>
					{:else}
						<span></span>
					{/if}
					<button
						type="button"
						onclick={toggleCharts}
						class="text-xs font-medium text-blue-600 hover:underline"
					>
						{showCharts ? t(undefined, 'hideCharts') : t(undefined, 'showCharts')}
					</button>
				</div>

				{#if showCharts}
					<div class="mt-2 flex flex-shrink-0 flex-col gap-2 lg:flex-row lg:items-stretch">
						<div class="min-w-0 lg:flex-1">
							<PaymentDonut
								totalAmount={paymentsTotalAmount}
								amountPaid={paymentsAmountPaid}
								remainingAmount={paymentsRemainingAmount}
							/>
						</div>
						<div class="min-w-0 lg:flex-1">
							<PaymentYearlyBars
								paymentRecords={paymentsTableInfo?.paymentRecords ?? []}
								deadMemberRecords={paymentsTableInfo?.deadMemberRecords ?? []}
							/>
						</div>
					</div>
				{/if}

				{#if paymentsTableInfo}
					<div class="mt-2">
						<Payments
							outstandingTableData={paymentsTableInfo}
							memberName={userData.name}
							memberId={memberIdRaw}
							fitHeight={false}
							hideSummary={true}
							showSearch={false}
							showMemberLabel={false}
							onDeleted={reloadPayments}
						/>
					</div>
				{/if}
			{:else if activeTab === 'family'}
				<FamilyPanel clubId={pinStatus.club_id} />
			{:else if activeTab === 'status'}
				<MemberStatusPanel userId={userData._id} onStatusChanged={refreshStatusAfterChange} />
			{:else if activeTab === 'other'}
				<div class="space-y-3">
					{#if tempPinBanner}
						<div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
							<p class="text-sm font-medium text-amber-950">
								Temp PIN for {tempPinBanner.memberId}:
								<span class="font-mono text-lg tracking-widest">{tempPinBanner.tempPin}</span>
								— share it with the member; they must change it on next login. It won't be shown again.
							</p>
							<button
								type="button"
								onclick={dismissTempPin}
								class="mt-2 text-sm font-medium text-amber-800 underline"
							>
								Dismiss
							</button>
						</div>
					{/if}
					{#if unlockBanner}
						<div class="rounded-md bg-green-50 p-4 text-sm text-green-800">{unlockBanner}</div>
					{/if}
					{#if pinError}
						<div class="rounded-md bg-red-50 p-4 text-sm text-red-800">{pinError}</div>
					{/if}

					<!-- Login PIN (admin) -->
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<div class="flex items-center justify-between gap-3">
							<h2 class="text-lg font-semibold text-gray-800">Login PIN</h2>
							{#if isActiveMember}
								<div class="flex shrink-0 flex-wrap justify-end gap-2">
									{#if pinStatus.locked}
										<Button variant="secondary" size="sm" disabled={pinBusy} onclick={handleUnlock}>
											Unlock
										</Button>
									{/if}
									<Button variant="primary" size="sm" disabled={pinBusy} onclick={handleResetPin}>
										{pinStatus.has_pin ? 'Reset PIN' : 'Generate Temp PIN'}
									</Button>
								</div>
							{:else}
								<span class="text-sm text-gray-400">—</span>
							{/if}
						</div>
						<p class="mt-1 text-sm text-gray-600">
							Status:
							<span class="font-medium text-gray-900">{pinTag}</span>
							{#if isActiveMember && pinStatus.pin_attempts > 0 && !pinStatus.locked}
								<span class="text-gray-500">· {pinStatus.pin_attempts}/5</span>
							{/if}
						</p>
					</div>
				</div>
		{/if}
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
