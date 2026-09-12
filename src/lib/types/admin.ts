export namespace AdminUser {
	export type Data = {
		_id: string;
		username: string;
		role: string;
		createdAt: number;
		createdBy: { _id: string; username: string } | null;
	};

	export type Create = {
		username: string;
		password: string;
	};
}
