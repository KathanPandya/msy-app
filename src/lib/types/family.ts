export namespace Family {
	export type MemberSummary = {
		id: string;
		member_id: string;
		first_name?: string;
		middle_name?: string;
		surname?: string;
		name: string;
		status: string;
		outstanding_amount?: number;
		mobile?: string;
		club_id?: string | null;
		has_pin?: boolean;
		must_change_pin?: boolean;
		locked?: boolean;
		pin_attempts?: number;
		dob_is_placeholder?: boolean;
		entry_date?: string;
	};

	export type ListItem = {
		clubId: string;
		managerId: string | null;
		memberCount: number;
		members: MemberSummary[];
	};

	export type Detail = {
		clubId: string;
		managerId: string | null;
		members: MemberSummary[];
		addable: MemberSummary[];
	};

	export type NeedsHeadItem = {
		clubId: string;
		managerId: string | null;
		currentHead: MemberSummary;
		suggestedHead: MemberSummary;
		members: MemberSummary[];
	};

	export type MeResponse = {
		success: boolean;
		family: { clubId: string; members: MemberSummary[] } | null;
	};
}
