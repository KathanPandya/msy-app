export namespace PinAuth {
	export type Stage =
		| 'identify'
		| 'pin'
		| 'bootstrap'
		| 'changePin'
		| 'admin'
		| 'locked'
		| 'inactive';

	export type IdentifyResult = {
		stage: Stage;
		memberId?: string;
		name?: string;
		userId?: string;
		error?: string;
	};

	export type StageResult = {
		stage?: Stage;
		memberId?: string;
		name?: string;
		userId?: string;
		error?: string;
		left?: number;
		dobOk?: boolean;
		success?: boolean;
		token?: string;
		expiresAt?: string;
		user?: PinUser;
	};

	export type PinUser = {
		_id: string;
		member_id: string;
		first_name: string;
		middle_name?: string;
		surname: string;
		role: string;
		status: string;
		outstanding_amount?: number;
		entry_date?: string;
		date_of_birth?: string;
		mobile?: string;
		email?: string;
		has_pin?: boolean;
		must_change_pin?: boolean;
		locked?: boolean;
		pin_attempts?: number;
		dob_is_placeholder?: boolean;
		club_id?: string | null;
	};

	export type SessionSuccess = {
		success: true;
		token: string;
		expiresAt: string;
		user: PinUser;
	};
}
