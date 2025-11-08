import axios from '$lib/config/axios';
import type { User } from '$lib/types/user';

class AuthApi {
	async userLogin(payload: {
		email: string;
		password: string;
	}): Promise<{ success: boolean; token: string; user: User.Get }> {
		const response = await axios.post(`/api/auth/login`, payload);
		return response.data;
	}
}

const authApi = new AuthApi();
export default authApi;
