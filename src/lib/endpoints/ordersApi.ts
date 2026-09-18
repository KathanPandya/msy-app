import axios from '$lib/config/axios';
import type { Order } from '$lib/types/order';

class OrdersApi {
	async createOrder({
		payload
	}: {
		payload: Order.Create;
	}): Promise<{ success: boolean; message: string; order: Order.Data }> {
		const response = await axios.post('/api/orders/create', payload);
		return response.data;
	}

	async verifyPayment({ payload }: { payload: Order.Verify }): Promise<Order.VerifyResponse> {
		const response = await axios.post('/api/orders/verify-payment', payload);
		return response.data;
	}

	// Admin only. Omit `status` for all orders — an empty `status=` is a 422.
	async fetchOrders({
		status
	}: { status?: Order.Status } = {}): Promise<{ success: boolean; data: Order.Data[] }> {
		const response = await axios.get('/api/orders', { params: status ? { status } : {} });
		return response.data;
	}

	// Admin only. `id` is the order `_id`, not `razorpay_order_id`.
	async markSettled({
		id,
		remarks
	}: {
		id: string;
		remarks?: string;
	}): Promise<{ success: boolean; message: string; order: Order.Data }> {
		const response = await axios.put(`/api/orders/${id}/mark-settled`, remarks ? { remarks } : {});
		return response.data;
	}

	// Admin only. Asks Razorpay whether a `created`/`failed` order was paid and settles it if so.
	async reconcile({
		id,
		remarks
	}: {
		id: string;
		remarks?: string;
	}): Promise<Order.ReconcileResponse> {
		const response = await axios.post(`/api/orders/${id}/reconcile`, remarks ? { remarks } : {});
		return response.data;
	}
}

const ordersApi = new OrdersApi();
export default ordersApi;
