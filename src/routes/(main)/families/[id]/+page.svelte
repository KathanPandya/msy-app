<script lang="ts">
	import { page } from '$app/state';
	import FamilyPanel from '$lib/components/other/FamilyPanel.svelte';

	const clubId = page.params.id ?? null;
</script>

<FamilyPanel {clubId} />
