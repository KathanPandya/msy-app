import axios from '$lib/config/axios';
import type { Terms } from '$lib/types/terms';

class TermsApi {
	async current(): Promise<{ terms: Terms.Current }> {
		const response = await axios.get('/api/terms/current');
		return response.data;
	}

	async list(): Promise<{ success: boolean; data: Terms.ListRow[] }> {
		const response = await axios.get('/api/admin/terms');
		return response.data;
	}

	async get({ id }: { id: string }): Promise<{ success: boolean; data: Terms.Detail }> {
		const response = await axios.get(`/api/admin/terms/${id}`);
		return response.data;
	}

	async publish({ payload }: { payload: Terms.Publish }): Promise<{
		success: boolean;
		message: string;
		data: { id: string; version: number };
	}> {
		const response = await axios.post('/api/admin/terms', payload);
		return response.data;
	}

	async makeCurrent({ id }: { id: string }): Promise<{ success: boolean; message?: string }> {
		const response = await axios.post(`/api/admin/terms/${id}/make-current`);
		return response.data;
	}
}

const termsApi = new TermsApi();
export default termsApi;
