import paymentApi from '$lib/endpoints/paymentApi';

export function hasDigitalReceipt(payment: { reciept_number?: string | null } | null): boolean {
	return !!payment?.reciept_number?.startsWith('MSYRCPT-');
}

// S3 serves the PDF with Content-Disposition: attachment, so navigating to it downloads without leaving the page.
export async function downloadPaymentReceipt(payment: {
	_id: string;
	receipt_url?: string | null;
}): Promise<void> {
	const url = payment.receipt_url || (await paymentApi.getPaymentReceipt(payment._id)).data.url;
	const link = document.createElement('a');
	link.href = url;
	link.click();
}

export function receiptErrorMessage(err: any): string {
	const data = err?.response?.data;
	return data?.message || err?.message || 'Could not download the receipt.';
}
