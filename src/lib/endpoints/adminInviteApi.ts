import axios from '$lib/config/axios';
import type { AdminInvite } from '$lib/types/admin';

// Public endpoints for the invited person (no admin session yet).
class AdminInviteApi {
	async check(payload: { token: string }): Promise<AdminInvite.CheckResult> {
		const response = await axios.post('/api/admin-invites/check', payload);
		return response.data;
	}

	async accept(payload: AdminInvite.AcceptPayload): Promise<AdminInvite.AcceptResult> {
		const response = await axios.post('/api/admin-invites/accept', payload);
		return response.data;
	}
}

const adminInviteApi = new AdminInviteApi();
export default adminInviteApi;
