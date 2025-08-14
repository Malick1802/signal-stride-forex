
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.da46b9852e6844b390bc922d481bf104',
  appName: 'Forex Alert',
  webDir: 'dist',
  // Use local bundled files instead of development server
  // server: {
  //   url: 'https://da46b985-2e68-44b3-90bc-922d481bf104.lovableproject.com?forceHideBadge=true',
  //   androidScheme: 'https',
  //   iosScheme: 'https'
  // },
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
      allowBackgroundProcessing: true,
      backgroundMode: 'always'
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
    // Add error handling for iOS
    preferredContentMode: 'mobile'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true, // Enable debugging for mobile
    appendUserAgent: 'ForexSignalPro/1.0',
    loggingBehavior: 'debug', // Enable debug logging
    useLegacyBridge: false,
    // Add error handling for Android
    overrideUserAgent: 'ForexSignalPro/1.0 (Android)',
    backgroundColor: '#0f172a'
  }
};

export default config;
