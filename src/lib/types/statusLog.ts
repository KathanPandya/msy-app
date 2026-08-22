export namespace StatusLog {
	export type MemberStatus = 'active' | 'removed' | 'voluntary-retired' | 'dead';

	export type DocumentType = 'proof_photo' | 'death_certificate';

	export type StatusDocument = {
		type: DocumentType;
		url: string;
	};

	export type Entry = {
		_id: string;
		status: MemberStatus;
		date: string;
		reason: string;
		document: StatusDocument | null;
		changedBy: string | null;
		createdAt: string;
	};

	export type GetResponse = {
		success: true;
		status: MemberStatus | null;
		revertible: boolean;
		logs: Entry[];
	};

	export type PostRequest = {
		status: MemberStatus;
		date: string;
		reason?: string;
		document?: StatusDocument | null;
	};

	export type PostResponse = {
		success: boolean;
		statusLog?: Entry;
		message: string;
	};

	export type PutRequest = {
		reason?: string;
		document?: StatusDocument | null;
	};

	export type PutResponse = {
		success: boolean;
		statusLog?: Entry;
		deadMember?: Entry;
		message: string;
	};
}
