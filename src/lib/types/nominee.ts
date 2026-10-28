export namespace Nominee {
	export type Relation =
		| 'father'
		| 'mother'
		| 'son'
		| 'daughter'
		| 'wife'
		| 'husband'
		| 'brother'
		| 'sister'
		| 'mother-in-law'
		| 'sister-in-law'
		| 'nephew';

	export type Data = {
		_id: string;
		userId: string;
		full_name: string;
		relation: Relation | null;
		createdBy: string;
		updatedBy: string;
		is_deleted?: boolean;
		createdAt: string;
		updatedAt: string;
	};

	export type Create = {
		full_name: string;
		relation: Relation;
	};

	export type Update = {
		relation: Relation;
	};

	export type NameCorrection = {
		type: 'correction';
		full_name: string;
		reason: string;
	};

	export type LogChange = {
		field: string;
		old: string | null;
		new: string | null;
	};

	export type Log = {
		_id: string;
		nomineeId: string;
		userId: string;
		type: 'correction' | 'change';
		changes: LogChange[];
		reason: string;
		changedBy: { _id: string; username: string; name: string } | null;
		createdAt: string;
		updatedAt: string;
	};
}
