<script lang="ts">
	import { page } from '$app/state';
	import { t } from '$lib/i18n';
	import { authStore } from '$lib/stores/authStore';
	import { requireMember } from '$lib/utilities/authGuard';
	import familiesApi from '$lib/endpoints/familiesApi';
	import { getCachedFamilyMe, setCachedFamilyMe } from '$lib/utilities/meCache';
	import MemberHeader from '$lib/components/other/MemberHeader.svelte';
	import FloatingTabBar from '$lib/components/ui/FloatingTabBar.svelte';
	import { setMemberShellContext, type MemberShellState } from '$lib/context/memberShell';

	let { children } = $props();

	const lang = $derived(page.params.lang as 'guj' | undefined);

	let isAuthorized = $state(false);
	let familyFetchedFor = $state('');

	const shell: MemberShellState = $state({
		isHead: false,
		familyMembers: [],
		isLoadingFamily: false
	});
	setMemberShellContext(shell);

	$effect(() => {
		if (!$authStore.isLoading) {
			isAuthorized = requireMember(lang);
		}
	});

	const user = $derived($authStore.userAllInfo?.user);

	$effect(() => {
		const userId = user?._id;
		if (!userId || familyFetchedFor === userId) return;
		familyFetchedFor = userId;

		const cached = getCachedFamilyMe(userId);
		if (cached) {
			shell.familyMembers = cached.family?.members ?? [];
			shell.isHead = cached.family?.isHead ?? false;
			return;
		}

		shell.isLoadingFamily = true;
		familiesApi
			.me()
			.then((res) => {
				setCachedFamilyMe(userId, res);
				shell.familyMembers = res.family?.members ?? [];
				shell.isHead = res.family?.isHead ?? false;
			})
			.catch(() => {
				shell.familyMembers = [];
				shell.isHead = false;
			})
			.finally(() => {
				shell.isLoadingFamily = false;
			});
	});

	const activeTab = $derived(
		page.url.pathname.endsWith('/payments')
			? 'payments'
			: page.url.pathname.endsWith('/profile')
				? 'profile'
				: 'home'
	);
</script>

{#if $authStore.isLoading}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<p class="text-sm text-gray-600">{t(lang, 'loading')}</p>
	</div>
{:else if isAuthorized && user}
	<div class="relative flex h-full flex-col bg-gray-50">
		<MemberHeader firstName={user.first_name} isHead={shell.isHead} {lang} />

		<main class="min-h-0 flex-1 overflow-y-auto px-3 pt-1.5 pb-24">
			<div class="mx-auto max-w-3xl space-y-2">
				{@render children?.()}
			</div>
		</main>

		<FloatingTabBar active={activeTab} {lang} />
	</div>
{/if}
