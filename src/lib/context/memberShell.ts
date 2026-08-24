// Shared reactive state for the /me/* member-facing pages — set once by
// me/+layout.svelte (which owns the family/isHead fetch) and read by any
// child page that needs it, so the fetch and its cache lookup aren't
// duplicated in every page.
import { getContext, setContext } from 'svelte';
import type { Family } from '$lib/types/family';

const MEMBER_SHELL_KEY = Symbol('member-shell');

export type MemberShellState = {
	isHead: boolean;
	familyMembers: Family.MemberSummary[];
	isLoadingFamily: boolean;
};

export function setMemberShellContext(state: MemberShellState) {
	setContext(MEMBER_SHELL_KEY, state);
}

export function getMemberShellContext(): MemberShellState {
	return getContext(MEMBER_SHELL_KEY);
}
