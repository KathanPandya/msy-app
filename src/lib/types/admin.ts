export namespace AdminUser {
	export type Data = {
		_id: string;
		username: string;
		// Missing for admins created before invites existed.
		name?: string | null;
		email?: string | null;
		role: string;
		createdAt: number;
		createdBy: { _id: string; username: string } | null;
	};

	// A member's verified email (separate from the profile email). "link" =
	// verified via the emailed link, "admin" = marked verified by an admin.
	export type VerifiedEmail = {
		email: string;
		status: 'active' | 'old';
		method: 'link' | 'admin';
		admin_id: string | null;
		verified_at: string;
		replaced_at: string | null;
	};

	export type EmailInfo = {
		success: boolean;
		active: VerifiedEmail | null;
		history: VerifiedEmail[];
	};

	export type RazorpayUser = {
		_id: string;
		member_id: string;
		first_name?: string;
		middle_name?: string;
		surname?: string;
	};
}

export namespace AdminInvite {
	export type Status = 'pending' | 'accepted' | 'revoked' | 'expired';

	export type Data = {
		_id: string;
		email: string;
		status: Status;
		expiresAt: number;
		createdAt: number;
		acceptedAt: number | null;
		revokedAt: number | null;
		invitedBy: { _id: string; username: string } | null;
		acceptedAdmin: { _id: string; username: string } | null;
	};

	export type CheckResult = {
		success: boolean;
		email: string;
		expiresAt: number;
	};

	export type AcceptPayload = {
		token: string;
		name: string;
		username: string;
		password: string;
	};

	export type AcceptResult = {
		success: boolean;
		message: string;
		username: string;
	};
}
