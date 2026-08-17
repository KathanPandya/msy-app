// src/lib/utilities/authGuard.ts
import { authStore } from '$lib/stores/authStore';
import { goto } from '$app/navigation';
import { get } from 'svelte/store';
import { withLang, type Lang } from '$lib/i18n';

export function requireAuth() {
	const auth = get(authStore);

	if (!auth.isAuthenticated) {
		goto('/login');
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

/** Authenticated member (PIN session) — not admin shell */
export function requireMember(lang?: Lang) {
	const auth = get(authStore);
	if (!auth.isAuthenticated) {
		goto(withLang(lang, '/login'));
		return false;
	}

	if (auth.authType === 'password' && auth.userAllInfo?.user.role === 'admin') {
		goto('/dashboard');
		return false;
	}

	return true;
}
