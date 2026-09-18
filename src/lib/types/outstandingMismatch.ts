export namespace OutstandingMismatch {
	export type Row = {
		userId: string;
		member_id: string | null;
		name: string;
		status: string;
		stored_outstanding_amount: number;
		api_outstanding_amount: number;
		/** stored - api. Positive = stored too high, negative = stored too low. Never 0. */
		difference: number;
	};

	/** A user that could not be checked — unknown, not clean. */
	export type CheckError = {
		userId: string;
		message: string;
	};

	export type Report = {
		totalUsers: number;
		mismatchCount: number;
		errorCount: number;
		mismatches: Row[];
		errors: CheckError[];
	};
}
