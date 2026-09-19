export namespace EmailVerification {
	export type Status = {
		success: boolean;
		email: string | null;
		verified: boolean;
	};

	export type SendResult = {
		success: boolean;
		alreadyVerified?: boolean;
		message?: string;
	};

	export type ConfirmResult = {
		success: boolean;
		message?: string;
	};
}
