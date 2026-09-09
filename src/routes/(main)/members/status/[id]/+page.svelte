<script lang="ts">
	import { page } from '$app/state';
	import MemberStatusPanel from '$lib/components/other/MemberStatusPanel.svelte';

	const userId = page.params.id ?? '';
</script>

<div class="mx-auto max-w-5xl p-2 lg:p-6">
	<MemberStatusPanel {userId} />
</div>
