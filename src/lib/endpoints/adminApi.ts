import axios from '$lib/config/axios';
import type { AdminUser } from '$lib/types/admin';

class AdminApi {
	async fetchAdmins(): Promise<{ success: boolean; count: number; data: AdminUser.Data[] }> {
		const response = await axios.get('/api/admin/admins');
		return response.data;
	}

	async createAdmin({
		payload
	}: {
		payload: AdminUser.Create;
	}): Promise<{ success: boolean; message: string; data: AdminUser.Data }> {
		const response = await axios.post('/api/admin/create-admin', payload);
		return response.data;
	}

	async fetchRazorpayUsers(): Promise<{
		success: boolean;
		userIds: string[];
		data: AdminUser.RazorpayUser[];
	}> {
		const response = await axios.get('/api/admin/razorpay-users');
		return response.data;
	}

	// Full replace — every id not in the list is turned off (razorpay.md §2).
	async saveRazorpayUsers({ userIds }: { userIds: string[] }): Promise<{
		success: boolean;
		message: string;
		userIds: string[];
		enabled: number;
		disabled: number;
	}> {
		const response = await axios.put('/api/admin/razorpay-users', { userIds });
		return response.data;
	}
}

const adminApi = new AdminApi();
export default adminApi;
