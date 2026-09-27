import { APP_CONSTANTS } from '$lib/constants/app-constants';
import type { Registration } from '$lib/types/registration';

export function parseRegistrationError(err: any, fallback: string): string {
	const data = err?.response?.data;
	if (typeof data?.error === 'string' && data.error) return data.error;
	if (typeof data?.message === 'string' && data.message) return data.message;
	return fallback;
}

const TOKEN_KEY = 'registrationToken';

export function saveRegistrationToken(token: string) {
	try {
		localStorage.setItem(TOKEN_KEY, token);
	} catch {}
}

export function getRegistrationToken(): string {
	try {
		return localStorage.getItem(TOKEN_KEY) ?? '';
	} catch {
		return '';
	}
}

export function clearRegistrationToken() {
	try {
		localStorage.removeItem(TOKEN_KEY);
	} catch {}
}

export const MIN_AGE = 18;
export const MAX_AGE = 55;
export const FITNESS_CERTIFICATE_FROM_AGE = 51;

export const FEE_SLABS = [
	{ minAge: 18, maxAge: 40, entrance_fee: 250, deposit: 500, corpus_fund: 50 },
	{ minAge: 41, maxAge: 50, entrance_fee: 500, deposit: 500, corpus_fund: 50 },
	{ minAge: 51, maxAge: 55, entrance_fee: 1500, deposit: 1000, corpus_fund: 50 }
].map((s) => ({ ...s, total_amount: s.entrance_fee + s.deposit + s.corpus_fund }));

export function feeSlabLines(lang: 'en' | 'guj' | undefined): string {
	return FEE_SLABS.map((s) =>
		lang === 'guj'
			? `<strong>${s.minAge} થી ${s.maxAge} વર્ષ</strong>: ${formatRupees(s.entrance_fee)} દાખલ ફી + ${formatRupees(s.deposit)} ડિપોઝિટ + ${formatRupees(s.corpus_fund)} કોર્પસ ફી = <strong>${formatRupees(s.total_amount)}</strong>`
			: `<strong>${s.minAge}–${s.maxAge} years</strong>: ${formatRupees(s.entrance_fee)} entry fee + ${formatRupees(s.deposit)} deposit + ${formatRupees(s.corpus_fund)} corpus fee = <strong>${formatRupees(s.total_amount)}</strong>`
	).join('\n');
}

export function ageOn(dob: string, asOf: Date = new Date()): number | null {
	const [y, m, d] = dob.split('-').map(Number);
	if (!y || !m || !d) return null;
	let age = asOf.getFullYear() - y;
	if (asOf.getMonth() + 1 < m || (asOf.getMonth() + 1 === m && asOf.getDate() < d)) age -= 1;
	return age;
}

export function estimateQuote(dob: string): Registration.Quote {
	const age = ageOn(dob);
	const slab = age === null ? undefined : FEE_SLABS.find((s) => age >= s.minAge && age <= s.maxAge);
	if (!slab) {
		return {
			eligible: false,
			age,
			entrance_fee: 0,
			corpus_fund: 0,
			deposit: 0,
			total_amount: 0,
			requires_fitness_certificate: false
		};
	}
	return {
		eligible: true,
		age,
		entrance_fee: slab.entrance_fee,
		corpus_fund: slab.corpus_fund,
		deposit: slab.deposit,
		total_amount: slab.total_amount,
		requires_fitness_certificate: (age ?? 0) >= FITNESS_CERTIFICATE_FROM_AGE
	};
}

export function formatRupees(amount: number | null | undefined): string {
	return `₹${(amount ?? 0).toLocaleString('en-IN')}`;
}

function labelFrom(options: { key: string; label: string }[], key: string | null | undefined) {
	if (!key) return '-';
	return options.find((o) => o.key === key)?.label ?? key.charAt(0).toUpperCase() + key.slice(1);
}

export const genderLabel = (key: string | null | undefined) =>
	labelFrom(APP_CONSTANTS.GENDERS, key);
export const maritalStatusLabel = (key: string | null | undefined) =>
	labelFrom(APP_CONSTANTS.MARITAL_STATUS, key);
export const gotraLabel = (key: string | null | undefined) => labelFrom(APP_CONSTANTS.GOTRAS, key);
export const relationLabel = (key: string | null | undefined) =>
	labelFrom(APP_CONSTANTS.NOMINEE_RELATIONS, key);
export const idDocTypeLabel = (key: string | null | undefined) =>
	labelFrom(APP_CONSTANTS.ID_DOCUMENT_TYPES, key);

export const REGISTRATION_STATUSES: { key: Registration.Status; label: string }[] = [
	{ key: 'in-review', label: 'In review' },
	{ key: 'payment_pending', label: 'Payment pending' },
	{ key: 'draft', label: 'Draft' },
	{ key: 'approved', label: 'Approved' },
	{ key: 'rejected', label: 'Rejected' }
];

const STATUS_CLASSES: Record<Registration.Status, string> = {
	draft: 'bg-gray-50 text-gray-700 ring-gray-200',
	payment_pending: 'bg-amber-50 text-amber-700 ring-amber-200',
	'in-review': 'bg-blue-50 text-blue-700 ring-blue-200',
	approved: 'bg-green-50 text-green-700 ring-green-200',
	rejected: 'bg-red-50 text-red-700 ring-red-200'
};

const PILL_BASE =
	'inline-flex items-center rounded px-1.5 py-[1px] text-[11px] font-medium ring-1 ring-inset';

export function registrationStatusLabel(status: Registration.Status): string {
	return REGISTRATION_STATUSES.find((s) => s.key === status)?.label ?? status;
}

export function registrationStatusPill(status: Registration.Status): string {
	return `${PILL_BASE} ${STATUS_CLASSES[status] ?? STATUS_CLASSES.draft}`;
}

export function fullName(p: { first_name?: string; middle_name?: string; surname?: string }) {
	return [p.first_name, p.middle_name, p.surname].filter(Boolean).join(' ');
}

export function fullAddress(a: Partial<Registration.Address> | null | undefined): string {
	if (!a) return '';
	return [a.address_line_1, a.address_line_2, a.landmark, a.area_name, a.city, a.state, a.pincode]
		.filter(Boolean)
		.join(', ');
}
