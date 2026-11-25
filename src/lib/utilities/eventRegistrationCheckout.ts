import eventRegistrationApi from '$lib/endpoints/eventRegistrationApi';
import type { EventRegistration } from '$lib/types/eventRegistration';
import { loadCheckoutScript } from '$lib/utilities/razorpayCheckout';
import { parseRegistrationError } from '$lib/utilities/registrationUtils';

const VERIFY_ATTEMPTS = 3;
const VERIFY_RETRY_DELAY_MS = 2000;

export type EventPaymentResult =
	| { kind: 'submitted' }
	| { kind: 'processing' }
	| { kind: 'needs_review' }
	| { kind: 'cancelled' }
	| { kind: 'alreadyPaid' }
	| { kind: 'failed'; reason: string }
	| { kind: 'createFailed'; message: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function verify(
	token: string,
	payload: EventRegistration.VerifyPayload
): Promise<EventPaymentResult> {
	for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt++) {
		try {
			const body = await eventRegistrationApi.verifyPayment({ token, payload });
			if (body.status === 'submitted') return { kind: 'submitted' };
			if (body.status === 'needs_review') return { kind: 'needs_review' };
			return { kind: 'processing' };
		} catch (err: any) {
			const status = err?.response?.status;
			// Only a bad signature fails; anything else is "confirming" — never re-charge.
			if (status === 400) {
				return {
					kind: 'failed',
					reason: parseRegistrationError(err, 'Invalid payment signature.')
				};
			}
			if (status && status < 500) return { kind: 'processing' };
			if (attempt < VERIFY_ATTEMPTS) await wait(VERIFY_RETRY_DELAY_MS);
		}
	}
	return { kind: 'processing' };
}

// onToken fires as soon as the server creates or reuses the form, so a cancelled payment can retry it.
export async function runEventRegistrationPayment({
	token,
	members,
	onToken,
	onVerifying
}: {
	token: string | null;
	members: EventRegistration.MemberInput[];
	onToken: (token: string) => void;
	onVerifying?: () => void;
}): Promise<EventPaymentResult> {
	let order: EventRegistration.OrderResponse;
	try {
		[order] = await Promise.all([
			eventRegistrationApi.createOrder({ token, members }),
			loadCheckoutScript()
		]);
	} catch (err: any) {
		// The saved form was paid already (e.g. the phone closed before our page heard back).
		if (err?.response?.status === 409) return { kind: 'alreadyPaid' };
		return {
			kind: 'createFailed',
			message: parseRegistrationError(err, err?.message || 'Could not start the payment.')
		};
	}
	onToken(order.token);

	return new Promise<EventPaymentResult>((resolve) => {
		let done = false;
		const finish = (result: EventPaymentResult | Promise<EventPaymentResult>) => {
			if (done) return;
			done = true;
			resolve(result);
		};

		const rzp = new (window as any).Razorpay({
			key: order.key,
			order_id: order.razorpay_order_id,
			amount: order.amount,
			currency: order.currency,
			name: 'Bhatt Mewada',
			description: 'Event registration',
			prefill: order.prefill,
			retry: { enabled: false },
			handler: (r: EventRegistration.VerifyPayload) => {
				onVerifying?.();
				finish(
					verify(order.token, {
						razorpay_order_id: r.razorpay_order_id,
						razorpay_payment_id: r.razorpay_payment_id,
						razorpay_signature: r.razorpay_signature
					})
				);
			},
			modal: { ondismiss: () => finish({ kind: 'cancelled' }) }
		});

		rzp.on('payment.failed', (resp: any) => {
			finish({ kind: 'failed', reason: resp?.error?.description || 'Payment was declined.' });
			rzp.close();
		});

		rzp.open();
	});
}
