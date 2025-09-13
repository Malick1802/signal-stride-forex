
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.da46b9852e6844b390bc922d481bf104',
  appName: 'ForexAlert Pro',
  webDir: 'dist',
  // Server config removed - using native mode for production builds
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f172a'
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_your_custom_icon",
      iconColor: "#488AFF",
      sound: "coin_notification"
    },
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#0f172a',
    loggingBehavior: 'debug',
    appendUserAgent: 'ForexAlertPro/1.0',
    captureInput: true,
    webSecurity: true,
    overrideUserAgent: 'ForexAlertPro/1.0 (Android)',
    mixedContentMode: 'compatibility',
    // Enhanced network timeouts
    networkTimeout: 30000,
    clearCache: true,
    // Hardware acceleration for smooth scrolling
    hardwareAccelerated: true
  },
  ios: {
    contentInset: 'automatic'
  },
  // Server config removed for pure native mode - no web server routing
};

export default config;
