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
}

const adminApi = new AdminApi();
export default adminApi;
