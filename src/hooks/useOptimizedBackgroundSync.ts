import { useEffect, useCallback, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useMobileConnectivity } from './useMobileConnectivity';
import { useOfflineSignals } from './useOfflineSignals';

interface BackgroundSyncOptions {
  onSignalsFetched?: (signals: any[]) => void;
  syncInterval?: number;
  enableBackgroundFetch?: boolean;
  enableVisibilitySync?: boolean;
}

interface SyncState {
  isActive: boolean;
  lastSync: number;
  syncCount: number;
  errors: string[];
}

interface SyncOperation {
  id: string;
  timestamp: number;
  promise: Promise<void>;
}

export const useOptimizedBackgroundSync = (options: BackgroundSyncOptions = {}) => {
  const { isConnected } = useMobileConnectivity();
  const { cacheSignals } = useOfflineSignals();
  
  const [syncState, setSyncState] = useState<SyncState>({
    isActive: false,
    lastSync: 0,
    syncCount: 0,
    errors: []
  });

  const syncOperationsRef = useRef<Map<string, SyncOperation>>(new Map());
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  
  const {
    onSignalsFetched,
    syncInterval = 3 * 60 * 1000, // 3 minutes  
    enableBackgroundFetch = true,
    enableVisibilitySync = true
  } = options;

  // Debounced sync coordinator to prevent multiple simultaneous operations
  const performSyncOperation = useCallback(async (operationId: string): Promise<void> => {
    if (!mountedRef.current || !isConnected) {
      console.log('📡 Skipping sync - component unmounted or offline');
      return;
    }

    // Check if this operation is already running
    const existingOperation = syncOperationsRef.current.get(operationId);
    if (existingOperation) {
      console.log(`📡 Sync operation ${operationId} already in progress, waiting...`);
      try {
        await existingOperation.promise;
        return;
      } catch (error) {
        console.warn(`📡 Existing sync operation ${operationId} failed:`, error);
      }
    }

    // Check rate limiting
    const now = Date.now();
    if (now - syncState.lastSync < 30000) { // 30 seconds minimum between syncs
      console.log('📡 Skipping sync - too frequent');
      return;
    }

    setSyncState(prev => ({ ...prev, isActive: true }));
    
    const syncPromise = (async () => {
      try {
        console.log(`📡 Starting sync operation: ${operationId}`);
        
        // Dynamic import to avoid circular dependencies
        const { supabase } = await import('@/integrations/supabase/client');
        
        const { data: signals, error } = await supabase
          .from('trading_signals')
          .select('*')
          .eq('status', 'active')
          .eq('is_centralized', true)
          .is('user_id', null)
          .order('confidence', { ascending: false })
          .limit(20);

        if (error) {
          throw error;
        }

        if (signals && signals.length > 0) {
          await cacheSignals(signals);
          console.log(`📡 Sync ${operationId} completed - ${signals.length} signals cached`);
          
          if (mountedRef.current) {
            setSyncState(prev => ({
              ...prev,
              lastSync: now,
              syncCount: prev.syncCount + 1,
              errors: prev.errors.slice(-4) // Keep last 5 errors
            }));
            onSignalsFetched?.(signals);
          }
        } else {
          console.log(`📡 Sync ${operationId} completed - no signals found`);
        }
      } catch (error) {
        const errorMessage = `Sync ${operationId} failed: ${(error as Error).message}`;
        console.error('❌', errorMessage);
        
        if (mountedRef.current) {
          setSyncState(prev => ({
            ...prev,
            errors: [...prev.errors.slice(-4), errorMessage]
          }));
        }
        throw error;
      }
    })();

    // Store the operation
    const operation: SyncOperation = {
      id: operationId,
      timestamp: now,
      promise: syncPromise
    };
    syncOperationsRef.current.set(operationId, operation);

    try {
      await syncPromise;
    } finally {
      // Clean up completed operation
      syncOperationsRef.current.delete(operationId);
      if (mountedRef.current) {
        setSyncState(prev => ({ ...prev, isActive: false }));
      }
    }
  }, [isConnected, syncState.lastSync, cacheSignals, onSignalsFetched]);

  // Debounced visibility change handler
  const handleVisibilityChange = useCallback(() => {
    if (!enableVisibilitySync || !isConnected || document.hidden) return;

    console.log('📱 App became visible - scheduling sync');
    
    // Clear any existing timeout
    if (visibilityTimeoutRef.current) {
      clearTimeout(visibilityTimeoutRef.current);
    }
    
    // Debounce visibility sync by 2 seconds
    visibilityTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && !document.hidden) {
        performSyncOperation('visibility-sync');
      }
    }, 2000);
  }, [enableVisibilitySync, isConnected, performSyncOperation]);

  // Setup app state listeners with proper cleanup
  const setupAppStateListeners = useCallback(() => {
    if (!enableVisibilitySync) return () => {};

    // Focus events
    const handleFocus = () => {
      if (isConnected) {
        console.log('📱 App focused - scheduling sync');
        performSyncOperation('focus-sync');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Native app state changes with proper async handling
    let nativeCleanup: (() => void) | null = null;
    
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive && isConnected) {
            console.log('📱 Native app became active - scheduling sync');
            performSyncOperation('native-active-sync');
          }
        }).then(listenerHandle => {
          nativeCleanup = () => listenerHandle.remove();
        });
      }).catch((error) => {
        console.warn('⚠️ Native app state monitoring not available:', error);
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (nativeCleanup) nativeCleanup();
    };
  }, [enableVisibilitySync, isConnected, handleVisibilityChange, performSyncOperation]);

  // Periodic sync with proper cleanup
  useEffect(() => {
    if (!isConnected || !enableBackgroundFetch) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    console.log(`📡 Setting up periodic sync: ${syncInterval}ms`);
    
    syncIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        performSyncOperation('periodic-sync');
      }
    }, syncInterval);

    // Perform initial sync
    performSyncOperation('initial-sync');

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isConnected, enableBackgroundFetch, syncInterval, performSyncOperation]);

  // App state listeners effect
  useEffect(() => {
    return setupAppStateListeners();
  }, [setupAppStateListeners]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      // Clear all timeouts and intervals
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
      
      // Cancel any pending sync operations
      syncOperationsRef.current.clear();
    };
  }, []);

  return {
    performBackgroundSync: () => performSyncOperation('manual-sync'),
    syncState,
    isHealthy: isConnected && !syncState.isActive && syncState.errors.length < 3
  };
};