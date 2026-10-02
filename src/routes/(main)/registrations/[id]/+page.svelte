<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import ImageViewer from '$lib/components/ui/ImageViewer.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import registrationApi from '$lib/endpoints/registrationApi';
	import type { Registration } from '$lib/types/registration';
	import { formatDate } from '$lib/utilities/helperFunc';
	import {
		formatRupees,
		fullAddress,
		fullName,
		genderLabel,
		gotraLabel,
		idDocTypeLabel,
		maritalStatusLabel,
		parseRegistrationError,
		registrationStatusLabel,
		registrationStatusPill,
		relationLabel
	} from '$lib/utilities/registrationUtils';
	import { Check, Copy, FileText, Send, X } from '@lucide/svelte';

	const registrationId = $derived(page.params.id as string);
	const returnTo = $derived((page.state as any)?.returnTo || '/registrations');

	let detail = $state<Registration.AdminDetail | null>(null);
	let referrals = $state<Partial<Record<Registration.Status, number>> | null>(null);
	let isLoading = $state(true);
	let loadError = $state('');

	let actionLoading = $state(false);
	let actionError = $state('');
	let notice = $state<{ tone: 'success' | 'warning'; text: string } | null>(null);
	let resentLink = $state('');
	let linkCopied = $state(false);

	let showApprove = $state(false);
	let showReject = $state(false);
	let rejectReason = $state('');

	let lastLoadedId: string | null = null;
	$effect(() => {
		const id = registrationId;
		if (!id || id === lastLoadedId) return;
		lastLoadedId = id;
		load(id);
	});

	async function load(id: string) {
		loadError = '';
		try {
			const res = await registrationApi.adminDetail({ id });
			detail = res.data;
		} catch (err) {
			loadError = parseRegistrationError(err, 'Could not load the application.');
			return;
		} finally {
			isLoading = false;
		}
		if (detail?.referrer) {
			try {
				referrals = (await registrationApi.adminReferrer({ id })).data.referrals;
			} catch {
				referrals = null;
			}
		}
	}

	const name = $derived(detail ? fullName(detail.applicant) : '');
	const canDecide = $derived(detail?.status === 'in-review');
	const canReject = $derived(
		detail?.status === 'in-review' ||
			detail?.status === 'draft' ||
			detail?.status === 'payment_pending'
	);
	const canResend = $derived(detail?.status === 'draft' || detail?.status === 'payment_pending');

	async function approve() {
		if (!detail) return;
		actionLoading = true;
		actionError = '';
		resentLink = '';
		try {
			const res = await registrationApi.approve({ id: detail.id });
			notice = res.emailed
				? { tone: 'success', text: `Approved. Member ID ${res.data.member_id} has been emailed.` }
				: {
						tone: 'warning',
						text: `Approved as ${res.data.member_id}, but the email could not be sent. Please pass the member ID on.`
					};
			showApprove = false;
		} catch (err) {
			actionError = parseRegistrationError(err, 'Could not approve this application.');
		} finally {
			actionLoading = false;
		}
		await load(detail.id);
	}

	async function reject() {
		if (!detail || !rejectReason.trim()) return;
		actionLoading = true;
		actionError = '';
		resentLink = '';
		try {
			const res = await registrationApi.reject({ id: detail.id, reason: rejectReason.trim() });
			notice = res.emailed
				? { tone: 'success', text: 'Rejected. The applicant has been emailed the reason.' }
				: { tone: 'warning', text: 'Rejected, but the email could not be sent.' };
			showReject = false;
			rejectReason = '';
		} catch (err) {
			actionError = parseRegistrationError(err, 'Could not reject this application.');
		} finally {
			actionLoading = false;
		}
		await load(detail.id);
	}

	async function resendLink() {
		if (!detail) return;
		actionLoading = true;
		actionError = '';
		try {
			const res = await registrationApi.resendLink({ id: detail.id });
			notice = { tone: 'success', text: res.message };
			resentLink = res.link;
		} catch (err) {
			actionError = parseRegistrationError(err, 'Could not send the link.');
			await load(detail.id);
		} finally {
			actionLoading = false;
		}
	}

	async function copyResentLink() {
		try {
			await navigator.clipboard.writeText(resentLink);
			linkCopied = true;
			setTimeout(() => (linkCopied = false), 1500);
		} catch {}
	}

	function adminLabel(ref: Registration.AdminRef): string {
		return ref?.name || ref?.username || 'an admin';
	}

	const applicantFields = $derived(
		detail
			? [
					{ label: 'Date of birth', value: formatDate(detail.applicant.date_of_birth) },
					{ label: 'Gender', value: genderLabel(detail.applicant.gender) },
					{ label: 'Mobile', value: detail.applicant.mobile || '-' },
					{
						label: 'Email',
						value: `${detail.applicant.email}${detail.applicant.email_verified_at ? '' : ' (not verified)'}`
					},
					{ label: 'Marital status', value: maritalStatusLabel(detail.applicant.marital_status) },
					{ label: 'Gotra', value: gotraLabel(detail.applicant.gotra) },
					{ label: 'Native place', value: detail.applicant.native_place || '-' },
					{ label: 'Address', value: fullAddress(detail.applicant.address) || '-' },
					{ label: 'Document type', value: idDocTypeLabel(detail.docs.id_doc_type) }
				]
			: []
	);

	const documents = $derived(
		detail
			? [
					{ label: 'Photo', url: detail.docs.photo_url },
					{ label: 'ID document', url: detail.docs.id_doc_url },
					...(detail.fitness_certificate_required || detail.docs.fitness_certificate_url
						? [
								{
									label: 'Fitness certificate',
									url: detail.docs.fitness_certificate_url ?? null
								}
							]
						: [])
				]
			: []
	);

	const nominees = $derived(
		detail ? [detail.nominee, detail.nominee_2].filter((n): n is Registration.Nominee => !!n) : []
	);
</script>

{#snippet docTile(label: string, url: string | null)}
	<div>
		<p class="mb-1 text-sm font-medium text-gray-500">{label}</p>
		{#if url && /\.pdf(\?|$)/i.test(url)}
			<a
				href={url}
				target="_blank"
				rel="noopener"
				class="flex h-32 w-32 flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
			>
				<FileText class="h-8 w-8" />
				<span class="text-xs font-medium">PDF</span>
			</a>
		{:else if url}
			<ImageViewer src={url} alt={label} thumbnailSize="large" />
		{:else}
			<div
				class="flex h-32 w-32 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400"
			>
				Not uploaded
			</div>
		{/if}
	</div>
{/snippet}

<div class="mx-auto flex h-full w-full max-w-5xl flex-col">
	{#if isLoading}
		<div class="flex h-full items-center justify-center">
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-2 text-sm text-gray-600">Loading application...</p>
			</div>
		</div>
	{:else if loadError || !detail}
		<div class="flex h-full flex-col items-center justify-center">
			<h3 class="text-sm font-medium text-gray-900">{loadError || 'Application not found'}</h3>
			<div class="mt-4">
				<Button variant="secondary" size="sm" onclick={() => goto(returnTo)}
					>Back to registrations</Button
				>
			</div>
		</div>
	{:else}
		<div class="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
			<div class="border-b border-gray-200 py-2">
				<div class="flex flex-wrap items-center gap-1.5">
					<span class={registrationStatusPill(detail.status)}
						>{registrationStatusLabel(detail.status)}</span
					>
					<div class="ml-auto flex items-center gap-1.5">
						{#if canResend}
							<Button variant="secondary" size="sm" onclick={resendLink} disabled={actionLoading}>
								<span class="flex items-center gap-1.5">
									<Send class="h-3.5 w-3.5" />
									<span>{actionLoading ? 'Sending...' : 'Resend link'}</span>
								</span>
							</Button>
						{/if}
						{#if canReject}
							<Button
								variant="danger"
								size="sm"
								onclick={() => {
									actionError = '';
									showReject = true;
								}}
								disabled={actionLoading}
							>
								<span class="flex items-center gap-1.5">
									<X class="h-3.5 w-3.5" />
									<span>Reject</span>
								</span>
							</Button>
						{/if}
						{#if canDecide}
							<Button
								variant="success"
								size="sm"
								onclick={() => {
									actionError = '';
									showApprove = true;
								}}
								disabled={actionLoading}
							>
								<span class="flex items-center gap-1.5">
									<Check class="h-3.5 w-3.5" />
									<span>Approve</span>
								</span>
							</Button>
						{/if}
					</div>
				</div>
				<h1 class="mt-1 text-base font-semibold break-words text-gray-900">{name}</h1>
				<p class="mt-0.5 text-xs text-gray-500">
					Applied {formatDate(detail.created_at)} · updated {formatDate(detail.updated_at)}
				</p>
			</div>

			{#if notice}
				<div
					class="rounded-md border px-2.5 py-1.5 text-xs {notice.tone === 'success'
						? 'border-green-200 bg-green-50 text-green-700'
						: 'border-amber-200 bg-amber-50 text-amber-800'}"
				>
					<p>{notice.text}</p>
					{#if resentLink}
						<div class="mt-1 flex items-center gap-1.5">
							<span class="min-w-0 flex-1 truncate font-mono">{resentLink}</span>
							<button
								type="button"
								onclick={copyResentLink}
								class="rounded p-1 hover:bg-green-100"
								title="Copy link"
								aria-label="Copy link"
							>
								{#if linkCopied}<Check class="h-3.5 w-3.5" />{:else}<Copy
										class="h-3.5 w-3.5"
									/>{/if}
							</button>
						</div>
					{/if}
				</div>
			{/if}
			{#if actionError && !showApprove && !showReject}
				<p class="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
					{actionError}
				</p>
			{/if}

			{#if detail.decision.approved_at}
				<p
					class="rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs text-green-700"
				>
					Approved by {adminLabel(detail.decision.approved_by)} on {formatDate(
						detail.decision.approved_at
					)}{#if detail.created_user}
						· member ID <span class="font-semibold">{detail.created_user.member_id}</span>{/if}
				</p>
			{:else if detail.decision.rejected_at}
				<p class="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
					Rejected by {adminLabel(detail.decision.rejected_by)} on {formatDate(
						detail.decision.rejected_at
					)}{#if detail.decision.reject_reason}
						— {detail.decision.reject_reason}{/if}
				</p>
			{/if}

			<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
				<div class="space-y-3">
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<div class="mb-3 border-b pb-2">
							<h2 class="text-xl font-semibold text-gray-800">Applicant</h2>
						</div>
						<dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							{#each applicantFields as field (field.label)}
								<div class="min-w-0 {field.label === 'Address' ? 'sm:col-span-2' : ''}">
									<dt class="mb-1 text-sm font-medium text-gray-500">{field.label}</dt>
									<dd class="text-base break-words text-gray-900">{field.value}</dd>
								</div>
							{/each}
						</dl>
						<div class="mt-3 flex flex-wrap gap-4">
							{#each documents as doc (doc.label)}
								{@render docTile(doc.label, doc.url)}
							{/each}
						</div>
					</div>

					{#each nominees as nominee, i (i)}
						<div class="rounded-lg bg-white p-4 shadow-sm">
							<div class="mb-3 border-b pb-2">
								<h2 class="text-xl font-semibold text-gray-800">Nominee {i + 1}</h2>
							</div>
							<dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
								{#each [{ label: 'Name', value: nominee.full_name || '-' }, { label: 'Relation', value: relationLabel(nominee.relation) }, { label: 'Mobile', value: nominee.mobile || '-' }, { label: 'Date of birth', value: formatDate(nominee.date_of_birth) }, { label: 'Document type', value: idDocTypeLabel(nominee.id_doc_type) }] as field (field.label)}
									<div class="min-w-0">
										<dt class="mb-1 text-sm font-medium text-gray-500">{field.label}</dt>
										<dd class="text-base break-words text-gray-900">{field.value}</dd>
									</div>
								{/each}
							</dl>
							<div class="mt-3 flex flex-wrap gap-4">
								{@render docTile('Photo', nominee.photo_url)}
								{@render docTile('ID document', nominee.id_doc_url)}
							</div>
						</div>
					{/each}
				</div>

				<div class="space-y-3">
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<div class="mb-3 border-b pb-2">
							<h2 class="text-xl font-semibold text-gray-800">Fees</h2>
						</div>
						<div class="space-y-1 text-sm text-gray-800">
							<div class="flex justify-between">
								<span
									>Entry fee{detail.fees.age_at_payment
										? ` (age ${detail.fees.age_at_payment})`
										: ''}</span
								>
								<span>{formatRupees(detail.fees.entrance_fee)}</span>
							</div>
							<div class="flex justify-between">
								<span>Deposit</span><span>{formatRupees(detail.fees.deposit)}</span>
							</div>
							<div class="flex justify-between">
								<span>Corpus fund</span><span>{formatRupees(detail.fees.corpus_fund)}</span>
							</div>
							<div class="flex justify-between border-t border-gray-200 pt-1 font-semibold">
								<span>Total</span><span>{formatRupees(detail.fees.total_amount)}</span>
							</div>
							<p class="pt-1 text-xs text-gray-500">
								{detail.fees.paid_at ? `Paid ${formatDate(detail.fees.paid_at)}` : 'Not paid yet'}
							</p>
						</div>
						{#if detail.order}
							<div class="mt-2 space-y-0.5 border-t border-gray-200 pt-2 text-xs text-gray-600">
								<p>Order {detail.order.razorpay_order_id} · {detail.order.status}</p>
								{#if detail.order.razorpay_payment_id}
									<p>
										Payment {detail.order.razorpay_payment_id}{detail.order.payment_method
											? ` · ${detail.order.payment_method}`
											: ''}
									</p>
								{/if}
								{#if detail.order.settlement_error}
									<p class="text-red-600">{detail.order.settlement_error}</p>
								{/if}
							</div>
						{/if}
					</div>

					<div class="rounded-lg bg-white p-4 shadow-sm">
						<div class="mb-3 border-b pb-2">
							<h2 class="text-xl font-semibold text-gray-800">Invited by</h2>
						</div>
						{#if detail.referrer}
							<p class="text-base text-gray-900">
								{fullName(detail.referrer)}
								{#if detail.referrer.member_id}
									<span class="text-sm text-gray-500">({detail.referrer.member_id})</span>
								{/if}
							</p>
							{#if detail.referrer.mobile}
								<p class="text-sm text-gray-600">{detail.referrer.mobile}</p>
							{/if}
							{#if referrals && Object.keys(referrals).length}
								<p class="mt-2 text-xs text-gray-500">
									Has invited:
									{Object.entries(referrals)
										.map(
											([status, count]) =>
												`${count} ${registrationStatusLabel(status as Registration.Status).toLowerCase()}`
										)
										.join(' · ')}
								</p>
							{/if}
						{:else}
							<p class="text-sm text-gray-500">-</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<Modal open={showApprove} onClose={() => (showApprove = false)} title="Approve application">
	<p class="text-sm text-gray-700">
		Approve <span class="font-medium">{name}</span>? This creates the member, issues the next member
		ID and emails it to them.
	</p>
	{#if actionError}
		<p class="mt-2 text-xs text-red-600">{actionError}</p>
	{/if}
	<div class="mt-3 flex justify-end gap-2">
		<Button variant="secondary" size="sm" onclick={() => (showApprove = false)}>Cancel</Button>
		<Button variant="success" size="sm" onclick={approve} disabled={actionLoading}>
			{actionLoading ? 'Approving...' : 'Approve'}
		</Button>
	</div>
</Modal>

<Modal open={showReject} onClose={() => (showReject = false)} title="Reject application">
	<label for="rejectReason" class="mb-1 block text-sm text-gray-700">
		Reason <span class="text-red-500">*</span>
		<span class="text-xs text-gray-500">— emailed to the applicant as written</span>
	</label>
	<textarea
		id="rejectReason"
		bind:value={rejectReason}
		rows="4"
		placeholder="e.g. The Aadhaar photo was too blurred to read."
		class="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm"
	></textarea>
	{#if actionError}
		<p class="mt-2 text-xs text-red-600">{actionError}</p>
	{/if}
	<div class="mt-3 flex justify-end gap-2">
		<Button variant="secondary" size="sm" onclick={() => (showReject = false)}>Cancel</Button>
		<Button
			variant="danger"
			size="sm"
			onclick={reject}
			disabled={actionLoading || !rejectReason.trim()}
		>
			{actionLoading ? 'Rejecting...' : 'Reject'}
		</Button>
	</div>
</Modal>
