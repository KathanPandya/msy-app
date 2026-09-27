<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import ImageViewer from '$lib/components/ui/ImageViewer.svelte';
	import { t, withLang, type Lang } from '$lib/i18n';
	import { APP_CONSTANTS } from '$lib/constants/app-constants';
	import registrationApi from '$lib/endpoints/registrationApi';
	import termsApi from '$lib/endpoints/termsApi';
	import type { Terms } from '$lib/types/terms';
	import type { Registration } from '$lib/types/registration';
	import { runRegistrationPayment } from '$lib/utilities/registrationCheckout';
	import {
		MAX_AGE,
		MIN_AGE,
		clearRegistrationToken,
		estimateQuote,
		formatRupees,
		fullAddress,
		fullName,
		genderLabel,
		getRegistrationToken,
		gotraLabel,
		idDocTypeLabel,
		maritalStatusLabel,
		parseRegistrationError,
		relationLabel,
		saveRegistrationToken
	} from '$lib/utilities/registrationUtils';
	import { formatDate } from '$lib/utilities/helperFunc';
	import { CheckCircle2, Clock, Plus, Upload, XCircle } from '@lucide/svelte';

	let {
		lang,
		mode,
		code = '',
		resumeToken = ''
	}: {
		lang: Lang | undefined;
		mode: 'invite' | 'resume';
		code?: string;
		resumeToken?: string;
	} = $props();

	type Stage =
		| 'checking'
		| 'invalid'
		| 'closed'
		| 'identity'
		| 'otp'
		| 'details'
		| 'review'
		| 'done';
	type DoneKind = 'submitted' | 'processing' | 'needs_review' | 'approved' | 'rejected';

	let stage = $state<Stage>('checking');
	let doneKind = $state<DoneKind>('submitted');
	let token = $state('');
	let isLoading = $state(false);
	let errors = $state<Record<string, string>>({});
	let notice = $state('');

	let firstName = $state('');
	let middleName = $state('');
	let surname = $state('');
	let dob = $state('');
	let email = $state('');

	let emailMasked = $state('');
	let otpCode = $state('');
	let otpForm = $state<HTMLFormElement>();
	let resendCooldown = $state(0);
	let resendBlocked = $state(false);
	let changingEmail = $state(false);
	let newEmail = $state('');

	let gender = $state('');
	let mobile = $state('');
	let maritalStatus = $state('');
	let gotra = $state('');
	let nativePlace = $state('');
	let addressLine1 = $state('');
	let addressLine2 = $state('');
	let landmark = $state('');
	let areaName = $state('');
	let city = $state('');
	let stateName = $state('');
	let pincode = $state('');
	type NomineeForm = { fullName: string; relation: string; mobile: string; dob: string };
	type IdDocUpload = 'id_doc' | 'nominee_id_doc' | 'nominee_2_id_doc';

	const NOMINEE_KEYS = ['nominee', 'nominee_2'] as const;
	const isIdDoc = (type: Registration.UploadType): type is IdDocUpload =>
		type === 'id_doc' || type === 'nominee_id_doc' || type === 'nominee_2_id_doc';
	const emptyNominee = (): NomineeForm => ({ fullName: '', relation: '', mobile: '', dob: '' });
	const emptyUploads = (): Record<Registration.UploadType, string | null> => ({
		id_doc: null,
		photo: null,
		fitness_certificate: null,
		nominee_id_doc: null,
		nominee_photo: null,
		nominee_2_id_doc: null,
		nominee_2_photo: null
	});
	const emptyDocTypes = (): Record<IdDocUpload, string> => ({
		id_doc: '',
		nominee_id_doc: '',
		nominee_2_id_doc: ''
	});

	let nominees = $state<NomineeForm[]>([emptyNominee()]);
	let uploads = $state(emptyUploads());
	let localPreviews = $state(emptyUploads());
	let docTypes = $state(emptyDocTypes());
	let uploadedDocTypes = $state(emptyDocTypes());
	let fitnessRequired = $state(false);
	let uploading = $state<Registration.UploadType | null>(null);
	let saveState = $state<'idle' | 'saving' | 'saved'>('idle');
	let missing = $state<string[]>([]);

	let serverQuote = $state<Registration.Quote | null>(null);
	let isPaying = $state(false);
	let isVerifying = $state(false);
	let paymentAttempted = $state(false);
	let terms = $state<Terms.Current | null>(null);
	let termsState = $state<'loading' | 'ready' | 'none' | 'error'>('loading');
	let termsAccepted = $state<Registration.TermsAcceptance | null>(null);
	let isAccepting = $state(false);

	const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
	const maxDob = new Date().toLocaleDateString('en-CA');

	const estimate = $derived(estimateQuote(dob));
	const dobMessage = $derived.by(() => {
		if (!dob) return '';
		if (estimate.age === null) return t(lang, 'regInvalidDob');
		if (estimate.age < MIN_AGE) return t(lang, 'regAgeTooLow').replace('{age}', String(MIN_AGE));
		if (estimate.age > MAX_AGE)
			return t(lang, 'regAgeTooHigh').replace('{age}', String(MAX_AGE + 1));
		return '';
	});

	const canStart = $derived(
		!!firstName.trim() &&
			!!middleName.trim() &&
			!!surname.trim() &&
			estimate.eligible &&
			!!email.trim()
	);

	const mobileError = $derived(mobile && !/^\d{10}$/.test(mobile) ? t(lang, 'regErrMobile') : '');
	const pincodeError = $derived(
		pincode && !/^\d{6}$/.test(pincode) ? t(lang, 'regErrPincode') : ''
	);

	function idDocReady(type: IdDocUpload) {
		return !!uploads[type] && !!docTypes[type] && docTypes[type] === uploadedDocTypes[type];
	}

	function nomineeComplete(i: number) {
		const n = nominees[i];
		const key = NOMINEE_KEYS[i];
		return (
			!!n.fullName.trim() &&
			!!n.relation &&
			/^\d{10}$/.test(n.mobile) &&
			!!n.dob &&
			idDocReady(`${key}_id_doc`) &&
			!!uploads[`${key}_photo`]
		);
	}

	const detailsComplete = $derived(
		!!gender &&
			/^\d{10}$/.test(mobile) &&
			!!maritalStatus &&
			!!gotra &&
			!!nativePlace.trim() &&
			!!addressLine1.trim() &&
			!!city.trim() &&
			!!stateName.trim() &&
			/^\d{6}$/.test(pincode) &&
			idDocReady('id_doc') &&
			!!uploads.photo &&
			(!fitnessRequired || !!uploads.fitness_certificate) &&
			nominees.every((_, i) => nomineeComplete(i))
	);

	const stepNumber = $derived(
		({ identity: 1, otp: 1, details: 2, review: 3 } as Partial<Record<Stage, number>>)[stage]
	);

	const langSwitchHref = $derived(
		lang === 'guj' ? page.url.pathname.replace(/^\/guj/, '') || '/' : `/guj${page.url.pathname}`
	);
	const langSwitchLabel = $derived(
		lang === 'guj' ? 'Use website in English' : 'વેબસાઇટ ગુજરાતીમાં વાપરો'
	);

	function clearMessages() {
		errors = {};
		notice = '';
	}

	function detailsPayload(): Registration.Update {
		return {
			gender: (gender || undefined) as Registration.Gender | undefined,
			mobile: mobile.trim(),
			marital_status: maritalStatus || undefined,
			gotra: gotra || undefined,
			native_place: nativePlace.trim(),
			address: {
				address_line_1: addressLine1.trim(),
				address_line_2: addressLine2.trim(),
				landmark: landmark.trim(),
				area_name: areaName.trim(),
				city: city.trim(),
				state: stateName.trim(),
				pincode: pincode.trim()
			},
			...Object.fromEntries(nominees.map((n, i) => [NOMINEE_KEYS[i], nomineePayload(n)]))
		};
	}

	function nomineePayload(n: NomineeForm): Registration.NomineeInput {
		return {
			full_name: n.fullName.trim(),
			...(n.relation ? { relation: n.relation } : {}),
			mobile: n.mobile.trim(),
			...(n.dob ? { date_of_birth: n.dob } : {})
		};
	}

	function nomineeFrom(n: Registration.Nominee | null | undefined): NomineeForm {
		return {
			fullName: n?.full_name ?? '',
			relation: n?.relation ?? '',
			mobile: n?.mobile ?? '',
			dob: n?.date_of_birth ? n.date_of_birth.slice(0, 10) : ''
		};
	}

	let lastSavedJson = '';

	function uploadsFrom(reg: Registration.Data): Record<Registration.UploadType, string | null> {
		return {
			id_doc: reg.docs?.id_doc_url ?? null,
			photo: reg.docs?.photo_url ?? null,
			fitness_certificate: reg.docs?.fitness_certificate_url ?? null,
			nominee_id_doc: reg.nominee?.id_doc_url ?? null,
			nominee_photo: reg.nominee?.photo_url ?? null,
			nominee_2_id_doc: reg.nominee_2?.id_doc_url ?? null,
			nominee_2_photo: reg.nominee_2?.photo_url ?? null
		};
	}

	function docTypesFrom(reg: Registration.Data): Record<IdDocUpload, string> {
		return {
			id_doc: reg.docs?.id_doc_type ?? '',
			nominee_id_doc: reg.nominee?.id_doc_type ?? '',
			nominee_2_id_doc: reg.nominee_2?.id_doc_type ?? ''
		};
	}

	function applyUploads(reg: Registration.Data) {
		uploads = uploadsFrom(reg);
		uploadedDocTypes = docTypesFrom(reg);
	}

	function fillFrom(reg: Registration.Data) {
		firstName = reg.first_name ?? '';
		middleName = reg.middle_name ?? '';
		surname = reg.surname ?? '';
		dob = reg.date_of_birth ? reg.date_of_birth.slice(0, 10) : '';
		email = reg.email ?? '';
		gender = reg.gender ?? '';
		mobile = reg.mobile ?? '';
		maritalStatus = reg.marital_status ?? '';
		gotra = reg.gotra ?? '';
		nativePlace = reg.native_place ?? '';
		addressLine1 = reg.address?.address_line_1 ?? '';
		addressLine2 = reg.address?.address_line_2 ?? '';
		landmark = reg.address?.landmark ?? '';
		areaName = reg.address?.area_name ?? '';
		city = reg.address?.city ?? '';
		stateName = reg.address?.state ?? '';
		pincode = reg.address?.pincode ?? '';
		nominees = reg.nominee_2
			? [nomineeFrom(reg.nominee), nomineeFrom(reg.nominee_2)]
			: [nomineeFrom(reg.nominee)];
		applyUploads(reg);
		docTypes = docTypesFrom(reg);
		fitnessRequired = !!reg.fitness_certificate_required;
		termsAccepted = reg.terms_accepted ?? null;
		lastSavedJson = JSON.stringify(detailsPayload());
	}

	function finish(kind: DoneKind) {
		doneKind = kind;
		clearRegistrationToken();
		stage = 'done';
	}

	async function openApplication(saved: string): Promise<boolean> {
		try {
			const { registration } = await registrationApi.me({ token: saved });
			token = saved;
			saveRegistrationToken(saved);
			fillFrom(registration);
			if (registration.status === 'in-review') {
				finish('submitted');
			} else if (registration.status === 'approved' || registration.status === 'rejected') {
				finish(registration.status);
			} else if (!registration.email_verified) {
				emailMasked = registration.email;
				stage = 'otp';
			} else {
				stage = 'details';
			}
			return true;
		} catch (err: any) {
			if (err?.response?.status === 410) {
				finish(err.response.data?.status === 'rejected' ? 'rejected' : 'approved');
				return true;
			}
			return false;
		}
	}

	async function refresh() {
		isLoading = true;
		const ok = await openApplication(token);
		isLoading = false;
		if (!ok) stage = 'closed';
	}

	onMount(async () => {
		if (mode === 'resume') {
			const saved = resumeToken || getRegistrationToken();
			if (!saved || !(await openApplication(saved))) stage = 'closed';
			return;
		}

		try {
			await registrationApi.checkReferral({ code });
		} catch {
			stage = 'invalid';
			return;
		}

		const saved = getRegistrationToken();
		if (saved && (await openApplication(saved))) return;
		clearRegistrationToken();
		stage = 'identity';
	});

	$effect(() => {
		if (resendCooldown <= 0) return;
		const timer = setTimeout(() => resendCooldown--, 1000);
		return () => clearTimeout(timer);
	});

	async function handleStart(event: Event) {
		event.preventDefault();
		if (!canStart || isLoading) return;
		clearMessages();
		isLoading = true;
		try {
			const data = await registrationApi.start({
				payload: {
					code,
					first_name: firstName.trim(),
					middle_name: middleName.trim(),
					surname: surname.trim(),
					date_of_birth: dob,
					email: email.trim()
				}
			});
			token = data.token;
			saveRegistrationToken(data.token);
			emailMasked = data.email_masked;
			otpCode = '';
			resendCooldown = 60;
			notice = t(lang, 'regCodeSentTo').replace('{email}', data.email_masked);
			stage = 'otp';
		} catch (err: any) {
			if (err?.response?.status === 403) {
				stage = 'invalid';
				return;
			}
			const message = parseRegistrationError(err, t(lang, 'errSomethingWrong'));
			const field = /email/i.test(message) ? 'email' : /age|birth/i.test(message) ? 'dob' : '_form';
			errors = { [field]: message };
		} finally {
			isLoading = false;
		}
	}

	function handleOtpInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		otpCode = target.value.replace(/\D/g, '').slice(0, 6);
		target.value = otpCode;
		if (otpCode.length === 6 && !isLoading) otpForm?.requestSubmit();
	}

	async function handleVerifyOtp(event: Event) {
		event.preventDefault();
		if (isLoading) return;
		clearMessages();
		if (!/^\d{6}$/.test(otpCode)) {
			errors = { otp: t(lang, 'errCodeSixDigits') };
			return;
		}
		isLoading = true;
		try {
			const data = await registrationApi.verifyOtp({ token, code: otpCode });
			fillFrom(data.registration);
			stage = 'details';
		} catch (err: any) {
			if (err?.response?.status === 404) {
				stage = 'closed';
				return;
			}
			const message = parseRegistrationError(err, t(lang, 'errSomethingWrong'));
			const left = err?.response?.data?.left;
			errors = {
				otp:
					typeof left === 'number'
						? `${message} ${t(lang, 'regAttemptsLeft').replace('{left}', String(left))}`
						: message
			};
			otpCode = '';
		} finally {
			isLoading = false;
		}
	}

	async function handleResend() {
		clearMessages();
		isLoading = true;
		try {
			const data = await registrationApi.resendOtp({ token });
			emailMasked = data.email_masked;
			otpCode = '';
			resendCooldown = 60;
			notice = t(lang, 'regNewCodeSentTo').replace('{email}', data.email_masked);
		} catch (err: any) {
			const data = err?.response?.data;
			if (err?.response?.status === 429 && data?.waitSeconds) {
				resendCooldown = Number(data.waitSeconds);
			} else {
				if (err?.response?.status === 429) resendBlocked = true;
				errors = { otp: parseRegistrationError(err, t(lang, 'errSomethingWrong')) };
			}
		} finally {
			isLoading = false;
		}
	}

	async function handleChangeEmail(event: Event) {
		event.preventDefault();
		if (isLoading || !newEmail.trim()) return;
		clearMessages();
		isLoading = true;
		try {
			const data = await registrationApi.changeEmail({ token, email: newEmail.trim() });
			email = newEmail.trim();
			emailMasked = data.email_masked;
			newEmail = '';
			changingEmail = false;
			otpCode = '';
			resendCooldown = 60;
			resendBlocked = false;
			notice = t(lang, 'regNewCodeSentTo').replace('{email}', data.email_masked);
		} catch (err: any) {
			errors = { newEmail: parseRegistrationError(err, t(lang, 'errSomethingWrong')) };
		} finally {
			isLoading = false;
		}
	}

	let saveSeq = 0;

	async function saveDetails(field = '_form') {
		if (!token || stage !== 'details') return;
		const payload = detailsPayload();
		const json = JSON.stringify(payload);
		if (json === lastSavedJson) return;

		const seq = ++saveSeq;
		saveState = 'saving';
		try {
			await registrationApi.update({ token, payload });
			lastSavedJson = json;
			const { [field]: _, ...rest } = errors;
			errors = rest;
			if (seq === saveSeq) saveState = 'saved';
		} catch (err: any) {
			if (seq === saveSeq) saveState = 'idle';
			const status = err?.response?.status;
			if (status === 403 || status === 409) return refresh();
			errors = { ...errors, [field]: parseRegistrationError(err, t(lang, 'errSomethingWrong')) };
		}
	}

	async function handleUpload(event: Event, type: Registration.UploadType) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		const { [type]: _, ...rest } = errors;
		errors = rest;
		if (file.size > MAX_UPLOAD_BYTES) {
			errors = { ...errors, [type]: t(lang, 'regErrFileTooLarge') };
			return;
		}

		const docType = isIdDoc(type) ? (docTypes[type] as Registration.IdDocType) : undefined;
		const preview = URL.createObjectURL(file);
		localPreviews = { ...localPreviews, [type]: preview };
		uploading = type;
		try {
			const data = await registrationApi.uploadDoc({ token, type, docType, file });
			applyUploads(data.registration);
		} catch (err: any) {
			const status = err?.response?.status;
			if (status === 403 || status === 409) return refresh();
			errors = { ...errors, [type]: parseRegistrationError(err, t(lang, 'regErrUploadFailed')) };
		} finally {
			uploading = null;
			localPreviews = { ...localPreviews, [type]: null };
			URL.revokeObjectURL(preview);
		}
	}

	function addSecondNominee() {
		nominees = [...nominees, emptyNominee()];
		saveDetails('nominee_2');
	}

	async function removeSecondNominee() {
		const { nominee_2: _, ...rest } = errors;
		errors = rest;
		saveState = 'saving';
		try {
			const { registration } = await registrationApi.update({
				token,
				payload: { nominee_2: null }
			});
			nominees = [nominees[0]];
			applyUploads(registration);
			docTypes = { ...docTypes, nominee_2_id_doc: '' };
			lastSavedJson = JSON.stringify(detailsPayload());
			saveState = 'saved';
		} catch (err: any) {
			saveState = 'idle';
			const status = err?.response?.status;
			if (status === 403 || status === 409) return refresh();
			errors = { ...errors, nominee_2: parseRegistrationError(err, t(lang, 'errSomethingWrong')) };
		}
	}

	async function handleDetailsContinue(event: Event) {
		event.preventDefault();
		if (!detailsComplete || isLoading) return;
		errors = {};
		missing = [];
		isLoading = true;
		try {
			await saveDetails();
			const data = await registrationApi.review({ token });
			fillFrom(data.registration);
			const blocking = data.missing.filter((m) => !/terms/i.test(m));
			if (!data.can_pay && blocking.length) {
				missing = blocking;
				return;
			}
			serverQuote = data.registration.quote;
			paymentAttempted = false;
			stage = 'review';
			window.scrollTo?.(0, 0);
			loadTerms();
		} catch (err: any) {
			const status = err?.response?.status;
			if (status === 403 || status === 409) return refresh();
			errors = { _form: parseRegistrationError(err, t(lang, 'errSomethingWrong')) };
		} finally {
			isLoading = false;
		}
	}

	async function loadTerms() {
		termsState = 'loading';
		try {
			terms = (await termsApi.current()).terms;
			termsState = 'ready';
		} catch (err: any) {
			termsState = err?.response?.status === 404 ? 'none' : 'error';
		}
	}

	async function acceptTerms(event: Event) {
		const box = event.currentTarget as HTMLInputElement;
		if (!box.checked || !terms || termsAccepted || isAccepting) return;
		const { terms: _, ...rest } = errors;
		errors = rest;
		isAccepting = true;
		try {
			const { registration } = await registrationApi.acceptTerms({
				token,
				version: terms.version,
				language: lang === 'guj' ? 'guj' : 'en'
			});
			termsAccepted = registration.terms_accepted;
		} catch (err: any) {
			box.checked = false;
			const status = err?.response?.status;
			if (status === 403) return refresh();
			errors = { ...errors, terms: parseRegistrationError(err, t(lang, 'errSomethingWrong')) };
			if (status === 409) await loadTerms();
		} finally {
			isAccepting = false;
		}
	}

	async function handlePay() {
		if (isPaying) return;
		clearMessages();
		isPaying = true;
		try {
			const result = await runRegistrationPayment({
				token,
				onVerifying: () => (isVerifying = true)
			});
			switch (result.kind) {
				case 'submitted':
				case 'processing':
				case 'needs_review':
					finish(result.kind);
					break;
				case 'cancelled':
					paymentAttempted = true;
					notice = t(lang, 'regPaymentCancelled');
					break;
				case 'failed':
					paymentAttempted = true;
					errors = {
						_form: t(lang, 'paymentFailed').replace('{reason}', result.reason.replace(/\.$/, ''))
					};
					break;
				case 'createFailed':
					if (result.status === 409 || result.status === 403) await refresh();
					else errors = { _form: result.message };
					break;
			}
		} finally {
			isPaying = false;
			isVerifying = false;
		}
	}

	function backToForm() {
		clearMessages();
		stage = 'details';
	}

	const reviewRows = $derived([
		{
			label: t(lang, 'regName'),
			value: fullName({ first_name: firstName, middle_name: middleName, surname })
		},
		{ label: t(lang, 'dateOfBirth'), value: formatDate(dob) },
		{ label: t(lang, 'email'), value: email },
		{ label: t(lang, 'gender'), value: genderLabel(gender) },
		{ label: t(lang, 'mobile'), value: mobile },
		{ label: t(lang, 'maritalStatus'), value: maritalStatusLabel(maritalStatus) },
		{ label: t(lang, 'gotra'), value: gotraLabel(gotra) },
		{ label: t(lang, 'nativePlace'), value: nativePlace },
		{
			label: t(lang, 'address'),
			value: fullAddress({
				address_line_1: addressLine1,
				address_line_2: addressLine2,
				landmark,
				area_name: areaName,
				city,
				state: stateName,
				pincode
			})
		},
		{ label: t(lang, 'regIdDocType'), value: idDocTypeLabel(docTypes.id_doc) }
	]);

	const reviewNominees = $derived(
		nominees.map((n, i) => ({
			title: t(lang, 'regNomineeN').replace('{n}', String(i + 1)),
			key: NOMINEE_KEYS[i],
			rows: [
				{ label: t(lang, 'regName'), value: n.fullName },
				{ label: t(lang, 'relation'), value: relationLabel(n.relation) },
				{ label: t(lang, 'mobile'), value: n.mobile },
				{ label: t(lang, 'dateOfBirth'), value: formatDate(n.dob) },
				{
					label: t(lang, 'regIdDocType'),
					value: idDocTypeLabel(docTypes[`${NOMINEE_KEYS[i]}_id_doc`])
				}
			]
		}))
	);

	const memberFiles = $derived<{ type: Registration.UploadType; label: string }[]>([
		{ type: 'photo', label: t(lang, 'regYourPhoto') },
		{ type: 'id_doc', label: t(lang, 'regIdDocument') },
		...(fitnessRequired
			? [{ type: 'fitness_certificate' as const, label: t(lang, 'regFitnessCertificate') }]
			: [])
	]);
</script>

{#snippet primaryButton(label: string, disabled: boolean, onclick?: () => void)}
	<button
		type={onclick ? 'button' : 'submit'}
		{onclick}
		{disabled}
		class="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
	>
		{label}
	</button>
{/snippet}

{#snippet formError()}
	{#if errors._form}
		<p class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
			{errors._form}
		</p>
	{/if}
{/snippet}

{#snippet sectionHeading(title: string, hint?: string)}
	<div class="border-b border-gray-200 pb-1.5">
		<h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
			<span class="h-3.5 w-1 rounded-full bg-blue-600"></span>
			{title}
		</h2>
		{#if hint}<p class="mt-0.5 pl-3 text-xs text-gray-500">{hint}</p>{/if}
	</div>
{/snippet}

{#snippet fileField(type: Registration.UploadType, label: string)}
	{@const src = localPreviews[type] ?? uploads[type]}
	{@const needsDocType = isIdDoc(type)}
	{@const docTypeMissing = needsDocType && !docTypes[type as IdDocUpload]}
	{@const staleDocType =
		needsDocType &&
		!!uploads[type] &&
		!!docTypes[type as IdDocUpload] &&
		docTypes[type as IdDocUpload] !== uploadedDocTypes[type as IdDocUpload]}
	<div>
		<p class="mb-1 block text-sm font-medium text-gray-700">
			{label} <span class="text-red-500">*</span>
		</p>
		{#if src}
			<div class="flex items-center gap-3">
				<div class="relative">
					<ImageViewer {src} alt={label} thumbnailSize="large" />
					{#if uploading === type}
						<div class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
							<div
								class="h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"
							></div>
						</div>
					{/if}
				</div>
				<div class="min-w-0 space-y-1">
					{#if uploading === type}
						<p class="text-xs text-gray-500">{t(lang, 'regUploading')}</p>
					{:else}
						{#if staleDocType}
							<p class="text-xs text-amber-700">{t(lang, 'regReuploadForType')}</p>
						{:else}
							<p class="flex items-center gap-1 text-xs text-green-700">
								<CheckCircle2 class="h-3.5 w-3.5" />
								{t(lang, 'regUploaded')}
							</p>
						{/if}
						<label
							for={`file-${type}`}
							class="inline-block cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800"
						>
							{t(lang, needsDocType ? 'regChangeDocument' : 'regChangePhoto')}
						</label>
					{/if}
				</div>
			</div>
		{:else}
			<label
				for={`file-${type}`}
				class="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed px-3 py-3 text-sm font-semibold transition-colors {docTypeMissing
					? 'cursor-not-allowed border-gray-200 text-gray-400'
					: 'cursor-pointer border-blue-300 bg-white text-blue-700 hover:border-blue-500 hover:bg-blue-50'}"
			>
				<Upload class="h-4 w-4" />
				{t(lang, needsDocType ? 'regUploadDocument' : 'regUploadPhoto')}
			</label>
			{#if docTypeMissing}
				<p class="mt-1 text-xs text-gray-500">{t(lang, 'regChooseDocTypeFirst')}</p>
			{/if}
		{/if}
		<!-- No `capture`, as decided: one button, the phone offers camera or gallery. -->
		<input
			id={`file-${type}`}
			type="file"
			accept="image/*"
			class="hidden"
			disabled={uploading !== null || docTypeMissing}
			onchange={(e) => handleUpload(e, type)}
		/>
		{#if errors[type]}
			<p class="mt-1 text-sm text-red-600">{errors[type]}</p>
		{/if}
	</div>
{/snippet}

{#snippet docTypeSelect(type: IdDocUpload)}
	<Select
		id={`doctype-${type}`}
		label={t(lang, 'regIdDocType')}
		bind:value={docTypes[type]}
		options={APP_CONSTANTS.ID_DOCUMENT_TYPES}
		required
	/>
{/snippet}

{#snippet nomineeSection(i: number)}
	{@const key = NOMINEE_KEYS[i]}
	<section class="space-y-3">
		<div class="flex items-end justify-between gap-2 border-b border-gray-200 pb-1.5">
			<h2 class="flex items-center gap-2 text-sm font-semibold text-gray-900">
				<span class="h-3.5 w-1 rounded-full bg-blue-600"></span>
				{t(lang, 'regNomineeN').replace('{n}', String(i + 1))}
			</h2>
			{#if i === 1}
				<button
					type="button"
					onclick={removeSecondNominee}
					class="text-sm font-medium text-red-600 hover:text-red-800"
				>
					{t(lang, 'regRemove')}
				</button>
			{/if}
		</div>
		{@render fileField(`${key}_photo`, t(lang, 'regPhoto'))}
		<Input
			id={`${key}-name`}
			label={t(lang, 'regName')}
			bind:value={nominees[i].fullName}
			error={errors[`${key}.fullName`]}
			onblur={() => saveDetails(`${key}.fullName`)}
			required
		/>
		<Select
			id={`${key}-relation`}
			label={t(lang, 'relation')}
			bind:value={nominees[i].relation}
			options={APP_CONSTANTS.NOMINEE_RELATIONS}
			error={errors[`${key}.relation`]}
			onchange={() => saveDetails(`${key}.relation`)}
			required
		/>
		<Input
			id={`${key}-mobile`}
			label={t(lang, 'mobile')}
			type="tel"
			inputmode="numeric"
			maxlength={10}
			bind:value={nominees[i].mobile}
			error={(nominees[i].mobile && !/^\d{10}$/.test(nominees[i].mobile)
				? t(lang, 'regErrMobile')
				: '') || errors[`${key}.mobile`]}
			onblur={() => saveDetails(`${key}.mobile`)}
			required
		/>
		<div>
			<label for={`${key}-dob`} class="mb-1 block text-sm font-medium text-gray-700">
				{t(lang, 'dateOfBirth')} <span class="text-red-500">*</span>
			</label>
			<input
				id={`${key}-dob`}
				type="date"
				bind:value={nominees[i].dob}
				max={maxDob}
				onchange={() => saveDetails(`${key}.dob`)}
				required
				class="h-11 w-full rounded-md border bg-white px-3 py-0 text-base text-gray-900 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none sm:h-10 sm:text-sm {errors[
					`${key}.dob`
				]
					? 'border-red-500'
					: 'border-gray-300'}"
			/>
			{#if errors[`${key}.dob`]}
				<p class="mt-1 text-sm text-red-600">{errors[`${key}.dob`]}</p>
			{/if}
		</div>
		{@render docTypeSelect(`${key}_id_doc`)}
		{@render fileField(`${key}_id_doc`, t(lang, 'regIdDocument'))}
		{#if errors[key]}
			<p class="text-sm text-red-600">{errors[key]}</p>
		{/if}
	</section>
{/snippet}

{#snippet reviewFiles(files: { type: Registration.UploadType; label: string }[])}
	<div class="flex gap-3">
		{#each files as file (file.type)}
			{#if uploads[file.type]}
				<div class="text-center">
					<ImageViewer src={uploads[file.type] ?? ''} alt={file.label} thumbnailSize="small" />
					<p class="mt-1 w-16 truncate text-[11px] text-gray-500">{file.label}</p>
				</div>
			{/if}
		{/each}
	</div>
{/snippet}

{#snippet feeBox(q: Registration.Quote)}
	<div class="space-y-1 text-sm text-gray-700">
		<div class="flex justify-between">
			<span>{t(lang, 'regEntryFee')}</span><span>{formatRupees(q.entrance_fee)}</span>
		</div>
		<div class="flex justify-between">
			<span>{t(lang, 'regDeposit')}</span><span>{formatRupees(q.deposit)}</span>
		</div>
		<div class="flex justify-between">
			<span>{t(lang, 'regCorpusFund')}</span><span>{formatRupees(q.corpus_fund)}</span>
		</div>
		<div class="flex justify-between border-t border-gray-200 pt-1.5 font-semibold text-gray-900">
			<span>{t(lang, 'total')}</span><span>{formatRupees(q.total_amount)}</span>
		</div>
	</div>
{/snippet}

<div class="relative min-h-full bg-white px-4 pt-16 pb-8">
	<header
		class="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-1.5 sm:px-6"
	>
		<a href={withLang(lang, '/')} class="flex min-w-0 items-center gap-1">
			<img
				src="/logos/02_Website_Logo/website-logo-symbol-512.webp"
				alt=""
				class="h-8 w-8 flex-shrink-0"
			/>
			<div class="min-w-0 leading-tight">
				<p class="text-sm font-medium text-[#2f9fb3]">
					<b class="text-lg">M</b>rutyu <b class="text-lg">S</b>ahay
					<b class="-mr-0.5 text-lg">Y</b>ojana
				</p>
			</div>
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
		<div class="mb-6 text-center">
			<img
				src="/logos/02_Website_Logo/website-logo-symbol-512.webp"
				alt="MSY"
				class="mx-auto mb-3 h-14 w-14"
			/>
			<h1 class="text-2xl font-bold text-gray-900">{t(lang, 'regTitle')}</h1>
			{#if stepNumber}
				<p class="mt-2 text-sm text-gray-600">
					{t(lang, 'regStepOf').replace('{step}', String(stepNumber))}
				</p>
			{/if}
		</div>

		{#if notice}
			<div class="mb-4 rounded-md border border-green-200 bg-green-50 p-3">
				<p class="text-sm text-green-800">{notice}</p>
			</div>
		{/if}

		{#if stage === 'checking'}
			<div class="py-6 text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-2 text-sm text-gray-600">{t(lang, 'loading')}</p>
			</div>
		{:else if stage === 'invalid' || stage === 'closed'}
			<div class="text-center">
				<XCircle class="mx-auto mb-3 h-10 w-10 text-red-500" />
				<p class="text-sm font-medium text-gray-900">
					{t(lang, stage === 'invalid' ? 'regInvalidLink' : 'regLinkClosed')}
				</p>
				<p class="mt-1 text-sm text-gray-500">
					{t(lang, stage === 'invalid' ? 'regInvalidLinkHint' : 'regLinkClosedHint')}
				</p>
			</div>
		{:else if stage === 'identity'}
			<form onsubmit={handleStart} class="space-y-4">
				<Input id="firstName" label={t(lang, 'firstName')} bind:value={firstName} required />
				<Input id="middleName" label={t(lang, 'middleName')} bind:value={middleName} required />
				<Input id="surname" label={t(lang, 'surname')} bind:value={surname} required />

				<div>
					<label for="dob" class="mb-1 block text-sm font-medium text-gray-700">
						{t(lang, 'dateOfBirth')} <span class="text-red-500">*</span>
					</label>
					<input
						id="dob"
						type="date"
						bind:value={dob}
						max={maxDob}
						required
						class="h-11 w-full rounded-md border px-3 py-0 text-base text-gray-900 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none sm:h-10 sm:text-sm {dobMessage ||
						errors.dob
							? 'border-red-500'
							: 'border-gray-300'} bg-white"
					/>
					{#if dobMessage || errors.dob}
						<p class="mt-1 text-sm text-red-600">{dobMessage || errors.dob}</p>
					{:else if estimate.eligible}
						<div class="mt-2">
							<p class="mb-1 text-sm font-medium text-gray-900">
								{t(lang, 'regFeeForAge')
									.replace('{age}', String(estimate.age))
									.replace('{amount}', formatRupees(estimate.total_amount))}
							</p>
							{@render feeBox(estimate)}
							{#if estimate.requires_fitness_certificate}
								<p class="mt-2 text-sm text-amber-700">{t(lang, 'regFitnessWarning')}</p>
							{/if}
						</div>
					{/if}
				</div>

				<div>
					<Input
						id="email"
						label={t(lang, 'email')}
						type="email"
						inputmode="email"
						bind:value={email}
						error={errors.email}
						required
					/>
					{#if !errors.email}
						<p class="mt-1 text-xs text-gray-500">{t(lang, 'regEmailCodeHint')}</p>
					{/if}
				</div>

				{@render formError()}
				{@render primaryButton(
					isLoading ? t(lang, 'pleaseWait') : t(lang, 'regVerifyEmail'),
					!canStart || isLoading
				)}
			</form>
		{:else if stage === 'otp'}
			{#if changingEmail}
				<form onsubmit={handleChangeEmail} class="space-y-4">
					<p class="text-sm text-gray-600">{t(lang, 'regEnterCorrectEmail')}</p>
					<Input
						id="newEmail"
						label={t(lang, 'email')}
						type="email"
						inputmode="email"
						bind:value={newEmail}
						error={errors.newEmail}
						required
					/>
					{@render primaryButton(
						isLoading ? t(lang, 'sending') : t(lang, 'regSendCode'),
						isLoading || !newEmail.trim()
					)}
					<button
						type="button"
						onclick={() => {
							changingEmail = false;
							newEmail = '';
							clearMessages();
						}}
						class="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-800"
					>
						{t(lang, 'regBack')}
					</button>
				</form>
			{:else}
				<form bind:this={otpForm} onsubmit={handleVerifyOtp} class="space-y-4">
					<p class="text-sm text-gray-600">
						{t(lang, 'regEnterCodeSentTo')} <strong>{emailMasked}</strong>
					</p>
					<div>
						<label for="otpCode" class="mb-1 block text-sm font-medium text-gray-700">
							{t(lang, 'sixDigitCode')}
							<span class="text-red-500">*</span>
						</label>
						<input
							id="otpCode"
							type="text"
							inputmode="numeric"
							autocomplete="one-time-code"
							maxlength={6}
							value={otpCode}
							oninput={handleOtpInput}
							required
							class="h-11 w-full rounded-md border bg-white px-3 py-0 text-base tracking-widest text-gray-900 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none sm:h-10 sm:text-sm {errors.otp
								? 'border-red-500'
								: 'border-gray-300'}"
						/>
						{#if errors.otp}
							<p class="mt-1 text-sm text-red-600">{errors.otp}</p>
						{/if}
					</div>
					{@render primaryButton(
						isLoading ? t(lang, 'pleaseWait') : t(lang, 'regConfirmCode'),
						isLoading || otpCode.length !== 6
					)}
					<div class="flex items-center">
						{#if !resendBlocked}
							<button
								type="button"
								onclick={handleResend}
								disabled={isLoading || resendCooldown > 0}
								class="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
							>
								{resendCooldown > 0
									? t(lang, 'resendCodeInSeconds').replace('{seconds}', String(resendCooldown))
									: t(lang, 'resendCode')}
							</button>
						{/if}
						<button
							type="button"
							onclick={() => {
								changingEmail = true;
								clearMessages();
							}}
							class="ml-auto text-sm font-medium text-blue-600 hover:text-blue-800"
						>
							{t(lang, 'regWrongEmail')}
						</button>
					</div>
					<p class="text-center text-xs text-gray-500">{t(lang, 'regResumeNotice')}</p>
				</form>
			{/if}
		{:else if stage === 'details'}
			<form onsubmit={handleDetailsContinue} class="space-y-7">
				<div class="flex items-center justify-between text-xs">
					<span class="flex items-center gap-1 text-green-700">
						<CheckCircle2 class="h-3.5 w-3.5" />
						{t(lang, 'regEmailConfirmed')}
					</span>
					{#if saveState === 'saving'}
						<span class="text-gray-400">{t(lang, 'regSaving')}</span>
					{:else if saveState === 'saved'}
						<span class="text-gray-400">{t(lang, 'regSaved')}</span>
					{/if}
				</div>

				<section class="space-y-3">
					{@render sectionHeading(t(lang, 'regYourDetails'))}
					{@render fileField('photo', t(lang, 'regYourPhoto'))}
					<Select
						id="gender"
						label={t(lang, 'gender')}
						bind:value={gender}
						options={APP_CONSTANTS.GENDERS}
						error={errors.gender}
						onchange={() => saveDetails('gender')}
						required
					/>
					<Input
						id="mobile"
						label={t(lang, 'mobile')}
						type="tel"
						inputmode="numeric"
						maxlength={10}
						bind:value={mobile}
						error={mobileError || errors.mobile}
						onblur={() => saveDetails('mobile')}
						required
					/>
				</section>

				<section class="space-y-3">
					{@render sectionHeading(t(lang, 'regFamilyDetails'))}
					<Select
						id="maritalStatus"
						label={t(lang, 'maritalStatus')}
						bind:value={maritalStatus}
						options={APP_CONSTANTS.MARITAL_STATUS}
						error={errors.maritalStatus}
						onchange={() => saveDetails('maritalStatus')}
						required
					/>
					<Select
						id="gotra"
						label={t(lang, 'gotra')}
						bind:value={gotra}
						options={APP_CONSTANTS.GOTRAS}
						error={errors.gotra}
						onchange={() => saveDetails('gotra')}
						required
					/>
					<Input
						id="nativePlace"
						label={t(lang, 'nativePlace')}
						bind:value={nativePlace}
						error={errors.nativePlace}
						onblur={() => saveDetails('nativePlace')}
						required
					/>
				</section>

				<section class="space-y-3">
					{@render sectionHeading(t(lang, 'address'))}
					<Input
						id="addressLine1"
						label={t(lang, 'addressLine1')}
						bind:value={addressLine1}
						error={errors.addressLine1}
						onblur={() => saveDetails('addressLine1')}
						required
					/>
					<Input
						id="addressLine2"
						label={t(lang, 'addressLine2')}
						bind:value={addressLine2}
						error={errors.addressLine2}
						onblur={() => saveDetails('addressLine2')}
					/>
					<div class="grid grid-cols-2 gap-3">
						<Input
							id="landmark"
							label={t(lang, 'landmark')}
							bind:value={landmark}
							error={errors.landmark}
							onblur={() => saveDetails('landmark')}
						/>
						<Input
							id="areaName"
							label={t(lang, 'areaName')}
							bind:value={areaName}
							error={errors.areaName}
							onblur={() => saveDetails('areaName')}
						/>
						<Input
							id="city"
							label={t(lang, 'city')}
							bind:value={city}
							error={errors.city}
							onblur={() => saveDetails('city')}
							required
						/>
						<Input
							id="state"
							label={t(lang, 'state')}
							bind:value={stateName}
							error={errors.state}
							onblur={() => saveDetails('state')}
							required
						/>
					</div>
					<Input
						id="pincode"
						label={t(lang, 'pincode')}
						inputmode="numeric"
						maxlength={6}
						bind:value={pincode}
						error={pincodeError || errors.pincode}
						onblur={() => saveDetails('pincode')}
						required
					/>
				</section>

				<section class="space-y-3">
					{@render sectionHeading(t(lang, 'regDocuments'), t(lang, 'regPhotoHint'))}
					{@render docTypeSelect('id_doc')}
					{@render fileField('id_doc', t(lang, 'regIdDocument'))}
					{#if fitnessRequired}
						<p class="text-xs text-amber-700">{t(lang, 'regFitnessHint')}</p>
						{@render fileField('fitness_certificate', t(lang, 'regFitnessCertificate'))}
					{/if}
				</section>

				{#each nominees as _, i (i)}
					{@render nomineeSection(i)}
				{/each}

				{#if nominees.length === 1}
					<button
						type="button"
						onclick={addSecondNominee}
						class="flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						<Plus class="h-4 w-4" />
						{t(lang, 'regAddSecondNominee')}
					</button>
				{/if}

				<div class="space-y-3">
					{#if missing.length}
						<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
							<p class="font-medium">{t(lang, 'regStillMissing')}</p>
							<p class="mt-0.5">{missing.join(', ')}</p>
						</div>
					{/if}
					{@render formError()}
					{@render primaryButton(
						isLoading ? t(lang, 'pleaseWait') : t(lang, 'regContinue'),
						!detailsComplete || isLoading || uploading !== null
					)}
					{#if !detailsComplete}
						<p class="text-center text-xs text-gray-500">{t(lang, 'regFillEverything')}</p>
					{/if}
				</div>
			</form>
		{:else if stage === 'review'}
			<div class="space-y-4">
				<div>
					<h2 class="text-sm font-semibold text-gray-900">{t(lang, 'regReviewTitle')}</h2>
					<p class="mt-0.5 text-xs text-gray-500">{t(lang, 'regReviewHint')}</p>
				</div>

				<dl class="divide-y divide-gray-100 text-sm">
					{#each reviewRows as row (row.label)}
						<div class="flex gap-3 py-2">
							<dt class="w-28 shrink-0 text-gray-500">{row.label}</dt>
							<dd class="min-w-0 break-words text-gray-900">{row.value || '-'}</dd>
						</div>
					{/each}
				</dl>

				{@render reviewFiles(memberFiles)}

				{#each reviewNominees as nominee (nominee.key)}
					<div class="space-y-2">
						<h3 class="text-sm font-semibold text-gray-900">{nominee.title}</h3>
						<dl class="divide-y divide-gray-100 text-sm">
							{#each nominee.rows as row (row.label)}
								<div class="flex gap-3 py-2">
									<dt class="w-28 shrink-0 text-gray-500">{row.label}</dt>
									<dd class="min-w-0 break-words text-gray-900">{row.value || '-'}</dd>
								</div>
							{/each}
						</dl>
						{@render reviewFiles([
							{ type: `${nominee.key}_photo`, label: t(lang, 'regPhoto') },
							{ type: `${nominee.key}_id_doc`, label: t(lang, 'regIdDocument') }
						])}
					</div>
				{/each}

				{#if serverQuote}
					{@render feeBox(serverQuote)}
				{/if}

				<section class="space-y-3">
					{@render sectionHeading(t(lang, 'regTermsTitle'))}
					{#if termsState === 'loading'}
						<p class="text-sm text-gray-500">{t(lang, 'loading')}</p>
					{:else if termsState === 'none'}
						<p class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
							{t(lang, 'regTermsNone')}
						</p>
					{:else if termsState === 'error'}
						<p class="text-sm text-red-600">
							{t(lang, 'regTermsLoadFailed')}
							<button
								type="button"
								onclick={loadTerms}
								class="font-medium text-blue-600 hover:text-blue-800"
								>{t(lang, 'regTryAgain')}</button
							>
						</p>
					{:else if terms}
						<!-- Both languages in one fixed-height scroll box, as decided: the terms are long. -->
						<div
							class="max-h-72 space-y-3 overflow-y-auto overscroll-contain rounded-md border border-gray-200 p-3 text-sm text-gray-700"
						>
							<div>
								<p class="mb-1 text-xs font-semibold text-gray-500">English</p>
								<p class="whitespace-pre-wrap">{terms.body_en}</p>
							</div>
							<div class="border-t border-gray-200 pt-3">
								<p class="mb-1 text-xs font-semibold text-gray-500">ગુજરાતી</p>
								<p class="whitespace-pre-wrap">{terms.body_guj}</p>
							</div>
						</div>
						<label class="flex items-start gap-2 text-sm text-gray-900">
							<input
								type="checkbox"
								checked={!!termsAccepted}
								disabled={!!termsAccepted || isAccepting}
								onchange={acceptTerms}
								class="mt-0.5 size-5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:size-4"
							/>
							<span>{isAccepting ? t(lang, 'pleaseWait') : t(lang, 'regTermsAccept')}</span>
						</label>
					{/if}
					{#if errors.terms}
						<p class="text-sm text-red-600">{errors.terms}</p>
					{/if}
				</section>

				{@render formError()}
				{@render primaryButton(
					isVerifying
						? t(lang, 'verifyingPayment')
						: isPaying
							? t(lang, 'pleaseWait')
							: paymentAttempted
								? t(lang, 'regRetryPayment')
								: t(lang, 'regPayAmount').replace(
										'{amount}',
										formatRupees(serverQuote?.total_amount)
									),
					isPaying || !serverQuote || !termsAccepted,
					handlePay
				)}
				<button
					type="button"
					onclick={backToForm}
					disabled={isPaying}
					class="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
				>
					{t(lang, 'regBackToForm')}
				</button>
			</div>
		{:else if stage === 'done'}
			<div class="text-center">
				{#if doneKind === 'rejected'}
					<XCircle class="mx-auto mb-3 h-10 w-10 text-red-500" />
				{:else if doneKind === 'processing' || doneKind === 'needs_review'}
					<Clock class="mx-auto mb-3 h-10 w-10 text-amber-500" />
				{:else}
					<CheckCircle2 class="mx-auto mb-3 h-10 w-10 text-green-600" />
				{/if}
				<p class="text-base font-semibold text-gray-900">
					{t(
						lang,
						doneKind === 'approved'
							? 'regApprovedTitle'
							: doneKind === 'rejected'
								? 'regRejectedTitle'
								: 'regSubmittedTitle'
					)}
				</p>
				<p class="mt-1 text-sm text-gray-600">
					{t(
						lang,
						doneKind === 'processing'
							? 'regDoneProcessing'
							: doneKind === 'needs_review'
								? 'regDoneNeedsReview'
								: doneKind === 'approved'
									? 'regDoneApproved'
									: doneKind === 'rejected'
										? 'regDoneRejected'
										: 'regDoneSubmitted'
					)}
				</p>
			</div>
		{/if}
	</div>
</div>
