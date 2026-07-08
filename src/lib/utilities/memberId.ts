/** Display form used in this DB: MSY_42 (also accepts MSY42 / 42). */
export function formatMemberId(id: number | string): string {
	const n = typeof id === 'number' ? id : parseMemberId(String(id));
	if (n == null) return String(id ?? '');
	return `MSY_${n}`;
}

/** Accepts "MSY_42", "MSY42", "msy42", or "42" → 42. Returns null if invalid. */
export function parseMemberId(input: string): number | null {
	const raw = input.trim().toUpperCase();
	if (!raw) return null;
	const digits = raw.replace(/^MSY[_-]?/, '').replace(/^_/, '');
	if (!/^\d+$/.test(digits)) return null;
	const n = Number.parseInt(digits, 10);
	return Number.isInteger(n) && n > 0 ? n : null;
}

export function memberIdDigits(memberId: string | number | null | undefined): number | null {
	if (memberId == null) return null;
	if (typeof memberId === 'number') return memberId > 0 ? memberId : null;
	return parseMemberId(memberId);
}
