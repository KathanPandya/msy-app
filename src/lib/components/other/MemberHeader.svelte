<script lang="ts">
	import { page } from '$app/state';
	import { t, withLang, type Lang } from '$lib/i18n';
	import { authStore } from '$lib/stores/authStore';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import InviteMemberModal from '$lib/components/other/InviteMemberModal.svelte';
	import { LogOut, UserPlus } from '@lucide/svelte';

	let { firstName, isHead, lang }: { firstName: string; isHead: boolean; lang: Lang | undefined } =
		$props();

	// English → offer Gujarati (label itself in Gujarati, since that's the
	// language being offered); Gujarati → offer English, label in English.
	// Preserves whichever /me/* page the member is currently on.
	const langSwitchHref = $derived(
		lang === 'guj' ? page.url.pathname.replace(/^\/guj/, '') || '/' : `/guj${page.url.pathname}`
	);
	const langSwitchLabel = $derived(
		lang === 'guj' ? 'Use website in English' : 'વેબસાઇટ ગુજરાતીમાં વાપરો'
	);

	let showInvite = $state(false);
	let showLogout = $state(false);
</script>

<header class="flex-shrink-0 border-b border-gray-200 bg-white px-3 py-1.5">
	<div class="mx-auto flex max-w-3xl items-center justify-between">
		<div class="flex items-center gap-1.5">
			<a href={withLang(lang, '/')} class="flex-shrink-0">
				<img
					src="/logos/02_Website_Logo/website-logo-symbol-512.webp"
					alt="MSY"
					class="h-7 w-7 flex-shrink-0"
				/>
			</a>
			<p class="text-sm font-semibold text-gray-900">
				{t(lang, 'greeting').replace('{name}', firstName)}
			</p>
			{#if isHead}
				<span
					class="inline-flex rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
					>{t(lang, 'head')}</span
				>
			{/if}
		</div>
		<div class="flex flex-shrink-0 items-center gap-2">
			<a
				href={langSwitchHref}
				data-sveltekit-replacestate
				class="text-xs font-medium text-blue-600 hover:underline"
			>
				{langSwitchLabel}
			</a>
			<button
				type="button"
				onclick={() => (showInvite = true)}
				aria-label={t(lang, 'inviteTitle')}
				title={t(lang, 'inviteTitle')}
				class="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
			>
				<UserPlus class="h-4 w-4" />
			</button>
			<button
				type="button"
				onclick={() => (showLogout = true)}
				aria-label={t(lang, 'logOut')}
				title={t(lang, 'logOut')}
				class="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
			>
				<LogOut class="h-4 w-4" />
			</button>
		</div>
	</div>
</header>

<InviteMemberModal open={showInvite} onClose={() => (showInvite = false)} {lang} />

<Modal open={showLogout} onClose={() => (showLogout = false)} title={t(lang, 'logOut')}>
	<p class="text-sm text-gray-700">{t(lang, 'logOutConfirm')}</p>
	<div class="mt-3 flex justify-end gap-2">
		<Button variant="secondary" size="sm" onclick={() => (showLogout = false)}
			>{t(lang, 'cancel')}</Button
		>
		<Button variant="danger" size="sm" onclick={() => authStore.logout()}
			>{t(lang, 'logOut')}</Button
		>
	</div>
</Modal>
