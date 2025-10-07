<!-- src/lib/components/ui/Tabs.svelte -->
<script lang="ts">
	type Tab = {
		id: string;
		label: string;
	};

	type TabsProps = {
		tabs: Tab[];
		activeTab: string;
		onTabChange?: (tabId: string) => void;
	};

	let { tabs, activeTab = $bindable(), onTabChange }: TabsProps = $props();

	function handleTabClick(tabId: string) {
		activeTab = tabId;
		onTabChange?.(tabId);
	}
</script>

<div class="border-b border-gray-200 bg-white">
	<nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
		{#each tabs as tab}
			<button
				type="button"
				onclick={() => handleTabClick(tab.id)}
				class={`
          border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors
          ${
						activeTab === tab.id
							? 'border-blue-500 text-blue-600'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
					}
        `}
				aria-current={activeTab === tab.id ? 'page' : undefined}
			>
				{tab.label}
			</button>
		{/each}
	</nav>
</div>
