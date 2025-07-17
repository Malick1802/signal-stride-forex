import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import MobileTradingSignals from './MobileTradingSignals';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

interface MobileAppState {
  isInitialized: boolean;
  isOnline: boolean;
  error: string | null;
}

export default function MobileApp() {
  const [appState, setAppState] = useState<MobileAppState>({
    isInitialized: false,
    isOnline: true,
    error: null
  });

  useEffect(() => {
    initializeMobileApp();
  }, []);

  const initializeMobileApp = async () => {
    try {
      console.log('🚀 ForexAlert Pro - Mobile App Starting...');
      
      // Check if running on native platform
      if (Capacitor.isNativePlatform()) {
        console.log('📱 Native platform detected:', Capacitor.getPlatform());
        
        // Configure status bar
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#0f172a' });
          console.log('✅ Status bar configured');
        } catch (error) {
          console.warn('⚠️ Status bar configuration failed:', error);
        }

        // Hide splash screen after a delay
        setTimeout(async () => {
          try {
            await SplashScreen.hide({ fadeOutDuration: 300 });
            console.log('✅ Splash screen hidden');
          } catch (error) {
            console.warn('⚠️ Splash screen hide failed:', error);
          }
        }, 2000);
      } else {
        console.log('🌐 Running as web app');
      }

      // Check network status
      const networkStatus = await Network.getStatus();
      setAppState(prev => ({ ...prev, isOnline: networkStatus.connected }));

      // Listen for network changes
      Network.addListener('networkStatusChange', (status) => {
        console.log('📶 Network status changed:', status);
        setAppState(prev => ({ ...prev, isOnline: status.connected }));
      });

      // Mark as initialized
      setAppState(prev => ({ ...prev, isInitialized: true }));
      
      console.log('✅ Mobile app initialization complete');
    } catch (error) {
      console.error('❌ Mobile app initialization failed:', error);
      setAppState(prev => ({ 
        ...prev, 
        error: 'Failed to initialize mobile app',
        isInitialized: true 
      }));
    }
  };

  // Show loading screen while initializing
  if (!appState.isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-6 mx-auto"></div>
          <h1 className="text-xl font-bold mb-2">ForexAlert Pro</h1>
          <p className="text-gray-300 mb-4">Initializing mobile app...</p>
          {Capacitor.isNativePlatform() && (
            <p className="text-sm text-gray-400">
              Mobile features loading on {Capacitor.getPlatform()}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show error screen if initialization failed
  if (appState.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-destructive">App Error</h1>
          <p className="text-muted-foreground mb-6">{appState.error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Restart App
          </button>
        </div>
      </div>
    );
  }

  // Show offline warning if not connected
  if (!appState.isOnline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Internet Connection</h1>
          <p className="text-muted-foreground mb-6">
            ForexAlert Pro requires an internet connection to provide real-time trading signals.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Retry Connection
          </button>
          <p className="text-xs text-muted-foreground mt-4">
            {Capacitor.isNativePlatform() ? 'Mobile App' : 'Web App'}
          </p>
        </div>
      </div>
    );
  }

  // Main app content
  return (
    <>
      <MobileTradingSignals />
      <Toaster />
      <Sonner />
    </>
  );
}