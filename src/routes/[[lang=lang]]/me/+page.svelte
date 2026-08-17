<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { t, withLang } from '$lib/i18n';
	import { authStore } from '$lib/stores/authStore';
	import { requireMember } from '$lib/utilities/authGuard';
	import { formatMemberDisplay } from '$lib/utilities/memberId';
	import familiesApi from '$lib/endpoints/familiesApi';
	import paymentApi from '$lib/endpoints/paymentApi';
	import uploadApi from '$lib/endpoints/uploadApi';
	import {
		getCachedFamilyMe,
		setCachedFamilyMe,
		getCachedOutstanding,
		setCachedOutstanding
	} from '$lib/utilities/meCache';
	import { formatDate } from '$lib/utilities/helperFunc';
	import ImageViewer from '$lib/components/ui/ImageViewer.svelte';
	import Payments from '$lib/components/other/Payments.svelte';
	import type { Payment } from '$lib/types/payment';
	import type { Family } from '$lib/types/family';
	import { Upload, QrCode, ChevronRight, Copy, Check } from '@lucide/svelte';
	import QRCode from 'qrcode';
	import { fade } from 'svelte/transition';

	const lang = $derived(page.params.lang as 'guj' | undefined);

	let isAuthorized = $state(false);
	let familyMembers = $state<Family.MemberSummary[]>([]);
	let familyCount = $state<number | null>(null);
	let isLoadingFamily = $state(false);
	let paymentsData = $state<Payment.OutstandingData | null>(null);
	let isLoadingPayments = $state(false);
	let paymentsFetchedFor = $state('');
	let familyFetchedFor = $state('');

	$effect(() => {
		if (!$authStore.isLoading) {
			isAuthorized = requireMember(lang);
		}
	});

	const user = $derived($authStore.userAllInfo?.user);
	const displayName = $derived(user?.name || t(lang, 'member'));

	$effect(() => {
		const userId = user?._id;
		if (!userId || familyFetchedFor === userId) return;
		familyFetchedFor = userId;

		const cached = getCachedFamilyMe(userId);
		if (cached) {
			const members = cached.family?.members ?? [];
			familyCount = members.length >= 2 ? members.length : null;
			familyMembers = familyCount != null ? members : [];
			return;
		}

		isLoadingFamily = true;
		familiesApi
			.me()
			.then((res) => {
				setCachedFamilyMe(userId, res);
				const members = res.family?.members ?? [];
				familyCount = members.length >= 2 ? members.length : null;
				familyMembers = familyCount != null ? members : [];
			})
			.catch(() => {
				familyCount = null;
				familyMembers = [];
			})
			.finally(() => {
				isLoadingFamily = false;
			});
	});

	$effect(() => {
		const userId = user?._id;
		if (!userId || paymentsFetchedFor === userId) return;
		paymentsFetchedFor = userId;

		const cached = getCachedOutstanding(userId);
		if (cached) {
			paymentsData = cached.data;
			return;
		}

		isLoadingPayments = true;
		paymentApi
			.getOutstandingPaymentOfMember(userId)
			.then((res) => {
				setCachedOutstanding(userId, res);
				paymentsData = res.data;
			})
			.catch(() => {
				paymentsData = null;
			})
			.finally(() => {
				isLoadingPayments = false;
			});
	});
	const isHead = $derived(Boolean(user?.club_id) && familyCount != null && familyCount >= 2);

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

	const familyNetDue = $derived(
		familyMembers.reduce((sum, m) => sum + (m.outstanding_amount ?? 0), 0)
	);

	const amount = $derived(isHead ? familyNetDue : (user?.outstanding_amount ?? 0));
	const due = $derived(amountLabel(amount));

	// Amount the user will actually pay — defaults to the due amount but is
	// editable, since a member may want to pay a partial or extra amount.
	let payAmountInput = $state('');
	let payAmountTouched = $state(false);
	$effect(() => {
		if (!payAmountTouched && amount > 0) {
			payAmountInput = String(amount);
		}
	});
	function handlePayAmountInput(event: Event) {
		payAmountTouched = true;
		payAmountInput = (event.target as HTMLInputElement).value;
	}
	const payAmount = $derived(Math.max(0, Math.round(Number(payAmountInput) || 0)));

	const UPI_VPA = 'boim-202082680266@boi';
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

	const upiLink = $derived(
		payAmount > 0
			? 'upi://pay?' +
					new URLSearchParams({
						pa: UPI_VPA,
						pn: UPI_PAYEE_NAME,
						am: String(payAmount),
						cu: 'INR',
						tn: `Dues - ${formatMemberDisplay(displayName, user?.member_id)}`
					})
			: ''
	);

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
		QRCode.toDataURL(upiLink, { margin: 1, width: 220 })
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

{#if $authStore.isLoading}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<p class="text-sm text-gray-600">{t(lang, 'loading')}</p>
	</div>
{:else if isAuthorized && user}
	<div class="relative flex h-full flex-col bg-gray-50">
		<header class="flex-shrink-0 border-b border-gray-200 bg-white px-3 py-2.5">
			<div class="mx-auto flex max-w-3xl items-center justify-between">
				<div class="flex items-center gap-2">
					<div
						class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
					>
						{(user.first_name || '?').charAt(0).toUpperCase()}
					</div>
					<div>
						<p class="text-sm font-semibold text-gray-900">
							{formatMemberDisplay(displayName, user.member_id)}
						</p>
						{#if isHead}
							<span
								class="inline-flex rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
								>{t(lang, 'head')}</span
							>
						{/if}
					</div>
				</div>
				<button
					type="button"
					onclick={() => authStore.logout()}
					class="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
				>
					{t(lang, 'logOut')}
				</button>
			</div>
		</header>

		<main class="min-h-0 flex-1 overflow-y-auto p-3">
			<div class="mx-auto max-w-3xl space-y-2">
			<section class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
				<div class="flex items-baseline justify-between">
					<p class="text-xs font-medium text-gray-500">{t(lang, 'amountDue')}</p>
					<p class="text-xs text-gray-500">{due.sub}</p>
				</div>
				<p class={`mt-0.5 text-2xl font-bold ${due.color}`}>{due.value}</p>

				{#if amount > 0}
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
							aria-disabled={payAmount <= 0}
							class={`flex flex-shrink-0 items-center justify-center rounded-md px-4 py-1.5 text-sm font-semibold text-white ${
								payAmount > 0
									? 'bg-blue-600 hover:bg-blue-700'
									: 'pointer-events-none bg-gray-300'
							}`}
						>
							{t(lang, 'pay')} ₹{payAmount}
						</a>
					</div>

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
								<div class="flex flex-col items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-3">
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
											{t(lang, 'closingIn')} {screenshotResetCountdown}s…
										</p>
									</div>
								</div>
							{:else if screenshotSelectedFile}
								<div class="flex flex-col items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-3">
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

				{#if isLoadingFamily}
					<div class="mt-2 flex items-center justify-center border-t border-gray-100 pt-2">
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"
						></div>
					</div>
				{:else if isHead}
					<div class="mt-2 border-t border-gray-100 pt-2">
						<p class="mb-1.5 text-xs font-medium text-gray-500">{t(lang, 'familyMembers')}</p>
						<div class="space-y-1.5">
							{#each familyMembers as m (m.id)}
								<button
									type="button"
									onclick={() => goto(withLang(lang, `/me/family/${m.id}`))}
									class="flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-100 px-2.5 py-2 text-left hover:bg-gray-50"
								>
									<div class="min-w-0">
										<p class="truncate text-xs font-medium text-gray-900">
											{formatMemberDisplay(m.name, m.member_id)}{m.id === user._id
												? ` (${t(lang, 'you')})`
												: ''}
										</p>
										{#if m.status !== 'active'}
											<span class="mt-0.5 inline-flex rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] text-yellow-800"
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

			{#if !isHead}
				{#if isLoadingPayments}
					<div class="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
						<div
							class="h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
						></div>
					</div>
				{:else if paymentsData}
					<Payments
						outstandingTableData={paymentsData}
						memberName={displayName}
						memberId={user.member_id}
						readOnly={true}
						showSearch={false}
						{lang}
					/>
				{/if}

				<section class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
					<h2 class="mb-2 text-sm font-semibold text-gray-900">{t(lang, 'details')}</h2>
					<dl class="space-y-1.5 text-xs">
						{#if user.entry_date}
							<div class="flex justify-between gap-4">
								<dt class="text-gray-500">{t(lang, 'joined')}</dt>
								<dd class="font-medium text-gray-900">{formatDate(user.entry_date)}</dd>
							</div>
						{/if}
					</dl>
				</section>
			{/if}
			</div>
		</main>

		{#if showCopiedToast}
			<div
				transition:fade={{ duration: 150 }}
				class="pointer-events-none absolute bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-xs font-medium text-white shadow-lg"
			>
				{t(lang, 'upiIdCopied')}
			</div>
		{/if}
	</div>
{/if}
