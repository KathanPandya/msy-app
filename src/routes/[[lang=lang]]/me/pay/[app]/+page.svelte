<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { t, withLang } from '$lib/i18n';
	import { authStore } from '$lib/stores/authStore';
	import { QrCode, Download, Copy, Check, ArrowLeftRight } from '@lucide/svelte';
	import UpiAppPicker from '$lib/components/other/UpiAppPicker.svelte';
	import PhonePePaySteps from '$lib/components/other/PhonePePaySteps.svelte';
	import {
		getUpiApp,
		buildUpiQueryString,
		buildGenericUpiLink,
		generateQrDataUrl,
		downloadQrImage,
		UPI_VPA
	} from '$lib/utilities/upiPayment';

	const lang = $derived(page.params.lang as 'guj' | undefined);
	const user = $derived($authStore.userAllInfo?.user);

	const app = $derived(getUpiApp(page.params.app ?? ''));

	// Amount arrives via the URL from the /me page's input — kept editable
	// here too since the member may want to adjust it right before paying.
	// The due amount is captured once (not re-read reactively) so the "due"
	// chip below keeps offering the original amount even after the member
	// types something else into the field.
	const dueAmount = Math.max(0, Math.round(Number(page.url.searchParams.get('amount')) || 0));
	let payAmountInput = $state(page.url.searchParams.get('amount') ?? '');
	function handlePayAmountInput(event: Event) {
		payAmountInput = (event.target as HTMLInputElement).value;
	}
	const payAmount = $derived(Math.max(0, Math.round(Number(payAmountInput) || 0)));

	const amountChips = $derived(
		[
			dueAmount > 0 ? { label: `${t(lang, 'due')} ₹${dueAmount}`, value: dueAmount } : null,
			{ label: '₹100', value: 100 },
			{ label: '₹500', value: 500 },
			{ label: '₹1000', value: 1000 }
		].filter((c): c is { label: string; value: number } => c !== null)
	);
	function selectChip(value: number) {
		payAmountInput = String(value);
	}

	// QR always encodes the generic "upi://pay?..." format — that's what
	// every UPI app's camera scanner recognizes, regardless of which app
	// the member picked in the previous step.
	const upiQueryString = $derived(buildUpiQueryString(payAmount, user?.member_id ?? ''));
	const upiLink = $derived(buildGenericUpiLink(upiQueryString));

	let qrDataUrl = $state('');
	$effect(() => {
		if (!upiLink) {
			qrDataUrl = '';
			return;
		}
		let cancelled = false;
		generateQrDataUrl(upiLink)
			.then((url) => {
				if (!cancelled) qrDataUrl = url;
			})
			.catch(() => {
				if (!cancelled) qrDataUrl = '';
			});
		return () => {
			cancelled = true;
		};
	});

	let showAppPicker = $state(false);
	function changeApp(appKey: string) {
		showAppPicker = false;
		goto(withLang(lang, `/me/pay/${appKey}?amount=${payAmount}`), { replaceState: true });
	}

	function downloadQr() {
		downloadQrImage(qrDataUrl);
	}

	function fallbackCopyText(text: string) {
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.focus();
		textarea.select();
		document.execCommand('copy');
		document.body.removeChild(textarea);
	}

	let showCopiedToast = $state(false);
	let copiedToastTimeout: ReturnType<typeof setTimeout> | undefined;
	async function copyUpiId() {
		try {
			// navigator.clipboard is only available in a secure context (HTTPS or
			// localhost) — testing over plain http on a LAN IP (e.g. from a phone)
			// leaves it undefined, so fall back to the execCommand approach.
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(UPI_VPA);
			} else {
				fallbackCopyText(UPI_VPA);
			}
		} catch {
			fallbackCopyText(UPI_VPA);
		}
		showCopiedToast = true;
		clearTimeout(copiedToastTimeout);
		copiedToastTimeout = setTimeout(() => {
			showCopiedToast = false;
		}, 2000);
	}
</script>

{#if user && app}
	{#if showAppPicker}
		<UpiAppPicker {lang} onselect={changeApp} onclose={() => (showAppPicker = false)} />
	{/if}

	<section class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
		<div class="flex items-center justify-between gap-2">
			<div class="flex min-w-0 items-center gap-2">
				{#if app.logo}
					<span
						class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-white p-1.5"
					>
						<img src={app.logo} alt={app.name} class="h-full w-full object-contain" />
					</span>
				{:else}
					<span
						class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
						style={`background-color:${app.color}`}
					>
						{app.letter}
					</span>
				{/if}
				<div class="min-w-0">
					<p class="text-[10px] text-gray-500">{t(lang, 'payingVia')}</p>
					<p class="truncate text-sm font-semibold text-gray-900">{app.name}</p>
				</div>
			</div>
			<button
				type="button"
				onclick={() => (showAppPicker = true)}
				class="flex flex-shrink-0 items-center gap-1 rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
			>
				<ArrowLeftRight class="h-3 w-3" />
				{t(lang, 'change')}
			</button>
		</div>

		<label class="relative mt-3 block">
			<span
				class="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-gray-500"
				>₹</span
			>
			<input
				type="number"
				min="1"
				step="1"
				inputmode="numeric"
				value={payAmountInput}
				oninput={handlePayAmountInput}
				placeholder={t(lang, 'amountToPay')}
				class="w-full rounded-md border border-gray-300 py-1.5 pr-2 pl-6 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
		</label>
		<p class="mt-1 text-[11px] text-gray-500">{t(lang, 'editAmountHint')}</p>

		<p class="mt-2 text-[11px] font-medium text-gray-500">{t(lang, 'quickSelectAmount')}</p>
		<div class="mt-1 flex flex-wrap gap-1.5">
			{#each amountChips as chip (chip.label)}
				<button
					type="button"
					onclick={() => selectChip(chip.value)}
					class={`rounded-full border px-3 py-1 text-xs font-medium ${
						payAmount === chip.value
							? 'border-blue-600 bg-blue-50 text-blue-700'
							: 'border-gray-300 text-gray-600 hover:bg-gray-50'
					}`}
				>
					{chip.label}
				</button>
			{/each}
		</div>

		<div class="mt-3 flex flex-col items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 p-3">
			{#if qrDataUrl}
				<img src={qrDataUrl} alt={`Scan to pay via ${app.name}`} class="h-44 w-44 rounded" />
			{:else}
				<div class="flex h-44 w-44 items-center justify-center text-xs text-gray-400">
					<QrCode class="h-6 w-6" />
				</div>
			{/if}
			<p class="text-center text-[11px] text-gray-500">{t(lang, 'orScanQr')}</p>
		</div>

		<div class="mt-2 grid grid-cols-2 gap-2">
			<button
				type="button"
				onclick={downloadQr}
				disabled={!qrDataUrl}
				class="flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<Download class="h-3.5 w-3.5" />
				{t(lang, 'downloadQr')}
			</button>
			<button
				type="button"
				onclick={copyUpiId}
				class="flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
			>
				{#if showCopiedToast}
					<Check class="h-3.5 w-3.5 text-green-600" />
					{t(lang, 'upiIdCopied')}
				{:else}
					<Copy class="h-3.5 w-3.5" />
					{t(lang, 'copyUpiId')}
				{/if}
			</button>
		</div>

	</section>

	{#if app.key === 'phonepe'}
		<div class="mt-3">
			<PhonePePaySteps {lang} />
		</div>
	{/if}
{:else if user}
	<section class="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600 shadow-sm">
		{t(lang, 'invalidAppNotice')}
		<button
			type="button"
			onclick={() => goto(withLang(lang, '/me'))}
			class="ml-1 font-medium text-blue-600 hover:text-blue-700"
		>
			{t(lang, 'home')}
		</button>
	</section>
{/if}
