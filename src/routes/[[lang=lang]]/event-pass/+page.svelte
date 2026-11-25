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
	import { CheckCircle2, Download } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { isRegistrationHost, EVENT_NAME_GUJ, EVENT_DATE_GUJ } from '$lib/constants/event';
	import EventAd from '$lib/components/event/EventAd.svelte';

	const onRegistrationHost = isRegistrationHost();

	const lang = $derived(page.params.lang as Lang | undefined);
	const L = $derived(lang === 'guj' ? 'guj' : 'en');
	const token = $derived(page.url.searchParams.get('token') ?? '');
	// Set by the form right after payment: shows the success heading instead of "Entry pass".
	const justPaid = $derived(page.url.searchParams.get('new') === '1');
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
	let isConfirming = $state(false);

	const CONFIRM_TRIES = 10;
	const CONFIRM_DELAY_MS = 3000;
	const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

	onMount(async () => {
		try {
			const [pass, opts] = await Promise.all([
				eventRegistrationApi.pass({ token }),
				optionApi.list({ lists: ['relation', 'profession', 'gotra'] })
			]);
			registration = pass.registration;
			options = opts.options;
		} catch {
			notFound = true;
		} finally {
			isLoading = false;
		}

		// Right after payment, Razorpay can take a few seconds to confirm it; keep checking
		// so the person sees their QR here instead of "payment not complete".
		if (justPaid && registration && registration.status !== 'paid') {
			isConfirming = true;
			for (let i = 0; i < CONFIRM_TRIES && registration.status !== 'paid'; i++) {
				await wait(CONFIRM_DELAY_MS);
				try {
					registration = (await eventRegistrationApi.pass({ token })).registration;
				} catch {}
			}
			isConfirming = false;
		}

		if (registration?.status === 'paid') {
			// Only the pass code: the admin site's own scanner reads it, so no other site is involved.
			qrDataUrl = await generateQrDataUrl(token);
		}
	});

	const head = $derived(registration?.members.find((m) => m.is_head));

	// A tap-to-save image of the pass, as a backup if WhatsApp fails. Not downloaded automatically:
	// phones block downloads the person didn't tap. The page also asks for a screenshot, since
	// people of this age find screenshots in the Gallery more easily than files in Downloads.
	async function savePass() {
		if (!registration || !qrDataUrl) return;
		const names = registration.members.map(fullName);
		const W = 720;
		const QR = 440;
		const H = 300 + QR + names.length * 40 + 80;

		const canvas = document.createElement('canvas');
		canvas.width = W;
		canvas.height = H;
		const ctx = canvas.getContext('2d')!;
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, W, H);
		ctx.textAlign = 'center';
		ctx.fillStyle = '#7b1e1e';
		ctx.font = 'bold 34px sans-serif';
		ctx.fillText(EVENT_NAME_GUJ, W / 2, 70, W - 60);
		ctx.fillStyle = '#111827';
		ctx.font = '26px sans-serif';
		ctx.fillText(EVENT_DATE_GUJ, W / 2, 115, W - 60);
		ctx.font = 'bold 30px sans-serif';
		ctx.fillText('Entry Pass', W / 2, 190);

		const img = new Image();
		img.src = qrDataUrl;
		await img.decode();
		ctx.drawImage(img, (W - QR) / 2, 220, QR, QR);

		ctx.font = '26px sans-serif';
		names.forEach((n, i) => ctx.fillText(n, W / 2, 220 + QR + 50 + i * 40, W - 60));
		ctx.fillStyle = '#6b7280';
		ctx.font = '22px sans-serif';
		ctx.fillText('Show this QR at the entry gate', W / 2, H - 40);

		canvas.toBlob((blob) => {
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'entry-pass.png';
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}, 'image/png');
	}

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

<div class="min-h-full bg-white px-4 pb-10">
	<header
		class="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-1.5 sm:px-6"
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
			{#if justPaid && registration.status === 'paid'}
				<div class="mb-6 text-center">
					<CheckCircle2 class="mx-auto mb-3 h-14 w-14 text-green-600" />
					<h1 class="text-2xl font-bold text-gray-900">{t(lang, 'epSuccessTitle')}</h1>
					{#if head}
						<p class="mt-2 text-gray-600">{t(lang, 'epWhatsappNote').replace('{number}', head.whatsapp)}</p>
					{/if}
				</div>
			{:else}
				<h1 class="mb-6 text-2xl font-bold text-gray-900">{t(lang, 'epTitle')}</h1>
			{/if}

			{#if registration.status === 'paid'}
				<div class="grid">
					<Button onclick={savePass} disabled={!qrDataUrl}>
						<span class="flex items-center justify-center gap-1.5">
							<Download class="h-4 w-4" />
							{t(lang, 'epSavePass')}
						</span>
					</Button>
				</div>
				<p class="mt-2 mb-4 text-center text-sm text-gray-600">{t(lang, 'epScreenshotHint')}</p>
				<div class="rounded-md border border-gray-200 p-4 text-center">
					{#if qrDataUrl}
						<img src={qrDataUrl} alt="QR" class="mx-auto h-56 w-56" />
					{/if}
					<p class="mt-3 text-sm text-gray-600">{t(lang, 'epShowQr')}</p>
				</div>
			{:else if isConfirming}
				<div class="rounded-md border border-gray-200 p-4 text-center">
					<div
						class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<p class="mt-2 text-sm text-gray-600">{t(lang, 'epConfirming')}</p>
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

		{#if !isLoading}
			<EventAd />
		{/if}
	</div>
</div>
