
import React, { useState, useEffect } from 'react';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import { useMobileBackgroundSync } from '@/hooks/useMobileBackgroundSync';
import { MobileNavigationBar } from './MobileNavigationBar';
import { MobileContentRouter } from './MobileContentRouter';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import MobileErrorBoundary from './MobileErrorBoundary';
import MobileInitializer from './MobileInitializer';
import CrashRecovery from './CrashRecovery';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface InitializationState {
  isInitialized: boolean;
  currentStep: string;
  error: string | null;
  progress: number;
  needsRecovery: boolean;
}

// Minimal progressive feature loading to prevent crashes
const initializeProgressiveFeatures = async () => {
  try {
    console.log('🔄 Starting progressive feature loading...');
    
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Web platform - no native features to load');
      return true;
    }

    // Phase 1: Status bar (non-critical)
    setTimeout(async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0f172a' });
        console.log('✅ Status bar configured');
      } catch (error) {
        console.warn('⚠️ Status bar failed:', error);
      }
    }, 1000);

    // Phase 2: Notifications (non-critical)
    setTimeout(async () => {
      try {
        await MobileNotificationManager.initialize();
        console.log('✅ Notifications initialized');
      } catch (error) {
        console.warn('⚠️ Notifications failed:', error);
      }
    }, 2000);

    return true;
  } catch (error) {
    console.warn('⚠️ Progressive feature loading failed:', error);
    return true; // Continue anyway
  }
};

export default function MobileAppWrapper({ children }: { children: React.ReactNode }) {
  const { isOnline, retryConnection } = useMobileConnectivity();
  const [activeTab, setActiveTab] = useState<'signals' | 'charts' | 'notifications' | 'settings'>('signals');
  const [isReady, setIsReady] = useState(false);

  // Setup mobile background sync with minimal config
  const { performBackgroundSync } = useMobileBackgroundSync({
    enableBackgroundSync: true,
    syncInterval: 60000, // Longer interval to reduce load
    onSyncComplete: (data) => {
      console.log('📱 Mobile sync completed:', data);
    }
  });

  // Delayed push notification initialization
  const { isRegistered, initializePushNotifications } = usePushNotifications();

  useEffect(() => {
    // Ultra-simple initialization
    const init = async () => {
      try {
        console.log('🚀 MobileAppWrapper: Simple initialization');
        
        // Just start progressive feature loading (non-blocking)
        initializeProgressiveFeatures();
        
        // Mark as ready immediately
        setIsReady(true);
        console.log('✅ MobileAppWrapper ready');
        
      } catch (error) {
        console.warn('⚠️ MobileAppWrapper init warning:', error);
        // Continue anyway
        setIsReady(true);
      }
    };

    init();
  }, []);

  // Delayed push notification setup
  useEffect(() => {
    if (Capacitor.isNativePlatform() && isReady && !isRegistered) {
      setTimeout(() => {
        console.log('🔔 Delayed push notification setup...');
        initializePushNotifications().catch((e) => {
          console.warn('⚠️ Push notifications setup failed:', e);
        });
      }, 3000); // Wait 3 seconds after app is ready
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isRegistered]);

  // Show offline screen with retry option
  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4">
        <h1 className="text-2xl font-bold mb-4">No Internet Connection</h1>
        <p className="text-gray-400 mb-6 text-center">
          ForexAlert Pro requires an internet connection to work properly.
        </p>
        <button
          onClick={retryConnection}
          className="bg-emerald-500 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Retry Connection
        </button>
        <p className="text-xs text-gray-500 mt-4">
          {Capacitor.isNativePlatform() ? 'Mobile App' : 'Web App'}
        </p>
      </div>
    );
  }

  // Show simple loading if not ready
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <MobileErrorBoundary>
      <div className="min-h-screen bg-background pb-20">
        {/* Main content area */}
        <div className="h-full">
          {Capacitor.isNativePlatform() ? (
            <MobileContentRouter activeTab={activeTab} />
          ) : (
            children
          )}
        </div>
        
        {/* Mobile navigation bar */}
        {Capacitor.isNativePlatform() && (
          <MobileNavigationBar 
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </div>
    </MobileErrorBoundary>
  );
}
