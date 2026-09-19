/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// SvelteKit registers this file automatically. It caches the app shell so the
// app opens fast and is installable; API calls are never cached.
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `msy-cache-${version}`;
// '/' is the SPA fallback (index.html) — used for every page navigation.
const ASSETS = [...build, ...files, '/'];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	// Only same-origin requests; API (other origin) always goes to network.
	if (url.origin !== sw.location.origin) return;

	// Page navigations: network first, fall back to cached shell when offline.
	if (req.mode === 'navigate') {
		event.respondWith(
			fetch(req).catch(async () => (await caches.match('/')) ?? Response.error())
		);
		return;
	}

	// Built assets / static files: cache first (they're versioned).
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(req).then((cached) => cached ?? fetch(req)));
	}
});
