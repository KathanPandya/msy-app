<script lang="ts" module>
	export type MemberSearchItem = {
		id: string;
		member_id: string;
		name: string;
	};

	// Stable per-instance id base for ARIA wiring (no randomness).
	let uidCounter = 0;
</script>

<script lang="ts">
	import { debounce } from '$lib/utilities/helperFunc';
	import { formatMemberId, memberIdDigits } from '$lib/utilities/memberId';

	let {
		members = [],
		fetcher,
		exclude = [],
		placeholder = 'Search by name or MSY id…',
		onpick
	}: {
		/** Local list to filter client-side. Ignored when `fetcher` is provided. */
		members?: MemberSearchItem[];
		/** Async search — called (debounced) with the query; return the matches to show. */
		fetcher?: (query: string) => Promise<MemberSearchItem[]>;
		exclude?: string[];
		placeholder?: string;
		onpick: (member: MemberSearchItem) => void;
	} = $props();

	const uid = `member-search-${uidCounter++}`;

	let q = $state('');
	let open = $state(false);
	let loading = $state(false);
	let remoteMatches = $state<MemberSearchItem[]>([]);
	let activeIndex = $state(-1);
	let listEl = $state<HTMLUListElement>();

	const ex = $derived(new Set(exclude));

	const runFetch = debounce(async (s: string) => {
		if (!fetcher) return;
		loading = true;
		try {
			remoteMatches = await fetcher(s);
		} catch {
			remoteMatches = [];
		} finally {
			loading = false;
		}
	}, 300);

	function onInput() {
		// Typing always re-opens the list (e.g. after a previous pick closed it).
		open = true;
		if (!fetcher) return;
		const s = q.trim();
		if (!s) {
			remoteMatches = [];
			loading = false;
			return;
		}
		loading = true;
		runFetch(s);
	}

	const matches = $derived.by(() => {
		const s = q.trim().toLowerCase();
		if (!s) return [];
		if (fetcher) {
			return remoteMatches.filter((m) => !ex.has(m.id)).slice(0, 8);
		}
		const digits = s.replace(/[^0-9]/g, '');
		return members
			.filter((m) => {
				if (ex.has(m.id)) return false;
				const nameMatch = m.name.toLowerCase().includes(s);
				const idMatch =
					!!digits &&
					(m.member_id.toLowerCase().includes(s) ||
						String(memberIdDigits(m.member_id) ?? '').includes(digits));
				return nameMatch || idMatch;
			})
			.slice(0, 8);
	});

	// Whenever the result set changes, highlight the first row (or nothing if empty).
	$effect(() => {
		activeIndex = matches.length ? 0 : -1;
	});

	function scrollActiveIntoView() {
		// Wait for the highlight/DOM to settle, then reveal the active row.
		requestAnimationFrame(() => {
			(listEl?.children[activeIndex] as HTMLElement | undefined)?.scrollIntoView({
				block: 'nearest'
			});
		});
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (!open) {
				open = true;
				return;
			}
			if (!matches.length) return;
			activeIndex = (activeIndex + 1) % matches.length;
			scrollActiveIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (!matches.length) return;
			activeIndex = (activeIndex - 1 + matches.length) % matches.length;
			scrollActiveIntoView();
		} else if (e.key === 'Enter') {
			if (open && activeIndex >= 0 && activeIndex < matches.length) {
				e.preventDefault();
				pick(matches[activeIndex]);
			}
		} else if (e.key === 'Escape') {
			if (open) {
				e.preventDefault();
				open = false;
			}
		}
	}

	function pick(m: MemberSearchItem) {
		onpick(m);
		q = '';
		remoteMatches = [];
		open = false;
	}
</script>

<div class="relative w-full max-w-md">
	<input
		type="text"
		role="combobox"
		aria-expanded={open && matches.length > 0}
		aria-controls={`${uid}-list`}
		aria-activedescendant={open && activeIndex >= 0 ? `${uid}-opt-${activeIndex}` : undefined}
		aria-autocomplete="list"
		bind:value={q}
		oninput={onInput}
		onkeydown={onKeydown}
		{placeholder}
		onfocus={() => (open = true)}
		onblur={() => setTimeout(() => (open = false), 120)}
		class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
	/>
	{#if open && matches.length}
		<ul
			bind:this={listEl}
			id={`${uid}-list`}
			role="listbox"
			class="absolute top-[calc(100%+0.25rem)] right-0 left-0 z-30 max-h-64 list-none overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg"
		>
			{#each matches as m, i (m.id)}
				<li role="option" id={`${uid}-opt-${i}`} aria-selected={i === activeIndex}>
					<button
						type="button"
						tabindex="-1"
						onpointerdown={(e) => e.preventDefault()}
						onpointermove={() => (activeIndex = i)}
						onclick={() => pick(m)}
						class="flex w-full items-baseline gap-2 rounded px-2 py-2 text-left text-sm {i ===
						activeIndex
							? 'bg-blue-50'
							: 'hover:bg-gray-50'}"
					>
						<span class="min-w-[3.5rem] font-mono text-xs text-gray-500"
							>{formatMemberId(m.member_id)}</span
						>
						<span class="font-semibold text-gray-900">{m.name}</span>
					</button>
				</li>
			{/each}
		</ul>
	{:else if open && q.trim()}
		<ul
			class="absolute top-[calc(100%+0.25rem)] right-0 left-0 z-30 list-none rounded-md border border-gray-200 bg-white p-1 shadow-lg"
		>
			<li class="px-2 py-2 text-sm text-gray-500">{loading ? 'Searching…' : 'No match'}</li>
		</ul>
	{/if}
</div>
