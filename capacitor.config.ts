
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.da46b9852e6844b390bc922d481bf104',
  appName: 'ForexAlert Pro',
  webDir: 'dist',
  server: {
    url: "https://da46b985-2e68-44b3-90bc-922d481bf104.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f172a'
    },
    App: {
      launchUrl: undefined
    }
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#0f172a',
    loggingBehavior: 'debug'
  }
};

export default config;
