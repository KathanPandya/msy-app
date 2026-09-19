import axios from '$lib/config/axios';
import type { EmailVerification } from '$lib/types/emailVerification';

class EmailVerificationApi {
	async fetchStatus(): Promise<EmailVerification.Status> {
		const response = await axios.get(`/api/email-verification/status`);
		return response.data;
	}

	async send(payload: { email: string }): Promise<EmailVerification.SendResult> {
		const response = await axios.post(`/api/email-verification/send`, payload);
		return response.data;
	}

	async confirm(payload: { token: string }): Promise<EmailVerification.ConfirmResult> {
		const response = await axios.post(`/api/email-verification/confirm`, payload);
		return response.data;
	}
}

const emailVerificationApi = new EmailVerificationApi();
export default emailVerificationApi;
