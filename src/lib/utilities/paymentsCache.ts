// Simple in-memory, query-keyed cache for the payments list. Same pattern as
// membersCache.ts — avoids refetching a page we already have (e.g. paging
// back and forth). Cleared whenever payment data can change server-side.
import type { Payment } from '$lib/types/payment';

type PaymentsResult = { data: Payment.List; total?: number; success: boolean; message?: string };

const cache = new Map<string, PaymentsResult>();

export function getCachedPayments(key: string): PaymentsResult | undefined {
	return cache.get(key);
}

export function setCachedPayments(key: string, value: PaymentsResult) {
	cache.set(key, value);
}

export function clearPaymentsCache() {
	cache.clear();
}
