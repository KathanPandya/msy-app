<script lang="ts">
	import { t, type Lang } from '$lib/i18n';
	import type { Family } from '$lib/types/family';

	let {
		familyMembers,
		selectedId,
		myId,
		lang,
		onselect
	}: {
		familyMembers: Family.MemberSummary[];
		selectedId: string;
		myId: string;
		lang: Lang | undefined;
		onselect: (id: string) => void;
	} = $props();

	function initials(name: string) {
		return (name || '?').trim().charAt(0).toUpperCase();
	}
</script>

{#if familyMembers.length > 1}
	<div class="flex gap-3 overflow-x-auto overflow-y-visible px-1 py-1.5">
		{#each familyMembers as m (m.id)}
			{@const isSelected = m.id === selectedId}
			<button
				type="button"
				onclick={() => onselect(m.id)}
				class="flex flex-shrink-0 flex-col items-center gap-1"
			>
				<span
					class={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition-all ${
						isSelected
							? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2 ring-offset-gray-50'
							: 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300'
					}`}
				>
					{initials(m.name)}
				</span>
				<span
					class={`max-w-14 truncate text-[10px] font-medium ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}
				>
					{m.id === myId ? t(lang, 'you') : m.name.split(' ')[0]}
				</span>
			</button>
		{/each}
	</div>
{/if}
