<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import addressApi from '$lib/endpoints/addressApi';
	import profileApi from '$lib/endpoints/profileApi';
	import userApi from '$lib/endpoints/userApi';
	import { createUserSchema } from '$lib/schema/update-user';
	import type { Form } from '$lib/types/form';

	let formData = $state<Form.UserCreate>({
		firstName: '',
		middleName: '',
		lastName: '',
		mobileNumber: '',
		email: '',
		password: '',
		confirmPassword: ''
	});

	let errors = $state<Record<keyof Form.UserCreate, string>>({
		firstName: '',
		middleName: '',
		lastName: '',
		mobileNumber: '',
		email: '',
		password: '',
		confirmPassword: ''
	});

	const hasErrors = $derived(Object.values(errors).some((error) => error !== ''));

	let successMessage = $state('');

	async function validateField<K extends keyof Form.UserCreate>(name: K) {
		try {
			await createUserSchema.validateAt(name as string, formData);
			errors[name] = '';
		} catch (err: any) {
			errors[name] = err?.message || 'Invalid';
		}
	}

	function resetForm() {
		formData = {
			firstName: '',
			middleName: '',
			lastName: '',
			mobileNumber: '',
			email: '',
			password: '',
			confirmPassword: ''
		};
		errors = Object.fromEntries(Object.keys(formData).map((k) => [k, ''])) as any;
		successMessage = '';
	}

	let loaderStatus = $state<Record<string, boolean>>({
		general: false
	});

	// Error state for each section
	let sectionErrors = $state<Record<string, string>>({
		general: ''
	});

	// Success state for each section
	let sectionSuccess = $state<Record<string, string>>({
		general: ''
	});

	async function submitSection(section: string) {
		sectionErrors[section] = '';
		sectionSuccess[section] = '';

		// Validate first
		try {
			await createUserSchema.validate(
				{
					firstName: formData.firstName,
					middleName: formData.middleName,
					lastName: formData.lastName,
					mobileNumber: formData.mobileNumber,
					email: formData.email,
					password: formData.password,
					confirmPassword: formData.confirmPassword
				},
				{ abortEarly: false }
			);
		} catch (err: any) {
			if (err.inner && Array.isArray(err.inner)) {
				err.inner.forEach((e: any) => {
					if (e.path) {
						errors[e.path as keyof typeof errors] = e.message;
					}
				});
			}
			sectionErrors[section] = 'Please fix the errors above';
			return;
		}

		loaderStatus.general = true;

		try {
			// Step 1: Create user
			const userResponse = await userApi.createUser({
				payload: {
					first_name: formData.firstName,
					middle_name: formData.middleName,
					surname: formData.lastName,
					mobile: formData.mobileNumber,
					email: formData.email,
					password: formData.password,
					reference_member_1: 'N/A',
					reference_member_2: 'N/A'
				}
			});
			if (!userResponse.token || !userResponse.user?._id) {
				throw new Error('User creation failed - missing token or user ID');
			}
			const userToken = userResponse.token;
			const userId = userResponse.user._id;
			// Step 2: Create address and profile in parallel
			await Promise.all([
				addressApi.createAddress({
					userToken: userToken,
					payload: {
						address_line_1: ' ',
						address_line_2: ' ',
						area_name: ' ',
						landmark: ' ',
						city: ' ',
						pincode: ' ',
						state: ' ',
						country: ' ',
						is_nominee_address: false
					}
				}),
				profileApi.createProfile({
					userToken: userToken,
					payload: {
						corpus_fund: 0,
						deposit: 0,
						entrance_fee: 0,
						gotra: ' ',
						marital_status: ' ',
						native_place: ' ',
						userId: userId
					}
				})
			]);
			// Step 3: Show success and navigate
			sectionSuccess[section] = 'Member created successfully! Redirecting...';
			// Reset form after short delay
			setTimeout(() => {
				resetForm();
			}, 500);
			// Navigate after showing success message
			setTimeout(() => {
				goto(`/members/update/${userId}`);
			}, 1000);
		} catch (error: any) {
			console.error('Error creating member:', error);

			// User-friendly error messages
			const errorMessage =
				error?.response?.data?.message ||
				error?.message ||
				'Failed to create member. Please try again.';

			sectionErrors[section] = errorMessage;

			// If user was created but address/profile failed, inform user
			if (error.message?.includes('address') || error.message?.includes('profile')) {
				sectionErrors[section] =
					'User created but failed to set up complete profile. Please update manually.';
			}
		} finally {
			loaderStatus.general = false;
		}
	}
</script>

<div class="mx-auto max-w-5xl">
	<div class="p-lg-6 space-y-6 p-2">
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
					id="password"
					label="Password"
					type="password"
					bind:value={formData.password}
					error={errors.password}
					onblur={() => validateField('password')}
					placeholder="Create Password"
				/>

				<Input
					id="confirmPassword"
					label="Confirm Password"
					type="password"
					bind:value={formData.confirmPassword}
					error={errors.confirmPassword}
					onblur={() => validateField('confirmPassword')}
					placeholder="Confirm Password"
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
					disabled={loaderStatus.general || hasErrors}
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
	</div>
</div>
