// src/lib/stores/authStore.ts
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import authApi from '$lib/endpoints/authApi';
import coreApi from '$lib/endpoints/coreApi';
import pinAuthApi from '$lib/endpoints/pinAuthApi';
import type { PinAuth } from '$lib/types/pinAuth';
import type { User } from '$lib/types/user';
import { derived, writable } from 'svelte/store';

export type AuthType = 'password' | 'pin';

type AuthState = {
	userAllInfo: User.AllInfo | null;
	pinUser: PinAuth.PinUser | null;
	authType: AuthType | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	error: string | null;
};

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		userAllInfo: null,
		pinUser: null,
		authType: null,
		isLoading: true,
		isAuthenticated: false,
		error: null
	});

	return {
		subscribe,

		async initialize() {
			if (!browser) return;

			const userId = localStorage.getItem('userId');
			const authType = (localStorage.getItem('authType') as AuthType | null) || 'password';
			const authToken = localStorage.getItem('authToken');

			if (!userId || !authToken) {
				set({
					userAllInfo: null,
					pinUser: null,
					authType: null,
					isLoading: false,
					isAuthenticated: false,
					error: null
				});
				return;
			}

			try {
				update((state) => ({ ...state, isLoading: true }));

				const userData = await coreApi.fetchUserInfo({ userId });

				set({
					userAllInfo: userData,
					pinUser: authType === 'pin' ? (userData.user as unknown as PinAuth.PinUser) : null,
					authType,
					isLoading: false,
					isAuthenticated: true,
					error: null
				});
			} catch (error: any) {
				console.error('Failed to fetch user:', error);
				localStorage.removeItem('authToken');
				localStorage.removeItem('userId');
				localStorage.removeItem('authType');

				set({
					userAllInfo: null,
					pinUser: null,
					authType: null,
					isLoading: false,
					isAuthenticated: false,
					error: error?.message || 'Authentication failed'
				});
			}
		},

		async login(email: string, password: string) {
			try {
				update((state) => ({ ...state, isLoading: true, error: null }));

				const response = await authApi.userLogin({ email, password });

				localStorage.setItem('authToken', response.token);
				localStorage.setItem('userId', response.user._id);
				localStorage.setItem('authType', 'password');
				const userAllInfo = await coreApi.fetchUserInfo({ userId: response.user._id });

				set({
					userAllInfo,
					pinUser: null,
					authType: 'password',
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

		/** Complete a successful PIN / bootstrap / change-pin session */
		async loginWithPinSession(token: string, user: PinAuth.PinUser) {
			if (!browser) return;

			localStorage.setItem('authToken', token);
			localStorage.setItem('userId', user._id);
			localStorage.setItem('authType', 'pin');

			try {
				const userAllInfo = await coreApi.fetchUserInfo({ userId: user._id });
				set({
					userAllInfo,
					pinUser: user,
					authType: 'pin',
					isLoading: false,
					isAuthenticated: true,
					error: null
				});
			} catch {
				// Still authenticated with PIN payload if full profile fetch fails
				set({
					userAllInfo: {
						user: user as unknown as User.Get,
						profile: null,
						address: {} as User.AllInfo['address'],
						nominee: [],
						payments: [],
						orders: []
					},
					pinUser: user,
					authType: 'pin',
					isLoading: false,
					isAuthenticated: true,
					error: null
				});
			}
		},

		async logout() {
			if (!browser) return;

			const authType = localStorage.getItem('authType');
			const token = localStorage.getItem('authToken');

			if (authType === 'pin' && token) {
				try {
					await pinAuthApi.logout();
				} catch {
					// clear local session anyway
				}
			}

			localStorage.clear();

			set({
				userAllInfo: null,
				pinUser: null,
				authType: null,
				isLoading: false,
				isAuthenticated: false,
				error: null
			});

			goto(authType === 'pin' ? '/login' : '/admin');
		},

		updateUser(userData: Partial<User.AllInfo>) {
			update((state) => ({
				...state,
				userAllInfo: state.userAllInfo ? { ...state.userAllInfo, ...userData } : null
			}));
		},

		isAdmin: derived({ subscribe }, ($auth) => $auth.userAllInfo?.user.role === 'admin'),

		clearError() {
			update((state) => ({ ...state, error: null }));
		}
	};
}

export const authStore = createAuthStore();
