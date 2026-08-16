import type { ParamMatcher } from '@sveltejs/kit';

// Restricts the optional [[lang=lang]] route segment to known language
// codes only, so e.g. /guj/me matches but arbitrary segments don't get
// swallowed as a language.
export const match: ParamMatcher = (param) => {
	return param === 'guj';
};
