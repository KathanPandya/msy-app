// import axios, { AxiosInstance } from 'axios';
// import { LocalStorageConstants } from '../_constants/local-storage-constants';
// import { API_BASE_URL } from './config';
// import { getExternalLogout } from '../UserContext';

import { authStore } from '$lib/stores/authStore';
import type { AxiosInstance } from 'axios';
import axios from 'axios';

const instance: AxiosInstance = axios.create({
	baseURL: 'http://localhost:3001/'
});

// Request Interceptor
instance.interceptors.request.use(
	(config: any) => {
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
	(error) => Promise.reject(error)
);

// Response Interceptor
instance.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (error.status == 403) {
			authStore.logout();
			// const lo = getExternalLogout();
			// await lo();
		}
		console.error('API Error:', error);
		return Promise.reject(error);
	}
);

export default instance;
