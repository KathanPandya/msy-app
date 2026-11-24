<script lang="ts">
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import { t, withLang, type Lang } from '$lib/i18n';
	import type { DictKey } from '$lib/i18n/translations';
	import optionApi from '$lib/endpoints/optionApi';
	import type { Option } from '$lib/types/option';
	import type { EventRegistration } from '$lib/types/eventRegistration';
	import { runEventRegistrationPayment } from '$lib/utilities/eventRegistrationCheckout';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { CalendarDays, CheckCircle2, MapPin, Plus } from '@lucide/svelte';
	import { isRegistrationHost } from '$lib/constants/event';
	import EventAd from '$lib/components/event/EventAd.svelte';

	const onRegistrationHost = isRegistrationHost();

	type Person = {
		firstName: string;
		middleName: string;
		lastName: string;
		dobDay: string;
		dobMonth: string;
		dobYear: string;
		relation: string;
		profession: string;
		ownMobile: boolean | null;
		mobile: string;
		whatsappSame: boolean;
		whatsapp: string;
		ownEmail: boolean | null;
		email: string;
		sameAddress: boolean;
		address: string;
		city: string;
		pincode: string;
		sameGotra: boolean;
		gotra: string;
		sameVatan: boolean;
		vatan: string;
	};
	type Field =
		| 'firstName'
		| 'middleName'
		| 'lastName'
		| 'dob'
		| 'relation'
		| 'profession'
		| 'ownMobile'
		| 'mobile'
		| 'whatsapp'
		| 'ownEmail'
		| 'email'
		| 'address'
		| 'city'
		| 'pincode'
		| 'gotra'
		| 'vatan';
	type Stage = 'landing' | 'head' | 'family' | 'member' | 'review' | 'paying' | 'done';

	const DRAFT_KEY = 'msy-family-registration-draft-v3';
	const FREE_UP_TO_AGE = 10;
	const FEE_PER_MEMBER = 100;

	const MONTHS = {
		en: [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December'
		],
		guj: [
			'જાન્યુઆરી',
			'ફેબ્રુઆરી',
			'માર્ચ',
			'એપ્રિલ',
			'મે',
			'જૂન',
			'જુલાઈ',
			'ઓગસ્ટ',
			'સપ્ટેમ્બર',
			'ઓક્ટોબર',
			'નવેમ્બર',
			'ડિસેમ્બર'
		]
	};
	const thisYear = new Date().getFullYear();

	const HEAD_STEPS: { title: DictKey; fields: Field[] }[] = [
		{ title: 'frStepAbout', fields: ['firstName', 'middleName', 'lastName', 'dob', 'profession'] },
		{ title: 'frStepContact', fields: ['mobile', 'whatsapp', 'email'] },
		{ title: 'frStepRoots', fields: ['address', 'city', 'pincode', 'gotra', 'vatan'] }
	];

	const emptyPerson = (isHead: boolean): Person => ({
		firstName: '',
		middleName: '',
		lastName: '',
		dobDay: '',
		dobMonth: '',
		dobYear: '',
		relation: isHead ? 'self' : '',
		profession: '',
		ownMobile: isHead ? true : null,
		mobile: '',
		whatsappSame: true,
		whatsapp: '',
		ownEmail: isHead ? true : null,
		email: '',
		sameAddress: !isHead,
		address: '',
		city: '',
		pincode: '',
		sameGotra: !isHead,
		gotra: '',
		sameVatan: !isHead,
		vatan: ''
	});

	const lang = $derived(page.params.lang as Lang | undefined);
	const L = $derived(lang === 'guj' ? 'guj' : 'en');
	const langSwitchHref = $derived(
		lang === 'guj' ? page.url.pathname.replace(/^\/guj/, '') || '/' : `/guj${page.url.pathname}`
	);
	const langSwitchLabel = $derived(
		lang === 'guj' ? 'Use website in English' : 'વેબસાઇટ ગુજરાતીમાં વાપરો'
	);

	const dayOptions = $derived([
		{ key: '', label: t(lang, 'frDay') },
		...Array.from({ length: 31 }, (_, i) => ({ key: String(i + 1), label: String(i + 1) }))
	]);
	const monthOptions = $derived([
		{ key: '', label: t(lang, 'frMonth') },
		...MONTHS[L].map((m, i) => ({ key: String(i + 1), label: m }))
	]);
	const yearOptions = $derived([
		{ key: '', label: t(lang, 'frYear') },
		...Array.from({ length: 101 }, (_, i) => ({
			key: String(thisYear - i),
			label: String(thisYear - i)
		}))
	]);
	let options = $state<Record<string, Option.Item[]>>({});
	let optionsError = $state('');
	const selectOptions = (list: string) => [
		{ key: '', label: t(lang, 'frSelect') },
		...(options[list] ?? []).map((o) => ({
			key: o.key,
			label: L === 'guj' ? o.label_guj : o.label_en
		}))
	];
	const gotraOptions = $derived(selectOptions('gotra'));
	const professionOptions = $derived(selectOptions('profession'));
	const relationOptions = $derived(selectOptions('relation'));
	const optionLabel = (list: string, key: string) => {
		const o = options[list]?.find((x) => x.key === key);
		return o ? (L === 'guj' ? o.label_guj : o.label_en) : '';
	};

	let stage = $state<Stage>('landing');
	let step = $state(0);
	let head = $state<Person>(emptyPerson(true));
	let members = $state<Person[]>([]);
	let draft = $state<Person>(emptyPerson(false));
	let editIndex = $state<number | null>(null);
	let returnTo = $state<'family' | 'review'>('family');
	let errors = $state<Partial<Record<Field, string>>>({});
	let formError = $state('');
	let token = $state<string | null>(null);
	let isPaying = $state(false);
	let restored = false;

	const headFirstName = $derived(head.firstName.trim() || t(lang, 'frYouTag'));
	const draftFirstName = $derived(draft.firstName.trim() || t(lang, 'frThisMember'));

	onMount(async () => {
		try {
			const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
			if (saved?.head) {
				head = saved.head;
				members = saved.members ?? [];
				stage = saved.stage === 'head' ? 'head' : 'family';
				step = saved.step ?? 0;
				token = saved.token ?? null;
			}
		} catch {}
		restored = true;

		try {
			options = (await optionApi.list({ lists: ['relation', 'profession', 'gotra'] })).options;
		} catch {
			optionsError = t(lang, 'frLoadOptionsFailed');
		}
	});

	// Saved on every change so a refresh or closed tab doesn't lose a half-filled form.
	// The token is kept too, so a cancelled payment retries the same form.
	$effect(() => {
		const snapshot = JSON.stringify({ head, members, stage, step, token });
		// Landing isn't saved, so someone with a half-filled form resumes it instead of seeing landing again.
		if (!restored || stage === 'landing' || stage === 'done') return;
		try {
			localStorage.setItem(DRAFT_KEY, snapshot);
		} catch {}
	});

	const fmt = (key: DictKey, vars: Record<string, string | number> = {}) =>
		Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), t(lang, key));

	const fullName = (p: Person) =>
		[p.firstName, p.middleName, p.lastName]
			.map((n) => n.trim())
			.filter(Boolean)
			.join(' ');
	const dobLabel = (p: Person) =>
		p.dobDay && p.dobMonth && p.dobYear
			? `${p.dobDay} ${MONTHS[L][Number(p.dobMonth) - 1]} ${p.dobYear}`
			: '';

	const dobIso = (p: Person) =>
		`${p.dobYear}-${p.dobMonth.padStart(2, '0')}-${p.dobDay.padStart(2, '0')}`;

	// Same rule as the server, which decides the actual charge.
	function ageToday(p: Person) {
		const now = new Date();
		const month = Number(p.dobMonth);
		const day = Number(p.dobDay);
		let age = now.getFullYear() - Number(p.dobYear);
		if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) {
			age -= 1;
		}
		return age;
	}
	const feeFor = (p: Person) => (ageToday(p) <= FREE_UP_TO_AGE ? 0 : FEE_PER_MEMBER);
	const totalAmount = $derived([head, ...members].reduce((sum, p) => sum + feeFor(p), 0));
	const feeLabel = (fee: number) => (fee ? `₹${fee}` : t(lang, 'frFree'));

	function reviewRows(p: Person, isHead: boolean) {
		const mobile = p.ownMobile ? p.mobile : head.mobile;
		const whatsapp = p.ownMobile
			? p.whatsappSame
				? p.mobile
				: p.whatsapp
			: head.whatsappSame
				? head.mobile
				: head.whatsapp;
		return [
			...(isHead
				? []
				: [{ label: t(lang, 'relation'), value: optionLabel('relation', p.relation) }]),
			{ label: t(lang, 'dateOfBirth'), value: dobLabel(p) },
			{ label: t(lang, 'frProfession'), value: optionLabel('profession', p.profession) },
			{ label: t(lang, 'frMobile'), value: mobile },
			{ label: t(lang, 'frWhatsapp'), value: whatsapp },
			{ label: t(lang, 'frEmail'), value: p.ownEmail ? p.email : head.email },
			{ label: t(lang, 'frAddress'), value: p.sameAddress ? head.address : p.address },
			{ label: t(lang, 'frCity'), value: p.sameAddress ? head.city : p.city },
			{ label: t(lang, 'frPincode'), value: p.sameAddress ? head.pincode : p.pincode },
			{ label: t(lang, 'gotra'), value: optionLabel('gotra', p.sameGotra ? head.gotra : p.gotra) },
			{ label: t(lang, 'frVatan'), value: p.sameVatan ? head.vatan : p.vatan },
			{ label: t(lang, 'frFee'), value: feeLabel(feeFor(p)) }
		];
	}

	function validate(p: Person, fields: Field[]): Partial<Record<Field, string>> {
		const e: Partial<Record<Field, string>> = {};
		const req = t(lang, 'frErrRequired');
		for (const f of fields) {
			switch (f) {
				case 'firstName':
				case 'middleName':
				case 'lastName':
					if (!p[f].trim()) e[f] = req;
					break;
				case 'dob':
					if (!p.dobDay || !p.dobMonth || !p.dobYear) e.dob = t(lang, 'frErrDob');
					break;
				case 'profession':
					if (!p.profession) e.profession = t(lang, 'frErrChoose');
					break;
				case 'relation':
					if (!p.relation) e.relation = t(lang, 'frErrChoose');
					break;
				case 'ownMobile':
					if (p.ownMobile === null) e.ownMobile = t(lang, 'frErrChoose');
					break;
				case 'ownEmail':
					if (p.ownEmail === null) e.ownEmail = t(lang, 'frErrChoose');
					break;
				case 'mobile':
					if (p.ownMobile && !/^\d{10}$/.test(p.mobile)) e.mobile = t(lang, 'frErrMobile');
					break;
				case 'whatsapp':
					if (p.ownMobile && !p.whatsappSame && !/^\d{10}$/.test(p.whatsapp))
						e.whatsapp = t(lang, 'frErrMobile');
					break;
				case 'email':
					if (p.ownEmail && p.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()))
						e.email = t(lang, 'frErrEmail');
					break;
				case 'address':
					if (!p.sameAddress && !p.address.trim()) e.address = req;
					break;
				case 'city':
					if (!p.sameAddress && !p.city.trim()) e.city = req;
					break;
				case 'pincode':
					if (!p.sameAddress && !/^\d{6}$/.test(p.pincode)) e.pincode = t(lang, 'frErrPincode');
					break;
				case 'gotra':
					if (!p.sameGotra && !p.gotra) e.gotra = t(lang, 'frErrChoose');
					break;
				case 'vatan':
					if (!p.sameVatan && !p.vatan.trim()) e.vatan = req;
					break;
			}
		}
		return e;
	}

	async function showErrorsOrPass(e: Partial<Record<Field, string>>): Promise<boolean> {
		errors = e;
		if (!Object.keys(e).length) return true;
		await tick();
		document
			.querySelector('.text-red-600')
			?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		return false;
	}

	async function goTo(next: Stage) {
		errors = {};
		stage = next;
		await tick();
		document.querySelector('main')?.scrollTo(0, 0);
	}

	async function nextHeadStep(event: SubmitEvent) {
		event.preventDefault();
		if (!(await showErrorsOrPass(validate(head, HEAD_STEPS[step].fields)))) return;
		if (step < HEAD_STEPS.length - 1) {
			step += 1;
			goTo('head');
		} else goTo(returnTo);
	}

	function prevHeadStep() {
		if (step > 0) step -= 1;
		goTo('head');
	}

	function editHead(from: 'family' | 'review') {
		returnTo = from;
		step = 0;
		goTo('head');
	}

	function openMember(index: number | null, from: 'family' | 'review' = 'family') {
		returnTo = from;
		editIndex = index;
		draft = index === null ? emptyPerson(false) : structuredClone($state.snapshot(members[index]));
		goTo('member');
	}

	async function saveMember(event: SubmitEvent) {
		event.preventDefault();
		const fields: Field[] = [
			'firstName',
			'middleName',
			'lastName',
			'dob',
			'relation',
			'profession',
			'ownMobile',
			'mobile',
			'whatsapp',
			'ownEmail',
			'email',
			'address',
			'city',
			'pincode',
			'gotra',
			'vatan'
		];
		if (!(await showErrorsOrPass(validate(draft, fields)))) return;
		const saved = structuredClone($state.snapshot(draft));
		if (editIndex === null) members.push(saved);
		else members[editIndex] = saved;
		goTo(returnTo);
	}

	function removeMember(index: number) {
		if (!confirm(fmt('frRemoveConfirm', { name: fullName(members[index]) }))) return;
		members.splice(index, 1);
	}

	function changeShared(field: 'address' | 'gotra' | 'vatan') {
		if (field === 'address') {
			draft.address = head.address;
			draft.city = head.city;
			draft.pincode = head.pincode;
			draft.sameAddress = false;
		} else if (field === 'gotra') {
			draft.gotra = head.gotra;
			draft.sameGotra = false;
		} else {
			draft.vatan = head.vatan;
			draft.sameVatan = false;
		}
	}

	function openReview() {
		formError = totalAmount > 0 ? '' : t(lang, 'frErrNeedAdult');
		if (!formError) goTo('review');
	}

	function toMemberInput(p: Person, isHead: boolean): EventRegistration.MemberInput {
		const ownMobile = isHead || !!p.ownMobile;
		const contact = ownMobile ? p : head;
		return {
			first_name: p.firstName.trim(),
			middle_name: p.middleName.trim(),
			surname: p.lastName.trim(),
			date_of_birth: dobIso(p),
			relation: isHead ? null : p.relation,
			profession: p.profession,
			mobile: contact.mobile,
			whatsapp: contact.whatsappSame ? contact.mobile : contact.whatsapp,
			email: (isHead || p.ownEmail ? p.email : head.email).trim(),
			address: (p.sameAddress ? head.address : p.address).trim(),
			city: (p.sameAddress ? head.city : p.city).trim(),
			pincode: p.sameAddress ? head.pincode : p.pincode,
			gotra: p.sameGotra ? head.gotra : p.gotra,
			native_place: (p.sameVatan ? head.vatan : p.vatan).trim(),
			same_as_head: {
				mobile: !ownMobile,
				email: !isHead && !p.ownEmail,
				address: p.sameAddress,
				gotra: p.sameGotra,
				native_place: p.sameVatan
			}
		};
	}

	async function payAndSubmit() {
		formError = '';
		isPaying = true;
		const result = await runEventRegistrationPayment({
			token,
			members: [toMemberInput(head, true), ...members.map((m) => toMemberInput(m, false))],
			onToken: (value) => (token = value),
			onVerifying: () => goTo('paying')
		});
		isPaying = false;

		switch (result.kind) {
			case 'submitted':
			case 'processing':
				try {
					localStorage.removeItem(DRAFT_KEY);
				} catch {}
				goTo('done');
				break;
			case 'needs_review':
				await goTo('review');
				formError = t(lang, 'frNeedsReview');
				break;
			case 'cancelled':
				await goTo('review');
				formError = t(lang, 'regPaymentCancelled');
				break;
			case 'failed':
				await goTo('review');
				formError = t(lang, 'paymentFailed').replace('{reason}', result.reason.replace(/\.$/, ''));
				break;
			case 'createFailed':
				formError = result.message;
				break;
		}
	}

	const passHref = $derived(withLang(lang, `/event-pass?token=${token}`));

	const digitsOnly = (value: string, length = 10) => value.replace(/\D/g, '').slice(0, length);
</script>

{#snippet fieldLabel(text: string, forId?: string)}
	<label for={forId} class="mb-1 block text-sm font-medium text-gray-700">
		{text} <span class="text-red-500">*</span>
	</label>
{/snippet}

{#snippet hint(text: string)}
	<p class="mt-1 text-xs text-gray-500">{text}</p>
{/snippet}

{#snippet fieldError(field: Field)}
	{#if errors[field]}
		<p class="mt-1 text-sm text-red-600">{errors[field]}</p>
	{/if}
{/snippet}

{#snippet nameField(p: Person, prefix: string)}
	<Input
		id={`${prefix}-first-name`}
		label={t(lang, 'firstName')}
		bind:value={p.firstName}
		error={errors.firstName}
		required
	/>
	<Input
		id={`${prefix}-middle-name`}
		label={t(lang, 'middleName')}
		bind:value={p.middleName}
		error={errors.middleName}
		required
	/>
	<Input
		id={`${prefix}-last-name`}
		label={t(lang, 'frLastName')}
		bind:value={p.lastName}
		error={errors.lastName}
		required
	/>
{/snippet}

{#snippet professionField(p: Person, prefix: string)}
	<Select
		id={`${prefix}-profession`}
		label={t(lang, 'frProfession')}
		bind:value={p.profession}
		options={professionOptions}
		error={errors.profession}
		required
	/>
{/snippet}

{#snippet dobFields(p: Person, prefix: string)}
	<div>
		{@render fieldLabel(t(lang, 'dateOfBirth'), `${prefix}-dob-day`)}
		<div class="grid grid-cols-[1fr_1.5fr_1fr] gap-2">
			<Select id={`${prefix}-dob-day`} bind:value={p.dobDay} options={dayOptions} />
			<Select id={`${prefix}-dob-month`} bind:value={p.dobMonth} options={monthOptions} />
			<Select id={`${prefix}-dob-year`} bind:value={p.dobYear} options={yearOptions} />
		</div>
		{@render fieldError('dob')}
	</div>
{/snippet}

{#snippet mobileFields(p: Person, prefix: string)}
	<Input
		id={`${prefix}-mobile`}
		label={t(lang, 'frMobile')}
		type="tel"
		inputmode="numeric"
		maxlength={10}
		bind:value={p.mobile}
		onChange={() => (p.mobile = digitsOnly(p.mobile))}
		error={errors.mobile}
		required
	/>
	<label class="flex cursor-pointer items-center gap-2">
		<input
			type="checkbox"
			bind:checked={p.whatsappSame}
			class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
		/>
		<span class="text-sm text-gray-700">{t(lang, 'frWhatsappSame')}</span>
	</label>
	{#if !p.whatsappSame}
		<Input
			id={`${prefix}-whatsapp`}
			label={t(lang, 'frWhatsapp')}
			type="tel"
			inputmode="numeric"
			maxlength={10}
			bind:value={p.whatsapp}
			onChange={() => (p.whatsapp = digitsOnly(p.whatsapp))}
			error={errors.whatsapp}
			required
		/>
	{/if}
{/snippet}

{#snippet emailField(p: Person, prefix: string)}
	<Input
		id={`${prefix}-email`}
		label={t(lang, 'frEmailOptional')}
		type="email"
		inputmode="email"
		bind:value={p.email}
		error={errors.email}
	/>
{/snippet}

{#snippet addressField(p: Person, prefix: string)}
	<div>
		{@render fieldLabel(t(lang, 'frAddress'), `${prefix}-address`)}
		<textarea
			id={`${prefix}-address`}
			rows="3"
			bind:value={p.address}
			class="w-full resize-y rounded-md border px-3 py-2 text-base text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm {errors.address
				? 'border-red-500'
				: 'border-gray-300'}"
		></textarea>
		{#if errors.address}
			{@render fieldError('address')}
		{:else}
			{@render hint(t(lang, 'frAddressHint'))}
		{/if}
	</div>
	<div class="grid grid-cols-2 gap-3">
		<Input
			id={`${prefix}-city`}
			label={t(lang, 'frCity')}
			bind:value={p.city}
			error={errors.city}
			required
		/>
		<Input
			id={`${prefix}-pincode`}
			label={t(lang, 'frPincode')}
			type="tel"
			inputmode="numeric"
			maxlength={6}
			bind:value={p.pincode}
			onChange={() => (p.pincode = digitsOnly(p.pincode, 6))}
			error={errors.pincode}
			required
		/>
	</div>
{/snippet}

{#snippet gotraField(p: Person, prefix: string)}
	<Select
		id={`${prefix}-gotra`}
		label={t(lang, 'gotra')}
		bind:value={p.gotra}
		options={gotraOptions}
		error={errors.gotra}
		required
	/>
{/snippet}

{#snippet vatanField(p: Person, prefix: string)}
	<div>
		<Input
			id={`${prefix}-vatan`}
			label={t(lang, 'frVatan')}
			bind:value={p.vatan}
			error={errors.vatan}
			required
		/>
		{#if !errors.vatan}{@render hint(t(lang, 'frVatanHint'))}{/if}
	</div>
{/snippet}

{#snippet yesNo(field: 'ownMobile' | 'ownEmail', question: string)}
	<div>
		{@render fieldLabel(question)}
		<div class="grid grid-cols-2 gap-2">
			<Button
				variant={draft[field] === true ? 'primary' : 'secondary'}
				onclick={() => (draft[field] = true)}
			>
				{t(lang, 'frYes')}
			</Button>
			<Button
				variant={draft[field] === false ? 'primary' : 'secondary'}
				onclick={() => (draft[field] = false)}
			>
				{fmt('frNoUseHeads', { name: headFirstName })}
			</Button>
		</div>
		{@render fieldError(field)}
	</div>
{/snippet}

{#snippet sameRow(label: string, value: string, onchange: () => void)}
	<div class="flex items-start justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
		<div class="min-w-0">
			<p class="text-sm font-medium text-gray-700">{label}</p>
			<p class="text-sm break-words text-gray-900">{value}</p>
			<p class="mt-0.5 flex items-center gap-1 text-xs text-green-700">
				<CheckCircle2 class="h-3.5 w-3.5" />
				{fmt('frSameAs', { name: headFirstName })}
			</p>
		</div>
		<button
			type="button"
			onclick={onchange}
			class="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-800"
		>
			{t(lang, 'frChange')}
		</button>
	</div>
{/snippet}

{#snippet formErrorBox()}
	{#if formError}
		<p class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</p>
	{/if}
{/snippet}

{#snippet personCardHeader(
	name: string,
	isHead: boolean,
	onedit: () => void,
	onremove?: () => void
)}
	<div class="flex items-center justify-between gap-2">
		<p class="flex min-w-0 items-center gap-2 font-semibold text-gray-900">
			<span class="truncate">{name}</span>
			{#if isHead}
				<span class="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
					{t(lang, 'frYouTag')}
				</span>
			{/if}
		</p>
		<div class="flex shrink-0 gap-3">
			<button
				type="button"
				onclick={onedit}
				class="text-sm font-medium text-blue-600 hover:text-blue-800"
			>
				{t(lang, 'frEdit')}
			</button>
			{#if onremove}
				<button
					type="button"
					onclick={onremove}
					class="text-sm font-medium text-red-600 hover:text-red-800"
				>
					{t(lang, 'regRemove')}
				</button>
			{/if}
		</div>
	</div>
{/snippet}

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
			{#if onRegistrationHost}
				<p class="text-base font-semibold text-gray-900">{t(lang, 'frTabTitle')}</p>
			{:else}
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
		{#if optionsError}
			<p class="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
				{optionsError}
			</p>
		{/if}
		{#if stage === 'landing'}
			<div class="space-y-6 pt-4 text-center">
				<div class="space-y-3 text-sm text-[#7b1e1e]/80">
					<p>
						<span class="text-base font-semibold text-[#7b1e1e]"
							>અખિલ હિંદ ભટ્ટ મેવાડા બ્રહ્મ સમાજ ફેડરેશન, ગાંધીનગર</span
						><br />
						ના નેજા હેઠળ આયોજિત
					</p>
					<p>
						<span class="text-base font-semibold text-[#7b1e1e]"
							>શ્રી ભટ્ટમેવાડા જ્ઞાતિ હિતવર્ધક મંડળ, મુંબઈ</span
						><br />
						સમર્થિત અને
					</p>
					<p>
						<span class="text-base font-semibold text-[#7b1e1e]">શ્રી ભટ્ટ મેવાડા સમાજ, હિંમતનગર</span
						><br />
						ના યજમાનપદે મળનાર
					</p>
				</div>

				<div class="border-y border-[#d4a537] py-5">
					<p class="text-lg font-semibold text-[#7b1e1e]">સમસ્ત ભટ્ટમેવાડા જ્ઞાતિ</p>
					<h1 class="mt-1 text-4xl font-bold text-[#7b1e1e]">નવમ સંમેલન</h1>
				</div>

				<div class="space-y-3 rounded-md border border-[#ecd9a4] bg-[#fdf6e7] p-4 text-left text-sm text-[#7b1e1e]">
					<p class="flex items-start gap-3">
						<CalendarDays class="mt-0.5 h-5 w-5 shrink-0 text-[#b8860b]" />
						<span class="font-semibold">૧૦ જાન્યુઆરી ૨૦૨૭, રવિવાર</span>
					</p>
					<p class="flex items-start gap-3">
						<MapPin class="mt-0.5 h-5 w-5 shrink-0 text-[#b8860b]" />
						<span>નૈયા પાર્ટી પ્લોટ, હડિયોલ રોડ, સહકારી જીન, હિંમતનગર</span>
					</p>
				</div>

				<div class="grid pt-1">
					<Button onclick={() => goTo('head')}>{t(lang, 'frRegisterNow')}</Button>
				</div>
			</div>
		{:else if stage === 'head'}
			<div class="mb-6">
				<div class="flex gap-1.5">
					{#each HEAD_STEPS as _, i (i)}
						<span class="h-1.5 flex-1 rounded-full {i <= step ? 'bg-blue-600' : 'bg-gray-200'}"
						></span>
					{/each}
				</div>
				<div class="mt-3 flex items-baseline justify-between gap-3">
					<h2 class="text-lg font-semibold text-gray-900">{t(lang, HEAD_STEPS[step].title)}</h2>
					<p class="shrink-0 text-sm text-gray-500">
						{t(lang, 'regStepOf').replace('{step}', String(step + 1))}
					</p>
				</div>
			</div>

			<form onsubmit={nextHeadStep} novalidate class="space-y-5">
				{#if step === 0}
					{@render nameField(head, 'head')}
					{@render dobFields(head, 'head')}
					{@render professionField(head, 'head')}
				{:else if step === 1}
					{@render mobileFields(head, 'head')}
					{@render emailField(head, 'head')}
				{:else}
					{@render addressField(head, 'head')}
					{@render gotraField(head, 'head')}
					{@render vatanField(head, 'head')}
				{/if}

				<div class="grid gap-3 pt-1 {step > 0 ? 'grid-cols-[1fr_2fr]' : ''}">
					{#if step > 0}
						<Button variant="secondary" onclick={prevHeadStep}>{t(lang, 'frBack')}</Button>
					{/if}
					<Button type="submit">{t(lang, 'frNext')}</Button>
				</div>
			</form>
		{:else if stage === 'family'}
			<div class="mb-6">
				<h1 class="text-2xl font-bold text-gray-900">{t(lang, 'frMembers')}</h1>
				<p class="mt-1 text-sm text-gray-600">{t(lang, 'frAddMoreHint')}</p>
			</div>

			<ul class="space-y-3">
				<li class="rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2.5">
					{@render personCardHeader(fullName(head), true, () => editHead('family'))}
				</li>
				{#each members as m, i (i)}
					<li class="rounded-md border border-gray-200 px-3 py-2.5">
						{@render personCardHeader(
							fullName(m),
							false,
							() => openMember(i),
							() => removeMember(i)
						)}
					</li>
				{/each}
			</ul>

			<button
				type="button"
				onclick={() => openMember(null)}
				class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
			>
				<Plus class="h-4 w-4" />
				{t(lang, 'frAddMember')}
			</button>

			<div class="mt-6 grid gap-3 border-t border-gray-200 pt-6">
				<p class="text-center text-sm text-gray-500">
					{fmt(members.length ? 'frMembersCount' : 'frMemberCountOne', { n: members.length + 1 })}
				</p>
				{@render formErrorBox()}
				<Button onclick={openReview}>{t(lang, 'frSubmit')}</Button>
			</div>
		{:else if stage === 'member'}
			<h1 class="mb-6 text-2xl font-bold text-gray-900">
				{t(lang, editIndex === null ? 'frNewMember' : 'frEditMember')}
			</h1>

			<form onsubmit={saveMember} novalidate class="space-y-5">
				{@render nameField(draft, 'm')}
				{@render dobFields(draft, 'm')}
				<div>
					<Select
						id="m-relation"
						label={fmt('frRelationWith', {
							member: draftFirstName.charAt(0).toUpperCase() + draftFirstName.slice(1),
							head: headFirstName
						})}
						bind:value={draft.relation}
						options={relationOptions}
						error={errors.relation}
						required
					/>
				</div>
				{@render professionField(draft, 'm')}

				<div class="space-y-5 border-t border-gray-200 pt-5">
					{@render yesNo('ownMobile', fmt('frOwnMobile', { name: draftFirstName }))}
					{#if draft.ownMobile}
						{@render mobileFields(draft, 'm')}
					{/if}
					{@render yesNo('ownEmail', fmt('frOwnEmail', { name: draftFirstName }))}
					{#if draft.ownEmail}
						{@render emailField(draft, 'm')}
					{/if}
				</div>

				<div class="space-y-3 border-t border-gray-200 pt-5">
					{#if draft.sameAddress}
						{@render sameRow(
							t(lang, 'frAddress'),
							`${head.address}, ${head.city} - ${head.pincode}`,
							() => changeShared('address')
						)}
					{:else}
						{@render addressField(draft, 'm')}
					{/if}
					{#if draft.sameGotra}
						{@render sameRow(t(lang, 'gotra'), optionLabel('gotra', head.gotra), () =>
							changeShared('gotra')
						)}
					{:else}
						{@render gotraField(draft, 'm')}
					{/if}
					{#if draft.sameVatan}
						{@render sameRow(t(lang, 'frVatan'), head.vatan, () => changeShared('vatan'))}
					{:else}
						{@render vatanField(draft, 'm')}
					{/if}
				</div>

				<div class="grid grid-cols-[1fr_2fr] gap-3 pt-1">
					<Button variant="secondary" onclick={() => goTo(returnTo)}>{t(lang, 'cancel')}</Button>
					<Button type="submit">{t(lang, 'frSaveMember')}</Button>
				</div>
			</form>
		{:else if stage === 'review'}
			<div class="mb-6">
				<h1 class="text-2xl font-bold text-gray-900">{t(lang, 'frReviewTitle')}</h1>
				<p class="mt-1 text-sm text-gray-600">{t(lang, 'frReviewHint')}</p>
			</div>

			<div class="space-y-3">
				{#each [{ p: head, isHead: true, i: -1 }, ...members.map( (p, i) => ({ p, isHead: false, i }) )] as entry (entry.i)}
					<section class="rounded-md border border-gray-200 px-3 py-2.5">
						{@render personCardHeader(fullName(entry.p), entry.isHead, () =>
							entry.isHead ? editHead('review') : openMember(entry.i, 'review')
						)}
						<dl class="mt-1 divide-y divide-gray-100 text-sm">
							{#each reviewRows(entry.p, entry.isHead) as row (row.label)}
								<div class="flex gap-3 py-2">
									<dt class="w-28 shrink-0 text-gray-500">{row.label}</dt>
									<dd class="min-w-0 break-words text-gray-900">{row.value || '-'}</dd>
								</div>
							{/each}
						</dl>
					</section>
				{/each}
			</div>

			<!-- Pinned so Pay stays visible however long the review list is. -->
			<div class="sticky bottom-0 -mx-4 mt-6 space-y-3 border-t border-gray-200 bg-white px-4 py-3">
				<div class="flex items-baseline justify-between">
					<p class="font-semibold text-gray-900">{t(lang, 'frTotal')}</p>
					<p class="font-semibold text-gray-900">₹{totalAmount}</p>
				</div>
				{@render formErrorBox()}
				<div class="grid grid-cols-[1fr_2fr] gap-3">
					<Button variant="secondary" disabled={isPaying} onclick={() => goTo('family')}>
						{t(lang, 'frBack')}
					</Button>
					<Button disabled={isPaying} onclick={payAndSubmit}>
						{fmt('frPaySubmit', { amount: totalAmount })}
					</Button>
				</div>
			</div>
		{:else if stage === 'paying'}
			<div class="pt-16 text-center">
				<div
					class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-4 text-lg font-semibold text-gray-900">{t(lang, 'frPaying')}</p>
				<p class="mt-1 text-sm text-gray-600">{t(lang, 'frDontClose')}</p>
			</div>
		{:else}
			<div class="pt-10 text-center">
				<CheckCircle2 class="mx-auto mb-4 h-16 w-16 text-green-600" />
				<h1 class="text-2xl font-bold text-gray-900">{t(lang, 'frDoneTitle')}</h1>
				<p class="mt-2 text-gray-600">
					{fmt('frDoneWhatsapp', { number: head.whatsappSame ? head.mobile : head.whatsapp })}
				</p>
				<p class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
					{t(lang, 'frKeepWhatsapp')}
				</p>
				<a
					href={passHref}
					class="mt-6 block rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
				>
					{t(lang, 'frViewPass')}
				</a>
			</div>
		{/if}

		{#if stage !== 'landing' && stage !== 'paying'}
			<EventAd />
		{/if}
	</div>
</div>
