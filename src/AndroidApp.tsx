import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from './contexts/AuthContext';
import MobileAppWrapper from './components/MobileAppWrapper';
import AppContent from './components/AppContent';
import AndroidErrorBoundary from './components/AndroidErrorBoundary';
import { MobileInitializer } from './components/MobileInitializer';
import { Capacitor } from '@capacitor/core';
import { useAndroidRealTimeSync } from './hooks/useAndroidRealTimeSync';

// Import CSS
import './index.css';
import './mobile-app.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
    },
  },
});

const AndroidApp = () => {
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState('signals');
  const [syncStatus, setSyncStatus] = useState<string>('Initializing...');

  // Setup Android real-time sync
  const { forceRefreshSignals, isConnected } = useAndroidRealTimeSync({
    onStatusUpdate: setSyncStatus,
    aggressiveMode: true
  });

  useEffect(() => {
    console.log('🚀 AndroidApp initializing on platform:', Capacitor.getPlatform());
    console.log('📱 Is native platform:', Capacitor.isNativePlatform());
    
    // Enhanced Android native initialization
    const initializeApp = async () => {
      try {
        setSyncStatus('Checking platform...');
        
        if (!Capacitor.isNativePlatform()) {
          console.warn('⚠️ Not running on native platform - push notifications will not work');
          setSyncStatus('⚠️ Web mode - limited features');
        } else {
          console.log('✅ Native Android platform detected');
          setSyncStatus('✅ Native platform ready');
        }
        
        // Allow time for Capacitor to fully initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsReady(true);
        console.log('✅ AndroidApp ready');
      } catch (error) {
        console.error('❌ AndroidApp initialization error:', error);
        setSyncStatus(`❌ Init error: ${error}`);
        setIsReady(true); // Still set ready to prevent infinite loading
      }
    };

    initializeApp();
  }, []);

  // Simple loading screen
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold">ForexAlert Pro</h1>
          <p className="text-gray-400 mt-2">Starting Android app...</p>
          <p className="text-emerald-400 text-sm mt-1">{syncStatus}</p>
          {Capacitor.isNativePlatform() && (
            <p className="text-gray-500 text-xs mt-1">
              🔗 {isConnected ? 'Connected' : 'Reconnecting...'}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <AndroidErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HashRouter>
            <MobileInitializer onStatusUpdate={setSyncStatus} />
            <MobileAppWrapper activeTab={activeTab} onTabChange={setActiveTab}>
              <AppContent activeTab={activeTab} onTabChange={setActiveTab} />
            </MobileAppWrapper>
            <Toaster />
            <Sonner />
          </HashRouter>
        </AuthProvider>
      </QueryClientProvider>
    </AndroidErrorBoundary>
  );
};

export default AndroidApp;