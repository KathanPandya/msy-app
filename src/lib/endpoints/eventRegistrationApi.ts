import axios from '$lib/config/axios';
import type { EventRegistration } from '$lib/types/eventRegistration';

class EventRegistrationApi {
	async createOrder({
		token,
		members
	}: {
		token: string | null;
		members: EventRegistration.MemberInput[];
	}): Promise<EventRegistration.OrderResponse> {
		const response = await axios.post('/api/event-registration/order', { token, members });
		return response.data;
	}

	async verifyPayment({
		token,
		payload
	}: {
		token: string;
		payload: EventRegistration.VerifyPayload;
	}): Promise<{ status: 'submitted' | 'processing' | 'needs_review' }> {
		const response = await axios.post('/api/event-registration/verify-payment', {
			token,
			...payload
		});
		return response.data;
	}

	async pass({ token }: { token: string }): Promise<{ registration: EventRegistration.Data }> {
		const response = await axios.get('/api/event-registration/pass', { params: { token } });
		return response.data;
	}

	async checkinDetail({
		token
	}: {
		token: string;
	}): Promise<{ success: boolean; data: EventRegistration.Data }> {
		const response = await axios.get(`/api/admin/event-registrations/checkin/${token}`);
		return response.data;
	}

	async checkin({
		token,
		memberIds
	}: {
		token: string;
		memberIds: string[];
	}): Promise<{ success: boolean; data: EventRegistration.Data }> {
		const response = await axios.post(`/api/admin/event-registrations/checkin/${token}`, {
			member_ids: memberIds
		});
		return response.data;
	}
}

const eventRegistrationApi = new EventRegistrationApi();
export default eventRegistrationApi;
