// src/lib/stores/familyListStore.ts
import { get, writable } from 'svelte/store';
import type { Family } from '$lib/types/family';
import familiesApi from '$lib/endpoints/familiesApi';

type FamilyListState = {
	families: Family.ListItem[];
	total: number;
	currentPage: number;
	limit: number;
	search: string;
	isLoading: boolean;
	error: string | null;
	/** true once the current (search) list has been fetched — cache survives navigation */
	initialized: boolean;
};

function createFamilyListStore() {
	const initial: FamilyListState = {
		families: [],
		total: 0,
		currentPage: 0,
		limit: 50,
		search: '',
		isLoading: false,
		error: null,
		initialized: false
	};

	const store = writable<FamilyListState>({ ...initial });
	const { subscribe, update } = store;

	async function fetchPage() {
		const s = get(store);
		update((st) => ({ ...st, isLoading: true, error: null }));
		try {
			const skip = s.currentPage * s.limit;
			return await familiesApi.list({
				search: s.search || undefined,
				skip,
				limit: s.limit
			});
		} catch (err: any) {
			update((st) => ({
				...st,
				isLoading: false,
				error: err?.response?.data?.message || 'Failed to load families.'
			}));
			return null;
		}
	}

	async function refresh() {
		update((st) => ({ ...st, currentPage: 0, families: [] }));
		const res = await fetchPage();
		if (res) {
			update((st) => ({
				...st,
				families: res.families,
				total: res.total,
				currentPage: 1,
				isLoading: false,
				initialized: true
			}));
		}
	}

	return {
		subscribe,

		/** Fetch the first page only if we don't already have a cached list. */
		async init() {
			if (get(store).initialized) return;
			await refresh();
		},

		/** Force a fresh reload of the current search/limit. */
		refresh,

		async next() {
			const s = get(store);
			const totalPages = Math.ceil(s.total / s.limit);
			if (s.currentPage >= totalPages) return;

			// Page already cached — just move the window, no API call.
			if (s.families.length > s.currentPage * s.limit) {
				update((st) => ({ ...st, currentPage: st.currentPage + 1 }));
				return;
			}

			if (s.isLoading) return;
			const res = await fetchPage();
			if (res) {
				update((st) => ({
					...st,
					families: [...st.families, ...res.families],
					total: res.total,
					currentPage: st.currentPage + 1,
					isLoading: false
				}));
			}
		},

		previous() {
			update((st) => (st.currentPage > 1 ? { ...st, currentPage: st.currentPage - 1 } : st));
		},

		async setLimit(limit: number) {
			if (limit === get(store).limit) return;
			update((st) => ({ ...st, limit }));
			await refresh();
		},

		async setSearch(search: string) {
			if (search === get(store).search) return;
			update((st) => ({ ...st, search }));
			await refresh();
		},

		/** Mark the cache stale so the next init() refetches (e.g. after creating a family). */
		invalidate() {
			update((st) => ({ ...st, initialized: false }));
		}
	};
}

export const familyListStore = createFamilyListStore();
