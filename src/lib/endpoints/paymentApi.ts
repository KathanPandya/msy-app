import axios from '$lib/config/axios';
import type { Payment } from '$lib/types/payment';
import { clearMembersCache } from '$lib/utilities/membersCache';
import { clearPaymentsCache } from '$lib/utilities/paymentsCache';
import { clearMeCache } from '$lib/utilities/meCache';

class PaymentApi {
	async getAllPayments(queryParams: {
		startDate?: string;
		endDate?: string;
		skip?: number;
		limit?: number;
	}): Promise<{ data: Payment.List; total?: number; success: boolean }> {
		const response = await axios.get('api/payment', {
			params: {
				startDate: queryParams.startDate,
				endDate: queryParams.endDate,
				skip: queryParams.skip,
				limit: queryParams.limit
			}
		});
		return response.data;
	}

	async getPaymentById(id: string): Promise<{ data: Payment.Get; success: boolean }> {
		const response = await axios.get(`api/payment/${id}`);
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
		clearMembersCache();
		clearPaymentsCache();
		clearMeCache();
		return response.data;
	}

	async updatePayment({
		payload
	}: {
		payload: Payment.Update;
	}): Promise<{ address: Payment.Get; success: boolean; message: string }> {
		const response = await axios.put(`/api/payment/update/${payload.id}`, payload);
		clearMembersCache();
		clearPaymentsCache();
		clearMeCache();
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

	async submitPaymentScreenshot({
		userId,
		url
	}: {
		userId: string;
		url: string;
	}): Promise<{ success: boolean; message: string }> {
		const response = await axios.post('/api/payment-screenshot', { userId, url });
		return response.data;
	}

	async getScreenshots(
		queryParams: {
			void?: boolean;
		} = {}
	): Promise<{ data: Payment.ScreenshotList; success: boolean }> {
		const response = await axios.get('/api/payment-screenshot', {
			params: { void: queryParams.void }
		});
		return response.data;
	}

	async generateScreenshotPayment(
		screenshotId: string
	): Promise<{ data: Payment.GeneratePreview; success: boolean }> {
		const response = await axios.post(`/api/payment-screenshot/${screenshotId}/generate-payment`);
		return response.data;
	}

	async getScreenshotPayments(
		screenshotId: string
	): Promise<{ data: Payment.ScreenshotPaymentList; success: boolean }> {
		const response = await axios.get(`/api/payment-screenshot/${screenshotId}/payments`);
		return response.data;
	}

	async voidScreenshot({
		screenshotId,
		reason
	}: {
		screenshotId: string;
		reason: string;
	}): Promise<{ success: boolean; message?: string }> {
		const response = await axios.post(`/api/payment-screenshot/${screenshotId}/void`, { reason });
		return response.data;
	}

	async unvoidScreenshot(screenshotId: string): Promise<{ success: boolean; message?: string }> {
		const response = await axios.post(`/api/payment-screenshot/${screenshotId}/unvoid`);
		return response.data;
	}
}

const paymentApi = new PaymentApi();
export default paymentApi;
