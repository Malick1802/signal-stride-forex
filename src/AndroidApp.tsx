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
    
    // Immediate initialization to prevent dark screen
    const timer = setTimeout(() => {
      setIsReady(true);
      console.log('✅ AndroidApp ready');
    }, 500); // Much shorter delay
    
    return () => clearTimeout(timer);
  }, []);

  // Show immediate loading screen with platform info
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-400 mx-auto"></div>
          <h1 className="text-2xl font-bold">ForexAlert Pro</h1>
          <div className="space-y-2">
            <p className="text-gray-300">Platform: {Capacitor.getPlatform()}</p>
            <p className="text-gray-300">Native: {Capacitor.isNativePlatform() ? '✅ Yes' : '❌ No'}</p>
            <p className="text-emerald-400 text-sm">{syncStatus}</p>
          </div>
          {!Capacitor.isNativePlatform() && (
            <div className="mt-4 p-4 bg-red-900/50 rounded-lg border border-red-700">
              <p className="text-red-200 text-sm font-semibold">⚠️ Warning: Running in web mode</p>
              <p className="text-red-300 text-xs mt-1">This should be a native Android app</p>
            </div>
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