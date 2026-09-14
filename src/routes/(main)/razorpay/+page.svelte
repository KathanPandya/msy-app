<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import RazorpayAccess from '$lib/components/razorpay/RazorpayAccess.svelte';
	import RazorpayOrders from '$lib/components/razorpay/RazorpayOrders.svelte';

	type Tab = 'orders' | 'access';
	const TABS: { id: Tab; label: string }[] = [
		{ id: 'orders', label: 'Orders' },
		{ id: 'access', label: 'Access' }
	];

	// Tab lives in the URL so refresh / back keeps the admin where they were.
	const activeTab = $derived<Tab>(page.url.searchParams.get('tab') === 'access' ? 'access' : 'orders');

	function selectTab(tab: Tab) {
		if (tab === activeTab) return;
		goto(tab === 'orders' ? page.url.pathname : `${page.url.pathname}?tab=${tab}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}
</script>

<div class="flex h-full flex-col">
	<nav
		class="mb-1.5 flex flex-shrink-0 gap-4 border-b border-gray-200 px-1"
		aria-label="Razorpay sections"
	>
		{#each TABS as tab (tab.id)}
			<button
				type="button"
				onclick={() => selectTab(tab.id)}
				class={`-mb-px border-b-2 px-1 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
					activeTab === tab.id
						? 'border-blue-600 text-blue-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				}`}
				aria-current={activeTab === tab.id ? 'page' : undefined}
			>
				{tab.label}
			</button>
		{/each}
	</nav>

	<div class="min-h-0 flex-1">
		{#if activeTab === 'orders'}
			<RazorpayOrders />
		{:else}
			<RazorpayAccess />
		{/if}
	</div>
</div>
