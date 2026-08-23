import axios from '$lib/config/axios';
import type { User } from '$lib/types/user';

class CoreApi {
	async fetchUserInfo({ userId }: { userId: string }): Promise<User.AllInfo> {
		const response = await axios.get<{ data: User.AllInfo }>(`/api/user/${userId}`);
		return response.data.data;
	}

	async fetchCurrentUser(): Promise<User.AllInfo> {
		const response = await axios.get<{ success: boolean; user: Partial<User.Get> }>(
			`/api/auth/me`
		);
		return {
			user: response.data.user as User.Get,
			profile: null,
			address: {} as User.AllInfo['address'],
			nominee: [],
			payments: [],
			orders: []
		};
	}
}

const coreApi = new CoreApi();
export default coreApi;
