/** Display form used in this DB: MSY-42 (also accepts MSY_42 / MSY42 / 42). */
export function formatMemberId(id: number | string): string {
	const n = typeof id === 'number' ? id : parseMemberId(String(id));
	if (n == null) return String(id ?? '');
	return `MSY-${n}`;
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

/** Standard display form across the app: "(MSY-42) Full Name". Falls back gracefully if either part is missing. */
export function formatMemberDisplay(
	name: string | null | undefined,
	id: number | string | null | undefined
): string {
	const trimmedName = (name ?? '').trim();
	const hasId = id !== null && id !== undefined && String(id).trim() !== '';
	if (!hasId) return trimmedName;
	const formattedId = formatMemberId(id as number | string);
	if (!trimmedName) return formattedId;
	return `(${formattedId}) ${trimmedName}`;
}
