import axios from '$lib/config/axios';

export type AdminUser = {
	id: string;
	username: string;
	role: string;
	createdAt: string;
	updatedAt: string;
};

class AuthApi {
	async userLogin(payload: {
		username: string;
		password: string;
	}): Promise<{ success: boolean; token: string; user: AdminUser }> {
		const response = await axios.post(`/api/auth/login`, payload);
		return response.data;
	}
}

const authApi = new AuthApi();
export default authApi;
