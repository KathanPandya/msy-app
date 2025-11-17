export function GenericSort(values: any[], key: string, type: 'asc' | 'desc') {
	return values.sort((a: any, b: any) => {
		return type === 'asc' ? a[key] - b[key] : b[key] - a[key];
	});
}

export function StringSort(arr: any[], key: string, order: 'asc' | 'desc' = 'asc'): any[] {
	return arr.sort((a, b) => {
		const valueA = String(a[key] || '').toLowerCase();
		const valueB = String(b[key] || '').toLowerCase();

		if (order === 'asc') {
			return valueA.localeCompare(valueB);
		} else {
			return valueB.localeCompare(valueA);
		}
	});
}
