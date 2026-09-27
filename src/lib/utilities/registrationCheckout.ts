import registrationApi from '$lib/endpoints/registrationApi';
import { loadCheckoutScript } from '$lib/utilities/razorpayCheckout';
import { parseRegistrationError } from '$lib/utilities/registrationUtils';

const VERIFY_ATTEMPTS = 3;
const VERIFY_RETRY_DELAY_MS = 2000;

export type RegistrationPaymentResult =
	| { kind: 'submitted' }
	| { kind: 'processing' }
	| { kind: 'needs_review' }
	| { kind: 'cancelled' }
	| { kind: 'failed'; reason: string }
	| { kind: 'createFailed'; status: number | undefined; message: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type VerifyPayload = {
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
};

async function verify(token: string, payload: VerifyPayload): Promise<RegistrationPaymentResult> {
	for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt++) {
		try {
			const body = await registrationApi.verifyPayment({ token, payload });
			if (body.status === 'submitted') return { kind: 'submitted' };
			if (body.status === 'needs_review') return { kind: 'needs_review' };
			return { kind: 'processing' };
		} catch (err: any) {
			const status = err?.response?.status;
			// Per spec: only a bad signature fails; anything else is "confirming" — never re-charge.
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

export async function runRegistrationPayment({
	token,
	onVerifying
}: {
	token: string;
	onVerifying?: () => void;
}): Promise<RegistrationPaymentResult> {
	let order: Awaited<ReturnType<typeof registrationApi.createOrder>>;
	try {
		[order] = await Promise.all([registrationApi.createOrder({ token }), loadCheckoutScript()]);
	} catch (err: any) {
		return {
			kind: 'createFailed',
			status: err?.response?.status,
			message: parseRegistrationError(err, err?.message || 'Could not start the payment.')
		};
	}

	return new Promise<RegistrationPaymentResult>((resolve) => {
		let done = false;
		const finish = (result: RegistrationPaymentResult | Promise<RegistrationPaymentResult>) => {
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
			description: 'Membership registration',
			prefill: order.prefill,
			retry: { enabled: false },
			handler: (r: VerifyPayload) => {
				onVerifying?.();
				finish(
					verify(token, {
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
