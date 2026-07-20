import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Absolute base so deep links like /room/:code resolve /assets/* (not /room/assets/*).
  // Capacitor loads the hosted Vercel URL (see capacitor.config.ts), so root-absolute paths are correct.
  base: '/',
  server: {
    // Allow ngrok / Cloudflare tunnel hostnames when testing on a phone
    allowedHosts: ['.ngrok-free.app', '.ngrok.io', '.ngrok.app', '.trycloudflare.com'],
  },
});
