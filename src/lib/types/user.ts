import type { Address } from '$lib/types/address';
import type { Profile } from '$lib/types/profile';

export namespace User {
	export type AllInfo = {
		user: Get;
		profile: Profile.Get | null;
		address: Address.Get;
		nominee: Array<Record<string, any>>;
		payments: Array<Record<string, any>>;
		orders: Array<Record<string, any>>;
	};

	export type Get = {
		blocked: boolean;
		confirmationToken: string;
		confirmed: false;
		createdAt: string;
		date_of_birth: string;
		email: string;
		entry_date: string;
		first_name: string;
		gender: string;
		is_firebase: boolean;
		is_profile_completed: boolean;
		member_id: string;
		middle_name: string;
		mobile: string;
		outstanding_amount: number;
		password: string;
		provider: string;
		reference_member_1: string;
		reference_member_2: string;
		resetPasswordToken: string;
		role: string;
		status: string;
		surname: string;
		total_payment: number;
		updatedAt: string;
		username: string;
		_v: number;
		_id: string;
		status_details: Status_Details;
	};

	export type Update = {
		first_name: string;
		middle_name: string;
		surname: string;
		status: string;
		date_of_birth: string;
		gender: string;
		mobile: string;
		// is_profile_completed?: boolean;
		// entry_date?: string;
		reference_member_1: string;
		reference_member_2: string;
		status_details: Status_Details;
		entry_date: string;
	};

	export type Create = {
		first_name: string;
		middle_name: string;
		surname: string;
		mobile: string;
		email: string;
		password: string;
		reference_member_1: string;
		reference_member_2: string;
	};

	export type List = Array<Get>;

	export type Status_Details = null | {
		date: string;
		remarks: string;
		photo_url: string;
		contribution_amount: null | number;
	};
}
