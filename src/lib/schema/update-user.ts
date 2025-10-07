import { APP_CONSTANTS } from '$lib/constants/app-constants';
import * as Yup from 'yup';

export const userRegistrationSchema = Yup.object().shape({
	firstName: Yup.string()
		.required('First Name is required')
		.min(2, 'Minimum 2 letters required')
		.matches(APP_CONSTANTS.VALIDATIONS.names, 'Enter a valid Name'),
	middleName: Yup.string()
		.required('Middle Name is required')
		.matches(APP_CONSTANTS.VALIDATIONS.names, 'Enter a valid Name'),
	lastName: Yup.string()
		.required('Surname is required')
		.min(2, 'Minimum 2 letters required')
		.matches(APP_CONSTANTS.VALIDATIONS.names, 'Enter a valid Name'),
	mobileNumber: Yup.string()
		.required('Mobile number is required')
		.matches(APP_CONSTANTS.VALIDATIONS.numberOnly, 'Must be only digits')
		.length(10, 'Must be exactly 10 digits'),
	email: Yup.string().email('Invalid email').required('Email is required'),
	gender: Yup.string().required('Gender is required'),
	dob: Yup.date().required('Date is required'),
	password: Yup.string()
		.matches(
			APP_CONSTANTS.VALIDATIONS.password,
			'Password must be at least 8 characters long and must contain at least one uppercase, lowercase and number. SPACE NOT ALLOWED'
		)
		.required('Password is required')
		.min(8),
	confirmPassword: Yup.string()
		.required('Confirm Password is required')
		.oneOf([Yup.ref('password')], 'Confirm Password different from Password'),
	status: Yup.string().required('Status is required'),
	refNum1: Yup.string().required('Reference Number 1 is required'),
	refNum2: Yup.string().required('Reference Number 2 is required')
});

export const profileDetailsSchema = Yup.object().shape({
	maritalStatus: Yup.string().required('Marital Status is required'),
	gotra: Yup.string().required('Gotra is required'),
	nativePlace: Yup.string()
		.required('Native Place is required')
		.min(2, 'Minimum 2 letters required')
		.matches(APP_CONSTANTS.VALIDATIONS.names, 'Enter a valid Place')
});

export const addressFormValidationSchema = Yup.object().shape({
	addressLine1: Yup.string().required('Address Line 1 is required'),
	addressLine2: Yup.string().required('Address Line 2 is required'),
	areaName: Yup.string().required('Area Name is required'),
	landmark: Yup.string().required('Landmark is required'),
	city: Yup.string().required('City is required'),
	pincode: Yup.string()
		.required('Pincode is required')
		.length(6, 'Must be exactly 6 digits')
		.matches(APP_CONSTANTS.VALIDATIONS.numberOnly, 'Must be only digits'),
	state: Yup.string().required('State is required'),
	country: Yup.string().required('Country is required')
});

// Combined schema
export const updateUserSchema = userRegistrationSchema
	.concat(profileDetailsSchema)
	.concat(addressFormValidationSchema);

export const createUserSchema = Yup.object().shape({
	firstName: Yup.string()
		.required('First Name is required')
		.min(2, 'Minimum 2 letters required')
		.matches(APP_CONSTANTS.VALIDATIONS.names, 'Enter a valid Name'),
	middleName: Yup.string()
		.required('Middle Name is required')
		.matches(APP_CONSTANTS.VALIDATIONS.names, 'Enter a valid Name'),
	lastName: Yup.string()
		.required('Surname is required')
		.min(2, 'Minimum 2 letters required')
		.matches(APP_CONSTANTS.VALIDATIONS.names, 'Enter a valid Name'),
	mobileNumber: Yup.string()
		.required('Mobile number is required')
		.matches(APP_CONSTANTS.VALIDATIONS.numberOnly, 'Must be only digits')
		.length(10, 'Must be exactly 10 digits'),
	email: Yup.string().email('Invalid email').required('Email is required'),
	password: Yup.string()
		.matches(
			APP_CONSTANTS.VALIDATIONS.password,
			'Password must be at least 8 characters long and must contain at least one uppercase, lowercase and number.SPACE NOT ALLOWED'
		)
		.required('Password is required')
		.min(8),
	confirmPassword: Yup.string()
		.required('Confirm Password is required')
		.oneOf([Yup.ref('password')], 'Confirm Password different from Password')
});
