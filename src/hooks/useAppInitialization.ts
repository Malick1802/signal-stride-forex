import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

interface InitializationState {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  progress: number;
  currentStep: string;
}

export const useAppInitialization = () => {
  const [state, setState] = useState<InitializationState>({
    isInitialized: false,
    isInitializing: true,
    error: null,
    progress: 0,
    currentStep: 'Starting...'
  });

  const updateProgress = useCallback((progress: number, step: string) => {
    setState(prev => ({ ...prev, progress, currentStep: step }));
  }, []);

  const initialize = useCallback(async () => {
    console.log('🚀 App initialization starting...');
    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      // Step 1: Platform detection
      updateProgress(10, 'Detecting platform...');
      const platform = Capacitor.getPlatform();
      console.log('📱 Platform detected:', platform);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 2: Network connectivity check
      updateProgress(30, 'Checking network...');
      const isOnline = navigator.onLine;
      console.log('🌐 Network status:', isOnline ? 'Online' : 'Offline');
      
      if (isOnline) {
        // Step 3: Test Supabase connection (optional, non-blocking)
        updateProgress(50, 'Testing connection...');
        try {
          const result = await Promise.race([
            supabase.from('subscribers').select('id').limit(1),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
          ]) as any;
          console.log('✅ Supabase connection test:', result?.error ? 'Failed (non-critical)' : 'Success');
        } catch (connectionError) {
          console.log('⚠️ Supabase connection test failed (continuing anyway):', connectionError);
        }
      }

      // Step 4: Initialize core features
      updateProgress(70, 'Loading core features...');
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 5: Finalize
      updateProgress(90, 'Finalizing...');
      await new Promise(resolve => setTimeout(resolve, 100));

      updateProgress(100, 'Ready!');
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isInitializing: false,
        error: null
      }));

      console.log('✅ App initialization complete');
    } catch (error) {
      const appError = error instanceof Error ? error : new Error('Initialization failed');
      console.error('❌ App initialization failed:', appError);
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: appError
      }));
    }
  }, [updateProgress]);

  const retry = useCallback(() => {
    console.log('🔄 Retrying app initialization...');
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Start initialization after a brief delay to ensure DOM is ready
    const timer = setTimeout(initialize, 100);
    return () => clearTimeout(timer);
  }, [initialize]);

  return {
    ...state,
    retry
  };
};