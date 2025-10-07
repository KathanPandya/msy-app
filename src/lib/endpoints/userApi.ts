import axios from '$lib/config/axios';
import type { User } from '$lib/types/user';

class UserApi {
	async updateUser({
		userId,
		payload
	}: {
		userId: string;
		payload: User.Update;
	}): Promise<{ user: User.Get; message: string; success: boolean }> {
		//to be done
		payload.reference_member_1 = 'test';
		payload.reference_member_2 = 'test';
		const response = await axios.put(`/api/user/update/${userId}`, payload);
		return response.data;
	}

	async createUser({
		payload
	}: {
		payload: User.Create;
	}): Promise<{ user: User.Get; token: string; success: boolean }> {
		const response = await axios.post(`/api/auth/register`, payload);
		return response.data;
	}
}

const userApi = new UserApi();
export default userApi;
