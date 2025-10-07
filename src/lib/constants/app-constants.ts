export const APP_CONSTANTS = {
	VALIDATIONS: {
		names: /^[A-Za-z\s'-]{2,}$/,
		numberOnly: /^[0-9]+$/,
		password: /^(?=.{8,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]+$/
	},

	MARITAL_STATUS: [
		{ key: '', label: 'Select status' },
		{
			key: 'married',
			label: 'Married'
		},
		{
			key: 'unmarried',
			label: 'Unmarried'
		},
		{
			key: 'divorced',
			label: 'Divorced'
		},
		{
			key: 'widow',
			label: 'Widow'
		},
		{
			key: 'divorced with child',
			label: 'Divorced with child'
		}
	],

	GOTRAS: [
		{ key: '', label: 'Select gotra' },
		{
			key: 'shandilya',
			label: 'Shandilya'
		},
		{
			key: 'parashar',
			label: 'Parashar'
		},
		{
			key: 'bhargav',
			label: 'Bhargav'
		},
		{
			key: 'kashyap',
			label: 'Kashyap'
		},
		{
			key: 'vatchhas',
			label: 'Vatchhas'
		}
	],

	GENDERS: [
		{ key: '', label: 'Select gender' },
		{ key: 'female', label: 'Female' },
		{ key: 'male', label: 'Male' }
	],

	MEMBER_STATUS: [
		{ key: '', label: 'Select status' },
		{ key: 'active', label: 'Active' },
		{ key: 'draft', label: 'Draft' },
		{ key: 'removed', label: 'Removed' },
		{ key: 'dead', label: 'Dead' }
	]
};
