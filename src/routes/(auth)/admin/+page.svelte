<script lang="ts">
	import { goto } from '$app/navigation';
	import Input from '$lib/components/ui/Input.svelte';
	import authApi from '$lib/endpoints/authApi';
	import { authStore } from '$lib/stores/authStore';
	import { onMount } from 'svelte';
	import * as Yup from 'yup';

	// Redirect if already logged in
	onMount(() => {
		if ($authStore.isAuthenticated) {
			goto('/dashboard');
		}
	});

	// Validation Schema
	const loginSchema = Yup.object().shape({
		email: Yup.string().email('Invalid email address').required('Email is required'),
		password: Yup.string()
			.required('Password is required')
			.min(8, 'Password must be at least 8 characters')
	});

	// Form Data
	let formData = $state({
		email: '',
		password: ''
	});

	// Errors
	let errors = $state({
		email: '',
		password: ''
	});

	// Loading and message states
	let isLoading = $state(false);
	let errorMessage = $state('');

	// Validate individual field
	async function validateField(field: keyof typeof errors) {
		try {
			await loginSchema.validateAt(field, formData);
			errors[field] = '';
		} catch (err: any) {
			errors[field] = err?.message || 'Invalid';
		}
	}

	// Submit login
	async function handleLogin() {
		isLoading = true;
		errorMessage = '';

		// Reset errors
		errors = {
			email: '',
			password: ''
		};

		try {
			// Validate form
			await loginSchema.validate(formData, { abortEarly: false });

			// TODO: Replace with your actual login API call
			await authStore.login(formData.email, formData.password);

			// Redirect to dashboard
			goto('/members');
		} catch (err: any) {
			if (err.inner && Array.isArray(err.inner)) {
				// Validation errors
				err.inner.forEach((e: any) => {
					if (e.path && e.path in errors) {
						errors[e.path as keyof typeof errors] = e.message;
					}
				});
			} else {
				// API error
				errorMessage =
					err?.response?.data?.message ||
					err?.message ||
					'Invalid email or password. Please try again.';
			}
		} finally {
			isLoading = false;
		}
	}

	// Handle Enter key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !isLoading) {
			handleLogin();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex min-h-screen bg-gray-50">
	<!-- Right side - Login Form -->
	<div class="flex flex-1 items-center justify-center p-8">
		<div class="w-full max-w-md">
			<!-- Mobile Logo -->
			<div class="mb-8 flex justify-center lg:hidden">
				<div class="flex items-center space-x-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
						<span class="text-2xl font-bold text-white">M</span>
					</div>
					<span class="text-2xl font-bold text-gray-900">MSY Admin</span>
				</div>
			</div>

			<!-- Header -->
			<!-- <div class="mb-8">
				<h2 class="mb-2 text-3xl font-bold text-gray-900">Welcome back</h2>
				<p class="text-gray-600">Please enter your credentials to continue</p>
			</div> -->

			<!-- Login Form -->
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleLogin();
				}}
				class="space-y-6"
			>
				<!-- Email -->
				<Input
					id="email"
					label="Email Address"
					type="email"
					bind:value={formData.email}
					error={errors.email}
					onblur={() => validateField('email')}
					placeholder="admin@example.com"
					required
					disabled={isLoading}
				/>

				<!-- Password -->
				<div>
					<Input
						id="password"
						label="Password"
						type="password"
						bind:value={formData.password}
						error={errors.password}
						onblur={() => validateField('password')}
						placeholder="Enter your password"
						required
						disabled={isLoading}
					/>

					<div class="mt-2 flex justify-end">
						<a
							href="/forgot-password"
							class="text-sm font-medium text-blue-600 hover:text-blue-700"
						>
							Forgot password?
						</a>
					</div>
				</div>

				<!-- Error Message -->
				{#if errorMessage}
					<div class="rounded-lg border border-red-200 bg-red-50 p-4">
						<div class="flex items-start">
							<svg class="mt-0.5 h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clip-rule="evenodd"
								/>
							</svg>
							<p class="ml-3 text-sm text-red-800">{errorMessage}</p>
						</div>
					</div>
				{/if}

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={isLoading}
					class="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isLoading}
						<div class="flex items-center gap-2">
							<div
								class="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
							></div>
							<span>Signing in...</span>
						</div>
					{:else}
						Sign in
					{/if}
				</button>

				<!-- Help Link -->
				<div class="pt-4 text-center">
					<p class="text-sm text-gray-600">
						Need help?
						<a href="/support" class="ml-1 font-semibold text-blue-600 hover:text-blue-700">
							Contact Support
						</a>
					</p>
				</div>
			</form>
		</div>
	</div>
</div>
