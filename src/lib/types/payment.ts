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
		remarks: string | null;
		updatedAt: string;
		userId: string;
		__v: 0;
		_id: string;
	};

	export type List = Array<Get>;

	export type Create = {
		amount: number;
		date: string;
		payment_reference: string;
		payment_mode: string;
		payment_type: string;
		reciept_number: string | null;
		photo: string | null;
		remarks: string | null;
		userId: string;
		paymentScreenshotId?: string;
	};

	export type Update = {
		id: string;
		userId: string;
		amount: number;
		date: string;
		payment_reference: string;
		payment_mode: string;
		payment_type: string;
		reciept_number: string | null;
		photo: string | null;
		remarks: string | null;
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

	export type ScreenshotPayment = {
		paymentId: string;
		userId: string;
		username: string;
		name: string;
		amount: number;
		date: string;
	};

	export type ScreenshotPaymentList = Array<ScreenshotPayment>;

	export type ScreenshotUser = {
		_id: string;
		username: string;
		first_name?: string;
		middle_name?: string;
		surname?: string;
	};

	export type Screenshot = {
		_id: string;
		userId: ScreenshotUser;
		url: string;
		void: boolean;
		voidReason: string;
		voidedAt: string | null;
		voidedBy: string | null;
		paymentsGeneratedCount: number;
		hasPayments: boolean;
		createdAt: string;
		updatedAt: string;
	};

	export type ScreenshotList = Array<Screenshot>;

	export type FamilyMember = {
		userId: string;
		username: string;
		name: string;
		outstanding_before: number;
	};

	export type Payer = {
		userId: string;
		username: string;
		name: string;
	};

	export type Settlement = {
		userId: string;
		username: string;
		name: string;
		isPayer: boolean;
		outstanding_before: number;
		from_outstanding: number;
		from_equal_split: number;
		amount: number;
		outstanding_after: number;
		reason: string;
	};

	export type GenerateSummary = {
		amountReceived: number;
		totalFamilyOutstandingBefore: number;
		amountUsedToClearDues: number;
		leftoverAmount: number;
		leftoverSplitAcross: number;
		settlementOrder: string[];
	};

	export type GeneratePreview = {
		extracted: { amount: number; transaction_id: string };
		duplicateWarning: boolean;
		duplicatePayment: { _id: string; date: string; userId: string } | null;
		payer: Payer;
		family: FamilyMember[];
		settlements: Settlement[];
		summary: GenerateSummary;
	};
}
