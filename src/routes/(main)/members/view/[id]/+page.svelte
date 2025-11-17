<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import coreApi from '$lib/endpoints/coreApi';
	import paymentApi from '$lib/endpoints/paymentApi';
	import profileApi from '$lib/endpoints/profileApi';
	import type { Address } from '$lib/types/address';
	import type { Payment } from '$lib/types/payment';
	import type { User } from '$lib/types/user';
	import { formatDate, getUserAddress } from '$lib/utilities/helperFunc';
	import { formatString } from '$lib/utilities/stringUtils';
	import { onMount } from 'svelte';

	let paymentsTableInfo = $state<Payment.OutstandingData | null>(null);
	let isLoading = $state(false);
	// let userInfo = $state<User.AllInfo | null>(null);
	// let userAddress = $state<Address.Data | null>(null);

	let userData = {
		// General Info
		હિસાબ: 0,
		firstName: '',
		middleName: '',
		surname: '',
		mobile: '',
		email: '',
		dob: '',
		gender: '',
		status: '',

		// Other Info
		nativePlace: '',
		gotra: '',
		maritalStatus: '',

		// Address
		addressLine1: '',
		addressLine2: '',
		areaName: '',
		landmark: '',
		city: '',
		pincode: '',
		state: '',
		country: '',

		// Additional fields
		joiningDate: '',
		// membershipType: '',
		// bloodGroup: '',
		// occupation: '',
		_id: '' // User ID for navigation
	};

	onMount(async () => {
		const userId = page.params.id;
		if (userId) {
			isLoading = true;
			const res = await paymentApi.getOutstandingPaymentOfMember(userId);
			paymentsTableInfo = res.data;

			userData.હિસાબ = paymentsTableInfo.outstandingAmount - paymentsTableInfo.totalPayment;

			let userInfo = await coreApi.fetchUserInfo({ userId });

			if (userInfo.profile === null) {
				const newProfile = await profileApi.createProfileById({
					userId: userId
				});
				userInfo.profile = newProfile.profile;
			}

			// Populate form with user data
			if (userInfo?.user) {
				userData.firstName = formatString(userInfo.user.first_name, ['trim']);
				userData.middleName = formatString(userInfo.user.middle_name, ['trim']);
				userData.surname = formatString(userInfo.user.surname, ['trim']);
				userData.mobile = formatString(userInfo.user.mobile, ['trim']);
				userData.email = formatString(userInfo.user.email, ['trim']);
				userData.gender = formatString(userInfo.user.gender, ['trim', 'capitalize-first']);
				userData.dob = formatString(userInfo.user.date_of_birth?.split('T')[0], ['trim']);
				userData.status = formatString(userInfo?.user?.status, ['trim', 'capitalize-first']);
				userData.joiningDate = formatDate(userInfo.user.entry_date);
				userData._id = userInfo.user._id;
				// userData.refNum1 = formatString(userInfo?.user.reference_member_1, ['trim']);
				// userData.refNum2 = formatString(userInfo?.user.reference_member_2, ['trim']);
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
			}

			if (userInfo.address) {
				let userAddress = getUserAddress(userInfo.address);
				if (userAddress) {
					userData.addressLine1 = formatString(userAddress.address_line_1, ['trim']);
					userData.addressLine2 = formatString(userAddress.address_line_2, ['trim']);
					userData.areaName = formatString(userAddress.area_name, ['trim']);
					userData.city = formatString(userAddress.city, ['trim']);
					userData.country = formatString(userAddress.country, ['trim']);
					userData.pincode = formatString(userAddress.pincode, ['trim']);
					userData.state = formatString(userAddress.state, ['trim']);
					userData.landmark = formatString(userAddress.landmark, ['trim']);
				}
			}
			isLoading = false;
		}
	});

	// Sample user data - replace with actual data from props or API

	function handleEditUser() {
		goto(`/members/update/${userData._id}`, {
			state: { userData }
		});
	}

	function handleChangeStatus() {
		goto(`/members/status/${userData._id}`, {
			state: { userData }
		});
	}
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="mx-auto max-w-5xl">
		{#if !isLoading}
			<!-- Header with Action Buttons -->
			<div class="mb-6 rounded-lg bg-white p-6 shadow-sm">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<h1 class="text-3xl font-bold text-gray-900">
							{userData.firstName}
							{userData.middleName}
							{userData.surname}
						</h1>
						<div class="mt-3 flex items-center gap-4">
							<span
								class="rounded-full px-4 py-1.5 text-sm font-medium {userData.status === 'Active'
									? 'bg-green-100 text-green-800'
									: userData.status === 'Inactive'
										? 'bg-red-100 text-red-800'
										: 'bg-yellow-100 text-yellow-800'}"
							>
								{userData.status}
							</span>
							<span class="text-sm text-gray-500">
								<svg
									class="mr-1 inline h-4 w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
								Member since {userData.joiningDate}
							</span>
						</div>
					</div>

					<div class="flex gap-3">
						<button
							onclick={handleEditUser}
							class="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
							Edit User
						</button>
						<button
							onclick={handleChangeStatus}
							class="flex items-center gap-2 rounded-lg bg-gray-600 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-gray-700"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
								/>
							</svg>
							Change Status
						</button>
					</div>
				</div>
			</div>

			<!-- General Information -->
			<div class="mb-6 rounded-lg bg-white p-6 shadow-sm">
				<h2 class="mb-6 border-b pb-3 text-xl font-semibold text-gray-800">General Information</h2>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">હિસાબ</p>
						<p
							class={`text-base text-gray-900 ${userData.હિસાબ < 0 ? 'text-green-600' : 'text-red-600'}`}
						>
							{`${Math.abs(userData.હિસાબ)} ${userData.હિસાબ < 0 ? 'જમા' : 'બાકી'}`}
						</p>
					</div>

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

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Mobile Number</p>
						<p class="flex items-center text-base text-gray-900">
							<svg
								class="mr-2 h-4 w-4 text-gray-400"
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
							{userData.mobile}
						</p>
					</div>

					<!-- <div class="md:col-span-2"> -->
					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Email</p>
						<p class="flex items-center text-base text-gray-900">
							<svg
								class="mr-2 h-4 w-4 text-gray-400"
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
							{userData.email}
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

					<!-- <div>
						<p class="mb-1 text-sm font-medium text-gray-500">Blood Group</p>
						<p class="text-base text-gray-900">{userData.bloodGroup}</p>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Occupation</p>
						<p class="text-base text-gray-900">{userData.occupation}</p>
					</div> -->
				</div>
			</div>

			<!-- Other Information -->
			<div class="mb-6 rounded-lg bg-white p-6 shadow-sm">
				<h2 class="mb-6 border-b pb-3 text-xl font-semibold text-gray-800">Other Information</h2>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
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

					<div>
						<p class="mb-1 text-sm font-medium text-gray-500">Joining Date</p>
						<p class="text-base text-gray-900">
							{userData.joiningDate}
						</p>
					</div>
				</div>
			</div>

			<!-- Address Information -->
			<div class="rounded-lg bg-white p-6 shadow-sm">
				<h2 class="mb-6 border-b pb-3 text-xl font-semibold text-gray-800">Address</h2>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
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
			</div>
		{/if}
	</div>
</div>
