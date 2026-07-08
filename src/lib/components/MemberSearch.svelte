<script lang="ts" module>
	export type MemberSearchItem = {
		id: string;
		member_id: string;
		name: string;
	};
</script>

<script lang="ts">
	import { formatMemberId, memberIdDigits } from '$lib/utilities/memberId';

	let {
		members,
		exclude = [],
		placeholder = 'Search by name or MSY id…',
		onpick
	}: {
		members: MemberSearchItem[];
		exclude?: string[];
		placeholder?: string;
		onpick: (member: MemberSearchItem) => void;
	} = $props();

	let q = $state('');
	let open = $state(false);

	const ex = $derived(new Set(exclude));
	const matches = $derived.by(() => {
		const s = q.trim().toLowerCase();
		if (!s) return [];
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

	function pick(m: MemberSearchItem) {
		onpick(m);
		q = '';
		open = false;
	}
</script>

<div class="relative w-full max-w-md">
	<input
		type="text"
		bind:value={q}
		{placeholder}
		onfocus={() => (open = true)}
		onblur={() => setTimeout(() => (open = false), 120)}
		class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
	/>
	{#if open && matches.length}
		<ul
			class="absolute top-[calc(100%+0.25rem)] right-0 left-0 z-30 max-h-64 list-none overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg"
		>
			{#each matches as m (m.id)}
				<li>
					<button
						type="button"
						onclick={() => pick(m)}
						class="flex w-full items-baseline gap-2 rounded px-2 py-2 text-left text-sm hover:bg-gray-50"
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
			<li class="px-2 py-2 text-sm text-gray-500">No match</li>
		</ul>
	{/if}
</div>
