import axios from '$lib/config/axios';

class UploadApi {
	async file({
		file
	}: {
		file: FormData;
	}): Promise<{ data: { fileUrl: string }; message: string; success: boolean }> {
		console.log('file', file);
		const response = await axios.post(`/api/upload`, file, {
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		});
		return response.data;
	}
}

const uploadApi = new UploadApi();
export default uploadApi;
