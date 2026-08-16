// Simple in-memory cache for the member self-service /me page — same pattern
// as membersCache.ts. Without this, navigating away from /me and back
// remounts the page and its $state resets, so it refetches family + payment
// data every time even though nothing changed. Cleared whenever this
// member's family/payment data can change server-side.
import type { Family } from '$lib/types/family';
import type { Payment } from '$lib/types/payment';

const familyMeCache = new Map<string, Family.MeResponse>();
const outstandingCache = new Map<string, { data: Payment.OutstandingData; success: boolean }>();

export function getCachedFamilyMe(userId: string): Family.MeResponse | undefined {
	return familyMeCache.get(userId);
}

export function setCachedFamilyMe(userId: string, value: Family.MeResponse) {
	familyMeCache.set(userId, value);
}

export function getCachedOutstanding(
	userId: string
): { data: Payment.OutstandingData; success: boolean } | undefined {
	return outstandingCache.get(userId);
}

export function setCachedOutstanding(
	userId: string,
	value: { data: Payment.OutstandingData; success: boolean }
) {
	outstandingCache.set(userId, value);
}

export function clearMeCache() {
	familyMeCache.clear();
	outstandingCache.clear();
}
