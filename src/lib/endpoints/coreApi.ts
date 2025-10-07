import axios from '$lib/config/axios';
import type { User } from '$lib/types/user';

class CoreApi {
	async fetchUserInfo({ userId }: { userId: string }): Promise<User.AllInfo> {
		const response = await axios.get<{ data: User.AllInfo }>(`/api/user/${userId}`);
		return response.data.data;
	}
}

const coreApi = new CoreApi();
export default coreApi;
