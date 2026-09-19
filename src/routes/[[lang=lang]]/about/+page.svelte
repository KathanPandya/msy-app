<script lang="ts">
	import { page } from '$app/state';
	import { withLang } from '$lib/i18n';
	import { ArrowLeft } from '@lucide/svelte';
	import { TRUST_NAME_EN, TRUST_NAME_GUJ, TRUST_REGISTRATION_NO } from '$lib/constants/trust';
	import rameshJoshi from '$lib/assets/committee-members/ramesh-joshi.jpeg';
	import vibhakarBhatt from '$lib/assets/committee-members/vibhakar-bhatt.jpeg';
	import dilipJoshi from '$lib/assets/committee-members/dilip-joshi.jpeg';
	import bharatPandya from '$lib/assets/committee-members/bharat-pandya.jpeg';

	const lang = $derived(page.params.lang as 'guj' | undefined);

	const langSwitchHref = $derived(
		lang === 'guj' ? page.url.pathname.replace(/^\/guj/, '') || '/' : `/guj${page.url.pathname}`
	);
	const langSwitchLabel = $derived(
		lang === 'guj' ? 'Use website in English' : 'વેબસાઇટ ગુજરાતીમાં વાપરો'
	);

	const leadership = [
		{
			photo: rameshJoshi,
			name: { en: 'Shri Rameshbhai M. Joshi', guj: 'શ્રી રમેશભાઈ એમ. જોષી' },
			role: { en: 'Founding President', guj: 'સ્થાપક પ્રમુખ' },
			phone: ''
		},
		{
			photo: vibhakarBhatt,
			name: { en: 'Shri Vibhakarbhai C. Bhatt', guj: 'શ્રી વિભાકરભાઈ સી. ભટ્ટ' },
			role: { en: 'President', guj: 'પ્રમુખ' },
			phone: '+91 94263 81789'
		},
		{
			photo: dilipJoshi,
			name: { en: 'Shri Dilipbhai K. Joshi', guj: 'શ્રી દલીપભાઈ કે. જોષી' },
			role: { en: 'General Secretary', guj: 'મહામંત્રી' },
			phone: '+91 94284 15260'
		},
		{
			photo: bharatPandya,
			name: { en: 'Shri Bharatbhai A. Pandya', guj: 'શ્રી ભરતભાઈ એ. પંડ્યા' },
			role: { en: 'Treasurer', guj: 'ખજાનચી' },
			phone: '+91 98988 97380'
		}
	];

	const otherBearerGroups = [
		{
			role: { en: 'Vice President', guj: 'ઉપપ્રમુખ' },
			members: [
				{
					name: { en: 'Shri Maheshbhai A. Joshi', guj: 'શ્રી મહેશભાઈ એ. જોષી' },
					phone: '+91 94265 09102'
				},
				{
					name: { en: 'Shri Rajeshbhai M. Joshi', guj: 'શ્રી રાજેશભાઈ એમ. જોષી' },
					phone: '+91 98799 55402'
				}
			]
		},
		{
			role: { en: 'Secretary', guj: 'મંત્રી' },
			members: [
				{
					name: { en: 'Shri Girishbhai M. Vyas', guj: 'શ્રી ગિરીશભાઈ એમ. વ્યાસ' },
					phone: '+91 94267 27671'
				},
				{
					name: { en: 'Shri Yogeshbhai N. Peshwa', guj: 'શ્રી યોગેશભાઈ એન. પેશ્વા' },
					phone: '+91 7990 406334'
				}
			]
		},
		{
			role: { en: 'Internal Auditor', guj: 'આંતરિક ઓડિટર' },
			members: [
				{
					name: { en: 'Shri Ashishbhai Bhatt', guj: 'શ્રી આશિષભાઈ ભટ્ટ' },
					phone: '+91 94263 08621'
				},
				{
					name: { en: 'Shri Atulbhai K. Joshi', guj: 'શ્રી અતુલભાઈ કે. જોષી' },
					phone: '+91 98795 13164'
				}
			]
		},
		{
			role: { en: 'Co-Treasurer', guj: 'સહખજાનચી' },
			members: [
				{
					name: { en: 'Shri Kashyapbhai J. Gor', guj: 'શ્રી કશ્યપભાઈ જે. ગોર' },
					phone: '+91 72840 10915'
				}
			]
		},
		{
			role: { en: 'Advisor', guj: 'સલાહકાર' },
			members: [
				{ name: { en: 'Shri Rameshbhai M. Joshi', guj: 'શ્રી રમેશભાઈ એમ. જોષી' }, phone: '' },
				{ name: { en: 'Shri Vinayakbhai K. Pandya', guj: 'શ્રી વિનાયકભાઈ કે. પંડ્યા' }, phone: '' }
			]
		}
	];

	type Section = {
		title: string;
		href?: string;
		subheading?: string;
		paragraphs: string[];
		html?: boolean;
	};
	type PageContent = {
		back: string;
		title: string;
		orgName: string;
		registration: string;
		intro: string;
		introHtml?: boolean;
		activities?: { label: string; href?: string }[];
		sections: Section[];
		leadershipTitle: string;
		otherBearersTitle: string;
	};

	const content: { en: PageContent; guj: PageContent } = {
		en: {
			back: 'Back',
			title: 'About Us',
			orgName: TRUST_NAME_EN,
			registration: `(Registration No. ${TRUST_REGISTRATION_NO})`,
			intro:
				'At our organization Akhil Hind Bhatt Mewada Bhrahm Samaj Federation, we are dedicated to supporting economically disadvantaged families and students through a series of initiatives. Our efforts are to provide immediate relief and long-term support while preserving the dignity and self-respect of those we assist. Here’s a detailed overview of the key activities we undertake to help those in need:',
			activities: [
				{ label: 'Anaj Sahay (Food Assistance)', href: '/other-schemes#anaj-sahay' },
				{ label: 'Parivar Kalyan Mrutyu Sahay Yojana' },
				{ label: 'Education helps', href: '/other-schemes#shikshan-sahay' },
				{ label: 'Empowering Youth Through Seminars and Workshops' },
				{ label: 'Jivan Sathi Pasandagi Mela' }
			],
			sections: [
				/* Sections 4 & 5 — commented out per request, not deleted.
				{
					title: '4. Empowering Youth Through Seminars and Workshops',
					subheading: undefined as string | undefined,
					paragraphs: [
						'We recognize the vital role of youth in shaping the future and thus focus on empowering them through seminars and workshops. Through the seminars on startups, we provide young people with the tools, knowledge, and inspiration needed to pursue their own business ventures. These sessions cover topics such as business planning, innovation, and financial management, and feature successful entrepreneurs who share their experiences and insights. Additionally, we organize job fairs to connect youth with potential employers and career opportunities, bridging the gap between education and employment.'
					],
					html: false
				},
				{
					title: '5. Jivan Sathi Pasandagi Mela',
					subheading: 'An Opportunity to Find Your Life Partner Within Our Community',
					paragraphs: [
						'Marriage is one of the most important decisions in life, and finding a compatible life partner who shares our values, culture, traditions, and family background can make that journey more meaningful.',
						'Through this special community gathering, we are providing <strong>young people an opportunity to meet and connect with other eligible members of our community who are looking for their life partner</strong>. The event creates a respectful and welcoming environment where individuals and families can interact, understand each other, and explore the possibility of building a lifelong relationship.',
						'Such initiatives are important because they help <strong>strengthen community connections, preserve our shared values and traditions, and create meaningful opportunities for the younger generation</strong>. Most importantly, the event is about bringing people together—giving them a platform to meet, communicate, and make an informed decision about their future.'
					],
					html: true
				}
				*/
			],
			leadershipTitle: 'Office Bearers',
			otherBearersTitle: 'Committee Members'
		},
		guj: {
			back: 'પાછળ',
			title: 'અમારા વિશે',
			orgName: TRUST_NAME_GUJ,
			registration: `(નોંધણી ક્રમાંક: ${TRUST_REGISTRATION_NO})`,
			intro:
				'અમારી સંસ્થા અખિલ હિંદ ભટ્ટ મેવાડા બ્રહ્મ સમાજ ફેડરેશન દ્વારા આર્થિક રીતે નબળા પરિવારો અને વિદ્યાર્થીઓને સહાય અને સશક્તિકરણ આપવા માટે વિવિધ સેવાકીય પ્રવૃત્તિઓ હાથ ધરવામાં આવે છે. જરૂરિયાતમંદ વ્યક્તિઓને તાત્કાલિક સહાય પૂરી પાડવાની સાથે સાથે તેમને લાંબા ગાળે આત્મનિર્ભર બનાવવાના હેતુથી અમારી સંસ્થા સતત પ્રયત્નશીલ છે. સહાય મેળવનાર વ્યક્તિના ગૌરવ, આત્મસન્માન અને સ્વાભિમાનને જાળવી રાખીને તેમને જરૂરી સહયોગ આપવો એ અમારી કામગીરીનો મુખ્ય હેતુ છે.\n\nજરૂરિયાતમંદ પરિવારો અને વિદ્યાર્થીઓના કલ્યાણ માટે અમારી સંસ્થા દ્વારા હાથ ધરવામાં આવતી મુખ્ય પ્રવૃત્તિઓ નીચે મુજબ છે:',
			introHtml: true,
			sections: [
				{
					title: '1. અનાજ સહાય',
					href: '/other-schemes#anaj-sahay',
					paragraphs: [
						'આર્થિક રીતે નબળા અને જરૂરિયાતમંદ પરિવારોને તેમના દૈનિક જીવનમાં જરૂરી અનાજ તથા ખાદ્ય સામગ્રીની સહાય પૂરી પાડવામાં આવે છે. આ પહેલનો મુખ્ય હેતુ જરૂરિયાતમંદ પરિવારોને જીવનની મૂળભૂત જરૂરિયાત પૂરી કરવામાં સહયોગ આપવાનો છે.'
					]
				},
				{
					title: '2. પરિવાર કલ્યાણ – મૃત્યુ સહાય યોજના',
					paragraphs: [
						'પરિવારમાં મુખ્ય કમાઉ સભ્યનું અવસાન થવાથી પરિવાર પર આવતી આર્થિક મુશ્કેલીને ધ્યાનમાં રાખીને, જરૂરિયાતમંદ પરિવારોને મૃત્યુ સહાય આપવામાં આવે છે. અચાનક સર્જાયેલી આર્થિક પરિસ્થિતિમાં પરિવારને થોડી રાહત મળે અને તેઓ મુશ્કેલ સમયમાંથી સ્વમાનપૂર્વક પસાર થઈ શકે તે માટે આ યોજના અમલમાં મૂકવામાં આવે છે.'
					]
				},
				{
					title: '3. શિક્ષણ સહાય',
					href: '/other-schemes#shikshan-sahay',
					paragraphs: [
						'આર્થિક પરિસ્થિતિને કારણે કોઈપણ વિદ્યાર્થીનું શિક્ષણ અટકી ન જાય તે માટે જરૂરિયાતમંદ વિદ્યાર્થીઓને શૈક્ષણિક સહાય આપવામાં આવે છે. અભ્યાસક્રમને અનુરૂપ ફી, પુસ્તકો, શૈક્ષણિક સામગ્રી તથા અન્ય જરૂરી સહાય દ્વારા વિદ્યાર્થીઓને તેમનું શિક્ષણ ચાલુ રાખવા માટે પ્રોત્સાહિત કરવામાં આવે છે.'
					]
				}
				/* Sections 4 & 5 — commented out per request, not deleted.
				{
					title: '4. સેમિનાર અને વર્કશોપ દ્વારા યુવાનોનું સશક્તિકરણ',
					paragraphs: [
						'અમે માનીએ છીએ કે યુવાનો સમાજ અને દેશના ભવિષ્યના ઘડવૈયા છે. તેથી યુવાનોને યોગ્ય માર્ગદર્શન, જ્ઞાન અને તકો પૂરી પાડીને તેમને સશક્ત બનાવવાના હેતુથી અમારી સંસ્થા વિવિધ સેમિનાર અને વર્કશોપનું આયોજન કરે છે.',
						'ખાસ કરીને સ્ટાર્ટઅપ અને ઉદ્યોગસાહસિકતા અંગેના સેમિનાર દ્વારા યુવાનોને પોતાનો વ્યવસાય શરૂ કરવા માટે જરૂરી જ્ઞાન, કૌશલ્ય અને પ્રેરણા પૂરી પાડવામાં આવે છે. આ સત્રોમાં વ્યવસાયનું આયોજન, નવીનતા, નાણાકીય વ્યવસ્થાપન જેવા મહત્વપૂર્ણ વિષયો અંગે માર્ગદર્શન આપવામાં આવે છે. સફળ ઉદ્યોગસાહસિકોને આમંત્રિત કરીને તેમના અનુભવો, સફળતાની યાત્રા અને વ્યવસાયિક ક્ષેત્રે મળેલા પડકારો અંગે પણ યુવાનો સાથે સંવાદ કરવામાં આવે છે.',
						'આ ઉપરાંત, યુવાનોને યોગ્ય રોજગારીની તકો સાથે જોડવા માટે જોબ ફેર (રોજગાર મેળા)નું પણ આયોજન કરવામાં આવે છે. આવા મેળાઓ દ્વારા યુવાનોને વિવિધ સંસ્થાઓ અને સંભવિત નોકરીદાતાઓ સાથે સીધો સંપર્ક કરવાની તથા પોતાની લાયકાત અને કૌશલ્ય અનુસાર કારકિર્દીની તકો મેળવવાની તક મળે છે.',
						'આ રીતે અમારી સંસ્થા સહાય, શિક્ષણ, રોજગાર અને સ્વાવલંબન દ્વારા સમાજના જરૂરિયાતમંદ પરિવારો અને યુવાનોના સર્વાંગી વિકાસ માટે સતત કાર્યરત છે.'
					]
				},
				{
					title: '5. જીવનસાથી પસંદગી મેળા',
					subheading: 'આપણા સમાજમાં જીવનસાથી શોધવાની એક સુંદર તક',
					paragraphs: [
						'લગ્ન જીવનના સૌથી મહત્વપૂર્ણ નિર્ણયો પૈકીનો એક છે. આપણી સાથે સુસંગત જીવનસાથી, જે આપણા મૂલ્યો, સંસ્કૃતિ, પરંપરાઓ અને પારિવારિક પૃષ્ઠભૂમિને સમજે અને સન્માન આપે, તેની સાથે જીવનની સફર વધુ સુખદ અને અર્થપૂર્ણ બની શકે છે.',
						'આ ખાસ સમાજલક્ષી મિલન સમારોહ દ્વારા અમે સમાજના યુવાનોને આપણા જ સમાજના એવા યોગ્ય યુવક-યુવતીઓ સાથે મળવાની અને પરસ્પર પરિચય કેળવવાની એક સુંદર તક પૂરી પાડી રહ્યા છીએ, જેઓ પોતાના જીવનસાથીની શોધમાં છે. આ કાર્યક્રમમાં વ્યક્તિઓ તેમજ તેમના પરિવારોને એક સન્માનપૂર્ણ અને આનંદદાયક વાતાવરણમાં પરસ્પર મળવા, વાતચીત કરવા, એકબીજાને સમજવા અને ભવિષ્યમાં જીવનસાથી તરીકેના સંબંધની શક્યતા અંગે વિચારવા માટેનું મંચ મળશે.',
						'આવા આયોજનોનું વિશેષ મહત્વ છે, કારણ કે તે સમાજમાં પરસ્પર જોડાણ અને એકતા મજબૂત કરવામાં, આપણી સંસ્કૃતિ અને પરંપરાઓને જાળવી રાખવામાં તથા નવી પેઢી માટે યોગ્ય અને અર્થપૂર્ણ સંબંધોની તકો ઊભી કરવામાં મહત્વપૂર્ણ ભૂમિકા ભજવે છે.',
						'સૌથી મહત્વની વાત એ છે કે આ કાર્યક્રમ માત્ર જીવનસાથી શોધવાનો પ્રસંગ નથી, પરંતુ લોકોને એકબીજાની નજીક લાવવાનો, પરિચય કેળવવાનો, સંવાદ કરવાનો અને પોતાના ભવિષ્ય અંગે સમજદારીપૂર્વક નિર્ણય લેવાનો એક સુંદર અવસર છે.'
					]
				}
				*/
			],
			leadershipTitle: 'હોદ્દેદારો',
			otherBearersTitle: 'સમિતિ સભ્યો'
		}
	};

	const c = $derived(lang === 'guj' ? content.guj : content.en);
</script>

<div class="min-h-full overflow-y-auto bg-white">
	<header class="flex items-center justify-between border-b border-gray-100 px-4 py-1.5 sm:px-6">
		<div class="flex items-center gap-3">
			<a
				href={withLang(lang, '/')}
				class="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
			>
				<ArrowLeft class="h-3.5 w-3.5" />
				{c.back}
			</a>
			<a href={withLang(lang, '/')} class="flex min-w-0 items-center gap-1">
				<img
					src="/logos/02_Website_Logo/website-logo-symbol-512.webp"
					alt=""
					class="h-8 w-8 flex-shrink-0"
				/>
				<div class="min-w-0 leading-tight">
					<p class="text-sm font-medium text-[#2f9fb3]"><b class="text-lg">M</b>rutyu <b class="text-lg">S</b>ahay <b class="-mr-0.5 text-lg">Y</b>ojana</p>
				</div>
			</a>
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
		<p class="mt-1 text-sm font-semibold text-gray-700">{c.orgName}</p>
		<p class="text-xs text-gray-400">{c.registration}</p>

		{#if lang === 'guj'}
			<p class="mt-4 text-sm leading-relaxed whitespace-pre-line text-gray-700">{c.intro}</p>
		{:else}
			<p class="mt-4 text-sm leading-relaxed text-gray-700">{c.intro}</p>
			<ol class="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-700">
				{#each c.activities ?? [] as activity (activity.label)}
					<li>
						{#if activity.href}
							<a href={activity.href} class="text-blue-600 hover:underline">{activity.label}</a>
						{:else}
							{activity.label}
						{/if}
					</li>
				{/each}
			</ol>
		{/if}

		<div class="mt-6 space-y-6">
			{#each c.sections as section (section.title)}
				<div>
					<h2 class="text-sm font-bold text-gray-900">
						{#if section.href}
							<a href={section.href} class="text-blue-600 hover:underline">{section.title}</a>
						{:else}
							{section.title}
						{/if}
					</h2>
					{#if section.subheading}
						<p class="mt-1 text-sm font-semibold text-gray-800">{section.subheading}</p>
					{/if}
					<div class="mt-2 space-y-2 text-sm leading-relaxed text-gray-700">
						{#each section.paragraphs as para (para)}
							{#if section.html}
								<p>{@html para}</p>
							{:else}
								<p>{para}</p>
							{/if}
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-10 border-t border-gray-100 pt-6">
			<h2 class="text-lg font-bold text-gray-900">{c.leadershipTitle}</h2>
			<div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
				{#each leadership as member (member.name.en)}
					<div class="text-center">
						<img
							src={member.photo}
							alt={lang === 'guj' ? member.name.guj : member.name.en}
							class="mx-auto h-20 w-20 rounded-full object-cover"
						/>
						<p class="mt-2 text-xs font-semibold text-gray-900">
							{lang === 'guj' ? member.name.guj : member.name.en}
						</p>
						<p class="text-[11px] text-gray-500">
							{lang === 'guj' ? member.role.guj : member.role.en}
						</p>
						{#if member.phone}
							<p class="text-[11px] text-gray-400">{member.phone}</p>
						{/if}
					</div>
				{/each}
			</div>

			<h3 class="mt-8 text-sm font-bold text-gray-900">{c.otherBearersTitle}</h3>
			<div class="mt-2 space-y-4">
				{#each otherBearerGroups as group (group.role.en)}
					<div>
						<p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">
							{lang === 'guj' ? group.role.guj : group.role.en}
						</p>
						<div class="mt-1 divide-y divide-gray-100">
							{#each group.members as member (member.name.en)}
								<div class="flex items-center justify-between gap-3 py-2 text-sm">
									<p class="min-w-0 truncate font-medium text-gray-900">
										{lang === 'guj' ? member.name.guj : member.name.en}
									</p>
									{#if member.phone}
										<span class="shrink-0 text-xs text-gray-400">{member.phone}</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</main>
</div>
