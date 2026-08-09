import axios from '$lib/config/axios';
import type { Family } from '$lib/types/family';
import { clearMembersCache } from '$lib/utilities/membersCache';

class FamiliesApi {
	async list(params?: {
		search?: string;
		skip?: number;
		limit?: number;
	}): Promise<{ success: boolean; families: Family.ListItem[]; total: number }> {
		const response = await axios.get(`/api/families`, {
			params: {
				search: params?.search || undefined,
				skip: params?.skip,
				limit: params?.limit
			}
		});
		return response.data;
	}

	async detail(id: string): Promise<{ success: boolean; family: Family.Detail }> {
		const response = await axios.get(`/api/families/${id}`);
		return response.data;
	}

	async createNew(payload: {
		memberId: string;
	}): Promise<{ success: boolean; clubId: string; member: Family.MemberSummary }> {
		const response = await axios.post(`/api/families/new`, payload);
		clearMembersCache();
		return response.data;
	}

	async addMember(
		id: string,
		payload: { memberId: string }
	): Promise<{ success: boolean; clubId: string; member: Family.MemberSummary }> {
		const response = await axios.post(`/api/families/${id}/add-member`, payload);
		clearMembersCache();
		return response.data;
	}

	async removeMember(
		id: string,
		payload: { memberId: string }
	): Promise<{ success: boolean; clubId: string; member: Family.MemberSummary }> {
		const response = await axios.post(`/api/families/${id}/remove-member`, payload);
		clearMembersCache();
		return response.data;
	}

	async makeHead(
		id: string,
		payload: { memberId: string }
	): Promise<{ success: boolean; clubId: string; managerId: string }> {
		const response = await axios.post(`/api/families/${id}/make-head`, payload);
		clearMembersCache();
		return response.data;
	}

	async me(): Promise<Family.MeResponse> {
		const response = await axios.get(`/api/families/me`);
		return response.data;
	}

	async getMember(id: string): Promise<{
		success: boolean;
		member: Family.MemberSummary & Record<string, unknown>;
	}> {
		const response = await axios.get(`/api/families/member/${id}`);
		return response.data;
	}

	async unlock(id: string): Promise<{ success: boolean; member: Family.MemberSummary }> {
		const response = await axios.post(`/api/families/user/${id}/unlock`);
		return response.data;
	}

	async resetPin(
		id: string
	): Promise<{ success: boolean; tempPin: string; member: Family.MemberSummary }> {
		const response = await axios.post(`/api/families/user/${id}/reset-pin`);
		return response.data;
	}

	async needsHead(): Promise<{ success: boolean; families: Family.NeedsHeadItem[] }> {
		const response = await axios.get(`/api/families/needs-head`);
		return response.data;
	}

	async promoteHead(payload: {
		clubId: string;
		memberId: string;
	}): Promise<{ success: boolean; clubId: string; managerId: string }> {
		const response = await axios.post(`/api/families/needs-head/promote`, payload);
		return response.data;
	}
}

const familiesApi = new FamiliesApi();
export default familiesApi;
