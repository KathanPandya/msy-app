export namespace Payment {
	export type Get = {
		amount: number;
		createdAt: string;
		date: string;
		payment_mode: string;
		payment_reference: string;
		payment_type: string;
		photo: string;
		reciept_number: string;
		remarks: string;
		updatedAt: string;
		userId: string;
		__v: 0;
		_id: string;
	};

	export type List = Array<Get>;

	export type Create = {
		amount: string;
		date: string;
		payment_reference: string;
		payment_mode: string;
		payment_type: string;
		reciept_number: string;
		photo: string;
		remarks: string;
		userId: string;
	};

	export type Payout_Create = {
		userId: string;
		deadMemberId: string;
		nomineeId: string;
		payment_amount: number;
		payment_date: string;
		payment_to_person: string;
		adhaar_card_no_of_reciever: string;
		payment_by_person: string;
	};

	export type Payout_List = Array<Payout_Get>;

	export type Payout_Get = {
		adhaar_card_no_of_reciever: string;
		createdAt: string;
		deadMemberId: string;
		nomineeId: string;
		payment_amount: number;
		payment_by_person: string;
		payment_cheque_photo: string;
		payment_date: string;
		payment_to_person: string;
		updatedAt: string;
		userId: string;
		__v: number;
		_id: string;
	};

	export type OutstandingData = {
		deadMemberRecords: Array<any>;
		paymentRecords: Payment.List;
		outstandingAmount: number;
		totalPayment: number;
	};
}
