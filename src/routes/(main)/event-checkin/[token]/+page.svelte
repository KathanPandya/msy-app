<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import eventRegistrationApi from '$lib/endpoints/eventRegistrationApi';
	import type { EventRegistration } from '$lib/types/eventRegistration';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { parseRegistrationError } from '$lib/utilities/registrationUtils';
	import { CheckCircle2, ScanLine } from '@lucide/svelte';

	const token = $derived(page.params.token as string);

	let registration = $state<EventRegistration.Data | null>(null);
	let selected = $state<string[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let loadError = $state('');
	let actionError = $state('');

	let lastLoaded: string | null = null;
	$effect(() => {
		const current = token;
		if (!current || current === lastLoaded) return;
		lastLoaded = current;
		load(current);
	});

	async function load(value: string) {
		loadError = '';
		try {
			registration = (await eventRegistrationApi.checkinDetail({ token: value })).data;
			// Everyone not yet in is ticked: usually the whole group arrives together.
			selected = registration.members.filter((m) => !m.checked_in_at).map((m) => m.id);
		} catch (err) {
			loadError = parseRegistrationError(err, 'Could not load this pass.');
		} finally {
			isLoading = false;
		}
	}

	async function markEntered() {
		if (!selected.length) return;
		actionError = '';
		isSaving = true;
		try {
			registration = (await eventRegistrationApi.checkin({ token, memberIds: selected })).data;
			selected = [];
		} catch (err) {
			actionError = parseRegistrationError(err, 'Could not mark entry.');
		} finally {
			isSaving = false;
		}
	}

	const fullName = (m: EventRegistration.Member) =>
		[m.first_name, m.middle_name, m.surname].filter(Boolean).join(' ');
	const enteredAt = (iso: string) =>
		new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
</script>

{#snippet scanNext()}
	<div class="grid">
		<Button variant="secondary" onclick={() => goto('/event-checkin')}>
			<span class="flex items-center justify-center gap-1.5">
				<ScanLine class="h-4 w-4" />
				Scan next
			</span>
		</Button>
	</div>
{/snippet}

<div class="mx-auto flex h-full w-full max-w-md flex-col">
	{#if isLoading}
		<div class="flex h-full items-center justify-center">
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-2 text-sm text-gray-600">Loading pass...</p>
			</div>
		</div>
	{:else if loadError || !registration}
		<div class="flex h-full flex-col items-center justify-center gap-4">
			<h3 class="text-sm font-medium text-gray-900">{loadError || 'Pass not found'}</h3>
			{@render scanNext()}
		</div>
	{:else}
		<div class="space-y-4 py-2">
			{#if registration.status !== 'paid'}
				<p class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
					This form is not paid for. Do not allow entry.
				</p>
			{/if}

			<ul class="space-y-2">
				{#each registration.members as m (m.id)}
					<li class="rounded-md border border-gray-200 px-3 py-2.5">
						{#if m.checked_in_at}
							<div class="flex items-center justify-between gap-2">
								<div class="min-w-0">
									<p class="truncate font-medium text-gray-900">{fullName(m)}</p>
									<p class="text-sm text-gray-500">{formatDate(m.date_of_birth)}</p>
								</div>
								<span class="flex shrink-0 items-center gap-1 text-sm font-medium text-green-700">
									<CheckCircle2 class="h-4 w-4" />
									Entered {enteredAt(m.checked_in_at)}
								</span>
							</div>
						{:else}
							<label class="flex cursor-pointer items-center gap-3">
								<input
									type="checkbox"
									value={m.id}
									bind:group={selected}
									disabled={registration.status !== 'paid'}
									class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								/>
								<div class="min-w-0">
									<p class="truncate font-medium text-gray-900">{fullName(m)}</p>
									<p class="text-sm text-gray-500">{formatDate(m.date_of_birth)}</p>
								</div>
							</label>
						{/if}
					</li>
				{/each}
			</ul>

			{#if actionError}
				<p class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
					{actionError}
				</p>
			{/if}

			{#if registration.status === 'paid' && registration.members.some((m) => !m.checked_in_at)}
				<div class="grid">
					<Button disabled={isSaving || !selected.length} onclick={markEntered}>
						Mark {selected.length} entered
					</Button>
				</div>
			{/if}

			{@render scanNext()}
		</div>
	{/if}
</div>
