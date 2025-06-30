
import { useState, useEffect } from 'react';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import MobileErrorBoundary from './MobileErrorBoundary';
import { Capacitor } from '@capacitor/core';

// Safe native features initialization
const initializeNativeFeatures = async () => {
  try {
    console.log('🚀 Initializing ForexAlert Pro mobile features...');
    
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Running as web app - skipping native features');
      return true;
    }

    // Dynamically import native features only when needed
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const { SplashScreen } = await import('@capacitor/splash-screen');
    
    // Configure status bar safely
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
      await StatusBar.show();
      console.log('✅ Status bar configured');
    } catch (error) {
      console.warn('⚠️ Status bar configuration failed:', error);
    }

    // Hide splash screen safely
    try {
      setTimeout(async () => {
        await SplashScreen.hide({ fadeOutDuration: 300 });
        console.log('✅ Splash screen hidden');
      }, 2000);
    } catch (error) {
      console.warn('⚠️ Splash screen hide failed:', error);
    }

    // Initialize notifications safely
    try {
      const notificationEnabled = await MobileNotificationManager.initialize();
      if (notificationEnabled) {
        console.log('📱 Mobile notifications initialized');
      }
    } catch (error) {
      console.warn('⚠️ Notification initialization failed:', error);
    }

    console.log('✅ Mobile app initialization complete');
    return true;
  } catch (error) {
    console.error('❌ Mobile initialization failed:', error);
    return false;
  }
};

export default function MobileAppWrapper({ children }: { children: React.ReactNode }) {
  const { isOnline, retryConnection } = useMobileConnectivity();
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        const success = await initializeNativeFeatures();
        if (mounted) {
          setIsInitialized(true);
          if (!success) {
            setInitializationError('Some mobile features may not be available');
          }
        }
      } catch (error) {
        console.error('🚨 Critical initialization error:', error);
        if (mounted) {
          setIsInitialized(true); // Continue anyway
          setInitializationError('Mobile features unavailable - running in compatibility mode');
        }
      }
    };

    init();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Show offline screen
  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4">
        <h1 className="text-2xl font-bold mb-4">No Internet Connection</h1>
        <p className="text-gray-400 mb-6 text-center">Please check your internet connection and try again.</p>
        <button
          onClick={retryConnection}
          className="bg-emerald-500 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-4"></div>
        <p className="text-lg">Initializing ForexAlert Pro...</p>
        {Capacitor.isNativePlatform() && (
          <p className="text-sm text-gray-400 mt-2">Loading mobile features</p>
        )}
      </div>
    );
  }

  return (
    <MobileErrorBoundary>
      {initializationError && (
        <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-3 mb-2">
          <p className="text-yellow-400 text-sm">{initializationError}</p>
        </div>
      )}
      {children}
    </MobileErrorBoundary>
  );
}
