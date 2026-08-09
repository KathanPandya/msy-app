import axios from '$lib/config/axios';
import type { PinAuth } from '$lib/types/pinAuth';

class PinAuthApi {
	async identify(payload: { memberId: string }): Promise<PinAuth.IdentifyResult> {
		const response = await axios.post(`/api/pin-auth/identify`, payload);
		return response.data;
	}

	async loginPin(payload: {
		memberId: string;
		pin: string;
	}): Promise<PinAuth.StageResult> {
		const response = await axios.post(`/api/pin-auth/login-pin`, payload);
		return response.data;
	}

	async bootstrap(payload: {
		memberId: string;
		dob: string;
		newPin: string;
		confirm: string;
	}): Promise<PinAuth.StageResult> {
		const response = await axios.post(`/api/pin-auth/bootstrap`, payload);
		return response.data;
	}

	async changePin(payload: {
		memberId: string;
		current: string;
		newPin: string;
		confirm: string;
	}): Promise<PinAuth.StageResult> {
		const response = await axios.post(`/api/pin-auth/change-pin`, payload);
		return response.data;
	}

	async logout(): Promise<{ success: boolean; message?: string }> {
		const response = await axios.post(`/api/pin-auth/logout`, {});
		return response.data;
	}
}

const pinAuthApi = new PinAuthApi();
export default pinAuthApi;
