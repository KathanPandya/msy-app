<script lang="ts">
	import { withLang, t, type Lang } from '$lib/i18n';
	import { Home, IndianRupee, User } from '@lucide/svelte';

	let { active, lang }: { active: 'home' | 'payments' | 'profile'; lang: Lang | undefined } =
		$props();

	const items = [
		{ key: 'home' as const, href: '/me', icon: Home, label: () => t(lang, 'home') },
		{
			key: 'payments' as const,
			href: '/me/payments',
			icon: IndianRupee,
			label: () => t(lang, 'payments')
		},
		{ key: 'profile' as const, href: '/me/profile', icon: User, label: () => t(lang, 'profile') }
	];
</script>

<nav
	class="pointer-events-none absolute inset-x-0 bottom-3 z-40 flex justify-center"
	aria-label="Primary"
>
	<div class="relative">
		<!-- Colour glow behind the panel — glass blur is only visible when it has
		     something with contrast/colour to distort; a flat page gives nothing
		     to blur, so this glow stands in for "content" behind the glass. -->
		<div
			class="absolute inset-0 -z-10 scale-110 rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 opacity-50 blur-xl"
		></div>
		<div
			class="pointer-events-auto flex items-center gap-0.5 rounded-full border border-white/60 bg-white/25 p-1 shadow-[0_8px_24px_rgba(31,41,110,0.18),inset_0_1px_1px_rgba(255,255,255,0.6)] backdrop-blur-xl backdrop-saturate-200"
		>
			{#each items as item (item.key)}
				{@const isActive = active === item.key}
				<a
					href={withLang(lang, item.href)}
					aria-current={isActive ? 'page' : undefined}
					class={`flex flex-col items-center gap-0 rounded-full px-4 py-1.5 transition-colors ${
						isActive ? 'bg-blue-600/90 text-white shadow-sm' : 'text-gray-700 hover:bg-white/40'
					}`}
				>
					<item.icon class="h-4 w-4" strokeWidth={isActive ? 2.25 : 2} />
					<span class="text-[9px] font-medium leading-tight">{item.label()}</span>
				</a>
			{/each}
		</div>
	</div>
</nav>
