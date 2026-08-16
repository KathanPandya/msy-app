import { dict, type DictKey, type Lang } from './translations';

export type { Lang };

export function t(lang: Lang | undefined, key: DictKey): string {
	return dict[key][lang === 'guj' ? 'guj' : 'en'];
}

// Prefix to prepend to internal links so navigation stays in the same
// language, e.g. withLang('guj', '/me/family/123') -> '/guj/me/family/123'.
export function withLang(lang: Lang | undefined, path: string): string {
	return lang === 'guj' ? `/guj${path}` : path;
}
