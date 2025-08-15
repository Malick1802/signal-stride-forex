
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

// Ultra-safe progressive feature loading - moved to post-startup
const initializeProgressiveFeatures = () => {
  console.log('🔄 Scheduling progressive feature loading...');
  
  if (!Capacitor.isNativePlatform()) {
    console.log('🌐 Web platform - no native features to load');
    return;
  }

  // Phase 1: Status bar (delayed, non-critical)
  setTimeout(async () => {
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
      console.log('✅ Status bar configured');
    } catch (error) {
      console.warn('⚠️ Status bar failed (non-critical):', error);
    }
  }, 3000); // Increased delay

  // Phase 2: Notifications (heavily delayed, non-critical)
  setTimeout(async () => {
    try {
      await MobileNotificationManager.initialize();
      console.log('✅ Notifications initialized');
    } catch (error) {
      console.warn('⚠️ Notifications failed (non-critical):', error);
    }
  }, 5000); // Much longer delay
};

interface MobileAppWrapperProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function MobileAppWrapper({ children, activeTab, onTabChange }: MobileAppWrapperProps) {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Minimal connectivity check - defer complex hooks
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Immediate readiness - no complex initialization
    console.log('🚀 MobileAppWrapper: Immediate initialization');
    
    // Quick online check
    setIsOnline(navigator.onLine);
    
    // Mark ready immediately
    setIsReady(true);
    
    // Schedule all complex initialization for later
    setTimeout(() => {
      try {
        console.log('🔄 Starting deferred initialization...');
        initializeProgressiveFeatures();
      } catch (error) {
        console.warn('⚠️ Deferred initialization failed (non-critical):', error);
      }
    }, 2000);

    console.log('✅ MobileAppWrapper ready immediately');
  }, []);

  // Deferred complex hooks initialization
  useEffect(() => {
    if (!isReady) return;

    // Initialize complex features after UI is stable
    setTimeout(() => {
      try {
        console.log('🔄 Initializing complex mobile features...');
        // Complex hooks would be initialized here if needed
      } catch (error) {
        console.warn('⚠️ Complex features failed (continuing):', error);
        setInitError('Some features may be limited');
      }
    }, 4000);
  }, [isReady]);

  // Simple offline check
  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4">
        <h1 className="text-2xl font-bold mb-4">No Internet Connection</h1>
        <p className="text-gray-400 mb-6 text-center">
          ForexAlert Pro requires an internet connection to work properly.
        </p>
        <button
          onClick={() => {
            setIsOnline(navigator.onLine);
            window.location.reload();
          }}
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
        {/* Show init error if any */}
        {initError && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-2 text-sm">
            {initError}
          </div>
        )}
        
        {/* Main content area - Always show children (web UI) */}
        <div className="h-full">
          {children}
        </div>
        
        {/* Mobile navigation bar for native platforms */}
        {Capacitor.isNativePlatform() && (
          <MobileNavigationBar 
            activeTab={activeTab || 'signals'}
            onTabChange={onTabChange || (() => {})}
          />
        )}
      </div>
    </MobileErrorBoundary>
  );
}
