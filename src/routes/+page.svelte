<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/authStore';

	$effect(() => {
		if ($authStore.isLoading) return; // wait for initialize() to resolve

		if (!$authStore.isAuthenticated) {
			goto('/login');
		} else if ($authStore.userAllInfo?.user.role === 'admin') {
			goto('/dashboard');
		} else {
			goto('/me');
		}
	});
</script>
