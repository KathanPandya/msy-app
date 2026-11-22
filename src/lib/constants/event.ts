export const REGISTRATION_HOST = 'registration.bhattmewada.org';

export const isRegistrationHost = () =>
	typeof location !== 'undefined' && location.hostname === REGISTRATION_HOST;
