import axios from '$lib/config/axios';
import type { Ticket } from '$lib/types/ticket';

type Ok<T> = { success: boolean; data: T; message: string };

class TicketApi {
	async fetchTickets({ params }: { params: Ticket.ListParams }): Promise<{
		success: boolean;
		data: Ticket.Data[];
		pagination: Ticket.Pagination;
	}> {
		// Only send what's actually set — an empty `status=` is a 422, not a
		// "no filter" (ticket.md §6.1: every filter must be a valid enum value).
		const query: Record<string, string> = {};
		if (params.page) query.page = String(params.page);
		if (params.limit) query.limit = String(params.limit);
		if (params.status) query.status = params.status;
		if (params.type) query.type = params.type;
		if (params.createdBy) query.createdBy = params.createdBy;
		if (params.includeDeleted) query.includeDeleted = 'true';

		const response = await axios.get('/api/tickets', { params: query });
		return response.data;
	}

	async fetchTicket({ id }: { id: string }): Promise<Ok<Ticket.Detail>> {
		const response = await axios.get(`/api/tickets/${id}`);
		return response.data;
	}

	async createTicket({ payload }: { payload: Ticket.Create }): Promise<Ok<Ticket.Data>> {
		const response = await axios.post('/api/tickets', payload);
		return response.data;
	}

	async updateTicket({
		id,
		payload
	}: {
		id: string;
		payload: Ticket.Update;
	}): Promise<Ok<Ticket.Data>> {
		const response = await axios.patch(`/api/tickets/${id}`, payload);
		return response.data;
	}

	async updateStatus({
		id,
		status
	}: {
		id: string;
		status: Ticket.Status;
	}): Promise<Ok<Ticket.Data>> {
		const response = await axios.patch(`/api/tickets/${id}/status`, { status });
		return response.data;
	}

	async deleteTicket({ id }: { id: string }): Promise<{ success: boolean; message: string }> {
		const response = await axios.delete(`/api/tickets/${id}`);
		return response.data;
	}

	/**
	 * The only way to remove an attachment — a PATCH that drops it from the
	 * array leaves the S3 object orphaned (ticket.md §10.2).
	 */
	async deleteAttachment({
		id,
		attachmentId
	}: {
		id: string;
		attachmentId: string;
	}): Promise<Ok<Ticket.Data>> {
		const response = await axios.delete(`/api/tickets/${id}/attachments/${attachmentId}`);
		return response.data;
	}

	async addComment({ id, text }: { id: string; text: string }): Promise<Ok<Ticket.Comment>> {
		const response = await axios.post(`/api/tickets/${id}/comments`, { text });
		return response.data;
	}
}

const ticketApi = new TicketApi();
export default ticketApi;
