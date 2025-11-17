export function capitalizeFirst(str: string | null | undefined): string {
	if (!str) return '';
	if (str.trim() === '') return str;

	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatString(
	str: string | undefined,
	type: Array<
		| 'capitalize-first'
		| 'capitalize-words'
		| 'trim'
		| 'trim-start'
		| 'trim-end'
		| 'lowercase'
		| 'uppercase'
	>
): string {
	if (!str) return '';

	let result = str;

	// Trim operations
	if (type.includes('trim')) {
		result = result.trim();
	}
	if (type.includes('trim-start')) {
		result = result.trimStart();
	}
	if (type.includes('trim-end')) {
		result = result.trimEnd();
	}

	// Case operations
	if (type.includes('lowercase')) {
		result = result.toLowerCase();
	}
	if (type.includes('uppercase')) {
		result = result.toUpperCase();
	}
	if (type.includes('capitalize-first')) {
		result = result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
	}
	if (type.includes('capitalize-words')) {
		result = result
			.toLowerCase()
			.split(' ')
			.map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
			.join(' ');
	}

	return result;
}

export function truncateString(str: string, maxChar: number) {
	if (str.length > maxChar) {
		// Calculate how many characters we can keep before the ellipsis
		const keepChars = maxChar - 3; // Reserve 3 chars for "..."

		// Return truncated string with ellipsis
		return str.slice(0, keepChars) + '...';
	}

	// If string is within limit, return as is
	return str;
}
