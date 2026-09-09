<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { withLang } from '$lib/i18n';
	import { authStore } from '$lib/stores/authStore';
	import { HandHeart } from '@lucide/svelte';

	const lang = $derived(page.params.lang as 'guj' | undefined);

	let payButtonContainer: HTMLDivElement;

	onMount(() => {
		// Razorpay's embed script only runs when injected as a real DOM node —
		// pasting the <script> tag into markup does not execute it.
		const form = document.createElement('form');
		const script = document.createElement('script');
		script.src = 'https://checkout.razorpay.com/v1/payment-button.js';
		script.setAttribute('data-payment_button_id', 'pl_TZdNWk9rUBB2wo');
		script.async = true;
		form.appendChild(script);
		payButtonContainer.appendChild(form);
	});

	$effect(() => {
		if ($authStore.isLoading) return; // wait for initialize() to resolve
		if (!$authStore.isAuthenticated) return; // show the public landing page

		if ($authStore.userAllInfo?.user.role === 'admin') {
			goto('/dashboard');
		} else {
			goto(withLang(lang, '/me'));
		}
	});

	// English → offer Gujarati (label itself in Gujarati); Gujarati → offer
	// English, label in English. Mirrors the toggle on /login.
	const langSwitchHref = $derived(
		lang === 'guj' ? page.url.pathname.replace(/^\/guj/, '') || '/' : `/guj${page.url.pathname}`
	);
	const langSwitchLabel = $derived(
		lang === 'guj' ? 'Use website in English' : 'વેબસાઇટ ગુજરાતીમાં વાપરો'
	);

	const content = {
		en: {
			aboutTitle: 'About the Scheme',
			aboutParagraphs: [
				'The MSY (Mrutyu Sahay Yojana) is a scheme run by the Akhil Hind Bhatt Mevada Brahma Samaj Federation for the mutual benefit of the Bhatt Mevada community.',
				'Any Bhatt Mevada community member between 18 and 55 years old can join with a one-time payment, and the benefit becomes active after 12 months of continuous membership.',
				"When a member of the scheme passes away, every other active member contributes a fixed ₹100. These small, pooled contributions come together as a substantial amount — 100 times the active members, at present ₹81,000 — which is handed to the deceased member's family (nominee) on the day of Besna, usually within 30 days of the death being reported.",
				"The scheme isn't built to be a source of individual benefit — it is a shared cultural practice: today we stand by another family in their grief, and tomorrow, if the need arises, the community stands by ours. To date, 111 families have received support through this scheme."
			],
			stats: [
				{ value: '18–55 yrs', label: 'eligible age' },
				{ value: '₹100', label: 'contribution per death' },
				{ value: '₹81,000', label: 'support paid on Besna' },
				{ value: '111', label: 'families supported so far' }
			],
			commonQuestions: 'Common Questions',
			viewAll: 'View all 20 questions →',
			faqs: [
				{
					q: 'What is the main purpose of this scheme?',
					a: "When a family loses a member, the entire Bhatt Mevada community shares the responsibility of supporting them — financially and socially — in that difficult time. That is the core purpose of MSY: one member's grief is the shared responsibility of the whole community."
				},
				{
					q: 'Who can become a member?',
					a: 'Any person between 18 and 55 years of age, belonging to the Bhatt Mevada Brahmin community and residing in India, can apply for membership.'
				},
				{
					q: 'How much do I need to pay to join?',
					a: 'The one-time joining amount depends on age at entry:\n\n<strong>18–40 years</strong>: ₹250 entry fee + ₹500 deposit + ₹50 corpus fee = <strong>₹800</strong>\n<strong>41–50 years</strong>: ₹500 entry fee + ₹500 deposit + ₹50 corpus fee = <strong>₹1,050</strong>\n<strong>51–55 years</strong>: ₹1,500 entry fee + ₹500 deposit + ₹50 corpus fee = <strong>₹2,550</strong>\n\nThis amount is paid once, at the time of joining.',
					html: true
				},
				{
					q: 'How is the support fund raised when a member passes away?',
					a: 'Every active member contributes ₹100 for each member who passes away. These individually small contributions, pooled across the community, become meaningful support for the bereaved family.'
				},
				{
					q: 'How soon is the support amount paid?',
					a: 'Once the death is reported with the required documents and verification is complete, the support amount is paid by cheque within 30 days, on the day of Besna.'
				}
			],
			alreadyMember: 'Already a member? Log in to view dues and make payments.',
			memberLogin: 'Member Login',
			needHelp: 'Need help?',
			contactSupport: 'Contact support on WhatsApp',
			adminLogin: 'Admin login'
		},
		guj: {
			aboutTitle: 'યોજના વિશે',
			aboutParagraphs: [
				'MSY (મૃત્યુ સહાય યોજના) એ અખિલ હિંદ ભટ્ટ મેવાડા બ્રહ્મ સમાજ ફેડરેશન દ્વારા સંચાલિત ભટ્ટ મેવાડા સમાજ માટેની યોજના છે.',
				'18 થી 55 વર્ષની ઉંમરના કોઈપણ ભટ્ટ મેવાડા સમાજના સભ્ય એક જ વખતની ચુકવણી કરીને સભ્ય બની શકે છે, અને સભ્યપદના 12 મહિના પૂર્ણ થયા બાદ યોજનાનો લાભ મળવાપાત્ર બને છે.',
				'જ્યારે યોજનાના કોઈ સભ્યનું અવસાન થાય છે, ત્યારે અન્ય દરેક ચાલુ સભ્ય ₹100 નો નિયત ફાળો આપે છે. આ નાના-નાના, ભેગા થયેલા ફાળા મળીને એક નોંધપાત્ર રકમ — ચાલુ સભ્યોની 100 ગણી રકમ, હાલમાં ₹81,000 — જે મરણ પામનાર સભ્યના પરિવારને (નોમિનીને), મૃત્યુની જાણ થયા બાદ સામાન્ય રીતે 30 દિવસની અંદર, બેસણાના દિવસે આપવામાં આવે છે.',
				'આ યોજના વ્યક્તિગત લાભ માટે નહીં, પરંતુ એક સહિયારી સામાજિક પરંપરા તરીકે ઊભી કરવામાં આવી છે: આજે આપણે બીજા પરિવારના દુઃખમાં સહભાગી બનીએ છીએ, અને કાલે જરૂર પડે તો સમાજ આપણી પડખે ઊભો રહેશે. અત્યાર સુધીમાં આ યોજના મારફતે 111 થી વધુ પરિવારોને સહાય મળી ચૂકી છે.'
			],
			stats: [
				{ value: '18–55 વર્ષ', label: 'પાત્રતા ઉંમર' },
				{ value: '₹100', label: 'મૃત્યુ દીઠ ફાળો' },
				{ value: '₹81,000', label: 'બેસણાના દિવસે અપાતી સહાય' },
				{ value: '111', label: 'અત્યાર સુધી સહાય પામેલા પરિવારો' }
			],
			commonQuestions: 'સામાન્ય પ્રશ્નો',
			viewAll: 'તમામ 20 પ્રશ્નો જુઓ →',
			faqs: [
				{
					q: 'આ યોજનાનો મુખ્ય હેતુ શું છે?',
					a: 'પરિવારના કોઈ સભ્યનું અવસાન થાય ત્યારે પરિવાર પર આવતી આર્થિક મુશ્કેલીમાં સમગ્ર ભટ્ટ મેવાડા સમાજ સહભાગી બને અને દુઃખની ઘડીમાં પરિવારને આર્થિક તથા સામાજિક આધાર મળે—આ યોજનાનો મૂળ હેતુ છે. "એક સભ્યનું દુઃખ — સમગ્ર સમાજની સહભાગી જવાબદારી."'
				},
				{
					q: 'યોજનામાં કોણ સભ્ય બની શકે?',
					a: '18 થી 55 વર્ષની ઉંમરના, ભારતમાં વસતા ભટ્ટ મેવાડા બ્રાહ્મણ જ્ઞાતિના વ્યક્તિ સભ્યપદ માટે અરજી કરી શકે છે.'
				},
				{
					q: 'સભ્ય બનવા માટે કેટલી રકમ ચૂકવવાની રહેશે?',
					a: 'ઉંમર પ્રમાણે રકમ અલગ છે:\n\n<strong>18 થી 40 વર્ષ</strong>: ₹250 દાખલ ફી + ₹500 ડિપોઝિટ + ₹50 કોર્પસ ફી = <strong>₹800</strong>\n<strong>41 થી 50 વર્ષ</strong>: ₹500 દાખલ ફી + ₹500 ડિપોઝિટ + ₹50 કોર્પસ ફી = <strong>₹1,050</strong>\n<strong>51 થી 55 વર્ષ</strong>: ₹1,500 દાખલ ફી + ₹500 ડિપોઝિટ + ₹50 કોર્પસ ફી = <strong>₹2,550</strong>\n\nઆ રકમ એક જ વખત ભરવાની રહેશે.',
					html: true
				},
				{
					q: 'કોઈ સભ્યનું અવસાન થાય ત્યારે સહાય કેવી રીતે ઊભી થાય છે?',
					a: 'દરેક ચાલુ સભ્યે મરણ પામનાર સભ્યદીઠ ₹100નો સહભાગી ફાળો આપવાનો હોય છે. આ રીતે સમાજના અનેક સભ્યોનો નાનો-નાનો સહયોગ મૃત્યુ પામનાર સભ્યના પરિવાર માટે સામૂહિક આર્થિક સહાયમાં પરિવર્તિત થાય છે.'
				},
				{
					q: 'મૃત્યુની જાણ થયા પછી સહાય ક્યારે ચૂકવવામાં આવશે?',
					a: 'જરૂરી કાર્યવાહી અને દસ્તાવેજોની ચકાસણી પૂર્ણ થયા બાદ 30 દિવસની અંદર, બેસણાના દિવસે, ચેક દ્વારા સહાય ચૂકવવાની જોગવાઈ છે.'
				}
			],
			alreadyMember: 'પહેલેથી સભ્ય છો? બાકી રકમ જોવા અને ચુકવણી કરવા લોગ ઇન કરો.',
			memberLogin: 'સભ્ય લોગ ઇન',
			needHelp: 'મદદ જોઈએ છે?',
			contactSupport: 'WhatsApp પર સહાયનો સંપર્ક કરો',
			adminLogin: 'એડમિન લોગ ઇન'
		}
	};

	const c = $derived(lang === 'guj' ? content.guj : content.en);
</script>

<div class="min-h-full overflow-y-auto bg-white">
	<header class="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6">
		<span class="text-sm font-bold tracking-wide text-blue-600">MSY</span>
		<a
			href={langSwitchHref}
			data-sveltekit-replacestate
			class="text-xs font-medium text-blue-600 hover:underline"
		>
			{langSwitchLabel}
		</a>
	</header>

	<main class="mx-auto max-w-2xl px-4 pt-4 pb-10 sm:px-6">
		<section class="text-center">
			<p class="text-2xl font-bold text-blue-600">Welcome,</p>
			<p class="mt-2 text-xs leading-relaxed text-gray-600">
				શ્રી અખિલ હિંદ ભટ્ટ મેવાડા બ્રહ્મ સમાજ ફેડરેશન સંચાલિત
				<br />
				<strong class="font-semibold text-gray-800">
					શ્રીમતી નિરંજનાબેન ભરતકુમાર ભટ્ટ સમસ્ત ભટ્ટ મેવાડા પરિવાર કલ્યાણ (મૃત્યુ સહાય) યોજના
				</strong>
				માં આપનું સ્વાગત છે 🙏
			</p>
		</section>

		<section class="mt-6">
			<h1 class="text-lg font-bold text-gray-900">{c.aboutTitle}</h1>
			<div class="mt-3 space-y-3 text-sm leading-relaxed text-gray-700">
				{#each c.aboutParagraphs as para (para)}
					<p>{para}</p>
				{/each}
			</div>

			<div class="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-gray-100 py-4 sm:grid-cols-4">
				{#each c.stats as stat (stat.label)}
					<div>
						<p class="text-base font-bold text-gray-900">{stat.value}</p>
						<p class="text-[11px] text-gray-500">{stat.label}</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="mt-4 flex justify-center">
			<div bind:this={payButtonContainer}></div>
		</section>

		<section class="mt-6">
			<div class="flex items-baseline justify-between">
				<h2 class="text-lg font-bold text-gray-900">{c.commonQuestions}</h2>
				<a href={withLang(lang, '/qna')} class="text-xs font-medium text-blue-600 hover:underline">
					{c.viewAll}
				</a>
			</div>
			<div class="mt-2 divide-y divide-gray-100">
				{#each c.faqs as faq (faq.q)}
					<details class="group py-3">
						<summary
							class="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-gray-800 marker:content-none"
						>
							{faq.q}
							<span class="mt-0.5 shrink-0 text-gray-400 transition-transform group-open:rotate-45"
								>+</span
							>
						</summary>
						<p class="mt-2 pr-6 text-sm leading-relaxed whitespace-pre-line text-gray-600">
							{#if faq.html}
								{@html faq.a}
							{:else}
								{faq.a}
							{/if}
						</p>
					</details>
				{/each}
			</div>
		</section>

		<section class="mt-6 border-t border-gray-100 pt-6 text-center">
			<p class="text-sm text-gray-700">{c.alreadyMember}</p>
			<a
				href={withLang(lang, '/login')}
				class="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
			>
				<HandHeart class="h-4 w-4" />
				{c.memberLogin}
			</a>
			<p class="mt-4 text-xs text-gray-500">
				{c.needHelp}
				<a
					href="https://wa.me/919898897380?text=Hi%2C%20I%20need%20help%20with%20MSY%20Portal"
					target="_blank"
					rel="noopener noreferrer"
					class="text-blue-600 hover:underline"
				>
					{c.contactSupport}
				</a>
			</p>
		</section>
	</main>

	<footer class="flex items-center justify-center gap-3 px-4 py-6 text-center text-[11px] text-gray-400">
		<a href={withLang(lang, '/about')} class="hover:text-gray-600 hover:underline">
			{lang === 'guj' ? 'અમારા વિશે' : 'About Us'}
		</a>
		<span>·</span>
		<a href={withLang(lang, '/terms')} class="hover:text-gray-600 hover:underline">
			{lang === 'guj' ? 'નિયમો અને શરતો' : 'Terms & Conditions'}
		</a>
		<span>·</span>
		<a href="/admin" class="hover:text-gray-600 hover:underline">{c.adminLogin}</a>
	</footer>
</div>
