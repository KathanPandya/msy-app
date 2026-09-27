export namespace Registration {
	export type Status = 'draft' | 'payment_pending' | 'in-review' | 'approved' | 'rejected';

	export type Gender = 'male' | 'female' | 'other';

	export type UploadType =
		| 'id_doc'
		| 'photo'
		| 'fitness_certificate'
		| 'nominee_id_doc'
		| 'nominee_photo'
		| 'nominee_2_id_doc'
		| 'nominee_2_photo';

	export type IdDocType = 'school_leaving_certificate' | 'passport' | 'driving_license' | 'aadhaar';

	export type Address = {
		address_line_1: string;
		address_line_2: string;
		landmark: string;
		area_name: string;
		city: string;
		state: string;
		country: string;
		pincode: string;
	};

	export type Docs = {
		id_doc_type: IdDocType | null;
		id_doc_url: string | null;
		photo_url: string | null;
		fitness_certificate_url: string | null;
	};

	export type Nominee = {
		full_name: string;
		relation: string | null;
		mobile: string;
		date_of_birth: string | null;
		id_doc_type: IdDocType | null;
		id_doc_url: string | null;
		photo_url: string | null;
	};

	export type NomineeInput = {
		full_name?: string;
		relation?: string;
		mobile?: string;
		date_of_birth?: string;
	};

	export type Quote = {
		eligible?: boolean;
		age: number | null;
		entrance_fee: number;
		corpus_fund: number;
		deposit: number;
		total_amount: number;
		requires_fitness_certificate?: boolean;
	};

	export type Data = {
		id: string;
		status: Status;
		email_verified: boolean;
		first_name: string;
		middle_name: string;
		surname: string;
		date_of_birth: string;
		email: string;
		gender: Gender | null;
		mobile: string;
		marital_status: string | null;
		gotra: string | null;
		native_place: string;
		address: Address;
		docs: Docs;
		fitness_certificate_required: boolean;
		nominee: Nominee;
		nominee_2: Nominee | null;
		quote: Quote;
		terms_accepted: TermsAcceptance | null;
	};

	export type TermsAcceptance = {
		version_id: string;
		version: number;
		language: 'en' | 'guj';
		accepted_at: string;
		ip: string | null;
	};

	export type Start = {
		code: string;
		first_name: string;
		middle_name: string;
		surname: string;
		date_of_birth: string;
		email: string;
	};

	export type StartResponse = {
		id: string;
		token: string;
		email_masked: string;
		quote: Quote;
	};

	export type Update = {
		gender?: Gender;
		mobile?: string;
		marital_status?: string;
		gotra?: string;
		native_place?: string;
		address?: Partial<Address>;
		nominee?: NomineeInput;
		nominee_2?: NomineeInput | null;
	};

	export type ReviewResponse = {
		registration: Data;
		missing: string[];
		can_pay: boolean;
	};

	export type OrderResponse = {
		key: string;
		razorpay_order_id: string;
		amount: number;
		currency: 'INR';
		quote: Quote;
		prefill: { name: string; email: string; contact: string };
	};

	export type VerifyPaymentResponse =
		| { status: 'submitted'; message: string; registration: Data }
		| { status: 'processing'; message: string }
		| { status: 'needs_review'; message: string };

	export type MyLink = {
		code: string;
		link: string;
	};

	export type ListRow = {
		id: string;
		name: string;
		email: string;
		mobile: string;
		status: Status;
		total_amount: number;
		paid_at: string | null;
		created_at: string;
		referrer: { id: string; name: string; member_id: string } | null;
	};

	export type ListResponse = {
		success: boolean;
		data: ListRow[];
		page: number;
		limit: number;
		total: number;
		counts: Partial<Record<Status, number>>;
	};

	export type AdminRef = { _id: string; name?: string; username?: string } | null;

	export type AdminDetail = {
		id: string;
		status: Status;
		applicant: {
			first_name: string;
			middle_name: string;
			surname: string;
			date_of_birth: string;
			gender: Gender | null;
			mobile: string;
			email: string;
			email_verified_at: string | null;
			marital_status: string | null;
			gotra: string | null;
			native_place: string;
			address: Address;
		};
		docs: Docs;
		fitness_certificate_required?: boolean;
		nominee: Nominee;
		nominee_2: Nominee | null;
		fees: {
			age_at_payment: number | null;
			entrance_fee: number;
			corpus_fund: number;
			deposit: number;
			total_amount: number;
			paid_at: string | null;
		};
		order: {
			id: string;
			razorpay_order_id: string;
			razorpay_payment_id: string | null;
			amount: number;
			status: string;
			payment_method: string | null;
			settlement_error: string | null;
		} | null;
		referrer: {
			_id: string;
			first_name?: string;
			middle_name?: string;
			surname?: string;
			member_id?: string;
			mobile?: string;
		} | null;
		decision: {
			approved_by: AdminRef;
			approved_at: string | null;
			rejected_by: AdminRef;
			rejected_at: string | null;
			reject_reason: string | null;
		};
		created_user: {
			_id: string;
			member_id: string;
			first_name: string;
			surname: string;
			status: string;
		} | null;
		created_at: string;
		updated_at: string;
	};

	export type ReferrerResponse = {
		success: boolean;
		data: {
			referrer: {
				first_name?: string;
				surname?: string;
				member_id?: string;
				mobile?: string;
				status?: string;
			};
			referrals: Partial<Record<Status, number>>;
		};
	};

	export type ApproveResponse = {
		success: boolean;
		message: string;
		data: {
			user_id: string;
			member_id: string;
			member_id_num: number;
			approved_by: string;
			approved_at: string;
		};
		emailed: boolean;
		email_error: string | null;
	};

	export type RejectResponse = {
		success: boolean;
		data: { rejected_by: string; rejected_at: string; reject_reason: string | null };
		emailed: boolean;
	};

	export type ResendLinkResponse = {
		success: boolean;
		message: string;
		link: string;
	};
}
