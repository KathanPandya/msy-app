import axios from '$lib/config/axios';
import type { OutstandingMismatch } from '$lib/types/outstandingMismatch';

// The endpoint recalculates the outstanding table for every user in the DB, so
// it can take several seconds on a large database. The default axios timeout is
// nowhere near enough — give it a generous one of its own.
const MISMATCH_TIMEOUT_MS = 120_000;

class OutstandingMismatchApi {
	/**
	 * Admin-only, read-only audit. Reports users whose stored
	 * `outstanding_amount` disagrees with the calculated one. Fixes nothing.
	 */
	async getReport(): Promise<{ data: OutstandingMismatch.Report; success: boolean }> {
		const response = await axios.get('api/payment/outstanding-mismatch', {
			timeout: MISMATCH_TIMEOUT_MS
		});
		return response.data;
	}
}

const outstandingMismatchApi = new OutstandingMismatchApi();
export default outstandingMismatchApi;
