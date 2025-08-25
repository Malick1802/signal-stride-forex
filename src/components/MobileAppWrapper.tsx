import React, { useState, useEffect } from 'react';
import { MobileNavigationBar } from './MobileNavigationBar';
import MobileErrorBoundary from './MobileErrorBoundary';
import { Capacitor } from '@capacitor/core';

interface MobileAppWrapperProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function MobileAppWrapper({ children, activeTab, onTabChange }: MobileAppWrapperProps) {
  const [isReady, setIsReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    console.log('🚀 MobileAppWrapper: Ultra-minimal initialization');
    
    // Quick online check
    setIsOnline(navigator.onLine);
    
    // Mark ready immediately - no complex initialization
    setIsReady(true);
    
    console.log('✅ MobileAppWrapper ready immediately');
  }, []);

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