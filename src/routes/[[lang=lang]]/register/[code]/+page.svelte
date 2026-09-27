<script lang="ts">
	import { page } from '$app/state';
	import RegistrationFlow from '$lib/components/registration/RegistrationFlow.svelte';

	const lang = $derived(page.params.lang as 'guj' | undefined);
	const code = $derived(page.params.code as string);
</script>

<RegistrationFlow {lang} mode="invite" {code} />
