import { useState, useEffect, useCallback, useRef } from 'react';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import { useOptimizedBackgroundSync } from '@/hooks/useOptimizedBackgroundSync';
import { useStableRealTimeConnection } from '@/hooks/useStableRealTimeConnection';
import { useEnhancedServiceWorker } from '@/hooks/useEnhancedServiceWorker';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import MobileErrorBoundary from './MobileErrorBoundary';
import { Capacitor } from '@capacitor/core';
import { MobileRouteManager } from '@/utils/mobileRouteManager';
import { useAuth } from '@/contexts/AuthContext';

interface InitializationState {
  isInitialized: boolean;
  currentStep: string;
  error: string | null;
  progress: number;
  isRecovering: boolean;
  lastRecoveryAttempt: number;
}

interface AppHealthState {
  isHealthy: boolean;
  issues: string[];
  lastCheck: number;
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
  const { isOnline, retryConnection } = useMobileConnectivity();
  const { sessionState, validateSession } = useAuth();
  
  const [initState, setInitState] = useState<InitializationState>({
    isInitialized: false,
    currentStep: 'Preparing...',
    error: null,
    progress: 0,
    isRecovering: false,
    lastRecoveryAttempt: 0
  });

  const [appHealth, setAppHealth] = useState<AppHealthState>({
    isHealthy: true,
    issues: [],
    lastCheck: Date.now()
  });

  const recoveryTimeoutRef = useRef<NodeJS.Timeout>();
  const healthCheckIntervalRef = useRef<NodeJS.Timeout>();

  // Enhanced connectivity and sync
  const { syncState, isHealthy: syncHealthy } = useOptimizedBackgroundSync({
    enableBackgroundFetch: true,
    enableVisibilitySync: true,
    syncInterval: 3 * 60 * 1000 // 3 minutes
  });

  const { isHealthy: rtHealthy, reconnect: reconnectRealTime } = useStableRealTimeConnection();
  const { isRegistered: swRegistered, updateServiceWorker, clearCache } = useEnhancedServiceWorker();

  const updateInitState = (updates: Partial<InitializationState>) => {
    setInitState(prev => ({ ...prev, ...updates }));
  };

  // App recovery mechanism for inactivity issues
  const performAppRecovery = useCallback(async () => {
    const now = Date.now();
    
    if (initState.isRecovering || now - initState.lastRecoveryAttempt < 30000) {
      console.log('🔄 Recovery already in progress or too frequent');
      return;
    }

    console.log('🔄 Performing app recovery after inactivity...');
    setInitState(prev => ({
      ...prev,
      isRecovering: true,
      lastRecoveryAttempt: now,
      error: null
    }));

    try {
      // Step 1: Validate session
      console.log('🔄 Step 1: Validating session...');
      await validateSession();

      // Step 2: Clear potentially stale caches
      console.log('🔄 Step 2: Clearing stale caches...');
      await clearCache(['forex-signals-offline-v1']);

      // Step 3: Reconnect real-time
      console.log('🔄 Step 3: Reconnecting real-time...');
      reconnectRealTime();

      // Step 4: Force connectivity check
      console.log('🔄 Step 4: Checking connectivity...');
      await retryConnection();

      console.log('✅ App recovery completed successfully');
      setAppHealth(prev => ({
        isHealthy: true,
        issues: [],
        lastCheck: now
      }));

    } catch (error) {
      console.error('❌ App recovery failed:', error);
      setAppHealth(prev => ({
        ...prev,
        isHealthy: false,
        issues: [...prev.issues, `Recovery failed: ${(error as Error).message}`]
      }));
    } finally {
      setInitState(prev => ({
        ...prev,
        isRecovering: false
      }));
    }
  }, [initState.isRecovering, initState.lastRecoveryAttempt, validateSession, clearCache, reconnectRealTime, retryConnection]);

  // Health monitoring
  const performHealthCheck = useCallback(() => {
    const now = Date.now();
    const issues: string[] = [];

    // Check various health indicators
    if (!isOnline) {
      issues.push('No internet connection');
    }

    if (!syncHealthy) {
      issues.push('Background sync issues');
    }

    if (!rtHealthy) {
      issues.push('Real-time connection issues');
    }

    if (sessionState === 'unauthenticated' && isOnline) {
      issues.push('Authentication issues');
    }

    const isHealthy = issues.length === 0;

    setAppHealth({
      isHealthy,
      issues,
      lastCheck: now
    });

    // Trigger recovery if unhealthy for more than 1 minute
    if (!isHealthy && now - appHealth.lastCheck > 60000) {
      console.warn('⚠️ App unhealthy for extended period, triggering recovery');
      performAppRecovery();
    }
  }, [isOnline, syncHealthy, rtHealthy, sessionState, appHealth.lastCheck, performAppRecovery]);

  // Handle visibility change for recovery
  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden && !appHealth.isHealthy) {
      console.log('📱 App visible again with health issues, triggering recovery');
      performAppRecovery();
    }
  }, [appHealth.isHealthy, performAppRecovery]);

  useEffect(() => {
    let mounted = true;
    
    console.log('🚀 MobileAppWrapper: Starting enhanced initialization');
    
    const init = async () => {
      try {
        const success = await initializeNativeFeatures(updateInitState);
        if (mounted) {
          setInitState(prev => ({
            ...prev,
            isInitialized: true,
            currentStep: success ? 'Ready' : 'Ready (limited functionality)'
          }));
        }
      } catch (error) {
        console.error('🚨 Critical initialization error:', error);
        if (mounted) {
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
    };
  }, []);

  // Setup health monitoring
  useEffect(() => {
    // Initial health check
    performHealthCheck();

    // Periodic health checks
    healthCheckIntervalRef.current = setInterval(performHealthCheck, 30000); // Every 30 seconds

    // Visibility change listener for recovery
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [performHealthCheck, handleVisibilityChange]);

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

  // Show detailed loading screen while initializing
  if (!initState.isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-6 mx-auto"></div>
          
          <h1 className="text-xl font-bold mb-2">ForexAlert Pro</h1>
          <p className="text-gray-300 mb-4">{initState.currentStep}</p>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
            <div 
              className="bg-emerald-400 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${initState.progress}%` }}
            ></div>
          </div>
          
          {Capacitor.isNativePlatform() && (
            <p className="text-sm text-gray-400">
              Loading mobile features on {Capacitor.getPlatform()}
            </p>
          )}
          
          {initState.error && (
            <p className="text-yellow-400 text-xs mt-2">{initState.error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <MobileErrorBoundary>
      {/* Health status indicators */}
      {(!appHealth.isHealthy || initState.error) && (
        <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-3 mb-2">
          {initState.error && (
            <p className="text-yellow-400 text-sm mb-1">{initState.error}</p>
          )}
          {!appHealth.isHealthy && (
            <div className="text-yellow-400 text-sm">
              <p className="font-medium">App Health Issues:</p>
              <ul className="text-xs mt-1 space-y-1">
                {appHealth.issues.map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
              {!initState.isRecovering && (
                <button
                  onClick={performAppRecovery}
                  className="mt-2 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 px-2 py-1 rounded transition-colors"
                >
                  Attempt Recovery
                </button>
              )}
            </div>
          )}
          {initState.isRecovering && (
            <p className="text-blue-400 text-sm">🔄 Recovering app state...</p>
          )}
        </div>
      )}
      
      {/* Sync status indicator for debugging */}
      {syncState.isActive && (
        <div className="bg-blue-500/10 border-l-4 border-blue-500 p-2">
          <p className="text-blue-400 text-xs">📡 Syncing data...</p>
        </div>
      )}
      
      {children}
    </MobileErrorBoundary>
  );
}
