import React, { useState, useEffect } from 'react';

import MobileErrorBoundary from './MobileErrorBoundary';
import MobilePushNotificationReviver from './MobilePushNotificationReviver';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
interface MobileAppWrapperProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function MobileAppWrapper({ children, activeTab, onTabChange }: MobileAppWrapperProps) {
  const { signOut } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isStabilizing, setIsStabilizing] = useState(true);
  useEffect(() => {
    console.log('🚀 MobileAppWrapper: Starting stabilized initialization');
    
    let stabilizationTimer: NodeJS.Timeout;
    let networkListeners: any[] = [];

    const initializeConnection = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          // Use Capacitor Network plugin for accurate connectivity
          const { Network } = await import('@capacitor/network');
          const { App } = await import('@capacitor/app');
          
          // Get initial network status
          const status = await Network.getStatus();
          console.log('📱 Initial network status:', status);
          setIsOnline(status.connected);
          
          // Listen for network changes
          const networkListener = await Network.addListener('networkStatusChange', (status) => {
            console.log('📶 Network status changed:', status);
            setIsOnline(status.connected);
          });
          networkListeners.push(networkListener);
          
          // Listen for app resume to re-check connectivity
          const appListener = await App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
              console.log('📱 App resumed - checking connectivity');
              Network.getStatus().then(status => {
                setIsOnline(status.connected);
              });
            }
          });
          networkListeners.push(appListener);
          
        } else {
          // Web platform - use navigator.onLine
          setIsOnline(navigator.onLine);
          
          const handleOnline = () => {
            console.log('🌐 Web went online');
            setIsOnline(true);
          };
          const handleOffline = () => {
            console.log('🌐 Web went offline');
            setIsOnline(false);
          };
          
          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);
          
          networkListeners.push(() => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          });
        }
        
        // Stabilization window to prevent flashing
        stabilizationTimer = setTimeout(() => {
          console.log('✅ Connection stabilization complete');
          setIsStabilizing(false);
          setIsReady(true);
        }, 1500); // 1.5 second stabilization window
        
      } catch (error) {
        console.warn('⚠️ Network initialization failed:', error);
        // Fallback to basic connectivity
        setIsOnline(navigator.onLine);
        setIsStabilizing(false);
        setIsReady(true);
      }
    };

    initializeConnection();
    
    return () => {
      if (stabilizationTimer) {
        clearTimeout(stabilizationTimer);
      }
      networkListeners.forEach(cleanup => {
        if (typeof cleanup === 'function') {
          cleanup();
        } else if (cleanup && cleanup.remove) {
          cleanup.remove();
        }
      });
    };
  }, []);

  // Only show offline during stabilization if we're definitely offline
  if (!isOnline && !isStabilizing) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4">
        <h1 className="text-2xl font-bold mb-4">No Internet Connection</h1>
        <p className="text-gray-400 mb-6 text-center">
          ForexAlert Pro requires an internet connection to work properly.
          {Capacitor.isNativePlatform() && (
            <><br /><br />Push notifications may still work via FCM when connectivity returns.</>
          )}
        </p>
        <button
          onClick={async () => {
            if (Capacitor.isNativePlatform()) {
              try {
                const { Network } = await import('@capacitor/network');
                const status = await Network.getStatus();
                setIsOnline(status.connected);
              } catch (error) {
                setIsOnline(navigator.onLine);
              }
            } else {
              setIsOnline(navigator.onLine);
            }
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
    <div className={`min-h-screen bg-background overflow-y-auto ${Capacitor.isNativePlatform() ? 'android-app mobile-app' : ''}`}>
      {/* Main content area with proper scrolling */}
      <div className="flex flex-col min-h-screen">
        {/* Push notification revival system for mobile */}
        {Capacitor.isNativePlatform() && <MobilePushNotificationReviver />}
        
        <MobileErrorBoundary>
          <main className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch">
            {children}
          </main>
        </MobileErrorBoundary>
        
      </div>
    </div>
  );
}