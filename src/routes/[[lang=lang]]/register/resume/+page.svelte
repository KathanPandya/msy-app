<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { withLang } from '$lib/i18n';
	import RegistrationFlow from '$lib/components/registration/RegistrationFlow.svelte';

	const lang = $derived(page.params.lang as 'guj' | undefined);

	let token = $state('');
	let ready = $state(false);

	// afterNavigate, not onMount: replaceState throws until the router has started.
	afterNavigate(() => {
		if (ready) return;
		token = page.url.searchParams.get('token') ?? '';
		if (token) replaceState(withLang(lang, '/register/resume'), {});
		ready = true;
	});
</script>

{#if ready}
	<RegistrationFlow {lang} mode="resume" resumeToken={token} />
{/if}
