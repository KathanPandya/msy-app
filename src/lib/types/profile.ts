export namespace Profile {
	export type Update = {
		native_place: string;
		marital_status: string;
		gotra: string;
		entrance_fee: number;
		corpus_fund: number;
		deposit: number;
	};

	export type Get = {
		corpus_fund: number;
		createdAt?: string;
		deposit: number;
		entrance_fee: number;
		gotra: string;
		marital_status: string;
		native_place: string;
		updatedAt?: string;
		userId: string;
		__v: number;
		_id: string;
	};

	export type Create = {
		corpus_fund: number;
		deposit: number;
		entrance_fee: number;
		gotra: string;
		marital_status: string;
		native_place: string;
		userId: string;
	};
}
