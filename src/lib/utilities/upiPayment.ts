import phonepeLogo from '$lib/assets/upi-apps/phonepe.svg';
import googlePayLogo from '$lib/assets/upi-apps/googlepay.svg';
import paytmLogo from '$lib/assets/upi-apps/paytm.png';
import bhimLogo from '$lib/assets/upi-apps/bhim.png';

// These match the fields encoded in the bank-issued merchant QR exactly
// (decoded from the physical QR) — dropping any of them (mc/mid/mtid/
// orgId/mg/purpose/mode) makes the intent look like a plain P2P payment
// to what the receiving bank has registered as a merchant account, which
// trips UPI apps' risk rule and fails the payment even though a raw scan
// of the same QR works fine.
export const UPI_VPA = 'boim-202073804429@boi';
export const UPI_PAYEE_NAME = 'AKHIL HIND BHATT MEVADA BRAHMSAMAJ FEDERATION';
const UPI_MERCHANT_FIELDS = {
	orgId: '159013',
	url: 'https://www.bankofindia.co.in',
	mc: '8398',
	mid: '0402020119523510',
	mtid: '71808897',
	mg: 'ONLINE',
	purpose: '00',
	mode: '01'
};

export type UpiApp = {
	key: string;
	name: string;
	color: string;
	letter: string;
	// Real brand logo (from Wikimedia Commons) — shown instead of the
	// letter badge when present. "other" has none, so it always falls
	// back to the letter.
	logo?: string;
};

// Just the 4 dominant apps, named explicitly, plus a catch-all "Other" —
// a 10-app grid wasn't earning its keep once most members only ever use
// one of these four.
export const UPI_APPS: UpiApp[] = [
	{ key: 'phonepe', name: 'PhonePe', color: '#5f259f', letter: 'Pe', logo: phonepeLogo },
	{ key: 'googlepay', name: 'Google Pay', color: '#4285f4', letter: 'G', logo: googlePayLogo },
	{ key: 'paytm', name: 'Paytm', color: '#00baf2', letter: 'P', logo: paytmLogo },
	{ key: 'bhim', name: 'BHIM', color: '#00a651', letter: 'B', logo: bhimLogo },
	{ key: 'other', name: 'Other', color: '#6b7280', letter: '···' }
];

export function getUpiApp(key: string): UpiApp | undefined {
	return UPI_APPS.find((a) => a.key === key);
}

// UPI's spec marks "tr" (transaction reference) mandatory for merchant
// payments (mc is set here) — without it a deep-link-initiated payment
// is an incomplete merchant request, unlike a QR scan where the scanning
// app generates its own reference. Each derivation gets a fresh one.
function generateTr(): string {
	const uuid =
		typeof crypto !== 'undefined' && crypto.randomUUID
			? crypto.randomUUID()
			: `${Date.now()}${Math.random()}`;
	return uuid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 35);
}

export function buildUpiQueryString(amount: number, memberId: string): string {
	if (amount <= 0) return '';
	return new URLSearchParams({
		...UPI_MERCHANT_FIELDS,
		pa: UPI_VPA,
		pn: UPI_PAYEE_NAME,
		am: amount.toFixed(2),
		cu: 'INR',
		tr: generateTr(),
		tn: (memberId ?? '').replace(/_/g, '-')
	})
		.toString()
		.replace(/\+/g, '%20');
}

export function buildGenericUpiLink(queryString: string): string {
	return queryString ? 'upi://pay?' + queryString : '';
}

export async function generateQrDataUrl(link: string): Promise<string> {
	if (!link) return '';
	// Dynamic import keeps qrcode out of the SSR graph (avoids Vite's unused-default warning).
	const { default: QRCode } = await import('qrcode');
	return QRCode.toDataURL(link, { margin: 1, width: 220 });
}

// iOS Safari (and several in-app browsers) ignore the <a download> attribute
// entirely — tapping it just opens the image instead of saving it. The Web
// Share API's file support is what actually lets an iOS member save it (via
// the native share sheet's "Save Image"), so that's tried first everywhere;
// the <a download> approach is only a fallback for browsers without it
// (desktop Chrome, most of Android).
export async function downloadQrImage(dataUrl: string): Promise<void> {
	if (!dataUrl) return;
	const filename = `msy-payment-qr-${Date.now()}.png`;

	let file: File | null = null;
	try {
		const res = await fetch(dataUrl);
		const blob = await res.blob();
		file = new File([blob], filename, { type: 'image/png' });
	} catch {
		file = null;
	}

	if (file && navigator.canShare?.({ files: [file] })) {
		try {
			await navigator.share({ files: [file] });
		} catch {
			// User cancelled or the share sheet failed — they already saw a
			// save option, so don't also fire an anchor download on top of it.
		}
		return;
	}

	const link = document.createElement('a');
	link.href = dataUrl;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

