import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.da46b9852e6844b390bc922d481bf104',
  appName: 'ForexSignal Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
    hostname: 'localhost',
    url: undefined
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
      style: 'light',
      backgroundColor: '#1e293b',
      overlay: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#10b981',
      sound: 'default',
      requestPermissions: true,
      scheduleOn: 'trigger'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    Network: {
      autoStart: true
    },
    App: {
      launchUrl: undefined,
      allowBackgroundProcessing: true
    },
    Haptics: {
      requestPermissions: true
    }
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
    preferredContentMode: 'mobile'
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    appendUserAgent: 'ForexSignalPro/1.0',
    loggingBehavior: 'none',
    useLegacyBridge: false,
    overrideUserAgent: 'ForexSignalPro/1.0 (Android)',
    backgroundColor: '#0f172a',
    allowNavigation: [
      'capacitor://localhost'
    ],
    mixedContentMode: 'never',
    handleAppUrlLoadInPlace: true
  }
};

export default config;
