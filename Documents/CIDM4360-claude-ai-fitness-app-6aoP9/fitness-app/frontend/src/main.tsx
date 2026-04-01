import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ── Capacitor native plugin initialisation ────────────────────────────────────
// These imports are safe to call in a web browser too — the plugins no-op when
// not running inside a native Capacitor wrapper.
async function initNative() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    // Status bar: match the app's dark theme
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#030712' });

    // Hide the splash screen once React has mounted
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();

    // Push notifications: request permission and register for remote notifications
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive === 'granted') {
      await PushNotifications.register();
    }

    // Store the device push token in the backend when received
    PushNotifications.addListener('registration', async token => {
      const userId = localStorage.getItem('fitness_user_id');
      if (!userId) return;
      const platform = Capacitor.getPlatform() as 'ios' | 'android';
      try {
        const { savePushToken } = await import('./api/client');
        await savePushToken(Number(userId), token.value, platform);
      } catch { /* non-critical */ }
    });

  } catch (err) {
    // Running in a browser without Capacitor — continue normally
  }
}

initNative().catch(() => {/* silently ignore */});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
