import axios from '$lib/config/axios';

class DashboardApi {
	async getDashboardStats(): Promise<any> {
		const response = await axios.get('api/admin/get-dashboard-stats');
		return response.data;
	}
}

const dashboardApi = new DashboardApi();
export default dashboardApi;
