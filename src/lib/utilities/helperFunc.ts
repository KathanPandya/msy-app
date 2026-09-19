export function getUserAddress(addresses: any[]) {
	return addresses.find((address) => !address.is_nominee_address) || null;
}

// Emails on example.com are placeholders set at import, not the member's real email.
export function isPlaceholderEmail(email: string | null | undefined): boolean {
	return !!email && email.trim().toLowerCase().endsWith('@example.com');
}

// Prefill value for an email input: the profile email only if it's a real one.
export function getPrefillEmail(email: string | null | undefined): string {
	return email && !isPlaceholderEmail(email) ? email.trim() : '';
}

export function formatDate(isoDate: string | null | undefined): string {
	if (!isoDate) return '-';

	const date = new Date(isoDate);

	// Check if valid date
	if (isNaN(date.getTime())) return '-';

	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = date.getFullYear();

	return `${day}-${month}-${year}`;
}

export function formatToYYYYMMDD(date: Date | string | number | null | undefined): string {
	if (!date) return '';

	let dateObj: Date;

	// Convert to Date object
	if (date instanceof Date) {
		dateObj = date;
	} else {
		dateObj = new Date(date);
	}

	// Check if valid date
	if (isNaN(dateObj.getTime())) return '';

	const year = dateObj.getFullYear();
	const month = String(dateObj.getMonth() + 1).padStart(2, '0');
	const day = String(dateObj.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

export function debounce<T extends (...args: any[]) => void>(
	fn: T,
	delay = 300
): (...args: Parameters<T>) => void {
	let timer: ReturnType<typeof setTimeout>;

	return (...args: Parameters<T>) => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			fn(...args);
		}, delay);
	};
}
