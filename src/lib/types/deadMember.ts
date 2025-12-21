export namespace DeadMember {
	export type Get = {
		userId: string;
		death_certificate: string;
		date_of_death: string;
		contribution_amount: number;
		remarks: string;
		__v: number;
		_id: string;
	};

	export type Update = {
		id: string;
		userId: string;
		date_of_death: string;
		death_certificate: string;
		remarks: string;
		contribution_amount: number;
	};

	export type Create = {
		userId: string;
		date_of_death: string;
		remarks: string;
		death_certificate: string;
		contribution_amount: number;
	};
}
