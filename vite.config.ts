import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), basicSsl()],
	server: {
		host: '0.0.0.0',
		port: 5173,
		strictPort: true,
		// Frontend now serves over https (for iOS Web Share testing); the API
		// is still plain http. Proxying server-side here keeps the browser on
		// a single https origin so it never makes a direct http request
		// (which https pages block as mixed content).
		proxy: {
			'/api': {
				// Change this to your machine's LAN IP when testing on a device (e.g. iOS Web Share)
				target: 'http://****:3001',
				changeOrigin: true
			}
		}
	}
});
