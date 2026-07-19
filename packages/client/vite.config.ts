import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset URLs so the Capacitor Android WebView can load the bundle.
  base: './',
  server: {
    // Allow ngrok / Cloudflare tunnel hostnames when testing on a phone
    allowedHosts: ['.ngrok-free.app', '.ngrok.io', '.ngrok.app', '.trycloudflare.com'],
  },
});
