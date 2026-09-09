import { writable } from 'svelte/store';

/** Lets a page override the header title in (main)/+layout.svelte (e.g. showing a
 * member's display name on their detail page instead of the generic nav label).
 * Pages that set this must clear it (set back to null) on destroy. */
export const pageTitleOverride = writable<string | null>(null);
