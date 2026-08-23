import axios from '$lib/config/axios';
import type { StatusLog } from '$lib/types/statusLog';
import { clearMembersCache } from '$lib/utilities/membersCache';
import { clearMeCache } from '$lib/utilities/meCache';

class StatusLogApi {
	async getStatusLog(userId: string): Promise<StatusLog.GetResponse> {
		const response = await axios.get(`/api/status-log/${userId}`);
		return response.data;
	}

	async postStatusLog(
		userId: string,
		payload: StatusLog.PostRequest
	): Promise<StatusLog.PostResponse> {
		const response = await axios.post(`/api/status-log/${userId}`, payload);
		clearMembersCache();
		clearMeCache();
		return response.data;
	}

	async putStatusLog(
		userId: string,
		logId: string,
		payload: StatusLog.PutRequest
	): Promise<StatusLog.PutResponse> {
		const response = await axios.put(`/api/status-log/${userId}/${logId}`, payload);
		clearMembersCache();
		clearMeCache();
		return response.data;
	}
}

const statusLogApi = new StatusLogApi();
export default statusLogApi;
