// Simple in-memory, query-keyed cache for the members list.
// Not persisted, not size-bounded — just avoids refetching a page we already
// have (e.g. paging back and forth). Cleared whenever member data can change
// server-side (payments, member updates, status changes, family changes).
import type { User } from '$lib/types/user';

type MembersResult = { users: User.List; total: number; success: boolean; message?: string };

const cache = new Map<string, MembersResult>();

export function getCachedMembers(key: string): MembersResult | undefined {
	return cache.get(key);
}

export function setCachedMembers(key: string, value: MembersResult) {
	cache.set(key, value);
}

export function clearMembersCache() {
	cache.clear();
}
