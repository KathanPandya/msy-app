import axios from '$lib/config/axios';
import type { AdminInvite, AdminUser } from '$lib/types/admin';

class AdminApi {
	async fetchAdmins(): Promise<{ success: boolean; count: number; data: AdminUser.Data[] }> {
		const response = await axios.get('/api/admin/admins');
		return response.data;
	}

	async deleteAdmin({ id }: { id: string }): Promise<{
		success: boolean;
		message: string;
		data: { _id: string; username: string };
	}> {
		const response = await axios.delete(`/api/admin/admins/${id}`);
		return response.data;
	}

	async sendInvite({ email }: { email: string }): Promise<{
		success: boolean;
		message: string;
		data: AdminInvite.Data;
	}> {
		const response = await axios.post('/api/admin/invites', { email });
		return response.data;
	}

	async fetchInvites(): Promise<{ success: boolean; count: number; data: AdminInvite.Data[] }> {
		const response = await axios.get('/api/admin/invites');
		return response.data;
	}

	async revokeInvite({ id }: { id: string }): Promise<{ success: boolean; message: string }> {
		const response = await axios.post(`/api/admin/invites/${id}/revoke`);
		return response.data;
	}

	async changePassword(payload: {
		currentPassword: string;
		newPassword: string;
	}): Promise<{ success: boolean; message: string }> {
		const response = await axios.post('/api/admin/change-password', payload);
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

	async fetchUserEmail({ userId }: { userId: string }): Promise<AdminUser.EmailInfo> {
		const response = await axios.get(`/api/admin/users/${userId}/email`);
		return response.data;
	}

	async sendUserEmailVerification({ userId, email }: { userId: string; email: string }): Promise<{
		success: boolean;
		alreadyVerified?: boolean;
		message: string;
	}> {
		const response = await axios.post(`/api/admin/users/${userId}/email/send-verification`, {
			email
		});
		return response.data;
	}

	async markUserEmailVerified({ userId, email }: { userId: string; email: string }): Promise<{
		success: boolean;
		alreadyVerified: boolean;
		message: string;
		active: AdminUser.VerifiedEmail;
	}> {
		const response = await axios.post(`/api/admin/users/${userId}/email/mark-verified`, {
			email
		});
		return response.data;
	}
}

const adminApi = new AdminApi();
export default adminApi;
