// import axios, { AxiosInstance } from 'axios';
// import { LocalStorageConstants } from '../_constants/local-storage-constants';
// import { API_BASE_URL } from './config';
// import { getExternalLogout } from '../UserContext';

import { authStore } from '$lib/stores/authStore';
import { endHttpRequest, startHttpRequest } from '$lib/stores/httpLoadingStore';
import type { AxiosInstance } from 'axios';
import axios from 'axios';

const instance: AxiosInstance = axios.create({
	baseURL: import.meta.env.VITE_API_URL
});

// Request Interceptor
instance.interceptors.request.use(
	(config: any) => {
		startHttpRequest();
		const customToken = config.headers?.['X-Custom-Authorization'];
		const token = localStorage.getItem('authToken');
		const tokenToUse = customToken || token;

		if (Boolean(tokenToUse)) {
			// Setup headers
			config.headers = {
				'Content-Type': 'application/json',
				...(config.headers as Record<string, any>),
				Authorization: `Bearer ${tokenToUse}`
			};
			delete config.headers['X-Custom-Authorization'];
		} else {
			// if token is not found
			console.warn('No token found, request might be unauthenticated');
		}
		return config;
	},
	(error) => {
		endHttpRequest();
		return Promise.reject(error);
	}
);

// Response Interceptor
instance.interceptors.response.use(
	(response) => {
		endHttpRequest();
		return response;
	},
	async (error) => {
		endHttpRequest();
		const status = error.response?.status ?? error.status;
		// Only force logout on 403 when a session token was present (avoid PIN public 403s).
		// /api/orders/create 403s for business reasons (Razorpay not enabled for the
		// member) — the caller handles it, the session is still valid.
		const isOrderCreateRejection =
			String(error.config?.url ?? '').includes('/api/orders/create') &&
			error.response?.data?.success === false;
		if (status === 403 && localStorage.getItem('authToken') && !isOrderCreateRejection) {
			authStore.logout();
		}
		console.error('API Error:', error);
		return Promise.reject(error);
	}
);

export default instance;
