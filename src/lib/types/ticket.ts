export namespace Ticket {
	export type Type = 'bug' | 'feature' | 'suggestion';
	export type Status = 'open' | 'solved';

	export type AdminRef = {
		_id: string;
		username: string;
		role: string;
	};

	/**
	 * `createdBy`/`updatedBy`/`deleted_by` come back as a populated object on
	 * GET and as a raw id string on every mutation — see the population table
	 * in ticket.md §4. Always read them through `adminName()`.
	 */
	export type Admin = AdminRef | string | null;

	export type Attachment = {
		_id: string;
		fileName: string;
		url: string;
		key: string;
		mimeType: string;
		createdAt: number;
		updatedAt: number;
	};

	/** What create/edit accepts — no `_id`, the server mints those. */
	export type AttachmentInput = {
		fileName: string;
		url: string;
		key: string;
		mimeType: string;
	};

	export type Data = {
		_id: string;
		title: string;
		description: string;
		type: Type;
		attachments: Attachment[];
		status: Status;
		createdBy: Admin;
		updatedBy: Admin;
		is_deleted: boolean;
		deleted_at: number | null;
		deleted_by: Admin;
		createdAt: number;
		updatedAt: number;
		__v: number;
	};

	export type StatusLog = {
		_id: string;
		ticketId: string;
		from: Status | null;
		to: Status;
		changedBy: AdminRef;
		createdAt: number;
		updatedAt: number;
		__v: number;
	};

	export type Comment = {
		_id: string;
		ticketId: string;
		text: string;
		createdBy: AdminRef;
		createdAt: number;
		updatedAt: number;
		__v: number;
	};

	/** One row in the attachment list UI — covers in-flight uploads too. */
	export type AttachmentItem = {
		id: string;
		name: string;
		url?: string;
		mimeType?: string;
		size?: number;
		status: 'uploading' | 'done' | 'error';
		error?: string;
	};

	export type Pagination = {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};

	export type ListParams = {
		page?: number;
		limit?: number;
		status?: Status | '';
		type?: Type | '';
		createdBy?: string;
		includeDeleted?: boolean;
	};

	export type Create = {
		title: string;
		description: string;
		type: Type;
		attachments?: AttachmentInput[];
	};

	export type Update = {
		title?: string;
		description?: string;
		type?: Type;
		attachments?: AttachmentInput[];
	};

	export type Detail = {
		ticket: Data;
		statusLogs: StatusLog[];
		comments: Comment[];
	};
}
