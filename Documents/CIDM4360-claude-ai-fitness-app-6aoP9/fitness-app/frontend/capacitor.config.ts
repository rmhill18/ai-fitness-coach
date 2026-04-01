import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aifitnesscoach.app',
  appName: 'AI Fitness Coach',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // ── For testing on a physical device during development ──────────────────
    // Replace with your computer's local IP address (find it with `ipconfig` or `ifconfig`)
    // then run `npm run dev` on your computer and uncomment the line below:
    // url: 'http://192.168.1.X:5173',
    // cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#030712',
      showSpinner: false,
      spinnerColor: '#22c55e',
      androidSplashResourceName: 'splash',
      iosSpinnerStyle: 'small',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#030712',
    },
  },
};

export default config;
