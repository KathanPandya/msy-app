import axios from '$lib/config/axios';
import { memberListStore } from '$lib/stores/memberListStore';
import type { User } from '$lib/types/user';
import { clearMembersCache } from '$lib/utilities/membersCache';
import { clearMeCache } from '$lib/utilities/meCache';

class UserApi {
	async updateUser({
		userId,
		payload
	}: {
		userId: string;
		payload: User.Update;
	}): Promise<{ user: User.Get; message: string; success: boolean }> {
		const response = await axios.put(`/api/user/update/${userId}`, payload);
		memberListStore.clear();
		clearMembersCache();
		clearMeCache();
		return response.data;
	}

	async createUser({
		payload
	}: {
		payload: User.Create;
	}): Promise<{ user: User.Get; token: string; success: boolean }> {
		const response = await axios.post(`/api/auth/register`, payload);
		memberListStore.clear();
		clearMembersCache();
		clearMeCache();
		return response.data;
	}

	async getAllUsers({
		query,
		skip,
		limit,
		sortOnKey,
		sortType,
		member_status,
		operation,
		amount,
		balance_type
	}: {
		query?: string;
		skip?: number;
		limit?: number;
		sortOnKey?: string;
		sortType?: 'asc' | 'desc';
		member_status?: string;
		operation?: string;
		amount?: number | undefined;
		balance_type?: 'debit' | 'credit' | undefined;
	}): Promise<{ users: User.List; total: number; success: boolean; message?: string }> {
		const response = await axios.get('api/user', {
			params: {
				name: query,
				member_id: query,
				skip: skip,
				limit: limit,
				sortOnKey,
				sortType,
				member_status,
				operation,
				amount,
				balance_type
			}
		});
		return response.data;
	}
}

const userApi = new UserApi();
export default userApi;
