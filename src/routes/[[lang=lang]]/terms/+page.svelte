<script lang="ts">
	import { page } from '$app/state';
	import { withLang } from '$lib/i18n';
	import { ArrowLeft } from '@lucide/svelte';
	import { TRUST_NAME_EN, TRUST_NAME_GUJ, TRUST_REGISTRATION_NO } from '$lib/constants/trust';

	const lang = $derived(page.params.lang as 'guj' | undefined);

	const langSwitchHref = $derived(
		lang === 'guj' ? page.url.pathname.replace(/^\/guj/, '') || '/' : `/guj${page.url.pathname}`
	);
	const langSwitchLabel = $derived(
		lang === 'guj' ? 'Use website in English' : 'વેબસાઇટ ગુજરાતીમાં વાપરો'
	);

	type Section = { title: string; paragraphs: string[] };
	type PageContent = {
		back: string;
		title: string;
		lastUpdated: string;
		intro: string[];
		sections: Section[];
	};

	const content: { en: PageContent; guj: PageContent } = {
		en: {
			back: 'Back',
			title: 'Terms and Conditions',
			lastUpdated: 'Last updated: September 8, 2026',
			intro: [
				`These Terms and Conditions govern the use of this website, operated by ${TRUST_NAME_EN}, a trust registered under The Public Trust Act 1950 (Registration No. ${TRUST_REGISTRATION_NO}), having its registered office at Plot No. 1316/A-2, Sector 7D, Gandhinagar-382007, Gujarat, India ("the Trust", "we", "us").`,
				'By using this website or making a payment through it, you agree to these terms.'
			],
			sections: [
				{
					title: '1. About Us',
					paragraphs: [
						`${TRUST_NAME_EN} is a not-for-profit trust. This website is used to,`,
						'(a) accept voluntary donations to support the Trust\'s charitable activities, and',
						"(b) collect scheme contributions from enrolled members, where members contribute periodically as mutual help/support for other members under the Trust's scheme."
					]
				},
				{
					title: '2. Nature of Payments',
					paragraphs: [
						"Donations made through this site are voluntary contributions to the Trust and are used solely for the Trust's charitable objectives.",
						"Scheme contributions are payments made by enrolled members as part of a member welfare scheme run by the Trust, intended to provide help/support to other members as per the scheme's rules.",
						'This website does not sell any goods or services. No commercial transaction takes place.'
					]
				},
				{
					title: '3. Payment Gateway',
					paragraphs: [
						"All payments are processed through Razorpay, a third-party payment gateway. We do not store your card, UPI, or banking details on our servers. By making a payment, you also agree to Razorpay's terms and privacy policy."
					]
				},
				{
					title: '4. Eligibility',
					paragraphs: [
						'Only persons enrolled as members of the Trust\'s scheme may make scheme contributions. The contribution may be made by the representative of the members. Donations may be made by any individual or entity wishing to support the Trust.'
					]
				},
				{
					title: '5. Refund Policy',
					paragraphs: [
						"Donations, once made, are generally non-refundable, as they are utilized for the Trust's ongoing charitable work. Scheme contributions are governed by the scheme's specific rules communicated to members at enrollment. In case of a genuine payment error (e.g., duplicate payment, technical failure), please contact us at msyfederation@gmail.com within 7 days for resolution."
					]
				},
				{
					title: '6. Tax Benefits',
					paragraphs: [
						"Donations to the Trust are eligible for tax deduction under Section 80G of the Income Tax Act, 1961. An 80G receipt will be issued to the donor's registered email address."
					]
				},
				{
					title: '7. Privacy',
					paragraphs: [
						"Personal information (name, email, phone, address) collected during payment is used only for issuing receipts, scheme records, and communication related to the Trust's activities. We do not sell or share your data with third parties, except as required by law or to process payments via Razorpay."
					]
				},
				{
					title: '8. User Responsibilities',
					paragraphs: [
						'You agree to provide accurate information while donating or contributing. The Trust is not liable for failed transactions due to incorrect details provided by the user.'
					]
				},
				{
					title: '9. Limitation of Liability',
					paragraphs: [
						'The Trust makes reasonable efforts to ensure this website is accurate and secure but does not guarantee uninterrupted or error-free access. The Trust is not liable for any indirect loss arising from use of this website.'
					]
				},
				{
					title: '10. Governing Law',
					paragraphs: [
						'These terms are governed by the laws of India, and any disputes are subject to the jurisdiction of courts in Gandhinagar, Gujarat, India.'
					]
				},
				{
					title: '11. Contact Us',
					paragraphs: [
						'For any queries regarding donations, scheme contributions, or these terms, contact us at:',
						'msyfederation@gmail.com',
						'+91 98988 97380',
						'Plot No. 1316/A-2, Sector 7D, Gandhinagar-382007, Gujarat, India'
					]
				}
			]
		},
		guj: {
			back: 'પાછળ',
			title: 'નિયમો અને શરતો',
			lastUpdated: 'છેલ્લે અપડેટ કર્યા તારીખ: 8 સપ્ટેમ્બર, 2026',
			intro: [
				`આ નિયમો અને શરતો આ વેબસાઇટના ઉપયોગને લાગુ પડે છે, જે ${TRUST_NAME_GUJ} દ્વારા સંચાલિત — એક સખાવતી સંસ્થા છે, જે સન 1950 ના સાર્વજનિક ટ્રસ્ટ અધિનિયમ હેઠળ નોંધાયેલ છે (નોંધણી ક્રમાંક: ${TRUST_REGISTRATION_NO}) અને જેની નોંધાયેલ કચેરી પ્લોટ નંબર 1316/એ-2, સેક્ટર 7/ડી, ગાંધીનગર-382007, ગુજરાત, ભારત ખાતે આવેલી છે ("ટ્રસ્ટ/ફેડરેશન", "અમે", "અમારું").`,
				'આ વેબસાઇટનો ઉપયોગ કરીને અથવા તેના મારફતે ચુકવણી કરીને, તમે આ શરતોને સ્વીકારો છો.'
			],
			sections: [
				{
					title: '1. અમારા વિશે',
					paragraphs: [
						`${TRUST_NAME_GUJ} એક બિન-નફાકારક સંસ્થા છે. આ વેબસાઇટનો ઉપયોગ,`,
						'(અ) ટ્રસ્ટની સખાવતી પ્રવૃત્તિઓને ટેકો આપવા સ્વૈચ્છિક દાન સ્વીકારવા માટે, અને',
						'(બ) નોંધાયેલા સભ્યો પાસેથી યોજનાના ફાળા એકત્ર કરવા માટે થાય છે, જ્યાં સભ્યો ટ્રસ્ટની યોજના હેઠળ અન્ય સભ્યોની પરસ્પર સહાય/આધાર માટે સમયાંતરે ફાળો આપે છે.'
					]
				},
				{
					title: '2. ચુકવણીની પ્રકૃતિ',
					paragraphs: [
						'આ સાઇટ મારફતે કરવામાં આવેલ દાન ટ્રસ્ટને સ્વૈચ્છિક ફાળો છે અને તેનો ઉપયોગ ફક્ત ટ્રસ્ટના સખાવતી હેતુઓ માટે જ થાય છે. યોજનાના ફાળા એ ટ્રસ્ટ દ્વારા સંચાલિત સભ્ય કલ્યાણ યોજનાના ભાગરૂપે નોંધાયેલા સભ્યો દ્વારા કરવામાં આવતી ચુકવણીઓ છે, જેનો હેતુ યોજનાના નિયમો મુજબ અન્ય સભ્યોને સહાય/આધાર પૂરો પાડવાનો છે. આ વેબસાઇટ પર કોઈ પણ ચીજવસ્તુ કે સેવાનું વેચાણ થતું નથી. કોઈ વ્યાપારિક વ્યવહાર થતો નથી.'
					]
				},
				{
					title: '3. પેમેન્ટ ગેટવે',
					paragraphs: [
						'તમામ ચુકવણીઓ Razorpay મારફતે કરવામાં આવે છે, જે એક તૃતીય-પક્ષ પેમેન્ટ ગેટવે છે. અમે તમારા કાર્ડ, UPI અથવા બેંકિંગ વિગતો અમારા સર્વર પર સંગ્રહિત કરતા નથી. ચુકવણી કરીને, તમે Razorpayની શરતો અને ગોપનીયતા નીતિ સાથે પણ સંમત થાઓ છો.'
					]
				},
				{
					title: '4. પાત્રતા',
					paragraphs: [
						'ફક્ત ટ્રસ્ટની યોજનામાં નોંધાયેલા સભ્યો અથવા તેમના દ્વારા અધિકૃત વ્યક્તિઓ જ યોજનાનો ફાળો ચૂકવી શકે છે. ટ્રસ્ટને ટેકો આપવા ઇચ્છતી કોઈ પણ વ્યક્તિ અથવા સંસ્થા દાન આપી શકે છે.'
					]
				},
				{
					title: '5. રિફંડ નીતિ',
					paragraphs: [
						'એક વખત આપેલ દાન સામાન્ય રીતે પરત મળવાપાત્ર નથી, કારણ કે તેનો ઉપયોગ ટ્રસ્ટની ચાલુ સખાવતી કામગીરી માટે થાય છે. યોજનાના ફાળા સભ્યપદ સમયે સભ્યોને જણાવવામાં આવેલા યોજનાના ચોક્કસ નિયમો દ્વારા સંચાલિત થાય છે. જો ચુકવણીમાં ખરેખર કોઈ ભૂલ થઈ હોય (દા.ત., ડુપ્લિકેટ ચુકવણી, ટેકનિકલ ખામી), તો કૃપા કરી ઉકેલ માટે 7 દિવસની અંદર msyfederation@gmail.com પર અમને સંપર્ક કરો.'
					]
				},
				{
					title: '6. કરવેરા લાભ',
					paragraphs: [
						'ટ્રસ્ટને આપેલ દાન આવકવેરા અધિનિયમ, 1961ની કલમ 80G હેઠળ કરવેરા માફી માટે પાત્ર છે. દાતાના નોંધાયેલા ઇમેઇલ સરનામે 80G રસીદ મોકલવામાં આવશે.'
					]
				},
				{
					title: '7. ગોપનીયતા',
					paragraphs: [
						'ચુકવણી દરમિયાન એકત્રિત કરવામાં આવેલ વ્યક્તિગત માહિતી (નામ, ઇમેઇલ, ફોન, સરનામું) ફક્ત રસીદ આપવા, યોજનાના રેકોર્ડ રાખવા અને ટ્રસ્ટની પ્રવૃત્તિઓ સંબંધિત સંદેશાવ્યવહાર માટે જ ઉપયોગમાં લેવાય છે. કાયદા દ્વારા જરૂરી હોય અથવા Razorpay મારફતે ચુકવણી કરવા સિવાય, અમે તમારો ડેટા તૃતીય પક્ષોને વેચતા કે શેર કરતા નથી.'
					]
				},
				{
					title: '8. વપરાશકર્તાની જવાબદારીઓ',
					paragraphs: [
						'દાન આપતી વખતે અથવા ફાળો ભરતી વખતે તમે સાચી માહિતી આપવા સંમત થાઓ છો. વપરાશકર્તા દ્વારા આપવામાં આવેલી ખોટી વિગતોના કારણે નિષ્ફળ થયેલા વ્યવહારો માટે ટ્રસ્ટ જવાબદાર નથી.'
					]
				},
				{
					title: '9. જવાબદારીની મર્યાદા',
					paragraphs: [
						'ટ્રસ્ટ આ વેબસાઇટ સચોટ અને સુરક્ષિત રહે તે માટે વ્યાજબી પ્રયાસો કરે છે, પરંતુ સતત અથવા ભૂલ-રહિત ઍક્સેસની ખાતરી આપતું નથી. આ વેબસાઇટના ઉપયોગથી ઉદ્ભવતી કોઈપણ પરોક્ષ નુકસાની માટે ટ્રસ્ટ જવાબદાર નથી.'
					]
				},
				{
					title: '10. લાગુ પડતો કાયદો',
					paragraphs: [
						'આ શરતો ભારતના કાયદા હેઠળ સંચાલિત થાય છે, અને કોઈપણ વિવાદ ગાંધીનગર, ગુજરાતની અદાલતોના અધિકારક્ષેત્રને આધીન રહેશે.'
					]
				},
				{
					title: '11. અમારો સંપર્ક કરો',
					paragraphs: [
						'દાન, યોજનાના ફાળા અથવા આ શરતો સંબંધિત કોઈ પણ પ્રશ્ન માટે, અમારો સંપર્ક કરો:',
						'msyfederation@gmail.com',
						'+91 98988 97380',
						'પ્લોટ નંબર 1316/એ-2, સેક્ટર 7/ડી, ગાંધીનગર-382007, ગુજરાત, ભારત'
					]
				}
			]
		}
	};

	const c = $derived(lang === 'guj' ? content.guj : content.en);
</script>

<div class="min-h-full overflow-y-auto bg-white">
	<header class="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6">
		<div class="flex items-center gap-3">
			<a
				href={withLang(lang, '/')}
				class="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
			>
				<ArrowLeft class="h-3.5 w-3.5" />
				{c.back}
			</a>
			<span class="text-sm font-bold tracking-wide text-blue-600">MSY</span>
		</div>
		<a
			href={langSwitchHref}
			data-sveltekit-replacestate
			class="text-xs font-medium text-blue-600 hover:underline"
		>
			{langSwitchLabel}
		</a>
	</header>

	<main class="mx-auto max-w-2xl px-4 pt-4 pb-10 sm:px-6">
		<h1 class="text-lg font-bold text-gray-900">{c.title}</h1>
		<p class="mt-1 text-xs text-gray-400">{c.lastUpdated}</p>

		<div class="mt-4 space-y-3 text-sm leading-relaxed text-gray-700">
			{#each c.intro as para (para)}
				<p>{para}</p>
			{/each}
		</div>

		<div class="mt-6 space-y-6">
			{#each c.sections as section (section.title)}
				<div>
					<h2 class="text-sm font-bold text-gray-900">{section.title}</h2>
					<div class="mt-2 space-y-2 text-sm leading-relaxed text-gray-700">
						{#each section.paragraphs as para (para)}
							<p>{para}</p>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</main>
</div>
