import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import MobileErrorBoundary from './MobileErrorBoundary';

interface InitializationState {
  isInitialized: boolean;
  currentStep: string;
  error: string | null;
  progress: number;
}

const MobileAppWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initState, setInitState] = useState<InitializationState>({
    isInitialized: false,
    currentStep: 'Loading...',
    error: null,
    progress: 0
  });

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    console.log('🚀 MobileAppWrapper: Starting simple initialization');
    
    // Simple initialization with timeout
    timeout = setTimeout(() => {
      console.log('✅ MobileAppWrapper: Initialization complete');
      setInitState({
        isInitialized: true,
        currentStep: 'Ready',
        error: null,
        progress: 100
      });
    }, 1000); // 1 second delay for smooth transition
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  // Show loading screen during initialization
  if (!initState.isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-6 mx-auto"></div>
          <h1 className="text-xl font-bold mb-2">ForexAlert Pro</h1>
          <p className="text-gray-300 mb-4">{initState.currentStep}</p>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
            <div 
              className="bg-emerald-400 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${initState.progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MobileErrorBoundary>
      {children}
    </MobileErrorBoundary>
  );
};

export default MobileAppWrapper;
