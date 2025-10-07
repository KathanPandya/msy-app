// import axios, { AxiosInstance } from 'axios';
// import { LocalStorageConstants } from '../_constants/local-storage-constants';
// import { API_BASE_URL } from './config';
// import { getExternalLogout } from '../UserContext';

import type { AxiosInstance } from 'axios';
import axios from 'axios';

const instance: AxiosInstance = axios.create({
	baseURL: 'http://localhost:3001/'
});

// Request Interceptor
instance.interceptors.request.use(
	(config: any) => {
		const customToken = config.headers?.['X-Custom-Authorization'];
		const token =
			'eyJhbGciOiJSUzI1NiIsImtpZCI6ImU4MWYwNTJhZWYwNDBhOTdjMzlkMjY1MzgxZGU2Y2I0MzRiYzM1ZjMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vYmhhdHRtZXdhZGEtMWUyMmIiLCJhdWQiOiJiaGF0dG1ld2FkYS0xZTIyYiIsImF1dGhfdGltZSI6MTc1OTg1NDUwMiwidXNlcl9pZCI6ImtUTTdMdGpUZVhWWnVLQnBVenJFNDBtUUIxdjEiLCJzdWIiOiJrVE03THRqVGVYVlp1S0JwVXpyRTQwbVFCMXYxIiwiaWF0IjoxNzU5ODU0NTAyLCJleHAiOjE3NTk4NTgxMDIsImVtYWlsIjoiYW5raXRiaGF0dDUxMUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJhbmtpdGJoYXR0NTExQGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.dxt8oB4x0dSBBTXz4nH4whHIMBEgKdfut9coPHSAxGYPHaOcUfBo3s7aoHjOW131MAUzAbML2Hx6MXUAT4XIMKRYgJVFdeATuV18rHrlPaVucVzdXf62xDSJcrMfZTgEf22beIBUAm-49JGgeivI2Ipum1VG2-_HRvgA5eZa18S-dzOh8t_cItbZns_MVdW11c1rr__zHcKr309YruxtBmOzmpNiisadcRVVrN2hqPE4eKOtqHxp2WcOX_QSPW_saoKMJgUNvIt6zCeIWDXzlhAsZ94pxAfSNl_F3RVmJBSPAAnJQm6jeyJxRcdMNuzeLmyBljKPwoK3vbZgz76Wog';

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
			// const lo = getExternalLogout();
			// await lo();
		}
		console.error('API Error:', error);
		return Promise.reject(error);
	}
);

export default instance;
