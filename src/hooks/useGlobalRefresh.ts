import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GlobalRefreshState {
  lastPriceUpdate: number;
  lastSignalUpdate: number;
  lastFullSync: number;
  isUpdating: boolean;
}

class GlobalRefreshService {
  private subscribers: Set<() => void> = new Set();
  private state: GlobalRefreshState = {
    lastPriceUpdate: 0,
    lastSignalUpdate: 0,
    lastFullSync: 0,
    isUpdating: false
  };

  private priceInterval: NodeJS.Timeout | null = null;
  private signalInterval: NodeJS.Timeout | null = null;
  private fullSyncInterval: NodeJS.Timeout | null = null;

  subscribe(callback: () => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  getState() {
    return { ...this.state };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback());
  }

  async triggerPriceUpdate() {
    // Remove client-side invocation to maintain centralization
    // FastForex updates happen every 60s via centralized cron or server triggers
    this.state.lastPriceUpdate = Date.now();
    this.notifySubscribers();
    
    console.log('📊 Price update timestamp recorded - relying on centralized FastForex 60s cycle');
  }

  async triggerSignalUpdate() {
    this.state.lastSignalUpdate = Date.now();
    this.notifySubscribers();
    
    try {
      console.log('🔄 Global signal update triggered');
      
      // No action needed - signals update automatically via real-time subscriptions
      console.log('✅ Global signal update completed');
    } catch (error) {
      console.error('❌ Global signal update error:', error);
    }
  }

  async triggerFullSync() {
    this.state.lastFullSync = Date.now();
    this.notifySubscribers();
    
    console.log('🔄 Global full sync - relying on centralized 60s FastForex updates');
    
    // Update timestamps without triggering redundant API calls
    await this.triggerPriceUpdate();
    await this.triggerSignalUpdate();
  }

  start() {
    console.log('🌐 Starting global refresh service (centralized mode - 60s FastForex cycle)');
    
    // Significantly reduced polling to preserve quota
    // Align with FastForex 60-second centralized updates
    this.priceInterval = setInterval(() => {
      this.triggerPriceUpdate();
    }, 120000); // Changed from 60s to 120s

    // Signal refresh reduced
    this.signalInterval = setInterval(() => {
      this.triggerSignalUpdate();
    }, 180000); // Changed from 45s to 180s (3 minutes)

    // Full sync reduced
    this.fullSyncInterval = setInterval(() => {
      this.triggerFullSync();
    }, 300000); // Changed from 120s to 300s (5 minutes)

    // Initial update after brief delay
    setTimeout(() => this.triggerPriceUpdate(), 5000); // Increased delay
  }

  stop() {
    console.log('🌐 Stopping global refresh service');
    
    if (this.priceInterval) clearInterval(this.priceInterval);
    if (this.signalInterval) clearInterval(this.signalInterval);
    if (this.fullSyncInterval) clearInterval(this.fullSyncInterval);
    
    this.priceInterval = null;
    this.signalInterval = null;
    this.fullSyncInterval = null;
  }
}

const globalRefreshService = new GlobalRefreshService();

export const useGlobalRefresh = () => {
  const [state, setState] = useState<GlobalRefreshState>(globalRefreshService.getState());
  const startedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = globalRefreshService.subscribe(() => {
      setState(globalRefreshService.getState());
    });

    // Start the service only once globally
    if (!startedRef.current) {
      globalRefreshService.start();
      startedRef.current = true;
    }

    return () => {
      unsubscribe();
      // Don't stop the service when component unmounts - keep it running globally
    };
  }, []);

  const triggerManualUpdate = useCallback(async () => {
    await globalRefreshService.triggerFullSync();
  }, []);

  return {
    ...state,
    triggerManualUpdate,
    isConnected: !state.isUpdating && Date.now() - state.lastPriceUpdate < 90000
  };
};

export { globalRefreshService };
