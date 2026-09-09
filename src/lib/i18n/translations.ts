export type Lang = 'en' | 'guj';

// Flat key → { en, guj } strings for the /me and /me/family/[id] pages
// (and the Payments component they embed). Only pages that opt in via the
// `lang` param/prop are translated — everything else stays English.
export const dict = {
	loading: { en: 'Loading…', guj: 'લોડ થઈ રહ્યું છે…' },
	logOut: { en: 'Log out', guj: 'લૉગ આઉટ' },
	head: { en: 'Head', guj: 'વડા' },
	greeting: { en: 'Hi, {name}', guj: 'નમસ્તે, {name}' },
	amountDue: { en: 'Amount due', guj: 'બાકી રકમ' },
	creditBalance: { en: 'Credit balance', guj: 'જમા રકમ' },
	toBePaid: { en: 'to be paid', guj: 'ચૂકવવાની બાકી' },
	inCredit: { en: 'in credit', guj: 'જમા' },
	allSettled: { en: 'All settled ✓', guj: 'સંપૂર્ણ ચૂકવેલ ✓' },
	amountToPay: { en: 'Amount to pay', guj: 'ચૂકવવાની રકમ' },
	quickSelectAmount: { en: 'Or pick an amount', guj: 'અથવા રકમ પસંદ કરો' },
	pay: { en: 'Pay', guj: 'ચૂકવો' },
	chooseUpiApp: { en: 'Choose a UPI app', guj: 'UPI એપ પસંદ કરો' },
	close: { en: 'Close', guj: 'બંધ કરો' },
	useAnotherApp: { en: 'Use another payment app', guj: 'બીજી ચુકવણી એપ વાપરો' },
	appNotInstalled: {
		en: "isn't installed on your device",
		guj: 'તમારા ડિવાઇસમાં ઇન્સ્ટોલ કરેલ નથી'
	},
	uploadScreenshotHeading: { en: 'Upload payment screenshot', guj: 'ચુકવણીનો સ્ક્રીનશોટ અપલોડ કરો' },
	paidAlreadyNotice: {
		en: "Paid already? Your due will be updated within 24–48 hours — it doesn't happen automatically.",
		guj: 'પહેલેથી ચૂકવ્યું છે? તમારી બાકી રકમ 24-48 કલાકમાં અપડેટ થશે — તે આપમેળે થતું નથી.'
	},
	screenshotSubmitted: {
		en: "Submitted — thanks, we'll verify it.",
		guj: 'સબમિટ થયું — આભાર, અમે તેની ચકાસણી કરીશું.'
	},
	closingIn: { en: 'Closing in', guj: 'બંધ થશે' },
	readyToSubmit: { en: 'Ready to submit', guj: 'સબમિટ કરવા તૈયાર' },
	submit: { en: 'Submit', guj: 'સબમિટ કરો' },
	submitting: { en: 'Submitting…', guj: 'સબમિટ થઈ રહ્યું છે…' },
	uploadScreenshot: { en: 'Upload payment screenshot', guj: 'ચુકવણીનો સ્ક્રીનશોટ અપલોડ કરો' },
	errFileSize: {
		en: 'File size must be less than 5MB',
		guj: 'ફાઇલનું કદ 5MB કરતાં ઓછું હોવું જોઈએ'
	},
	errFileType: {
		en: 'Only JPG or PNG screenshots are allowed',
		guj: 'ફક્ત JPG અથવા PNG સ્ક્રીનશોટની મંજૂરી છે'
	},
	errUploadFailed: {
		en: 'Upload failed. Please try again.',
		guj: 'અપલોડ નિષ્ફળ થયું. ફરી પ્રયાસ કરો.'
	},
	home: { en: 'Home', guj: 'હોમ' },
	profile: { en: 'Profile', guj: 'પ્રોફાઇલ' },
	familyMembers: { en: 'Family members', guj: 'પરિવારના સભ્યો' },
	you: { en: 'you', guj: 'તમે' },
	due: { en: 'due', guj: 'બાકી' },
	credit: { en: 'credit', guj: 'જમા' },
	settled: { en: 'settled', guj: 'ચૂકતે' },
	view: { en: 'View', guj: 'જુઓ' },
	details: { en: 'Details', guj: 'વિગતો' },
	joined: { en: 'Joined', guj: 'જોડાયા' },
	payingVia: { en: 'Paying via', guj: 'આના દ્વારા ચૂકવણી' },
	change: { en: 'Change', guj: 'બદલો' },
	openApp: { en: 'Open {app}', guj: '{app} ખોલો' },
	downloadQr: { en: 'Download QR', guj: 'QR ડાઉનલોડ કરો' },
	copyUpiId: { en: 'Copy UPI ID', guj: 'UPI ID કૉપિ કરો' },
	upiIdCopied: { en: 'UPI ID copied', guj: 'UPI ID કૉપિ થયું' },
	howToPayVia: { en: 'How to pay via {app}', guj: '{app} દ્વારા કેવી રીતે ચૂકવવું' },
	payStep1: {
		en: 'Set the amount, then download the QR',
		guj: 'રકમ સેટ કરો, પછી QR ડાઉનલોડ કરો'
	},
	payStep2: {
		en: 'Open PhonePe and tap the Scan icon at the bottom of the home screen. On the scan screen that opens, do NOT point your camera at anything — instead tap "Upload QR" near the bottom to choose the QR image from your gallery.',
		guj: 'PhonePe ખોલો અને હોમ સ્ક્રીનની નીચે આપેલા Scan આઇકન પર ટૅપ કરો. જે સ્કેન સ્ક્રીન ખૂલે તેમાં કેમેરાથી કંઈ સ્કેન ન કરો — તેના બદલે નીચે આપેલા "Upload QR" પર ટૅપ કરી ગેલેરીમાંથી QR ઇમેજ પસંદ કરો.'
	},
	payStep3: {
		en: 'From your gallery, select the QR code image you downloaded in step 1',
		guj: 'તમારી ગેલેરીમાંથી, સ્ટેપ 1માં ડાઉનલોડ કરેલી QR કોડ ઇમેજ પસંદ કરો'
	},
	payStep4: {
		en: 'Check the amount and tap Pay',
		guj: 'રકમ ચકાસો અને Pay પર ટૅપ કરો'
	},
	payStep5: {
		en: 'Come back and upload your payment screenshot',
		guj: 'પાછા આવો અને તમારો ચુકવણી સ્ક્રીનશોટ અપલોડ કરો'
	},
	orScanQr: {
		en: 'Or scan this QR with any UPI app',
		guj: 'અથવા આ QR ને કોઈપણ UPI એપથી સ્કેન કરો'
	},
	editAmountHint: {
		en: 'You can change the amount above — the QR updates automatically.',
		guj: 'તમે ઉપર રકમ બદલી શકો છો — QR આપમેળે અપડેટ થશે.'
	},
	invalidAppNotice: {
		en: "That app isn't recognized.",
		guj: 'તે એપ ઓળખાઈ નથી.'
	},
	member: { en: 'Member', guj: 'સભ્ય' },
	myPage: { en: '← My page', guj: '← મારું પેજ' },
	notAllowedToView: {
		en: 'Not allowed to view this member.',
		guj: 'આ સભ્યને જોવાની મંજૂરી નથી.'
	},
	status: { en: 'Status', guj: 'સ્થિતિ' },
	fatherHusband: { en: 'Father/Husband', guj: 'પિતા/પતિ' },
	mobile: { en: 'Mobile', guj: 'મોબાઇલ' },
	general: { en: 'General', guj: 'સામાન્ય' },
	address: { en: 'Address', guj: 'સરનામું' },
	save: { en: 'Save', guj: 'સાચવો' },
	cancel: { en: 'Cancel', guj: 'રદ કરો' },
	firstName: { en: 'First Name', guj: 'પ્રથમ નામ' },
	middleName: { en: 'Middle Name', guj: 'મધ્યમ નામ' },
	surname: { en: 'Surname', guj: 'અટક' },
	email: { en: 'Email', guj: 'ઇમેલ' },
	gender: { en: 'Gender', guj: 'લિંગ' },
	referenceMember1: { en: 'Reference Number 1', guj: 'સંદર્ભ નંબર 1' },
	referenceMember2: { en: 'Reference Number 2', guj: 'સંદર્ભ નંબર 2' },
	nativePlace: { en: 'Native Place', guj: 'મૂળ સ્થળ' },
	gotra: { en: 'Gotra', guj: 'ગોત્ર' },
	maritalStatus: { en: 'Marital Status', guj: 'વૈવાહિક સ્થિતિ' },
	addressLine1: { en: 'Address Line 1', guj: 'સરનામું લાઇન 1' },
	addressLine2: { en: 'Address Line 2', guj: 'સરનામું લાઇન 2' },
	areaName: { en: 'Area Name', guj: 'વિસ્તારનું નામ' },
	landmark: { en: 'Landmark', guj: 'લેન્ડમાર્ક' },
	city: { en: 'City', guj: 'શહેર' },
	pincode: { en: 'Pincode', guj: 'પિનકોડ' },
	state: { en: 'State', guj: 'રાજ્ય' },
	country: { en: 'Country', guj: 'દેશ' },
	updateSuccess: { en: 'Updated successfully.', guj: 'સફળતાપૂર્વક અપડેટ થયું.' },
	updateFailed: {
		en: 'Could not update. Please try again.',
		guj: 'અપડેટ કરી શકાયું નહીં. ફરી પ્રયાસ કરો.'
	},
	noAddressOnFile: { en: 'No address on file.', guj: 'કોઈ સરનામું નથી.' },
	nominees: { en: 'Nominees', guj: 'નોમિની' },
	noNominees: { en: 'No nominees on file.', guj: 'કોઈ નોમિની નથી.' },
	relation: { en: 'Relation', guj: 'સંબંધ' },
	relationNotSet: { en: 'Not set', guj: 'સેટ નથી' },
	setRelation: { en: 'Set relation', guj: 'સંબંધ સેટ કરો' },
	selectRelation: { en: 'Select relation', guj: 'સંબંધ પસંદ કરો' },
	relationFather: { en: 'Father', guj: 'પિતા' },
	relationMother: { en: 'Mother', guj: 'માતા' },
	relationSon: { en: 'Son', guj: 'પુત્ર' },
	relationDaughter: { en: 'Daughter', guj: 'પુત્રી' },
	relationWife: { en: 'Wife', guj: 'પત્ની' },
	relationHusband: { en: 'Husband', guj: 'પતિ' },
	relationBrother: { en: 'Brother', guj: 'ભાઈ' },
	relationSister: { en: 'Sister', guj: 'બહેન' },
	relationMotherInLaw: { en: 'Mother-in-law', guj: 'સાસુ' },
	relationSisterInLaw: { en: 'Sister-in-law', guj: 'નણંદ/ભાભી' },
	relationNephew: { en: 'Nephew', guj: 'ભાણિયો/ભત્રીજો' },
	noProfileData: { en: 'No profile data.', guj: 'કોઈ પ્રોફાઇલ ડેટા નથી.' },
	unsavedChangesConfirm: {
		en: 'You have unsaved changes. Leave without saving?',
		guj: 'તમારા ફેરફારો સાચવ્યા નથી. સાચવ્યા વિના જવું છે?'
	},
	viewOnlyNotice: {
		en: 'View-only. Payments and changes are handled by the admin.',
		guj: 'ફક્ત જોવા માટે. ચુકવણી અને ફેરફારો એડમિન દ્વારા સંભાળવામાં આવે છે.'
	},

	// Payments.svelte
	paymentSummary: { en: 'Payment Summary', guj: 'ચુકવણી સારાંશ' },
	total: { en: 'Total', guj: 'કુલ' },
	paid: { en: 'Paid', guj: 'ચૂકવેલ' },
	balance: { en: 'Balance', guj: 'બાકી' },
	bal: { en: 'Bal', guj: 'બાકી' },
	complete: { en: 'complete', guj: 'પૂર્ણ' },
	searchMembers: {
		en: 'Search members by name or mobile...',
		guj: 'નામ અથવા મોબાઇલ દ્વારા સભ્યો શોધો...'
	},
	paymentHistory: { en: 'Payment History', guj: 'ચુકવણી ઇતિહાસ' },
	allEntries: { en: 'All Entries', guj: 'બધી નોંધો' },
	payments: { en: 'Payments', guj: 'ચુકવણીઓ' },
	deadMembers: { en: 'Deceased Members', guj: 'નિધન પામેલા સભ્યો' },
	switchToCompact: { en: 'Switch to compact view', guj: 'કોમ્પેક્ટ વ્યુ પર સ્વિચ કરો' },
	switchToComfortable: { en: 'Switch to comfortable view', guj: 'આરામદાયક વ્યુ પર સ્વિચ કરો' },
	compact: { en: 'Compact', guj: 'કોમ્પેક્ટ' },
	comfortable: { en: 'Comfortable', guj: 'આરામદાયક' },
	downloadCsv: { en: 'Download CSV', guj: 'CSV ડાઉનલોડ કરો' },
	date: { en: 'Date', guj: 'તારીખ' },
	amount: { en: 'Amount', guj: 'રકમ' },
	remarks: { en: 'Remarks', guj: 'ટિપ્પણી' },
	paymentMode: { en: 'Payment Mode', guj: 'ચુકવણી પદ્ધતિ' },
	paymentType: { en: 'Payment Type', guj: 'ચુકવણી પ્રકાર' },
	dateOfDeath: { en: 'Date of Death', guj: 'મૃત્યુ તારીખ' },
	paymentDetails: { en: 'Payment Details', guj: 'ચુકવણી વિગતો' },
	referenceNumber: { en: 'Reference Number', guj: 'સંદર્ભ નંબર' },
	receiptNumber: { en: 'Receipt Number', guj: 'રસીદ નંબર' },
	description: { en: 'Description', guj: 'વર્ણન' },
	receipt: { en: 'Receipt', guj: 'રસીદ' },
	edit: { en: 'Edit', guj: 'સંપાદિત કરો' },

	// /me/payments/v2 (PaymentDonut.svelte, PaymentYearlyBars.svelte)
	yearlyChartTitle: {
		en: 'Yearly payments vs. contributions',
		guj: 'વર્ષવાર ચુકવણી અને ફાળો'
	},
	contributionLegend: {
		en: 'Contribution (deceased member)',
		guj: 'ફાળો (નિધન પામેલ સભ્ય)'
	},
	noPaymentHistoryYet: { en: 'No payment history yet.', guj: 'હજુ સુધી કોઈ ચુકવણી ઇતિહાસ નથી.' },
	paidInYear: { en: 'Paid in {year}', guj: '{year} માં ચૂકવેલ' },
	noPayments: { en: 'No payments.', guj: 'કોઈ ચુકવણી નથી.' },
	contributionAmountInYear: {
		en: 'Contribution amount in {year}',
		guj: '{year} માં ફાળાની રકમ'
	},
	noContributionsThisYear: { en: 'No contributions this year.', guj: 'આ વર્ષે કોઈ ફાળો નથી.' },
	hideCharts: { en: 'Hide charts', guj: 'ચાર્ટ છુપાવો' },
	showCharts: { en: 'Show charts', guj: 'ચાર્ટ બતાવો' },

	// login page
	memberLogin: { en: 'Member login', guj: 'સભ્ય લૉગિન' },
	welcomeBack: { en: 'Welcome back,', guj: 'ફરી સ્વાગત છે,' },
	firstLoginFor: { en: 'First login for', guj: 'પ્રથમ લૉગિન' },
	verifyDobAndSetPin: {
		en: 'Verify your date of birth and set a PIN.',
		guj: 'તમારી જન્મ તારીખ ચકાસો અને PIN સેટ કરો.'
	},
	pinSetByAdminNotice: {
		en: 'Your PIN was set by the admin. Please choose your own.',
		guj: 'તમારો PIN એડમિન દ્વારા સેટ કરવામાં આવ્યો હતો. કૃપા કરી તમારો પોતાનો પસંદ કરો.'
	},
	attemptsLeft: { en: 'attempt(s) left.', guj: 'પ્રયાસ(ો) બાકી છે.' },
	memberId: { en: 'Member ID', guj: 'સભ્ય ID' },
	errEnterIdFirst: { en: 'Please enter your ID.', guj: 'કૃપા કરી તમારું ID દાખલ કરો.' },
	fourDigitPin: { en: '4-digit PIN', guj: '4-અંકનો PIN' },
	continueLabel: { en: 'Continue', guj: 'આગળ વધો' },
	checking: { en: 'Checking…', guj: 'ચકાસી રહ્યા છીએ…' },
	logIn: { en: 'Log in', guj: 'લૉગ ઇન' },
	loggingIn: { en: 'Logging in…', guj: 'લૉગ ઇન થઈ રહ્યું છે…' },
	dateOfBirth: { en: 'Date of birth', guj: 'જન્મ તારીખ' },
	newFourDigitPin: { en: 'New 4-digit PIN', guj: 'નવો 4-અંકનો PIN' },
	confirmPin: { en: 'Confirm PIN', guj: 'નવા PIN ની પુષ્ટિ કરો' },
	setPinAndLogIn: { en: 'Set PIN & log in', guj: 'PIN સેટ કરો અને લૉગ ઇન કરો' },
	saving: { en: 'Saving…', guj: 'સાચવી રહ્યા છીએ…' },
	temporaryPin: { en: 'Temporary PIN', guj: 'એડમિન દ્વારા આપેલ પિન નાખો' },
	updatePin: { en: 'Update PIN', guj: 'PIN અપડેટ કરો' },
	updating: { en: 'Updating…', guj: 'અપડેટ થઈ રહ્યું છે…' },
	accountNotSelfActivated: {
		en: "isn't set up for self-activation.",
		guj: 'સ્વ-સક્રિયકરણ માટે સેટ નથી.'
	},
	askAdminForTempPin: {
		en: 'Please ask the admin for a temporary PIN, then come back to log in.',
		guj: 'કૃપા કરી કામચલાઉ PIN માટે એડમિનને પૂછો, પછી લૉગ ઇન કરવા પાછા આવો.'
	},
	accountLabel: { en: 'Account', guj: 'ખાતું' },
	isLocked: { en: 'is locked.', guj: 'લૉક છે.' },
	tooManyAttemptsNotice: {
		en: 'Too many incorrect attempts. Please contact the admin to unlock it.',
		guj: 'ઘણા ખોટા પ્રયાસો. તેને અનલૉક કરવા કૃપા કરી એડમિનનો સંપર્ક કરો.'
	},
	isInactive: { en: 'is inactive.', guj: 'નિષ્ક્રિય છે.' },
	membershipInactiveNotice: {
		en: 'This membership is no longer active. Please contact the admin.',
		guj: 'આ સભ્યપદ હવે સક્રિય નથી. કૃપા કરી એડમિનનો સંપર્ક કરો.'
	},
	startOver: { en: '← Start over', guj: '← ફરીથી શરૂ કરો' },
	needHelp: { en: 'Need help?', guj: 'મદદ જોઈએ છે?' },
	contactSupport: { en: 'Contact Support', guj: 'સપોર્ટનો સંપર્ક કરો' },
	loginToAdminPortal: { en: 'Login to admin portal', guj: 'એડમિન પોર્ટલમાં લૉગિન કરો' },
	errSomethingWrong: { en: 'Something went wrong.', guj: 'કંઈક ખોટું થયું.' },
	errLoginFailed: { en: 'Login failed.', guj: 'લૉગિન નિષ્ફળ થયું.' },
	errCouldNotSetPin: { en: 'Could not set PIN.', guj: 'PIN સેટ કરી શકાયો નહીં.' },
	errPinsMismatch: {
		en: 'New PIN and Confirm PIN should be the same.',
		guj: 'નવો PIN અને પુષ્ટિ કરેલ PIN સરખા હોવા જોઈએ.'
	},
	errCouldNotUpdatePin: { en: 'Could not update PIN.', guj: 'PIN અપડેટ કરી શકાયો નહીં.' },

	// other-schemes page
	knowOtherSchemes: { en: 'Know about our other schemes', guj: 'અમારી અન્ય યોજનાઓ' },
	annapurnaSchemeParagraph1: {
		en: 'Twice a year, we conduct an Anaj Sahay program aimed at providing essential food supplies to around 55 economically needy families. These families often struggle to meet their basic needs, and we offer them some relief without compromising their dignity. We understand the importance of maintaining the self-respect of those we assist, so we ensure that the distribution is conducted discreetly and respectfully. No public announcements or advertisements are made about this program; instead, we work quietly behind the scenes to ensure that the families receive the support they need in a manner that preserves their privacy.',
		guj: 'વર્ષમાં બે વાર, અમે આશરે 55 આર્થિક રીતે જરૂરિયાતમંદ પરિવારોને આવશ્યક અનાજ સહાય પૂરી પાડવા માટે "અનાજ સહાય" કાર્યક્રમનું આયોજન કરીએ છીએ. આ પરિવારો ઘણીવાર તેમની મૂળભૂત જરૂરિયાતો પૂરી કરવા માટે સંઘર્ષ કરે છે, અને અમે તેમના ગૌરવ સાથે સમાધાન કર્યા વિના તેમને થોડી રાહત આપીએ છીએ. અમે જેમને સહાય કરીએ છીએ તેમના આત્મસન્માન જાળવવાનું મહત્વ સમજીએ છીએ, તેથી અમે ખાતરી કરીએ છીએ કે વિતરણ સમજદારીપૂર્વક અને આદરપૂર્વક કરવામાં આવે. આ કાર્યક્રમ વિશે કોઈ જાહેરાતો કરવામાં આવતી નથી; તેના બદલે, અમે પડદા પાછળ શાંતિથી કામ કરીએ છીએ જેથી પરિવારોને જરૂરી સહાય મળી રહે તેની ખાતરી કરી શકાય - અને તેમની ગોપનીયતા જળવાઈ રહે.'
	},
	annapurnaSchemeParagraph2: {
		en: 'The Anaj Sahay packages typically include staple food items such as rice, wheat, lentils, and cooking oil, which are crucial for daily sustenance. By providing these essentials, we aim to alleviate the immediate financial burden on these families, allowing them to focus on other aspects of their lives without the added stress of securing food. The distribution process is handled with care and sensitivity, ensuring that the families feel supported and valued.',
		guj: 'અનાજ સહાયમાં સામાન્ય રીતે ચોખા, ઘઉં, દાળ, ગોળ, ચા, ખાંડ, ઘી અને રસોઈ તેલ જેવી મુખ્ય ખાદ્ય ચીજોનો સમાવેશ થાય છે, જે રોજિંદા જીવન માટે મહત્વપૂર્ણ છે. આ ઉપરાંત ઘરખર્ચ માટે ₹૨,૦૦૦/- રોકડ પણ આપવામાં આવે છે. આ આવશ્યક ચીજવસ્તુઓ પૂરી પાડીને, અમે આ પરિવારો પર તાત્કાલિક નાણાકીય બોજ ઘટાડવાનો હેતુ રાખીએ છીએ, જેથી તેઓ ખોરાક સુરક્ષિત કરવાના વધારાના તણાવ વિના તેમના જીવનના અન્ય પાસાઓ પર ધ્યાન કેન્દ્રિત કરી શકે. વિતરણ પ્રક્રિયા કાળજી અને સંવેદનશીલતા સાથે હાથ ધરવામાં આવે છે, ખાતરી કરે છે કે પરિવારો ટેકો અને મૂલ્યવાન અનુભવે છે.'
	},
	contributeUseBankDetails: {
		en: 'To contribute in this scheme, use below bank details',
		guj: 'આ યોજનામાં યોગદાન આપવા માટે, નીચેની બેંક વિગતોનો ઉપયોગ કરો'
	},
	shikshanSchemeParagraph: {
		en: 'Under this scheme, we provide scholarships and interest-free loans to students who require additional financial support. These loans are intended to cover educational expenses that are not fully met by scholarships or other sources of funding. The application process for these loans ensures that assistance is provided to those who truly need it.',
		guj: 'આ યોજના હેઠળ, અમે એવા વિદ્યાર્થીઓને શિષ્યવૃત્તિ અને વ્યાજમુક્ત લોન પ્રદાન કરીએ છીએ જેમને વધારાની નાણાકીય સહાયની જરૂર હોય છે. આ લોનનો હેતુ એવા શૈક્ષણિક ખર્ચાઓને આવરી લેવાનો છે જે શિષ્યવૃત્તિ અથવા ભંડોળના અન્ય સ્ત્રોતો દ્વારા સંપૂર્ણપણે પૂર્ણ થતા નથી. આ લોન માટેની અરજી પ્રક્રિયા ખાતરી કરે છે કે જેમને ખરેખર તેની જરૂર હોય તેમને સહાય પૂરી પાડવામાં આવે. આ યોજનામાં યોગદાન આપવા માટે, નીચેની બેંક વિગતોનો ઉપયોગ કરો.'
	},
	bankLabel: { en: 'Bank', guj: 'બેંક' },
	bankNameBoi: { en: 'Bank Of India', guj: 'બેંક ઓફ ઇન્ડિયા' },
	accountNumberLabel: { en: 'Account number', guj: 'ખાતા નંબર' },
	ifscCodeLabel: { en: 'IFSC code', guj: 'IFSC કોડ' },
	copy: { en: 'Copy', guj: 'કૉપિ કરો' },
	copied: { en: 'Copied!', guj: 'કૉપિ થયું!' }
} as const;

export type DictKey = keyof typeof dict;
