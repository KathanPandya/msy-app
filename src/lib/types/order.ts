import type { Payment } from '$lib/types/payment';

export namespace Order {
	export type PaymentType = 'deposit' | 'membership_fee' | 'donation' | 'msy_contribution' | 'other';

	export type Status = 'created' | 'failed' | 'paid' | 'settling' | 'settled' | 'unsettled';

	// `amount` is in paise (payment-flow.md §6.1) — divide by 100 for rupees.
	export type Data = {
		_id: string;
		userId: string;
		razorpay_order_id: string;
		currency: 'INR';
		amount: number;
		payment_type: PaymentType;
		receipt: string;
		status: Status;
		razorpay_payment_id: string | null;
		payment_method: string | null;
		paid_at: string | null;
		failure_reason: string | null;
		settled_at: string | null;
		settlement_error: string | null;
		settled_by: string | null;
		settlement_remarks: string | null;
		createdAt: string;
		updatedAt: string;
	};

	export type Create = {
		amount: number;
		currency: 'INR';
		payment_type: PaymentType;
	};

	// Exactly the three values Razorpay Checkout hands to `handler`.
	export type Verify = {
		razorpay_order_id: string;
		razorpay_payment_id: string;
		razorpay_signature: string;
	};

	export type VerifyResponse =
		| { success: true; status: 'settled'; message: string; order: Data; payments: Payment.Get[] }
		| { success: true; status: 'unsettled' | 'processing'; message: string; order: Data }
		| { success: false; status: 'failed'; message: string };

	// Errors (404/409/502/500) come back as `{ success: false, message }` and throw.
	export type ReconcileResponse =
		| { success: true; status: 'settled'; message: string; order: Data; payments: Payment.Get[] }
		| { success: true; status: 'unsettled' | 'processing'; message: string; order: Data };
}
