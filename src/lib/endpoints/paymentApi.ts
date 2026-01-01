import axios from '$lib/config/axios';
import type { Payment } from '$lib/types/payment';

class PaymentApi {
	async getAllPayments(queryParams: {
		startDate?: string;
		endDate?: string;
	}): Promise<{ data: Payment.List; success: boolean }> {
		const response = await axios.get('api/payment', {
			params: {
				startDate: queryParams.startDate,
				endDate: queryParams.endDate
			}
		});
		return response.data;
	}

	async getOutstandingPaymentOfMember(
		userId: string
	): Promise<{ data: Payment.OutstandingData; success: boolean }> {
		const response = await axios.get(`api/payment/get-outstanding-table/${userId}`);
		return response.data;
	}

	async getAllPayouts(queryParams: {
		limit: number;
		page: number;
	}): Promise<{ data: Payment.Payout_Get[]; success: boolean }> {
		const response = await axios.get('api/payout', {
			params: {
				limit: queryParams.limit,
				page: queryParams.page
			}
		});
		return response.data;
	}

	async getAllUserOutstandingPayment(): Promise<{ data: Payment.Payout_Get[]; success: boolean }> {
		const response = await axios.get('api/payment/get-all-user-outstanding-amount');
		return response.data;
	}

	async addPayment({
		payload
	}: {
		payload: Payment.Create;
	}): Promise<{ address: Payment.Get; success: boolean; message: string }> {
		const response = await axios.post('/api/payment/create', payload);
		return response.data;
	}

	async updatePayment({
		payload
	}: {
		payload: Payment.Update;
	}): Promise<{ address: Payment.Get; success: boolean; message: string }> {
		const response = await axios.put(`/api/payment/update/${payload.id}`, payload);
		return response.data;
	}

	async addPayout({
		payload
	}: {
		payload: Payment.Payout_Create;
	}): Promise<{ address: Payment.Get; success: boolean; message: string }> {
		const response = await axios.post('/api/payout/create', payload);
		return response.data;
	}
}

const paymentApi = new PaymentApi();
export default paymentApi;
