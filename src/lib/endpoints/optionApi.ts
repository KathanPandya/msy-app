import axios from '$lib/config/axios';
import type { Option } from '$lib/types/option';

class OptionApi {
	async list({ lists }: { lists: string[] }): Promise<{ options: Record<string, Option.Item[]> }> {
		const response = await axios.get('/api/options', { params: { list: lists.join(',') } });
		return response.data;
	}
}

const optionApi = new OptionApi();
export default optionApi;
