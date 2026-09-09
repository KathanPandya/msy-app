<script lang="ts">
	import { page } from '$app/state';
	import { goto, beforeNavigate } from '$app/navigation';
	import { t, withLang } from '$lib/i18n';
	import type { DictKey } from '$lib/i18n/translations';
	import { authStore } from '$lib/stores/authStore';
	import { getMemberShellContext } from '$lib/context/memberShell';
	import { getCachedUserInfo, setCachedUserInfo } from '$lib/utilities/meCache';
	import { formatDate, formatToYYYYMMDD, getUserAddress } from '$lib/utilities/helperFunc';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import coreApi from '$lib/endpoints/coreApi';
	import userApi from '$lib/endpoints/userApi';
	import profileApi from '$lib/endpoints/profileApi';
	import addressApi from '$lib/endpoints/addressApi';
	import nomineeApi from '$lib/endpoints/nomineeApi';
	import MemberAvatarSwitcher from '$lib/components/other/MemberAvatarSwitcher.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { User } from '$lib/types/user';
	import type { Nominee } from '$lib/types/nominee';
	import { Pencil } from '@lucide/svelte';

	const lang = $derived(page.params.lang as 'guj' | undefined);
	const shell = getMemberShellContext();

	const me = $derived($authStore.userAllInfo?.user);

	const selectedId = $derived(page.url.searchParams.get('member') || me?._id || '');
	// Self can always edit their own record; editing someone else's requires
	// being the family head (matches the backend's PUT /user|profile|address
	// permission rules — non-head members get a 401 from the API either way,
	// this just avoids showing a form that will fail).
	const canEdit = $derived(selectedId === me?._id || shell.isHead);

	let info = $state<User.AllInfo | null>(null);
	let isLoadingInfo = $state(false);
	let infoFetchedFor = $state('');

	$effect(() => {
		const id = selectedId;
		if (!id || infoFetchedFor === id) return;
		infoFetchedFor = id;
		clearSectionStatuses();
		generalEditing = false;
		profileEditing = false;
		addressEditing = false;

		const cached = getCachedUserInfo(id);
		if (cached) {
			info = cached;
			return;
		}

		isLoadingInfo = true;
		info = null;
		coreApi
			.fetchUserInfo({ userId: id })
			.then((res) => {
				setCachedUserInfo(id, res);
				info = res;
			})
			.catch(() => {
				info = null;
			})
			.finally(() => {
				isLoadingInfo = false;
			});
	});

	const address = $derived(info ? getUserAddress(info.address ?? []) : null);

	// Save-result banners ("Updated successfully." / error) — scoped per
	// section and auto-cleared, so they don't linger indefinitely or bleed
	// into a different member's view after switching via the avatar row.
	const STATUS_CLEAR_DELAY = 4000;
	let generalStatusTimeout: ReturnType<typeof setTimeout> | undefined;
	let profileStatusTimeout: ReturnType<typeof setTimeout> | undefined;
	let addressStatusTimeout: ReturnType<typeof setTimeout> | undefined;

	function clearSectionStatuses() {
		clearTimeout(generalStatusTimeout);
		clearTimeout(profileStatusTimeout);
		clearTimeout(addressStatusTimeout);
		generalStatus = '';
		profileStatus = '';
		addressStatus = '';
	}

	function selectMember(id: string) {
		if (id === selectedId) return;
		goto(withLang(lang, `/me/profile${id === me?._id ? '' : `?member=${id}`}`));
	}

	// --- General (User.Update) ---
	function emptyGeneralForm() {
		return {
			first_name: '',
			middle_name: '',
			surname: '',
			mobile: '',
			email: '',
			date_of_birth: '',
			gender: ''
		};
	}
	let generalEditing = $state(false);
	let generalSaving = $state(false);
	let generalStatus = $state<'success' | 'error' | ''>('');
	let generalForm = $state(emptyGeneralForm());
	// Snapshot taken when the form opens — compared against the live form
	// below to know whether the user has actually typed anything, so the
	// unsaved-changes warning only fires on real edits, not on every open.
	let generalInitial = emptyGeneralForm();
	const generalDirty = $derived(
		generalEditing && JSON.stringify(generalForm) !== JSON.stringify(generalInitial)
	);

	function openGeneralEdit() {
		if (!info) return;
		generalForm = {
			first_name: info.user.first_name || '',
			middle_name: info.user.middle_name || '',
			surname: info.user.surname || '',
			mobile: info.user.mobile || '',
			email: info.user.email || '',
			date_of_birth: formatToYYYYMMDD(info.user.date_of_birth),
			gender: info.user.gender || ''
		};
		generalInitial = { ...generalForm };
		clearTimeout(generalStatusTimeout);
		generalStatus = '';
		generalEditing = true;
	}

	async function submitGeneral(event: SubmitEvent) {
		event.preventDefault();
		if (!info) return;
		generalSaving = true;
		clearTimeout(generalStatusTimeout);
		generalStatus = '';
		try {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { first_name, middle_name, surname, ...restForm } = generalForm;
			const res = await userApi.updateUser({
				userId: info.user._id,
				payload: {
					...restForm,
					entry_date: info.user.entry_date
				}
			});
			info = { ...info, user: { ...info.user, ...res.user } };
			setCachedUserInfo(selectedId, info);
			generalStatus = 'success';
			generalEditing = false;
		} catch {
			generalStatus = 'error';
		} finally {
			generalSaving = false;
			generalStatusTimeout = setTimeout(() => (generalStatus = ''), STATUS_CLEAR_DELAY);
		}
	}

	// --- Profile (Profile.Update) ---
	let profileEditing = $state(false);
	let profileSaving = $state(false);
	let profileStatus = $state<'success' | 'error' | ''>('');
	function emptyProfileForm() {
		return { native_place: '', gotra: '', marital_status: '' };
	}
	let profileForm = $state(emptyProfileForm());
	let profileInitial = emptyProfileForm();
	const profileDirty = $derived(
		profileEditing && JSON.stringify(profileForm) !== JSON.stringify(profileInitial)
	);

	function openProfileEdit() {
		if (!info?.profile) return;
		profileForm = {
			native_place: info.profile.native_place || '',
			gotra: info.profile.gotra || '',
			marital_status: info.profile.marital_status || ''
		};
		profileInitial = { ...profileForm };
		clearTimeout(profileStatusTimeout);
		profileStatus = '';
		profileEditing = true;
	}

	async function submitProfile(event: SubmitEvent) {
		event.preventDefault();
		if (!info?.profile) return;
		profileSaving = true;
		clearTimeout(profileStatusTimeout);
		profileStatus = '';
		try {
			const res = await profileApi.updateProfile({
				profileId: info.profile._id,
				payload: {
					...profileForm,
					entrance_fee: info.profile.entrance_fee,
					corpus_fund: info.profile.corpus_fund,
					deposit: info.profile.deposit
				}
			});
			info = { ...info, profile: { ...info.profile, ...res.profile } };
			setCachedUserInfo(selectedId, info);
			profileStatus = 'success';
			profileEditing = false;
		} catch {
			profileStatus = 'error';
		} finally {
			profileSaving = false;
			profileStatusTimeout = setTimeout(() => (profileStatus = ''), STATUS_CLEAR_DELAY);
		}
	}

	// --- Address (Address.Update) ---
	function emptyAddressForm() {
		return {
			address_line_1: '',
			address_line_2: '',
			area_name: '',
			landmark: '',
			city: '',
			pincode: '',
			state: '',
			country: ''
		};
	}
	let addressEditing = $state(false);
	let addressSaving = $state(false);
	let addressStatus = $state<'success' | 'error' | ''>('');
	let addressForm = $state(emptyAddressForm());
	let addressInitial = emptyAddressForm();
	const addressDirty = $derived(
		addressEditing && JSON.stringify(addressForm) !== JSON.stringify(addressInitial)
	);

	function openAddressEdit() {
		if (!address) return;
		addressForm = {
			address_line_1: address.address_line_1 || '',
			address_line_2: address.address_line_2 || '',
			area_name: address.area_name || '',
			landmark: address.landmark || '',
			city: address.city || '',
			pincode: address.pincode || '',
			state: address.state || '',
			country: address.country || ''
		};
		addressInitial = { ...addressForm };
		clearTimeout(addressStatusTimeout);
		addressStatus = '';
		addressEditing = true;
	}

	async function submitAddress(event: SubmitEvent) {
		event.preventDefault();
		if (!info || !address) return;
		addressSaving = true;
		clearTimeout(addressStatusTimeout);
		addressStatus = '';
		try {
			const res = await addressApi.updateAddress({
				addressId: address._id,
				payload: { ...addressForm, is_nominee_address: false }
			});
			info = {
				...info,
				address: info.address.map((a) => (a._id === address._id ? { ...a, ...res.address } : a))
			};
			setCachedUserInfo(selectedId, info);
			addressStatus = 'success';
			addressEditing = false;
		} catch {
			addressStatus = 'error';
		} finally {
			addressSaving = false;
			addressStatusTimeout = setTimeout(() => (addressStatus = ''), STATUS_CLEAR_DELAY);
		}
	}

	// --- Nominees (view + edit relation only; members can never create or delete) ---
	let nominees = $state<Nominee.Data[]>([]);
	let nomineesFetchedFor = $state('');
	let editingNomineeId = $state<string | null>(null);
	let nomineeRelationForm = $state('');
	let nomineeRelationInitial = $state('');
	let nomineeSaving = $state(false);
	let nomineeStatus = $state<'success' | 'error' | ''>('');
	let nomineeStatusTimeout: ReturnType<typeof setTimeout> | undefined;
	const nomineeDirty = $derived(nomineeRelationForm !== nomineeRelationInitial);

	$effect(() => {
		const id = selectedId;
		if (!id || nomineesFetchedFor === id) return;
		nomineesFetchedFor = id;
		editingNomineeId = null;
		clearTimeout(nomineeStatusTimeout);
		nomineeStatus = '';
		nomineeApi
			.fetchNominees({ userId: id })
			.then((res) => {
				nominees = res.data;
			})
			.catch(() => {
				nominees = [];
			});
	});

	const RELATION_LABEL_KEYS: Record<string, DictKey> = {
		father: 'relationFather',
		mother: 'relationMother',
		son: 'relationSon',
		daughter: 'relationDaughter',
		wife: 'relationWife',
		husband: 'relationHusband',
		brother: 'relationBrother',
		sister: 'relationSister',
		'mother-in-law': 'relationMotherInLaw',
		'sister-in-law': 'relationSisterInLaw',
		nephew: 'relationNephew'
	};

	const nomineeRelationOptions = $derived(
		APP_CONSTANTS.NOMINEE_RELATIONS.map((option) => ({
			key: option.key,
			label: option.key === '' ? t(lang, 'selectRelation') : t(lang, RELATION_LABEL_KEYS[option.key])
		}))
	);

	function relationLabel(relation: string | null) {
		if (!relation) return t(lang, 'relationNotSet');
		const key = RELATION_LABEL_KEYS[relation];
		return key ? t(lang, key) : relation;
	}

	function openNomineeEdit(nominee: Nominee.Data) {
		editingNomineeId = nominee._id;
		nomineeRelationForm = nominee.relation || '';
		nomineeRelationInitial = nomineeRelationForm;
		clearTimeout(nomineeStatusTimeout);
		nomineeStatus = '';
	}

	async function submitNomineeRelation(event: SubmitEvent, nomineeId: string) {
		event.preventDefault();
		nomineeSaving = true;
		clearTimeout(nomineeStatusTimeout);
		nomineeStatus = '';
		try {
			const res = await nomineeApi.updateNomineeRelation({
				nomineeId,
				payload: { relation: nomineeRelationForm as Nominee.Data['relation'] & string }
			});
			nominees = nominees.map((n) => (n._id === nomineeId ? { ...n, ...res.nominee } : n));
			nomineeStatus = 'success';
			editingNomineeId = null;
		} catch {
			nomineeStatus = 'error';
		} finally {
			nomineeSaving = false;
			nomineeStatusTimeout = setTimeout(() => (nomineeStatus = ''), STATUS_CLEAR_DELAY);
		}
	}

	// Warn before leaving this page (switching tabs, switching member, back
	// button, typing a URL — beforeNavigate covers all of them) while any
	// section has actual unsaved edits.
	const hasUnsavedChanges = $derived(generalDirty || profileDirty || addressDirty);

	beforeNavigate(({ cancel }) => {
		if (hasUnsavedChanges && !confirm(t(lang, 'unsavedChangesConfirm'))) {
			cancel();
		}
	});
</script>

{#if me}
	<MemberAvatarSwitcher
		familyMembers={shell.familyMembers}
		{selectedId}
		myId={me._id}
		{lang}
		onselect={selectMember}
	/>

	{#if isLoadingInfo}
		<div
			class="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
		>
			<div
				class="h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
			></div>
		</div>
	{:else if info}
		<!-- General -->
		<section class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
			<div class="mb-2 flex items-center justify-between gap-2">
				<div class="flex min-w-0 items-center gap-2">
					<h2 class="text-sm font-semibold text-gray-900">{t(lang, 'general')}</h2>
					{#if generalStatus}
						<span
							class="truncate text-xs {generalStatus === 'success'
								? 'text-green-700'
								: 'text-red-600'}"
						>
							{t(lang, generalStatus === 'success' ? 'updateSuccess' : 'updateFailed')}
						</span>
					{/if}
				</div>
				{#if canEdit && !generalEditing}
					<button
						type="button"
						onclick={openGeneralEdit}
						class="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
					>
						<Pencil class="h-3 w-3" />
						{t(lang, 'edit')}
					</button>
				{/if}
			</div>

			{#if generalEditing}
				<form onsubmit={submitGeneral} class="space-y-2.5">
					<div class="grid grid-cols-2 gap-2.5">
						<Input
							id="first_name"
							label={t(lang, 'firstName')}
							bind:value={generalForm.first_name}
							required
							disabled
						/>
						<Input
							id="middle_name"
							label={t(lang, 'middleName')}
							bind:value={generalForm.middle_name}
							disabled
						/>
						<Input
							id="surname"
							label={t(lang, 'surname')}
							bind:value={generalForm.surname}
							required
							disabled
						/>
						<Input
							id="mobile"
							label={t(lang, 'mobile')}
							bind:value={generalForm.mobile}
							required
							maxlength={10}
							inputmode="numeric"
						/>
						<Input
							id="dob"
							type="date"
							label={t(lang, 'dateOfBirth')}
							bind:value={generalForm.date_of_birth}
							required
						/>
						<Select
							id="gender"
							label={t(lang, 'gender')}
							bind:value={generalForm.gender}
							options={APP_CONSTANTS.GENDERS}
							required
						/>
					</div>
					<div class="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							size="sm"
							variant="secondary"
							onclick={() => (generalEditing = false)}
							disabled={generalSaving}
						>
							{t(lang, 'cancel')}
						</Button>
						<Button type="submit" size="sm" disabled={generalSaving || !generalDirty}>
							{generalSaving ? t(lang, 'saving') : t(lang, 'save')}
						</Button>
					</div>
				</form>
			{:else}
				<dl class="space-y-1.5 text-xs">
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'status')}</dt>
						<dd class="font-medium text-gray-900 capitalize">{info.user.status}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'joined')}</dt>
						<dd class="font-medium text-gray-900">{formatDate(info.user.entry_date)}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'firstName')}</dt>
						<dd class="font-medium text-gray-900">{info.user.first_name || '-'}</dd>
					</div>
					{#if info.user.middle_name}
						<div class="flex justify-between gap-4">
							<dt class="text-gray-500">{t(lang, 'middleName')}</dt>
							<dd class="font-medium text-gray-900">{info.user.middle_name}</dd>
						</div>
					{/if}
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'surname')}</dt>
						<dd class="font-medium text-gray-900">{info.user.surname || '-'}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'mobile')}</dt>
						<dd class="font-medium text-gray-900">{info.user.mobile || '-'}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'dateOfBirth')}</dt>
						<dd class="font-medium text-gray-900">{formatDate(info.user.date_of_birth)}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'gender')}</dt>
						<dd class="font-medium text-gray-900 capitalize">{info.user.gender || '-'}</dd>
					</div>
				</dl>
			{/if}
		</section>

		<!-- Profile -->
		<section class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
			<div class="mb-2 flex items-center justify-between gap-2">
				<div class="flex min-w-0 items-center gap-2">
					<h2 class="text-sm font-semibold text-gray-900">{t(lang, 'profile')}</h2>
					{#if profileStatus}
						<span
							class="truncate text-xs {profileStatus === 'success'
								? 'text-green-700'
								: 'text-red-600'}"
						>
							{t(lang, profileStatus === 'success' ? 'updateSuccess' : 'updateFailed')}
						</span>
					{/if}
				</div>
				{#if canEdit && info.profile && !profileEditing}
					<button
						type="button"
						onclick={openProfileEdit}
						class="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
					>
						<Pencil class="h-3 w-3" />
						{t(lang, 'edit')}
					</button>
				{/if}
			</div>

			{#if !info.profile}
				<p class="text-xs text-gray-500">{t(lang, 'noProfileData')}</p>
			{:else if profileEditing}
				<form onsubmit={submitProfile} class="space-y-2.5">
					<div class="grid grid-cols-2 gap-2.5">
						<Input
							id="native_place"
							label={t(lang, 'nativePlace')}
							bind:value={profileForm.native_place}
							required
						/>
						<Select
							id="gotra"
							label={t(lang, 'gotra')}
							bind:value={profileForm.gotra}
							options={APP_CONSTANTS.GOTRAS}
							required
						/>
						<Select
							id="marital_status"
							label={t(lang, 'maritalStatus')}
							bind:value={profileForm.marital_status}
							options={APP_CONSTANTS.MARITAL_STATUS}
							required
						/>
					</div>
					<div class="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							size="sm"
							variant="secondary"
							onclick={() => (profileEditing = false)}
							disabled={profileSaving}
						>
							{t(lang, 'cancel')}
						</Button>
						<Button type="submit" size="sm" disabled={profileSaving || !profileDirty}>
							{profileSaving ? t(lang, 'saving') : t(lang, 'save')}
						</Button>
					</div>
				</form>
			{:else}
				<dl class="space-y-1.5 text-xs">
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'nativePlace')}</dt>
						<dd class="font-medium text-gray-900">{info.profile.native_place || '-'}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'gotra')}</dt>
						<dd class="font-medium text-gray-900 capitalize">{info.profile.gotra || '-'}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'maritalStatus')}</dt>
						<dd class="font-medium text-gray-900 capitalize">
							{info.profile.marital_status || '-'}
						</dd>
					</div>
				</dl>
			{/if}
		</section>

		<!-- Address -->
		<section class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
			<div class="mb-2 flex items-center justify-between gap-2">
				<div class="flex min-w-0 items-center gap-2">
					<h2 class="text-sm font-semibold text-gray-900">{t(lang, 'address')}</h2>
					{#if addressStatus}
						<span
							class="truncate text-xs {addressStatus === 'success'
								? 'text-green-700'
								: 'text-red-600'}"
						>
							{t(lang, addressStatus === 'success' ? 'updateSuccess' : 'updateFailed')}
						</span>
					{/if}
				</div>
				{#if canEdit && address && !addressEditing}
					<button
						type="button"
						onclick={openAddressEdit}
						class="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
					>
						<Pencil class="h-3 w-3" />
						{t(lang, 'edit')}
					</button>
				{/if}
			</div>

			{#if !address}
				<p class="text-xs text-gray-500">{t(lang, 'noAddressOnFile')}</p>
			{:else if addressEditing}
				<form onsubmit={submitAddress} class="space-y-2.5">
					<div class="grid grid-cols-2 gap-2.5">
						<Input
							id="address_line_1"
							label={t(lang, 'addressLine1')}
							bind:value={addressForm.address_line_1}
							required
						/>
						<Input
							id="address_line_2"
							label={t(lang, 'addressLine2')}
							bind:value={addressForm.address_line_2}
						/>
						<Input
							id="area_name"
							label={t(lang, 'areaName')}
							bind:value={addressForm.area_name}
							required
						/>
						<Input
							id="landmark"
							label={t(lang, 'landmark')}
							bind:value={addressForm.landmark}
							required
						/>
						<Input id="city" label={t(lang, 'city')} bind:value={addressForm.city} required />
						<Input
							id="pincode"
							label={t(lang, 'pincode')}
							bind:value={addressForm.pincode}
							required
							maxlength={6}
							inputmode="numeric"
						/>
						<Input id="state" label={t(lang, 'state')} bind:value={addressForm.state} required />
						<Input
							id="country"
							label={t(lang, 'country')}
							bind:value={addressForm.country}
							required
						/>
					</div>
					<div class="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							size="sm"
							variant="secondary"
							onclick={() => (addressEditing = false)}
							disabled={addressSaving}
						>
							{t(lang, 'cancel')}
						</Button>
						<Button type="submit" size="sm" disabled={addressSaving || !addressDirty}>
							{addressSaving ? t(lang, 'saving') : t(lang, 'save')}
						</Button>
					</div>
				</form>
			{:else}
				<dl class="space-y-1.5 text-xs">
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'addressLine1')}</dt>
						<dd class="text-right font-medium text-gray-900">{address.address_line_1 || '-'}</dd>
					</div>
					{#if address.address_line_2}
						<div class="flex justify-between gap-4">
							<dt class="text-gray-500">{t(lang, 'addressLine2')}</dt>
							<dd class="text-right font-medium text-gray-900">{address.address_line_2}</dd>
						</div>
					{/if}
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'areaName')}</dt>
						<dd class="font-medium text-gray-900">{address.area_name || '-'}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'landmark')}</dt>
						<dd class="font-medium text-gray-900">{address.landmark || '-'}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'city')}</dt>
						<dd class="font-medium text-gray-900">{address.city || '-'}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'pincode')}</dt>
						<dd class="font-medium text-gray-900">{address.pincode || '-'}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'state')}</dt>
						<dd class="font-medium text-gray-900">{address.state || '-'}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">{t(lang, 'country')}</dt>
						<dd class="font-medium text-gray-900">{address.country || '-'}</dd>
					</div>
				</dl>
			{/if}
		</section>

		<!-- Nominees (view + edit relation only — no add/delete for members) -->
		<section class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
			<div class="mb-2 flex items-center justify-between gap-2">
				<div class="flex min-w-0 items-center gap-2">
					<h2 class="text-sm font-semibold text-gray-900">{t(lang, 'nominees')}</h2>
					{#if nomineeStatus}
						<span
							class="truncate text-xs {nomineeStatus === 'success'
								? 'text-green-700'
								: 'text-red-600'}"
						>
							{t(lang, nomineeStatus === 'success' ? 'updateSuccess' : 'updateFailed')}
						</span>
					{/if}
				</div>
			</div>

			{#if nominees.length === 0}
				<p class="text-xs text-gray-500">{t(lang, 'noNominees')}</p>
			{:else}
				<ul class="space-y-2">
					{#each nominees as nominee (nominee._id)}
						<li class="rounded-md border border-gray-100 p-2">
							{#if editingNomineeId === nominee._id}
								<form
									onsubmit={(e) => submitNomineeRelation(e, nominee._id)}
									class="space-y-2"
								>
									<div class="text-xs font-medium text-gray-900">{nominee.full_name}</div>
									<div class="grid grid-cols-2 gap-2.5">
										<Select
											id={`relation-${nominee._id}`}
											label={t(lang, 'relation')}
											bind:value={nomineeRelationForm}
											options={nomineeRelationOptions}
											required
										/>
									</div>
									<div class="flex justify-end gap-2 pt-1">
										<Button
											type="button"
											size="sm"
											variant="secondary"
											onclick={() => (editingNomineeId = null)}
											disabled={nomineeSaving}
										>
											{t(lang, 'cancel')}
										</Button>
										<Button
											type="submit"
											size="sm"
											disabled={nomineeSaving || !nomineeDirty}
										>
											{nomineeSaving ? t(lang, 'saving') : t(lang, 'save')}
										</Button>
									</div>
								</form>
							{:else}
								<div class="flex items-center justify-between gap-2">
									<div class="min-w-0">
										<div class="truncate text-xs font-medium text-gray-900">
											{nominee.full_name}
										</div>
										<div class="text-xs text-gray-500">{relationLabel(nominee.relation)}</div>
									</div>
									{#if canEdit}
										<button
											type="button"
											onclick={() => openNomineeEdit(nominee)}
											class="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
										>
											<Pencil class="h-3 w-3" />
											{nominee.relation ? t(lang, 'edit') : t(lang, 'setRelation')}
										</button>
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
{/if}
