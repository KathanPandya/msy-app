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
}
