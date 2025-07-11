import { useState, useEffect } from 'react';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import MobileErrorBoundary from './MobileErrorBoundary';
import { Capacitor } from '@capacitor/core';
import { MobileRouteManager } from '@/utils/mobileRouteManager';

interface InitializationState {
  isInitialized: boolean;
  currentStep: string;
  error: string | null;
  progress: number;
}

// Safe native features initialization with detailed logging
const initializeNativeFeatures = async (
  setInitState: (state: Partial<InitializationState>) => void
) => {
  try {
    console.log('🚀 Starting ForexAlert Pro mobile initialization...');
    setInitState({ currentStep: 'Starting initialization...', progress: 10 });
    
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Running as web app - skipping native features');
      setInitState({ currentStep: 'Web app mode', progress: 100 });
      return true;
    }

    console.log('📱 Native platform detected:', Capacitor.getPlatform());
    setInitState({ currentStep: 'Configuring native features...', progress: 25 });

    // Initialize mobile routing first
    try {
      setInitState({ currentStep: 'Setting up mobile routing...', progress: 30 });
      MobileRouteManager.initializeMobileRouting();
      console.log('✅ Mobile routing initialized');
    } catch (error) {
      console.warn('⚠️ Mobile routing initialization failed:', error);
      setInitState({ error: 'Routing setup failed (non-critical)' });
    }

    // Dynamically import native features only when needed
    try {
      setInitState({ currentStep: 'Loading status bar...', progress: 35 });
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
      await StatusBar.show();
      console.log('✅ Status bar configured');
    } catch (error) {
      console.warn('⚠️ Status bar configuration failed:', error);
      setInitState({ error: 'Status bar setup failed (non-critical)' });
    }

    // Hide splash screen safely
    try {
      setInitState({ currentStep: 'Hiding splash screen...', progress: 50 });
      const { SplashScreen } = await import('@capacitor/splash-screen');
      
      setTimeout(async () => {
        await SplashScreen.hide({ fadeOutDuration: 300 });
        console.log('✅ Splash screen hidden');
      }, 2000);
    } catch (error) {
      console.warn('⚠️ Splash screen hide failed:', error);
      setInitState({ error: 'Splash screen failed (non-critical)' });
    }

    // Initialize notifications safely
    try {
      setInitState({ currentStep: 'Setting up notifications...', progress: 75 });
      const notificationEnabled = await MobileNotificationManager.initialize();
      if (notificationEnabled) {
        console.log('📱 Mobile notifications initialized');
      } else {
        console.warn('⚠️ Notifications not available');
      }
    } catch (error) {
      console.warn('⚠️ Notification initialization failed:', error);
      setInitState({ error: 'Notifications failed (non-critical)' });
    }

    setInitState({ currentStep: 'Initialization complete', progress: 100 });
    console.log('✅ Mobile app initialization complete');
    return true;
  } catch (error) {
    console.error('❌ Critical mobile initialization failed:', error);
    setInitState({ 
      error: `Critical error: ${(error as Error).message}`,
      currentStep: 'Initialization failed'
    });
    return false;
  }
};

export default function MobileAppWrapper({ children }: { children: React.ReactNode }) {
  const [initState, setInitState] = useState<InitializationState>({
    isInitialized: false,
    currentStep: 'Preparing...',
    error: null,
    progress: 0
  });

  const updateInitState = (updates: Partial<InitializationState>) => {
    setInitState(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    let mounted = true;
    let timeout: NodeJS.Timeout;
    
    console.log('🚀 MobileAppWrapper: Starting initialization');
    
    const init = async () => {
      try {
        // Add timeout to prevent infinite loading
        timeout = setTimeout(() => {
          if (mounted) {
            console.warn('⚠️ Initialization timeout, proceeding anyway');
            setInitState({
              isInitialized: true,
              currentStep: 'Ready (timeout fallback)',
              error: 'Some features may be limited',
              progress: 100
            });
          }
        }, 10000); // 10 second timeout
        
        const success = await initializeNativeFeatures(updateInitState);
        
        if (mounted) {
          clearTimeout(timeout);
          setInitState(prev => ({
            ...prev,
            isInitialized: true,
            currentStep: success ? 'Ready' : 'Ready (limited functionality)'
          }));
        }
      } catch (error) {
        console.error('🚨 Critical initialization error:', error);
        if (mounted) {
          clearTimeout(timeout);
          setInitState(prev => ({
            ...prev,
            isInitialized: true,
            error: 'Some features may not work correctly',
            currentStep: 'Ready (compatibility mode)'
          }));
        }
      }
    };

    init();
    
    return () => {
      mounted = false;
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  // Show simple loading screen while initializing
  if (!initState.isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-6 mx-auto"></div>
          <h1 className="text-xl font-bold mb-2">ForexAlert Pro</h1>
          <p className="text-gray-300 mb-4">{initState.currentStep}</p>
          
          {initState.progress > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
              <div 
                className="bg-emerald-400 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${initState.progress}%` }}
              ></div>
            </div>
          )}
          
          {initState.error && (
            <p className="text-yellow-400 text-sm mt-2">{initState.error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <MobileErrorBoundary>
      {children}
    </MobileErrorBoundary>
  );
}
