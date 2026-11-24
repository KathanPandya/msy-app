export namespace EventRegistration {
	export type Status = 'payment_pending' | 'paid';

	export type SameAsHead = {
		mobile: boolean;
		email: boolean;
		address: boolean;
		gotra: boolean;
		native_place: boolean;
	};

	export type MemberInput = {
		first_name: string;
		middle_name: string;
		surname: string;
		date_of_birth: string;
		relation: string | null;
		profession: string;
		mobile: string;
		whatsapp: string;
		email: string | null;
		address: string;
		city: string;
		pincode: string;
		gotra: string;
		native_place: string;
		same_as_head: SameAsHead;
	};

	export type Member = Omit<MemberInput, 'same_as_head'> & {
		id: string;
		is_head: boolean;
		fee: number;
		checked_in_at: string | null;
	};

	export type Data = {
		id: string;
		status: Status;
		total_amount: number;
		paid_at: string | null;
		members: Member[];
	};

	export type OrderResponse = {
		token: string;
		key: string;
		razorpay_order_id: string;
		amount: number;
		currency: string;
		total_amount: number;
		prefill: { name: string; email?: string; contact: string };
	};

	export type VerifyPayload = {
		razorpay_order_id: string;
		razorpay_payment_id: string;
		razorpay_signature: string;
	};
}
