<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { t, withLang } from '$lib/i18n';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import paymentApi from '$lib/endpoints/paymentApi';
	import uploadApi from '$lib/endpoints/uploadApi';
	import ImageViewer from '$lib/components/ui/ImageViewer.svelte';
	import { getMemberShellContext } from '$lib/context/memberShell';
	import { authStore } from '$lib/stores/authStore';
	import { Upload, QrCode, ChevronRight, Copy, Check, X } from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	const lang = $derived(page.params.lang as 'guj' | undefined);
	const shell = getMemberShellContext();

	const user = $derived($authStore.userAllInfo?.user);
	const displayName = $derived(user?.name || t(lang, 'member'));

	function amountLabel(n: number) {
		if (n > 0) return { value: `₹${n}`, sub: t(lang, 'toBePaid'), color: 'text-red-700' };
		if (n < 0)
			return { value: `₹${Math.abs(n)}`, sub: t(lang, 'inCredit'), color: 'text-green-700' };
		return { value: '₹0', sub: t(lang, 'allSettled'), color: 'text-gray-800' };
	}

	function familyDueLabel(n: number | undefined) {
		const amt = n ?? 0;
		if (amt > 0) return { text: `₹${amt} ${t(lang, 'due')}`, color: 'text-red-700' };
		if (amt < 0) return { text: `₹${Math.abs(amt)} ${t(lang, 'credit')}`, color: 'text-green-700' };
		return { text: t(lang, 'settled'), color: 'text-gray-800' };
	}

	const amount = $derived(user?.outstanding_amount ?? 0);

	// Total outstanding across the whole family (familyMembers includes the
	// logged-in member) — shown as the due amount and used to prefill the pay
	// amount so the head can settle everyone at once, not just their own balance.
	const familyTotalDue = $derived(
		shell.familyMembers.length
			? shell.familyMembers.reduce((sum, m) => sum + (m.outstanding_amount ?? 0), 0)
			: amount
	);
	const due = $derived(amountLabel(familyTotalDue));

	// The heading above the figure shouldn't call it "due" once it's a credit
	// balance — that only makes sense when money is actually owed.
	const amountHeading = $derived(
		familyTotalDue < 0 ? t(lang, 'creditBalance') : t(lang, 'amountDue')
	);

	// Amount the user will actually pay — defaults to the family's total due but is
	// editable, since a member may want to pay a partial or extra amount.
	let payAmountInput = $state('');
	let payAmountTouched = $state(false);
	$effect(() => {
		if (!payAmountTouched && familyTotalDue > 0) {
			payAmountInput = String(familyTotalDue);
		}
	});
	function handlePayAmountInput(event: Event) {
		payAmountTouched = true;
		payAmountInput = (event.target as HTMLInputElement).value;
	}
	const payAmount = $derived(Math.max(0, Math.round(Number(payAmountInput) || 0)));

	const UPI_VPA = 'boim-202073804429@boi';
	const UPI_PAYEE_NAME = 'MSY';

	let showCopiedToast = $state(false);
	let copiedToastTimeout: ReturnType<typeof setTimeout> | undefined;

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
			showCopiedToast = true;
			clearTimeout(copiedToastTimeout);
			copiedToastTimeout = setTimeout(() => {
				showCopiedToast = false;
			}, 2000);
		} catch {
			fallbackCopyText(UPI_VPA);
			showCopiedToast = true;
			clearTimeout(copiedToastTimeout);
			copiedToastTimeout = setTimeout(() => {
				showCopiedToast = false;
			}, 2000);
		}
	}

	const upiQueryString = $derived(
		payAmount > 0
			? new URLSearchParams({
					pa: UPI_VPA,
					pn: UPI_PAYEE_NAME,
					am: String(payAmount),
					cu: 'INR',
					tn: `Dues - ${formatMemberDisplay(displayName, user?.member_id)}`
				}).toString()
			: ''
	);
	const upiLink = $derived(upiQueryString ? 'upi://pay?' + upiQueryString : '');

	let showAppPicker = $state(false);

	// Market-share ordered (PhonePe/GPay/Paytm dominate, long tail after) —
	// each prefix already ends in "pay?" so the shared UPI query string can be
	// appended directly to build that app's own deep link.
	const UPI_APPS = [
		{ name: 'PhonePe', prefix: 'phonepe://pay?', color: '#5f259f', letter: 'Pe' },
		{ name: 'Google Pay', prefix: 'tez://upi/pay?', color: '#4285f4', letter: 'G' },
		{ name: 'Paytm', prefix: 'paytmmp://pay?', color: '#00baf2', letter: 'P' },
		{ name: 'Navi', prefix: 'navipay://upi/pay?', color: '#ff5e3a', letter: 'N' },
		{ name: 'Super Money', prefix: 'super://upi/pay?', color: '#6c3ce9', letter: 'S' },
		{ name: 'BHIM', prefix: 'bhim://pay?', color: '#00a651', letter: 'B' },
		{ name: 'FamPay', prefix: 'fampay://upi/pay?', color: '#7c4dff', letter: 'F' },
		{ name: 'CRED', prefix: 'credpay://upi/pay?', color: '#1c1c1e', letter: 'C' },
		{ name: 'Amazon Pay', prefix: 'amazonpay://upi/pay?', color: '#ff9900', letter: 'A' },
		{ name: 'WhatsApp', prefix: 'whatsapp://upi/pay?', color: '#25d366', letter: 'W' }
	];
	const upiApps = $derived(
		upiQueryString ? UPI_APPS.map((app) => ({ ...app, href: app.prefix + upiQueryString })) : []
	);

	function handlePayClick(event: MouseEvent) {
		if (payAmount <= 0) return;
		event.preventDefault();
		showAppPicker = true;
	}

	// Custom URL schemes fail silently — if the app isn't installed, nothing
	// happens and the member is left staring at the page. We'd like to detect
	// that by checking whether the tab lost visibility (i.e. the app actually
	// opened), but the browser's own "open in app?" prompt (e.g. the
	// incognito-mode "leave private browsing?" bar) neither hides the tab nor
	// blocks script execution while the user is deciding — it only blurs the
	// window. So: a plain timer would fire the "not installed" toast while
	// that prompt is still sitting there unanswered. Instead, a blur pauses
	// the check (the user is looking at *something*), and only once focus
	// returns — with no app having opened — do we conclude it's missing.
	let appNotFoundName = $state('');
	function openUpiApp(app: { name: string; href: string }) {
		showAppPicker = false;
		let opened = false;
		let dialogPending = false;
		let notFoundTimer: ReturnType<typeof setTimeout> | undefined;

		function showNotFound() {
			appNotFoundName = app.name;
			setTimeout(() => {
				if (!opened) appNotFoundName = '';
			}, 3000);
		}

		function cleanup() {
			opened = true;
			clearTimeout(notFoundTimer);
			document.removeEventListener('visibilitychange', onVisibilityChange);
			window.removeEventListener('blur', onBlur);
			window.removeEventListener('focus', onFocus);
		}

		function onVisibilityChange() {
			if (!document.hidden) return;
			appNotFoundName = '';
			cleanup();
		}

		function onBlur() {
			dialogPending = true;
			clearTimeout(notFoundTimer);
		}

		function onFocus() {
			if (!dialogPending) return;
			dialogPending = false;
			if (opened || document.hidden) return;
			// The user just dismissed a prompt (e.g. declined to leave
			// incognito) and the app never opened — safe to conclude now.
			notFoundTimer = setTimeout(() => {
				if (!opened && !document.hidden) showNotFound();
			}, 800);
		}

		document.addEventListener('visibilitychange', onVisibilityChange);
		window.addEventListener('blur', onBlur);
		window.addEventListener('focus', onFocus);

		window.location.href = app.href;

		notFoundTimer = setTimeout(() => {
			if (!opened && !document.hidden && !dialogPending) showNotFound();
		}, 2500);

		setTimeout(cleanup, 15000);
	}

	// QR fallback — some devices/browsers fail to open the upi:// deep link
	// (e.g. desktop, or no UPI app installed), so scanning must always work too.
	let qrDataUrl = $state('');
	let showQr = $state(false);
	$effect(() => {
		if (!upiLink) {
			qrDataUrl = '';
			return;
		}
		let cancelled = false;
		// Dynamic import keeps qrcode out of the SSR graph (avoids Vite's unused-default warning).
		import('qrcode')
			.then(({ default: QRCode }) => QRCode.toDataURL(upiLink, { margin: 1, width: 220 }))
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

	// Payment screenshot upload — lets a member attach proof right after paying
	// so admins can reconcile faster. Picking a file only stages it locally;
	// the actual upload + submission happens on the explicit Submit click.
	let screenshotFile = $state<HTMLInputElement | null>(null);
	let screenshotPreviewUrl = $state('');
	let screenshotName = $state('');
	let screenshotSelectedFile = $state<File | null>(null);
	let screenshotUploading = $state(false);
	let screenshotSubmitted = $state(false);
	let screenshotError = $state('');
	let screenshotResetCountdown = $state(0);
	let screenshotResetInterval: ReturnType<typeof setInterval> | null = null;

	function handleScreenshotChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		screenshotError = '';

		if (file.size > 5 * 1024 * 1024) {
			screenshotError = t(lang, 'errFileSize');
			return;
		}
		if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
			screenshotError = t(lang, 'errFileType');
			return;
		}

		if (screenshotPreviewUrl) URL.revokeObjectURL(screenshotPreviewUrl);
		screenshotSelectedFile = file;
		screenshotPreviewUrl = URL.createObjectURL(file);
		screenshotName = file.name;
	}

	async function submitScreenshot() {
		if (!screenshotSelectedFile || !user) return;

		screenshotUploading = true;
		screenshotError = '';
		try {
			const formData = new FormData();
			formData.append('file', screenshotSelectedFile);
			const res = await uploadApi.file({ file: formData });
			await paymentApi.submitPaymentScreenshot({ userId: user._id, url: res.data.fileUrl });
			screenshotSubmitted = true;
			startScreenshotResetCountdown();
		} catch (err: any) {
			screenshotError = err?.response?.data?.message || t(lang, 'errUploadFailed');
		} finally {
			screenshotUploading = false;
		}
	}

	function startScreenshotResetCountdown() {
		screenshotResetCountdown = 5;
		screenshotResetInterval = setInterval(() => {
			screenshotResetCountdown -= 1;
			if (screenshotResetCountdown <= 0) {
				removeScreenshot();
			}
		}, 1000);
	}

	function removeScreenshot() {
		if (screenshotResetInterval) {
			clearInterval(screenshotResetInterval);
			screenshotResetInterval = null;
		}
		if (screenshotPreviewUrl) URL.revokeObjectURL(screenshotPreviewUrl);
		screenshotPreviewUrl = '';
		screenshotName = '';
		screenshotSelectedFile = null;
		screenshotSubmitted = false;
		screenshotResetCountdown = 0;
		screenshotError = '';
		if (screenshotFile) screenshotFile.value = '';
	}
</script>

{#if user}
	<section class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
		<div class="flex items-baseline justify-between">
			<p class="text-xs font-medium text-gray-500">{amountHeading}</p>
			<p class="text-xs text-gray-500">{due.sub}</p>
		</div>
		<p class={`mt-0.5 text-2xl font-bold ${due.color}`}>{due.value}</p>

		{#if familyTotalDue > 0}
			<div class="mt-2 flex items-center gap-2">
				<label class="relative flex-1">
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
				<a
					href={payAmount > 0 ? upiLink : undefined}
					onclick={handlePayClick}
					aria-disabled={payAmount <= 0}
					class={`flex flex-shrink-0 items-center justify-center rounded-md px-4 py-1.5 text-sm font-semibold text-white ${
						payAmount > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'pointer-events-none bg-gray-300'
					}`}
				>
					{t(lang, 'pay')} ₹{payAmount}
				</a>
			</div>

			{#if showAppPicker}
				<div
					transition:fade={{ duration: 150 }}
					class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
					role="button"
					tabindex="0"
					onclick={() => (showAppPicker = false)}
					onkeydown={(e) => e.key === 'Escape' && (showAppPicker = false)}
				>
					<div
						role="dialog"
						aria-modal="true"
						aria-label={t(lang, 'chooseUpiApp')}
						class="w-full max-w-sm rounded-t-xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg sm:rounded-xl sm:pb-4"
						onclick={(e) => e.stopPropagation()}
					>
						<div class="mb-3 flex items-center justify-between">
							<p class="text-sm font-semibold text-gray-900">{t(lang, 'chooseUpiApp')}</p>
							<button
								type="button"
								onclick={() => (showAppPicker = false)}
								class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
								aria-label={t(lang, 'close')}
							>
								<X class="h-4 w-4" />
							</button>
						</div>
						<div class="grid grid-cols-5 gap-3">
							{#each upiApps as app (app.name)}
								<button
									type="button"
									onclick={() => openUpiApp(app)}
									class="flex flex-col items-center gap-1 text-center"
								>
									<span
										class="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white"
										style={`background-color:${app.color}`}
									>
										{app.letter}
									</span>
									<span class="text-[10px] leading-tight text-gray-600">{app.name}</span>
								</button>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			{#if appNotFoundName}
				<div
					transition:fade={{ duration: 150 }}
					class="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-xs rounded-md bg-gray-900 px-3 py-2 text-center text-xs font-medium text-white shadow-lg"
				>
					{appNotFoundName} {t(lang, 'appNotInstalled')}
				</div>
			{/if}

			<button
				type="button"
				onclick={() => (showQr = !showQr)}
				class="mt-1.5 flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
			>
				<QrCode class="h-3.5 w-3.5" />
				{showQr ? t(lang, 'hideQr') : t(lang, 'scanQrInstead')}
			</button>

			{#if showQr}
				<div
					class="mt-1.5 flex flex-col items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 p-3"
				>
					{#if qrDataUrl}
						<img src={qrDataUrl} alt="Scan to pay via UPI" class="h-40 w-40 rounded" />
					{:else}
						<div class="flex h-40 w-40 items-center justify-center text-xs text-gray-400">
							Generating…
						</div>
					{/if}
					<p class="text-center text-[11px] text-gray-500">{t(lang, 'scanWithUpi')}</p>
					<button
						type="button"
						onclick={copyUpiId}
						class="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
					>
						{UPI_VPA}
						{#if showCopiedToast}
							<Check class="h-3.5 w-3.5 text-green-600" />
						{:else}
							<Copy class="h-3.5 w-3.5 text-gray-500" />
						{/if}
					</button>
				</div>
			{/if}

			<div class="mt-2 border-t border-gray-100 pt-2">
				<p class="text-xs text-gray-500">
					{t(lang, 'paidAlreadyNotice')}
					<span class="font-medium text-gray-700">{t(lang, 'uploadToSpeedUp')}</span>
				</p>

				<div class="mt-1.5">
					{#if screenshotSubmitted}
						<div
							class="flex flex-col items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-3"
						>
							<ImageViewer
								src={screenshotPreviewUrl}
								alt="Payment screenshot"
								thumbnailSize="large"
								removeImage={removeScreenshot}
							/>
							<div class="min-w-0 text-center">
								<p class="truncate text-xs font-medium text-gray-900">{screenshotName}</p>
								<p class="text-xs text-green-700">{t(lang, 'screenshotSubmitted')}</p>
								<p class="mt-0.5 text-[11px] text-gray-400">
									{t(lang, 'closingIn')}
									{screenshotResetCountdown}s…
								</p>
							</div>
						</div>
					{:else if screenshotSelectedFile}
						<div
							class="flex flex-col items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-3"
						>
							<ImageViewer
								src={screenshotPreviewUrl}
								alt="Payment screenshot"
								thumbnailSize="large"
								removeImage={screenshotUploading ? undefined : removeScreenshot}
							/>
							<div class="min-w-0 text-center">
								<p class="truncate text-xs font-medium text-gray-900">{screenshotName}</p>
								<p class="text-xs text-gray-500">{t(lang, 'readyToSubmit')}</p>
							</div>
							<button
								type="button"
								onclick={submitScreenshot}
								disabled={screenshotUploading}
								class="flex w-full flex-shrink-0 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if screenshotUploading}
									<div
										class="h-3 w-3 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"
									></div>
									{t(lang, 'submitting')}
								{:else}
									{t(lang, 'submit')}
								{/if}
							</button>
						</div>
					{:else}
						<label
							for="screenshot-upload"
							class="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-2.5 text-xs text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
						>
							<Upload class="h-3.5 w-3.5" />
							{t(lang, 'uploadScreenshot')}
						</label>
						<input
							id="screenshot-upload"
							type="file"
							class="hidden"
							accept=".jpg,.jpeg,.png"
							onchange={handleScreenshotChange}
							bind:this={screenshotFile}
						/>
					{/if}
					{#if screenshotError}
						<p class="mt-1 text-xs text-red-600">{screenshotError}</p>
					{/if}
				</div>
			</div>
		{/if}

		{#if shell.isLoadingFamily}
			<div class="mt-2 flex items-center justify-center border-t border-gray-100 pt-2">
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"
				></div>
			</div>
		{:else if shell.familyMembers.length}
			<div class="mt-2 border-t border-gray-100 pt-2">
				<p class="mb-1.5 text-xs font-medium text-gray-500">{t(lang, 'familyMembers')}</p>
				<div class="space-y-1.5">
					{#each shell.familyMembers as m (m.id)}
						<button
							type="button"
							onclick={() =>
								goto(withLang(lang, `/me/payments${m.id === user._id ? '' : `?member=${m.id}`}`))}
							class="flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-100 px-2.5 py-2 text-left hover:bg-gray-50"
						>
							<div class="min-w-0">
								<p class="truncate text-xs font-medium text-gray-900">
									{formatMemberDisplay(m.name, m.member_id)}{m.id === user._id
										? ` (${t(lang, 'you')})`
										: ''}
								</p>
								{#if m.status !== 'active'}
									<span
										class="mt-0.5 inline-flex rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] text-yellow-800"
										>{m.status}</span
									>
								{/if}
							</div>
							<span class="flex flex-shrink-0 items-center gap-4">
								<span class={`text-xs font-medium ${familyDueLabel(m.outstanding_amount).color}`}
									>{familyDueLabel(m.outstanding_amount).text}</span
								>
								<span class="flex items-center gap-0.5 text-xs font-medium text-blue-600">
									{t(lang, 'view')}
									<ChevronRight class="h-3.5 w-3.5" />
								</span>
							</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</section>

	{#if showCopiedToast}
		<div
			transition:fade={{ duration: 150 }}
			class="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-xs font-medium text-white shadow-lg"
		>
			{t(lang, 'upiIdCopied')}
		</div>
	{/if}
{/if}
