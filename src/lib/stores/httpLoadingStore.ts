// Tracks how many axios requests are currently in flight, app-wide, so a
// global header strip can show while any API call is pending — useful once
// deployed, where latency makes "is anything happening?" not obvious.
import { derived, writable } from 'svelte/store';

const activeRequests = writable(0);

export const isHttpLoading = derived(activeRequests, (count) => count > 0);

export function startHttpRequest() {
	activeRequests.update((count) => count + 1);
}

export function endHttpRequest() {
	activeRequests.update((count) => Math.max(0, count - 1));
}
