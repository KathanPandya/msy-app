export namespace Terms {
	export type Current = {
		id: string;
		version: number;
		body_en: string;
		body_guj: string;
		published_at: string;
	};

	export type Publisher = { name?: string; username?: string } | null;

	export type ListRow = {
		id: string;
		version: number;
		is_current: boolean;
		published_at: string;
		published_by: Publisher;
		note: string | null;
		preview_en: string;
	};

	export type Detail = ListRow & {
		body_en: string;
		body_guj: string;
	};

	export type Publish = {
		body_en: string;
		body_guj: string;
		note?: string;
	};
}
