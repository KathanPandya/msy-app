import axios from '$lib/config/axios';
import type { DeadMember } from '$lib/types/deadMember';
import type { User } from '$lib/types/user';

class DeadMemberApi {
	async getAllDeadMembers(): Promise<{ data: Array<DeadMember.Get>; success: boolean }> {
		const response = await axios.get(`/api/dead-member`);
		return response.data;
	}

	async changeMemberStatusToDead({
		payload
	}: {
		payload: DeadMember.Create;
	}): Promise<{ user: User.Get; token: string; success: boolean }> {
		const response = await axios.post(`/api/dead-member/create`, payload);
		return response.data;
	}

	async updateDeadMember({ payload }: { payload: DeadMember.Update }) {
		const response = await axios.put(`/api/dead-member/update/${payload.id}`, payload);
		return response.data;
	}
}

const deadMemberApi = new DeadMemberApi();
export default deadMemberApi;
