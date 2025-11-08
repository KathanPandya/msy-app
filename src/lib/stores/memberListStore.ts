// src/lib/stores/memberListStore.ts
import { writable } from 'svelte/store';
import type { User } from '$lib/types/user';
import userApi from '$lib/endpoints/userApi';

type MemberListState = {
	members: User.List;
	total: number;
	isLoading: boolean;
	error: string | null;
	lastQuery: string | undefined;
};

function createMemberListStore() {
	const { subscribe, set, update } = writable<MemberListState>({
		members: [],
		total: 0,
		isLoading: false,
		error: null,
		lastQuery: undefined
	});

	return {
		subscribe,

		async fetchMembers(query?: string) {
			// Update loading state
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const response = await userApi.getAllUsers({ query });

				// Store the response
				update((state) => ({
					members: response.users, // API returns 'users' but we store as 'members'
					total: response.total,
					isLoading: false,
					error: null,
					lastQuery: query
				}));

				// If query is empty, this is the "all members" cache
				if (!query) {
					console.log('Cached all members:', response.users.length);
				}

				return response;
			} catch (error: any) {
				const errorMessage = error?.response?.data?.message || 'Failed to fetch members';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw error;
			}
		},

		// Get all members (no query)
		async fetchAllMembers() {
			return this.fetchMembers(undefined);
		},

		// Search members (with query)
		async searchMembers(query: string) {
			return this.fetchMembers(query);
		},

		// Clear the store
		clear() {
			set({
				members: [],
				total: 0,
				isLoading: false,
				error: null,
				lastQuery: undefined
			});
		},

		// Update a single member in the list
		updateMember(memberId: string, updates: Partial<User.List[0]>) {
			update((state) => ({
				...state,
				members: state.members.map((member) =>
					member._id === memberId ? { ...member, ...updates } : member
				)
			}));
		},

		// Add a new member to the list
		addMember(member: User.List[0]) {
			update((state) => ({
				...state,
				members: [member, ...state.members],
				total: state.total + 1
			}));
		},

		// Remove a member from the list
		removeMember(memberId: string) {
			update((state) => ({
				...state,
				members: state.members.filter((member) => member._id !== memberId),
				total: state.total - 1
			}));
		}
	};
}

export const memberListStore = createMemberListStore();
