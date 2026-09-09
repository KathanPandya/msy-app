import axios from '$lib/config/axios';
import type { Nominee } from '$lib/types/nominee';

class NomineeApi {
	async fetchNominees({ userId }: { userId: string }): Promise<{
		success: boolean;
		data: Nominee.Data[];
	}> {
		const response = await axios.get(`/api/nominee/${userId}`);
		return response.data;
	}

	async createNominee({
		payload
	}: {
		payload: Nominee.Create;
	}): Promise<{ success: boolean; address: Nominee.Data; message: string }> {
		const response = await axios.post('/api/nominee/create', payload);
		return response.data;
	}

	async updateNomineeRelation({
		nomineeId,
		payload
	}: {
		nomineeId: string;
		payload: Nominee.Update;
	}): Promise<{ success: boolean; nominee: Nominee.Data; message: string }> {
		const response = await axios.patch(`/api/nominee/update/${nomineeId}`, payload);
		return response.data;
	}

	async deleteNominee({
		nomineeId
	}: {
		nomineeId: string;
	}): Promise<{ success: boolean; message: string }> {
		const response = await axios.delete(`/api/nominee/delete/${nomineeId}`);
		return response.data;
	}
}

const nomineeApi = new NomineeApi();
export default nomineeApi;
