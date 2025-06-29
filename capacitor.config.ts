
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.da46b9852e6844b390bc922d481bf104',
  appName: 'ForexSignal Pro',
  webDir: 'dist',
  server: {
    url: 'https://da46b985-2e68-44b3-90bc-922d481bf104.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    // Enhanced mobile connectivity settings
    timeout: 30000,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#10b981',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f172a',
      overlay: false
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#10b981',
      sound: 'beep.wav'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    // Enhanced network handling
    Network: {
      autoStart: true
    },
    // Enhanced app behavior
    App: {
      launchUrl: undefined,
      // Prevent app from being killed in background
      allowBackgroundProcessing: true
    }
  },
  ios: {
    contentInset: 'automatic',
    // Enhanced iOS settings
    allowsLinkPreview: false,
    scrollEnabled: true,
    // Better performance
    limitsNavigationsToAppBoundDomains: false
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    // Enhanced Android settings
    webContentsDebuggingEnabled: true,
    // Better connectivity handling
    appendUserAgent: 'ForexSignalPro/1.0',
    // Performance optimizations
    loggingBehavior: 'debug',
    // Network security
    useLegacyBridge: false
  }
};

export default config;
