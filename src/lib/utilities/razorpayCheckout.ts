// Razorpay order flow (payment-flow.md): /create → Checkout → /verify-payment.
// One attempt per order — every call here creates a fresh order, and the
// Checkout popup has retries disabled, so "try again" is just calling
// runRazorpayPayment again.
import ordersApi from '$lib/endpoints/ordersApi';
import type { Order } from '$lib/types/order';
import type { Payment } from '$lib/types/payment';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const VERIFY_ATTEMPTS = 3;
const VERIFY_RETRY_DELAY_MS = 2000;

export type RazorpayResult =
	// Fully recorded against the member(s).
	| { kind: 'settled'; payments: Payment.Get[] }
	// Money taken; admin will record it (`unsettled`).
	| { kind: 'review' }
	// Money taken; still being recorded (`processing`, or verify kept failing with 5xx/network).
	| { kind: 'processing' }
	// Closed the popup without paying. Nothing charged.
	| { kind: 'cancelled' }
	// Bank/Razorpay declined. Nothing charged.
	| { kind: 'failed'; reason: string }
	// Verify returned a 4xx — money may have been deducted, member should contact support.
	| { kind: 'verifyFailed' }
	// /create failed before Checkout opened.
	| { kind: 'createFailed'; message: string };

let checkoutScriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
	if ((window as any).Razorpay) return Promise.resolve();
	if (checkoutScriptPromise) return checkoutScriptPromise;

	checkoutScriptPromise = new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = CHECKOUT_SRC;
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => {
			checkoutScriptPromise = null;
			script.remove();
			reject(new Error('Could not load Razorpay. Check your connection and try again.'));
		};
		document.body.appendChild(script);
	});
	return checkoutScriptPromise;
}

function createErrorMessage(err: any): string {
	const data = err?.response?.data;
	// 422 → { error: { amount: "..." } }; 400 → plain text body.
	if (data?.error && typeof data.error === 'object') {
		const first = Object.values(data.error)[0];
		if (typeof first === 'string') return first;
	}
	if (typeof data === 'string' && data) return data;
	return data?.message || err?.message || 'Could not start payment. Please try again.';
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function verify(payload: Order.Verify): Promise<RazorpayResult> {
	for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt++) {
		try {
			const body = await ordersApi.verifyPayment({ payload });
			if (!body.success) return { kind: 'verifyFailed' };
			if (body.status === 'settled') return { kind: 'settled', payments: body.payments };
			if (body.status === 'unsettled') return { kind: 'review' };
			return { kind: 'processing' };
		} catch (err: any) {
			const status = err?.response?.status;
			// 4xx is a real rejection; 5xx / network may be transient — retry.
			if (status && status < 500) return { kind: 'verifyFailed' };
			if (attempt < VERIFY_ATTEMPTS) await wait(VERIFY_RETRY_DELAY_MS);
		}
	}
	// Never ask to pay again here — the backend also hears from Razorpay directly.
	return { kind: 'processing' };
}

export async function runRazorpayPayment({
	amountRupees,
	paymentType,
	prefill,
	onVerifying
}: {
	amountRupees: number;
	paymentType: Order.PaymentType;
	prefill?: { name?: string; contact?: string };
	// Fires once Razorpay reports success and verification starts.
	onVerifying?: () => void;
}): Promise<RazorpayResult> {
	const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
	if (!keyId) return { kind: 'createFailed', message: 'Payments are not configured.' };

	let order: Order.Data;
	try {
		const [res] = await Promise.all([
			ordersApi.createOrder({
				payload: {
					amount: Math.round(amountRupees) * 100,
					currency: 'INR',
					payment_type: paymentType
				}
			}),
			loadCheckoutScript()
		]);
		order = res.order;
	} catch (err) {
		return { kind: 'createFailed', message: createErrorMessage(err) };
	}

	return new Promise<RazorpayResult>((resolve) => {
		// payment.failed closes the popup, which can also trigger ondismiss —
		// only the first outcome counts.
		let done = false;
		const finish = (result: RazorpayResult | Promise<RazorpayResult>) => {
			if (done) return;
			done = true;
			resolve(result);
		};

		const rzp = new (window as any).Razorpay({
			key: keyId,
			order_id: order.razorpay_order_id,
			amount: order.amount,
			currency: order.currency,
			name: 'Bhatt Mewada',
			description: order.payment_type,
			prefill,
			retry: { enabled: false },
			handler: (response: Order.Verify) => {
				onVerifying?.();
				finish(
					verify({
						razorpay_order_id: response.razorpay_order_id,
						razorpay_payment_id: response.razorpay_payment_id,
						razorpay_signature: response.razorpay_signature
					})
				);
			},
			modal: {
				ondismiss: () => finish({ kind: 'cancelled' })
			}
		});

		rzp.on('payment.failed', (resp: any) => {
			finish({
				kind: 'failed',
				reason: resp?.error?.description || 'Payment was declined'
			});
			rzp.close();
		});

		rzp.open();
	});
}
