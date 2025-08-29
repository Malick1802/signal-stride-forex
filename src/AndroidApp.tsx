import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from './contexts/AuthContext';
import MobileAppWrapper from './components/MobileAppWrapper';
import AppContent from './components/AppContent';
import AndroidErrorBoundary from './components/AndroidErrorBoundary';
import AndroidConnectionStatus from './components/AndroidConnectionStatus';
import AndroidDebugPanel from './components/AndroidDebugPanel';
import ErrorRecovery from './components/ErrorRecovery';
import { Capacitor } from '@capacitor/core';
import { useAppInitialization } from './hooks/useAppInitialization';

// Import CSS
import './index.css';
import './mobile-app.css';
import './android-scroll-fix.css';

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
  const [activeTab, setActiveTab] = useState('signals');
  const { isInitialized, isInitializing, error, progress, currentStep, retry } = useAppInitialization();

  // Show initialization screen or error recovery if needed
  if (error) {
    return <ErrorRecovery error={error} retry={retry} />;
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div>
            <p className="text-lg font-semibold">{currentStep}</p>
            <div className="w-64 bg-slate-700 rounded-full h-2 mt-2 mx-auto">
              <div 
                className="bg-blue-400 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-slate-300 mt-1">{progress}%</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AndroidErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HashRouter>
            <MobileAppWrapper activeTab={activeTab} onTabChange={setActiveTab}>
              <AppContent activeTab={activeTab} onTabChange={setActiveTab} />
            </MobileAppWrapper>
            <AndroidConnectionStatus />
            {Capacitor.isNativePlatform() && <AndroidDebugPanel />}
            <Toaster />
            <Sonner />
          </HashRouter>
        </AuthProvider>
      </QueryClientProvider>
    </AndroidErrorBoundary>
  );
};

export default AndroidApp;