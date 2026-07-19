import type { CapacitorConfig } from '@capacitor/cli';

/** Production web app — Capacitor loads this URL so push-to-main (Vercel) updates the app UI without a new APK. */
const WEB_APP_URL = 'https://board-game-cafe-client.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.boardgamecafe.app',
  appName: 'Board Game Cafe',
  webDir: 'dist',
  server: {
    url: WEB_APP_URL,
    cleartext: false,
  },
};

export default config;
