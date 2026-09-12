import uploadApi from '$lib/endpoints/uploadApi';
import type { Ticket } from '$lib/types/ticket';

// ---------- Errors ----------

/**
 * The ticket API has two error shapes: 422s are `{ error: { field: msg } }`
 * with no `success`/`message` at all, everything else is
 * `{ success: false, message }` (ticket.md §8). Every call site goes through
 * here so nothing else has to know that.
 */
export function parseTicketError(err: any, fallback = 'Something went wrong'): string {
	const data = err?.response?.data;
	if (!data) return err?.message || fallback;

	if (data.error && typeof data.error === 'object') {
		const messages = Object.values(data.error).filter(Boolean) as string[];
		if (messages.length) return messages.join(', ');
	}

	// 403s from the auth middleware use `error` as a plain string.
	if (typeof data.error === 'string') return data.error;

	return data.message || fallback;
}

// ---------- Dates (epoch ms numbers, never strings — §3.1) ----------

export function formatTicketDate(ms: number | null | undefined): string {
	if (!ms) return '-';
	const date = new Date(ms);
	if (isNaN(date.getTime())) return '-';
	return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTicketDateTime(ms: number | null | undefined): string {
	if (!ms) return '-';
	const date = new Date(ms);
	if (isNaN(date.getTime())) return '-';
	return date.toLocaleString('en-GB', {
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hour12: true
	});
}

export function timeAgo(ms: number | null | undefined): string {
	if (!ms) return '';
	const seconds = Math.floor((Date.now() - ms) / 1000);
	if (seconds < 60) return 'just now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return formatTicketDate(ms);
}

// ---------- Admin refs ----------

/** Populated object on GET, raw id string on every mutation (§4). */
export function adminName(admin: Ticket.Admin): string {
	if (!admin) return '-';
	if (typeof admin === 'string') return '-';
	return admin.username || '-';
}

export function adminId(admin: Ticket.Admin): string | null {
	if (!admin) return null;
	return typeof admin === 'string' ? admin : admin._id;
}

/**
 * The logged-in admin's id. The admin login payload uses `id` (see AdminUser
 * in authApi) while the member payload uses `_id`, and the store holds
 * whichever one this session logged in with — so check both, then fall back to
 * the `userId` login writes to localStorage.
 */
export function resolveCurrentAdminId(user: any): string | null {
	const id = user?._id ?? user?.id;
	if (id) return String(id);
	if (typeof localStorage !== 'undefined') return localStorage.getItem('userId');
	return null;
}

export function isCreator(ticket: Ticket.Data | null, currentUserId: string | null): boolean {
	if (!ticket || !currentUserId) return false;
	return adminId(ticket.createdBy) === currentUserId;
}

// ---------- Labels & pills ----------

export const TICKET_TYPES: { key: Ticket.Type; label: string }[] = [
	{ key: 'bug', label: 'Bug' },
	{ key: 'feature', label: 'Feature' },
	{ key: 'suggestion', label: 'Suggestion' }
];

export const TICKET_STATUSES: { key: Ticket.Status; label: string }[] = [
	{ key: 'open', label: 'Open' },
	{ key: 'solved', label: 'Solved' }
];

const TYPE_CLASSES: Record<Ticket.Type, string> = {
	bug: 'bg-red-50 text-red-700 ring-red-200',
	feature: 'bg-blue-50 text-blue-700 ring-blue-200',
	suggestion: 'bg-amber-50 text-amber-700 ring-amber-200'
};

const STATUS_CLASSES: Record<Ticket.Status, string> = {
	open: 'bg-amber-50 text-amber-700 ring-amber-200',
	solved: 'bg-green-50 text-green-700 ring-green-200'
};

const PILL_BASE =
	'inline-flex items-center rounded px-1.5 py-[1px] text-[11px] font-medium ring-1 ring-inset';

export function typePillClass(type: Ticket.Type): string {
	return `${PILL_BASE} ${TYPE_CLASSES[type] ?? 'bg-gray-50 text-gray-700 ring-gray-200'}`;
}

export function statusPillClass(status: Ticket.Status): string {
	return `${PILL_BASE} ${STATUS_CLASSES[status] ?? 'bg-gray-50 text-gray-700 ring-gray-200'}`;
}

export function typeLabel(type: Ticket.Type): string {
	return TICKET_TYPES.find((t) => t.key === type)?.label ?? type;
}

export function statusLabel(status: Ticket.Status): string {
	return TICKET_STATUSES.find((s) => s.key === status)?.label ?? status;
}

/** Table cells render through `{@html}`, so anything interpolated must be escaped. */
export function escapeHtml(value: unknown): string {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// ---------- Attachments ----------

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_EXTENSIONS = [
	'jpeg',
	'jpg',
	'png',
	'gif',
	'pdf',
	'doc',
	'docx',
	'xls',
	'xlsx'
];
export const UPLOAD_ACCEPT = ALLOWED_UPLOAD_EXTENSIONS.map((ext) => `.${ext}`).join(',');

export function isImageAttachment(a: { mimeType?: string; url?: string }): boolean {
	if (a.mimeType?.startsWith('image/')) return true;
	// mimeType is "" when it wasn't sent — fall back to the extension.
	return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(a.url ?? '');
}

export function attachmentName(a: { fileName?: string; url?: string; key?: string }): string {
	if (a.fileName) return a.fileName;
	const source = a.key || a.url || '';
	const last = source.split('/').pop() || 'attachment';
	// Keys are prefixed with a timestamp: "tickets/1699123-screen.png".
	return last.replace(/^\d+-/, '');
}

export function formatBytes(bytes: number | undefined): string {
	if (!bytes) return '';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Rejects locally on the same rules the server applies, so we don't burn a request. */
export function validateUploadFile(file: File): string | null {
	const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
	if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext)) {
		return `${file.name}: unsupported file type`;
	}
	if (file.size > MAX_UPLOAD_BYTES) {
		return `${file.name}: larger than 10 MB`;
	}
	return null;
}

/**
 * One file per request (§7). Maps `fileUrl` → `url`, which is the rename the
 * ticket API needs and the easiest thing in this integration to forget.
 */
export async function uploadTicketFile(file: File): Promise<Ticket.AttachmentInput> {
	const formData = new FormData();
	formData.append('file', file);
	formData.append('folder', 'tickets');

	const response = await uploadApi.file({ file: formData });
	const data = response.data;

	return {
		fileName: data.fileName || file.name,
		url: data.fileUrl,
		key: data.key,
		mimeType: data.mimeType || file.type || ''
	};
}

/** Strips server-side fields so an existing attachment can be re-sent on PATCH. */
export function toAttachmentInput(a: Ticket.Attachment): Ticket.AttachmentInput {
	return { fileName: a.fileName, url: a.url, key: a.key, mimeType: a.mimeType };
}
