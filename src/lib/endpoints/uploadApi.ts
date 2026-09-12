import axios from '$lib/config/axios';

export type UploadedFile = {
	fileName: string;
	fileUrl: string;
	key: string;
	bucket: string;
	etag: string;
	mimeType: string;
	/** Post-compression byte count, not the size of the file the user picked. */
	size: number;
};

class UploadApi {
	async file({
		file
	}: {
		file: FormData;
	}): Promise<{ data: UploadedFile; message: string; success: boolean }> {
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
