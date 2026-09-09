<script lang="ts">
	import { page } from '$app/state';
	import { withLang } from '$lib/i18n';
	import { ArrowLeft } from '@lucide/svelte';

	const lang = $derived(page.params.lang as 'guj' | undefined);

	const langSwitchHref = $derived(
		lang === 'guj' ? page.url.pathname.replace(/^\/guj/, '') || '/' : `/guj${page.url.pathname}`
	);
	const langSwitchLabel = $derived(
		lang === 'guj' ? 'Use website in English' : 'વેબસાઇટ ગુજરાતીમાં વાપરો'
	);

	const content = {
		en: {
			back: 'Back',
			title: 'Frequently Asked Questions',
			subtitle: "20 questions, translated from the federation's official Gujarati FAQ",
			memberLogin: 'Member Login',
			closing: [
				'"To connect every Bhatt Mevada family with a community of support, where sharing in joy and helping in sorrow both become part of our collective culture."',
				"This scheme is not about receiving help — it is an initiative to build a culture of giving help. One member's ₹100 contribution may seem small, but the combined support of thousands of members can become a significant source of strength for a family in the hardest moment of life."
			],
			faqs: [
				{
					q: 'What is the main purpose of this scheme?',
					a: "When a family loses a member, the responsibility of supporting them — financially and socially — in that difficult time is shared by the entire Bhatt Mevada community. That is the core purpose of this scheme: \"One member's grief, the shared responsibility of the whole community.\""
				},
				{
					q: "Is this only a support scheme during a member's death, or also a means of social unity?",
					a: 'The scheme is not limited to financial support. Its deeper purpose is to strengthen the spirit of moving "from family to community, and from community to cooperation." Every member\'s small contribution builds a larger support system that stands ready when it is needed most.'
				},
				{
					q: 'Who can become a member?',
					a: 'Any person between 18 and 55 years of age, belonging to the Bhatt Mevada Brahmin community and residing in India, can apply for membership.'
				},
				{
					q: 'Is proof of age required to join?',
					a: 'Yes. Along with the application form, one valid age-proof document is required — a school leaving certificate, passport, driving licence, or Aadhaar card. If your age is between 50 and 55, you will also have to submit a health fitness certificate from a registered medical practitioner (MBBS or higher).'
				},
				{
					q: 'How much do I need to pay to become a member?',
					a: 'The one-time joining amount depends on age at entry:\n\n<strong>18–40 years</strong>: ₹250 entry fee + ₹500 deposit + ₹50 corpus fee = <strong>₹800</strong>\n<strong>41–50 years</strong>: ₹500 entry fee + ₹500 deposit + ₹50 corpus fee = <strong>₹1,050</strong>\n<strong>51–55 years</strong>: ₹1,500 entry fee + ₹500 deposit + ₹50 corpus fee = <strong>₹2,550</strong>\n\nThis amount is paid once, at the time of joining.',
					html: true
				},
				{
					q: 'What is the ₹500 deposit for?',
					a: "The deposit collected at membership is part of the scheme's financial structure. As per the rules, it is non-refundable in any case."
				},
				{
					q: 'Does the scheme benefit apply immediately after joining?',
					a: 'No. The benefit becomes applicable only after a member completes 12 months of continuous membership and timely contribution in case of demise of any member.'
				},
				{
					q: 'How is the support fund raised when a member passes away?',
					a: 'Every active member contributes ₹100 for each member who passes away. These individually small contributions, pooled across the community, come together as meaningful financial support for the bereaved family.'
				},
				{
					q: 'Why is the contribution fixed at ₹100?',
					a: "Because the scheme's strength lies not in one large contribution, but in small, regular participation from every member. ₹100 is a modest amount for an individual, but becomes significant support when the whole community contributes together."
				},
				{
					q: "Who informs the federation of a member's death, and how?",
					a: "The member's heir/nominee must submit written intimation to the federation along with the official death certificate."
				},
				{
					q: 'How soon is the support amount paid after the death is reported?',
					a: 'Once the required process and document verification are complete, the support amount is paid by cheque within 30 days.'
				},
				{
					q: 'Is it mandatory to name a nominee?',
					a: 'Yes. Naming a first heir/nominee is mandatory; a second nominee is optional. If the first nominee is not alive, the payment can be made to the second nominee as per the rules.'
				},
				{
					q: 'Can the nominee be changed later?',
					a: 'Yes. The heir/nominee can be changed by paying a fee of ₹50.'
				},
				{
					q: 'What happens if a member misses two consecutive contributions?',
					a: 'As per the rules, membership is automatically cancelled after missing two consecutive contributions, and the deposit is forfeited. However, the member can request to continue the membership by paying the late fee, but the final decision on whether to continue the membership will be made by the management.'
				},
				{
					q: 'What should I do if my address or mobile number changes?',
					a: 'Inform the federation immediately, so that important updates, contribution requests, and scheme communication continue to reach you without interruption.'
				},
				{
					q: 'What if information provided at the time of joining turns out to be false?',
					a: 'If false information was given at entry, or an attempt was made to mislead the federation, the managing committee has the right to cancel the membership as per the rules.'
				},
				{
					q: 'What is the biggest benefit of joining this scheme?',
					a: "The biggest benefit isn't only the amount received — it's the assurance that in a moment of crisis, you are not alone. The entire Bhatt Mevada community stands with you."
				},
				{
					q: 'Can this scheme be seen as our responsibility toward the community?',
					a: "Absolutely. Membership isn't just about the support you may receive — it's a commitment to stand by other families in their time of grief as well."
				},
				{
					q: "What is the scheme's core message?",
					a: "\"Today, we stand with someone else's family in their grief. Tomorrow, when we need it, the community will stand with us.\""
				},
				{
					q: 'Why should every Bhatt Mevada family join this scheme?',
					a: "Because this scheme is built on collective security rather than individual benefit. Your small contribution can become a big source of hope for one family — and the more families that join, the stronger the community's mutual trust, cooperation, and sense of security becomes."
				}
			]
		},
		guj: {
			back: 'પાછળ',
			title: 'વારંવાર પૂછાતા પ્રશ્નો',
			subtitle: 'ફેડરેશન દ્વારા આપવામાં આવેલ મૂળ ગુજરાતી લખાણ',
			memberLogin: 'સભ્ય લોગ ઇન',
			closing: [
				'"ભટ્ટ મેવાડા સમાજના દરેક પરિવારને એક એવા સહયોગી પરિવાર સાથે જોડવો, જ્યાં સુખમાં સહભાગિતા અને દુઃખમાં સહાય—બંને આપણી સામૂહિક સંસ્કૃતિ બને."',
				'આ યોજના સહાય લેવાની નહીં, સહાય આપવાની સંસ્કૃતિ વિકસાવવાની પહેલ છે. એક સભ્યનો ₹100નો સહયોગ કદાચ નાનો લાગે, પરંતુ હજારો સભ્યોનો સહયોગ કોઈ પરિવાર માટે જીવનની કઠિન ઘડીમાં મોટો આધાર બની શકે છે.'
			],
			faqs: [
				{
					q: 'આ યોજનાનો મુખ્ય હેતુ શું છે?',
					a: 'પરિવારના કોઈ સભ્યનું અવસાન થાય ત્યારે પરિવાર પર આવતી આર્થિક મુશ્કેલીમાં સમગ્ર ભટ્ટ મેવાડા સમાજ સહભાગી બને અને દુઃખની ઘડીમાં પરિવારને આર્થિક તથા સામાજિક આધાર મળે—આ યોજનાનો મૂળ હેતુ છે. "એક સભ્યનું દુઃખ — સમગ્ર સમાજની સહભાગી જવાબદારી."'
				},
				{
					q: 'આ માત્ર મૃત્યુ સમયે સહાય યોજના છે કે સામાજિક એકતાનું પણ માધ્યમ છે?',
					a: 'આ યોજના માત્ર આર્થિક સહાય પૂરતી મર્યાદિત નથી. તેનો મૂળ આશય "પરિવારથી સમાજ અને સમાજથી સહકાર"ની ભાવનાને મજબૂત કરવાનો છે. દરેક સભ્યના નાના સહયોગથી જરૂરિયાતના સમયે મોટા પરિવારનો સહારો ઊભો થાય છે.'
				},
				{
					q: 'યોજનામાં કોણ સભ્ય બની શકે?',
					a: '18 થી 55 વર્ષની ઉંમરના, ભારતમાં વસતા ભટ્ટ મેવાડા બ્રાહ્મણ જ્ઞાતિના વ્યક્તિ સભ્યપદ માટે અરજી કરી શકે છે.'
				},
				{
					q: 'સભ્ય બનવા માટે ઉંમરનો પુરાવો આપવો જરૂરી છે?',
					a: 'હા. શાળા છોડ્યાનું પ્રમાણપત્ર, પાસપોર્ટ, ડ્રાઇવિંગ લાઇસન્સ અથવા આધારકાર્ડ પૈકી કોઈ એક માન્ય પુરાવો પ્રવેશપત્ર સાથે આપવો જરૂરી છે. જો આપની ઉંમર 50 થી 55 વર્ષની વચ્ચે છે, તો આપે માન્યતા પ્રાપ્ત મેડિકલ ઓફિસર (MBBS અથવા ઉપરી) પાસેથી ફિઝિકલ ફિટનેસ પ્રમાણપત્ર જોડવું જરૂરી છે.'
				},
				{
					q: 'સભ્ય બનવા માટે કેટલી રકમ ચૂકવવાની રહેશે?',
					a: 'ઉંમર પ્રમાણે રકમ અલગ છે:\n\n<strong>18 થી 40 વર્ષ</strong>: ₹250 દાખલ ફી + ₹500 ડિપોઝિટ + ₹50 કોર્પસ ફી = <strong>₹800</strong>\n<strong>41 થી 50 વર્ષ</strong>: ₹500 દાખલ ફી + ₹500 ડિપોઝિટ + ₹50 કોર્પસ ફી = <strong>₹1,050</strong>\n<strong>51 થી 55 વર્ષ</strong>: ₹1,500 દાખલ ફી + ₹500 ડિપોઝિટ + ₹50 કોર્પસ ફી = <strong>₹2,550</strong>\n\nઆ રકમ એક જ વખત ભરવાની રહેશે.',
					html: true
				},
				{
					q: 'ડિપોઝિટનો હેતુ શું છે?',
					a: 'સભ્યપદ સાથે લેવાતી ₹500ની ડિપોઝિટ યોજનાની નાણાકીય વ્યવસ્થાનો એક ભાગ છે. નિયમો મુજબ કોઈપણ સંજોગોમાં ડિપોઝિટ પરત મળવાપાત્ર રહેશે નહીં.'
				},
				{
					q: 'સભ્ય બન્યા પછી તરત જ યોજનાનો લાભ મળે છે?',
					a: 'નહીં. સભ્ય બન્યા પછી 12 મહિના સળંગ સભ્યપદ પૂર્ણ થયા બાદ અને કોઈ સભ્યના અવસાનના કિસ્સામાં સમયસર ફાળો ભર્યા બાદ જ યોજનાનો લાભ મળવાપાત્ર બને છે.'
				},
				{
					q: 'કોઈ સભ્યનું અવસાન થાય ત્યારે સહાય કેવી રીતે ઊભી થાય છે?',
					a: 'દરેક ચાલુ સભ્યે મરણ પામનાર સભ્યદીઠ ₹100નો સહભાગી ફાળો આપવાનો હોય છે. આ રીતે સમાજના અનેક સભ્યોનો નાનો-નાનો સહયોગ મૃત્યુ પામનાર સભ્યના પરિવાર માટે સામૂહિક આર્થિક સહાયમાં પરિવર્તિત થાય છે.'
				},
				{
					q: '₹100નો ફાળો શા માટે?',
					a: 'કારણ કે યોજનાની તાકાત મોટા ફાળામાં નહીં, પરંતુ દરેક સભ્યના નાના અને નિયમિત સહયોગમાં છે. ₹100 વ્યક્તિ માટે નાની રકમ છે, પરંતુ સમગ્ર સમાજ જોડાય ત્યારે તે મુશ્કેલીના સમયે નોંધપાત્ર સહાય બની શકે છે.'
				},
				{
					q: 'મૃત્યુની જાણ કોણ અને કેવી રીતે કરશે?',
					a: 'સભ્યના વારસદારે ફેડરેશનને લેખિત જાણ સાથે મરણ પ્રમાણપત્ર રજૂ કરવાનું રહેશે.'
				},
				{
					q: 'મૃત્યુની જાણ થયા પછી સહાય ક્યારે ચૂકવવામાં આવશે?',
					a: 'જરૂરી કાર્યવાહી અને દસ્તાવેજોની ચકાસણી પૂર્ણ થયા બાદ 30 દિવસની અંદર ચેક દ્વારા સહાય ચૂકવવાની જોગવાઈ છે.'
				},
				{
					q: 'નોમીની રાખવો જરૂરી છે?',
					a: 'હા. પ્રથમ વારસદાર/નોમીની ફરજિયાત છે. બીજો નોમીની રાખવો વૈકલ્પિક છે. પ્રથમ નોમીની હયાત ન હોય તો નિયમ મુજબ બીજા નોમીનીને ચૂકવણી કરી શકાય છે.'
				},
				{
					q: 'શું નોમીની બદલી શકાય છે?',
					a: 'હા. ₹50ની ફી ભરીને વારસદાર/નોમીનીમાં ફેરફાર કરી શકાય છે.'
				},
				{
					q: 'જો સભ્ય સતત બે વખત સભ્ય ફાળો નહીં ભરે તો શું થશે?',
					a: 'નિયમ મુજબ, સતત બે વાર સભ્ય ફાળો ન ભરવાથી સભ્યપદ આપોઆપ રદ થશે અને ડિપોઝિટ જપ્ત થશે. આમ છતાં, સભ્ય લેટ ફી ભરીને સભ્યપદ ચાલુ રાખવા માટે અરજી કરી શકે છે, પરંતુ તેનો સ્વીકાર કરવો કે નહીં તેનો અધિકાર સંસ્થા પાસે રહેશે.'
				},
				{
					q: 'સભ્યનું સરનામું અથવા મોબાઈલ નંબર બદલાય તો શું કરવું?',
					a: 'ફેડરેશનને તાત્કાલિક જાણ કરવી જરૂરી છે, જેથી મહત્વની માહિતી, ફાળો તથા યોજનાની કાર્યવાહી અંગેનો સંપર્ક જળવાઈ રહે.'
				},
				{
					q: 'યોજનામાં જોડાયા પછી કોઈ માહિતી ખોટી હોવાનું જણાય તો?',
					a: 'પ્રવેશ સમયે ખોટી માહિતી આપવામાં આવી હોય અથવા ફેડરેશનને ગેરમાર્ગે દોરવાનો પ્રયાસ થયો હોય તો કારોબારીને નિયમ મુજબ સભ્યપદ રદ કરવાનો અધિકાર રહેશે.'
				},
				{
					q: 'યોજનામાં જોડાવાનો સૌથી મોટો લાભ શું છે?',
					a: 'તેનો સૌથી મોટો લાભ માત્ર મળતી રકમ નથી; પરંતુ એ વિશ્વાસ છે કે મુશ્કેલીની ઘડીએ વ્યક્તિ એકલી નથી—સમગ્ર ભટ્ટ મેવાડા પરિવાર તેની સાથે છે.'
				},
				{
					q: 'શું આ યોજનાને સમાજ પ્રત્યેની આપણી જવાબદારી તરીકે જોઈ શકાય?',
					a: 'ચોક્કસ. સભ્યપદ એટલે માત્ર પોતાને મળતી સહાયની અપેક્ષા નહીં, પરંતુ બીજા પરિવારના દુઃખમાં પણ પોતાની ફરજ નિભાવવાની પ્રતિબદ્ધતા.'
				},
				{
					q: 'યોજનાનો મૂળ સંદેશ શું છે?',
					a: '"આજે આપણે કોઈના પરિવારના દુઃખમાં સહભાગી બનીશું, કાલે જરૂર પડે ત્યારે સમાજ આપણો સહારો બનશે."'
				},
				{
					q: 'દરેક ભટ્ટ મેવાડા પરિવારને આ યોજનામાં જોડાવું કેમ જોઈએ?',
					a: 'કારણ કે આ યોજના વ્યક્તિગત લાભ કરતાં સામૂહિક સુરક્ષાની ભાવના પર આધારિત છે. આપનો નાનો ફાળો કોઈ એક પરિવાર માટે મોટી આશા બની શકે છે. વધુમાં વધુ પરિવારો જોડાશે, તેટલો સમાજનો પરસ્પર વિશ્વાસ, સહકાર અને સુરક્ષાનો ભાવ મજબૂત બનશે.'
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
		<p class="mt-1 text-sm text-gray-500">{c.subtitle}</p>

		<div class="mt-6 divide-y divide-gray-100">
			{#each c.faqs as faq, i (faq.q)}
				<details class="group py-4">
					<summary
						class="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-gray-800 marker:content-none"
					>
						<span>{i + 1}. {faq.q}</span>
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

		<div class="mt-10 border-t border-gray-100 pt-6 text-sm leading-relaxed text-gray-700 italic">
			{#each c.closing as para (para)}
				<p class="mt-2 first:mt-0">{para}</p>
			{/each}
		</div>

		<div class="mt-8 text-center">
			<a
				href={withLang(lang, '/login')}
				class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
			>
				{c.memberLogin}
			</a>
		</div>
	</main>
</div>
