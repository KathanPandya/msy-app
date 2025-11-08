import axios from '$lib/config/axios';
import type { Profile } from '$lib/types/profile';
import type { User } from '$lib/types/user';

class ProfileApi {
	async updateProfile({
		profileId,
		payload
	}: {
		profileId: string;
		payload: Profile.Update;
	}): Promise<{ profile: Profile.Get; message: string; success: boolean }> {
		const response = await axios.put(`api/profile/update/${profileId}`, payload);
		return response.data;
	}

	async createProfile({
		userToken,
		payload
	}: {
		userToken: string;
		payload: Profile.Create;
	}): Promise<{ user: Profile.Get; message: string; success: boolean }> {
		const response = await axios.post(
			`/api/profile/create`,
			payload,
			userToken ? { headers: { 'X-Custom-Authorization': userToken } } : {}
		);
		return response.data;
	}

	async createProfileById({
		userId
	}: {
		userId: string;
	}): Promise<{ user: User.Get; message: string; success: boolean; profile: Profile.Get }> {
		const response = await axios.post(`/api/admin/profile/create/${userId}`);
		return response.data;
	}
}

const profileApi = new ProfileApi();
export default profileApi;
