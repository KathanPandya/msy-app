<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { t, withLang, type Lang } from '$lib/i18n';
	import eventRegistrationApi from '$lib/endpoints/eventRegistrationApi';
	import optionApi from '$lib/endpoints/optionApi';
	import type { EventRegistration } from '$lib/types/eventRegistration';
	import type { Option } from '$lib/types/option';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { generateQrDataUrl } from '$lib/utilities/upiPayment';
	import { CheckCircle2 } from '@lucide/svelte';
	import { isRegistrationHost } from '$lib/constants/event';

	const onRegistrationHost = isRegistrationHost();

	const lang = $derived(page.params.lang as Lang | undefined);
	const L = $derived(lang === 'guj' ? 'guj' : 'en');
	const token = $derived(page.url.searchParams.get('token') ?? '');
	const langSwitchHref = $derived(
		(lang === 'guj' ? page.url.pathname.replace(/^\/guj/, '') || '/' : `/guj${page.url.pathname}`) +
			page.url.search
	);
	const langSwitchLabel = $derived(
		lang === 'guj' ? 'Use website in English' : 'વેબસાઇટ ગુજરાતીમાં વાપરો'
	);

	let registration = $state<EventRegistration.Data | null>(null);
	let options = $state<Record<string, Option.Item[]>>({});
	let qrDataUrl = $state('');
	let isLoading = $state(true);
	let notFound = $state(false);

	onMount(async () => {
		try {
			const [pass, opts] = await Promise.all([
				eventRegistrationApi.pass({ token }),
				optionApi.list({ lists: ['relation', 'profession', 'gotra'] })
			]);
			registration = pass.registration;
			options = opts.options;
			if (registration.status === 'paid') {
				// Only the pass code: the admin site's own scanner reads it, so no other site is involved.
				qrDataUrl = await generateQrDataUrl(token);
			}
		} catch {
			notFound = true;
		} finally {
			isLoading = false;
		}
	});

	const optionLabel = (list: string, key: string | null) => {
		const o = options[list]?.find((x) => x.key === key);
		return o ? (L === 'guj' ? o.label_guj : o.label_en) : '';
	};
	const fullName = (m: EventRegistration.Member) =>
		[m.first_name, m.middle_name, m.surname].filter(Boolean).join(' ');

	function rows(m: EventRegistration.Member) {
		return [
			...(m.is_head
				? []
				: [{ label: t(lang, 'relation'), value: optionLabel('relation', m.relation) }]),
			{ label: t(lang, 'dateOfBirth'), value: formatDate(m.date_of_birth) },
			{ label: t(lang, 'frProfession'), value: optionLabel('profession', m.profession) },
			{ label: t(lang, 'frMobile'), value: m.mobile },
			{ label: t(lang, 'frWhatsapp'), value: m.whatsapp },
			{ label: t(lang, 'frEmail'), value: m.email },
			{ label: t(lang, 'frAddress'), value: `${m.address}, ${m.city} - ${m.pincode}` },
			{ label: t(lang, 'gotra'), value: optionLabel('gotra', m.gotra) },
			{ label: t(lang, 'frVatan'), value: m.native_place }
		];
	}
</script>

<div class="relative min-h-full bg-white px-4 pt-16 pb-10">
	<header
		class="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-1.5 sm:px-6"
	>
		<a href={withLang(lang, '/')} class="flex min-w-0 items-center gap-1">
			<img
				src="/logos/02_Website_Logo/website-logo-symbol-512.webp"
				alt=""
				class="h-8 w-8 flex-shrink-0"
			/>
			{#if !onRegistrationHost}
				<p class="text-sm font-medium text-[#2f9fb3]">
					<b class="text-lg">M</b>rutyu <b class="text-lg">S</b>ahay
					<b class="-mr-0.5 text-lg">Y</b>ojana
				</p>
			{/if}
		</a>
		<a
			href={langSwitchHref}
			data-sveltekit-replacestate
			class="text-xs font-medium text-blue-600 hover:underline"
		>
			{langSwitchLabel}
		</a>
	</header>

	<div class="mx-auto w-full max-w-md pt-4">
		{#if isLoading}
			<div class="pt-16 text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-2 text-sm text-gray-600">{t(lang, 'loading')}</p>
			</div>
		{:else if notFound || !registration}
			<p class="pt-16 text-center text-sm font-medium text-gray-900">{t(lang, 'epNotFound')}</p>
		{:else}
			<h1 class="mb-6 text-2xl font-bold text-gray-900">{t(lang, 'epTitle')}</h1>

			{#if registration.status === 'paid'}
				<div class="rounded-md border border-gray-200 p-4 text-center">
					{#if qrDataUrl}
						<img src={qrDataUrl} alt="QR" class="mx-auto h-56 w-56" />
					{/if}
					<p class="mt-3 text-sm text-gray-600">{t(lang, 'epShowQr')}</p>
				</div>
			{:else}
				<p class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
					{t(lang, 'epNotPaid')}
				</p>
			{/if}

			<div class="mt-6 space-y-3">
				{#each registration.members as m (m.id)}
					<section class="rounded-md border border-gray-200 px-3 py-2.5">
						<div class="flex items-center justify-between gap-2">
							<p class="flex min-w-0 items-center gap-2 font-semibold text-gray-900">
								<span class="truncate">{fullName(m)}</span>
								{#if m.is_head}
									<span
										class="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white"
									>
										{t(lang, 'frYouTag')}
									</span>
								{/if}
							</p>
							{#if m.checked_in_at}
								<span class="flex shrink-0 items-center gap-1 text-sm font-medium text-green-700">
									<CheckCircle2 class="h-4 w-4" />
									{t(lang, 'epEntered')}
								</span>
							{/if}
						</div>
						<dl class="mt-1 divide-y divide-gray-100 text-sm">
							{#each rows(m) as row (row.label)}
								<div class="flex gap-3 py-2">
									<dt class="w-28 shrink-0 text-gray-500">{row.label}</dt>
									<dd class="min-w-0 break-words text-gray-900">{row.value || '-'}</dd>
								</div>
							{/each}
						</dl>
					</section>
				{/each}
			</div>
		{/if}
	</div>
</div>
