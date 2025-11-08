// src/lib/utils/auth.ts
import { authStore } from '$lib/stores/authStore';
import { goto } from '$app/navigation';
import { get } from 'svelte/store';

export function requireAuth() {
	const auth = get(authStore);

	if (!auth.isAuthenticated) {
		goto('/admin');
		return false;
	}

	return true;
}

export function requireAdmin() {
	const auth = get(authStore);
	if (!auth.isAuthenticated) {
		goto('/admin');
		return false;
	}

	const isAdmin = auth.userAllInfo?.user.role === 'admin';

	if (!isAdmin) {
		goto('/unauthorized');
		return false;
	}

	return true;
}
