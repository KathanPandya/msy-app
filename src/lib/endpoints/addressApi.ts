import axios from '$lib/config/axios';
import type { Address } from '$lib/types/address';

class AddressApi {
	async updateAddress({
		addressId,
		payload
	}: {
		addressId: string;
		payload: Address.Update;
	}): Promise<{ address: Address.Data; message: string; success: boolean }> {
		const response = await axios.put(`/api/address/update/${addressId}`, payload);
		return response.data;
	}

	async createAddress({
		userToken,
		payload
	}: {
		userToken: string;
		payload: Address.Create;
	}): Promise<{ address: Address.Data; message: string; success: boolean }> {
		const response = await axios.post(
			'/api/address/create',
			payload,
			userToken ? { headers: { 'X-Custom-Authorization': userToken } } : {}
		);
		return response.data;
	}
}

const addressApi = new AddressApi();
export default addressApi;
