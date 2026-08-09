import axios from '$lib/config/axios';

class DashboardApi {
	async getDashboardStats(): Promise<any> {
		const response = await axios.get('api/admin/get-dashboard-stats');
		return response.data;
	}

	async downloadBackup(): Promise<{ blob: Blob; filename: string }> {
		try {
			const response = await axios.get('api/admin/export/backup', {
				responseType: 'blob'
			});

			const disposition = response.headers['content-disposition'] as string | undefined;
			const match = disposition?.match(/filename="?([^"]+)"?/);
			const filename =
				match?.[1] ?? `bhattmevada-backup-${new Date().toISOString().slice(0, 10)}.xlsx`;

			return { blob: response.data as Blob, filename };
		} catch (error: any) {
			const data = error?.response?.data;
			if (data instanceof Blob) {
				try {
					const parsed = JSON.parse(await data.text());
					throw new Error(parsed.message || 'Failed to download backup');
				} catch (e) {
					if (e instanceof Error && !e.message.includes('JSON')) {
						throw e;
					}
				}
			}
			throw new Error(error?.response?.statusText || error?.message || 'Failed to download backup');
		}
	}
}

const dashboardApi = new DashboardApi();
export default dashboardApi;
