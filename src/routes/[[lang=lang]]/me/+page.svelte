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
	import { Upload, ChevronRight } from '@lucide/svelte';
	import UpiAppPicker from '$lib/components/other/UpiAppPicker.svelte';

	const lang = $derived(page.params.lang as 'guj' | undefined);
	const shell = getMemberShellContext();

	const user = $derived($authStore.userAllInfo?.user);

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

	// Amount the user will pay — always the family's total due; editing
	// happens on the dedicated per-app page after picking a UPI app.
	const payAmount = $derived(Math.max(0, Math.round(familyTotalDue)));

	let showAppPicker = $state(false);

	function handlePayClick() {
		if (payAmount <= 0) return;
		showAppPicker = true;
	}

	function selectApp(appKey: string) {
		showAppPicker = false;
		goto(withLang(lang, `/me/pay/${appKey}?amount=${payAmount}`));
	}

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
		<div class="flex items-center justify-between gap-2">
			<div>
				<div class="flex items-baseline gap-2">
					<p class="text-xs font-medium text-gray-500">{amountHeading}</p>
					<p class="text-xs text-gray-500">{due.sub}</p>
				</div>
				<p class={`mt-0.5 text-2xl font-bold ${due.color}`}>{due.value}</p>
			</div>

			{#if familyTotalDue > 0}
				<button
					type="button"
					onclick={handlePayClick}
					class="flex flex-shrink-0 items-center justify-center rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
				>
					{t(lang, 'pay')}
				</button>
			{/if}
		</div>

		{#if familyTotalDue > 0 && showAppPicker}
			<UpiAppPicker {lang} onselect={selectApp} onclose={() => (showAppPicker = false)} />
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

	{#if familyTotalDue > 0}
		<section class="rounded-lg border border-blue-200 bg-blue-50/50 p-3 shadow-sm">
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
					<Upload class="h-4 w-4 text-blue-700" />
				</div>
				<div class="min-w-0">
					<h2 class="text-sm font-semibold text-gray-900">{t(lang, 'uploadScreenshotHeading')}</h2>
					<p class="text-[11px] text-gray-600">{t(lang, 'paidAlreadyNotice')}</p>
				</div>
			</div>

			<div class="mt-2.5">
				{#if screenshotSubmitted}
					<div
						class="flex flex-col items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-3"
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
						class="flex flex-col items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-3"
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
						class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-blue-300 bg-white px-3 py-3 text-sm font-semibold text-blue-700 transition-colors hover:border-blue-500 hover:bg-blue-50"
					>
						<Upload class="h-4 w-4" />
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
		</section>
	{/if}
{/if}
