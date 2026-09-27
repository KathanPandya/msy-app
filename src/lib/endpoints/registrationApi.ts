import axios from '$lib/config/axios';
import type { Registration } from '$lib/types/registration';

class RegistrationApi {
	async checkReferral({ code }: { code: string }): Promise<{ valid: boolean }> {
		const response = await axios.get(`/api/registration/referral/${encodeURIComponent(code)}`);
		return response.data;
	}

	async myLink(): Promise<Registration.MyLink> {
		const response = await axios.get('/api/registration/my-link');
		return response.data;
	}

	async start({ payload }: { payload: Registration.Start }): Promise<Registration.StartResponse> {
		const response = await axios.post('/api/registration/start', payload);
		return response.data;
	}

	async verifyOtp({
		token,
		code
	}: {
		token: string;
		code: string;
	}): Promise<{ verified: boolean; registration: Registration.Data }> {
		const response = await axios.post('/api/registration/verify-otp', { token, code });
		return response.data;
	}

	async resendOtp({ token }: { token: string }): Promise<{ sent: boolean; email_masked: string }> {
		const response = await axios.post('/api/registration/resend-otp', { token });
		return response.data;
	}

	async changeEmail({
		token,
		email
	}: {
		token: string;
		email: string;
	}): Promise<{ sent: boolean; email_masked: string }> {
		const response = await axios.post('/api/registration/change-email', { token, email });
		return response.data;
	}

	async me({ token }: { token: string }): Promise<{ registration: Registration.Data }> {
		const response = await axios.get('/api/registration/me', { params: { token } });
		return response.data;
	}

	async update({
		token,
		payload
	}: {
		token: string;
		payload: Registration.Update;
	}): Promise<{ registration: Registration.Data }> {
		const response = await axios.patch('/api/registration/me', { token, ...payload });
		return response.data;
	}

	async uploadDoc({
		token,
		type,
		docType,
		file
	}: {
		token: string;
		type: Registration.UploadType;
		docType?: Registration.IdDocType;
		file: File;
	}): Promise<{ url: string; registration: Registration.Data }> {
		const form = new FormData();
		form.append('token', token);
		form.append('type', type);
		if (docType) form.append('doc_type', docType);
		form.append('file', file);
		const response = await axios.post('/api/registration/docs', form, {
			headers: { 'Content-Type': 'multipart/form-data' }
		});
		return response.data;
	}

	async acceptTerms({
		token,
		version,
		language
	}: {
		token: string;
		version: number;
		language: 'en' | 'guj';
	}): Promise<{ registration: Registration.Data }> {
		const response = await axios.post('/api/registration/accept-terms', {
			token,
			version,
			language
		});
		return response.data;
	}

	async review({ token }: { token: string }): Promise<Registration.ReviewResponse> {
		const response = await axios.get('/api/registration/review', { params: { token } });
		return response.data;
	}

	async createOrder({ token }: { token: string }): Promise<Registration.OrderResponse> {
		const response = await axios.post('/api/registration/order', { token });
		return response.data;
	}

	async verifyPayment({
		token,
		payload
	}: {
		token: string;
		payload: {
			razorpay_order_id: string;
			razorpay_payment_id: string;
			razorpay_signature: string;
		};
	}): Promise<Registration.VerifyPaymentResponse> {
		const response = await axios.post('/api/registration/verify-payment', { token, ...payload });
		return response.data;
	}

	async adminList({
		params
	}: {
		params: { status?: Registration.Status; search?: string; page: number; limit: number };
	}): Promise<Registration.ListResponse> {
		const response = await axios.get('/api/admin/registrations', { params });
		return response.data;
	}

	async adminDetail({
		id
	}: {
		id: string;
	}): Promise<{ success: boolean; data: Registration.AdminDetail }> {
		const response = await axios.get(`/api/admin/registrations/${id}`);
		return response.data;
	}

	async adminReferrer({ id }: { id: string }): Promise<Registration.ReferrerResponse> {
		const response = await axios.get(`/api/admin/registrations/${id}/referrer`);
		return response.data;
	}

	async approve({ id }: { id: string }): Promise<Registration.ApproveResponse> {
		const response = await axios.post(`/api/admin/registrations/${id}/approve`);
		return response.data;
	}

	async reject({
		id,
		reason
	}: {
		id: string;
		reason: string;
	}): Promise<Registration.RejectResponse> {
		const response = await axios.post(`/api/admin/registrations/${id}/reject`, { reason });
		return response.data;
	}

	async resendLink({ id }: { id: string }): Promise<Registration.ResendLinkResponse> {
		const response = await axios.post(`/api/admin/registrations/${id}/resend-link`);
		return response.data;
	}
}

const registrationApi = new RegistrationApi();
export default registrationApi;
