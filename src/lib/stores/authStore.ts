// src/lib/stores/authStore.ts
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import authApi from '$lib/endpoints/authApi'; // Your auth API
import coreApi from '$lib/endpoints/coreApi';
import type { User } from '$lib/types/user';
import { derived, writable } from 'svelte/store';

type AuthState = {
	userAllInfo: User.AllInfo | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	error: string | null;
};

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		userAllInfo: null,
		isLoading: true, // Start as loading
		isAuthenticated: false,
		error: null
	});

	return {
		subscribe,

		// Initialize auth - call this on app start
		async initialize() {
			if (!browser) return;

			const userId = localStorage.getItem('userId');

			if (!userId) {
				set({
					userAllInfo: null,
					isLoading: false,
					isAuthenticated: false,
					error: null
				});
				return;
			}

			// Token exists, fetch user data
			try {
				update((state) => ({ ...state, isLoading: true }));

				const userData = await coreApi.fetchUserInfo({
					userId
				}); // Your API call

				set({
					userAllInfo: userData,
					isLoading: false,
					isAuthenticated: true,
					error: null
				});
			} catch (error: any) {
				console.error('Failed to fetch user:', error);

				// Invalid token, clear it
				localStorage.removeItem('token');

				set({
					userAllInfo: null,
					isLoading: false,
					isAuthenticated: false,
					error: error?.message || 'Authentication failed'
				});
			}
		},

		// Login
		async login(email: string, password: string) {
			try {
				update((state) => ({ ...state, isLoading: true, error: null }));

				const response = await authApi.userLogin({ email, password });

				localStorage.setItem('authToken', response.token);
				localStorage.setItem('userId', response.user._id);
				const userAllInfo = await coreApi.fetchUserInfo({ userId: response.user._id });

				set({
					userAllInfo: userAllInfo,
					isLoading: false,
					isAuthenticated: true,
					error: null
				});

				return response;
			} catch (error: any) {
				const errorMessage = error?.response?.data?.message || 'Login failed';

				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));

				throw error;
			}
		},

		// Logout
		logout() {
			if (!browser) return;

			// localStorage.removeItem('token');
			localStorage.clear();

			set({
				userAllInfo: null,
				isLoading: false,
				isAuthenticated: false,
				error: null
			});

			goto('/admin');
		},

		// Update user data
		updateUser(userData: Partial<User.AllInfo>) {
			update((state) => ({
				...state,
				user: state.userAllInfo ? { ...state.userAllInfo, ...userData } : null
			}));
		},

		// Check if user is admin
		isAdmin: derived({ subscribe }, ($auth) => $auth.userAllInfo?.user.role === 'admin'),

		// Clear error
		clearError() {
			update((state) => ({ ...state, error: null }));
		}
	};
}

export const authStore = createAuthStore();
