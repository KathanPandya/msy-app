import axios from '$lib/config/axios';
import type { Profile } from '$lib/types/profile';

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
}

const profileApi = new ProfileApi();
export default profileApi;
